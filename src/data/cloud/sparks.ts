/**
 * SPARKS ARE SERVER-OWNED (supabase/unapplied/20261015_01_spark_lock.sql).
 *
 * Once 01 is applied the profiles guard trigger silently keeps the old value of
 * sparks / sparkles / give_sparks / reserved / sparks_seeded / rewarded /
 * welcome_granted_at / is_sample / sample_key, and 01b makes any PATCH that
 * names them fail 42501. The only member-facing writers are these RPCs:
 *   - spend_my_sparks(_amount, _reason, _ref)  debit `sparks` only, ledgered
 *   - claim_welcome_grant()                    +50 sparks, +50 give_sparks, once
 * and, from 20261015_03:
 *   - reserve_wish_sparks(_item, _amount)      wish publish: sparks -> hold
 *   - release_my_wish_hold(_item)              wish withdrawn: hold -> sparks
 *     (settlement closes the hold server-side; the granter's +10 is the
 *      existing connection payout)
 *   - pledge_to_wish(_wish, _cents, _local_id) Fund pledge (needs Sep-27)
 * After every call the balance is re-read from the server (my_profile) so the
 * local store never drifts from the ledger.
 */
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore, WISH_COMPOSE_KEY } from "@/data/my-profile";
import { itemsStore } from "@/data/items";
import { cloudItemId } from "@/data/cloud/items-sync";

export type SparkFailure =
  "sparks" | "gate" | "no-profile" | "bad-amount" | "unavailable" | "error";

export type SparkResult = { ok: true } | { ok: false; reason: SparkFailure; message: string };

type RpcError = { code?: string; message?: string } | null;

/** One mapping for every server refusal the spark lock / live-give gate can raise. */
export function sparkFailure(error: RpcError): SparkFailure {
  const msg = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  if (msg.includes("insufficient sparks")) return "sparks";
  if (msg.includes("live give") || code === "42501" || msg.includes("row-level security"))
    return "gate";
  if (msg.includes("no profile")) return "no-profile";
  if (msg.includes("bad amount")) return "bad-amount";
  if (
    msg.includes("capped") ||
    msg.includes("not fundable") ||
    msg.includes("stated cost") ||
    msg.includes("not your wish")
  )
    return "error";
  /* Function not deployed yet (migration unapplied): PostgREST PGRST202 / 42883. */
  if (code === "PGRST202" || code === "42883" || msg.includes("could not find the function"))
    return "unavailable";
  return "error";
}

/** Plain-words line for a gate refusal on connect / conversation / message. */
export function gateLine(error: RpcError): string | null {
  return sparkFailure(error) === "gate" ? "put a give out first — then you can connect." : null;
}

/**
 * Pull my_profile + my open holds and copy the server-owned balances into the
 * local store. The wish-composer hold (WISH_COMPOSE_KEY) is client-only (open
 * product question), so it is kept and subtracted from the shown balance.
 */
export async function refreshBalance() {
  await sessionStore.refresh();
  const p = sessionStore.get().profile as
    | (NonNullable<ReturnType<typeof sessionStore.get>["profile"]> & {
        give_sparks?: number;
        welcome_granted_at?: string | null;
      })
    | null;
  if (!p) return;
  const compose = myProfileStore.get().reserved[WISH_COMPOSE_KEY] ?? 0;
  const reserved: Record<string, number> = compose ? { [WISH_COMPOSE_KEY]: compose } : {};
  const holds = await (
    supabase.from as unknown as (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string,
        ) => Promise<{
          data: { item_id: string | null; amount: number }[] | null;
          error: RpcError;
        }>;
      };
    }
  )("spark_holds")
    .select("item_id, amount")
    .eq("state", "held");
  if (!holds.error && holds.data) {
    const items = itemsStore.get().items;
    for (const h of holds.data) {
      if (!h.item_id) continue;
      const local = items.find((i) => i.cloudId === h.item_id || i.id === `cloud:${h.item_id}`);
      reserved[local?.id ?? `cloud:${h.item_id}`] = h.amount;
    }
  }
  myProfileStore.patch({
    sparks: Math.max(0, p.sparks - compose),
    sparkles: p.sparkles,
    /* No holds table yet (03 unapplied): keep the local view of holds. */
    ...(holds.error ? {} : { reserved }),
    ...(typeof p.give_sparks === "number" ? { giveSparks: p.give_sparks } : {}),
    ...(p.welcome_granted_at ? { welcomeGranted: true } : {}),
  });
}

async function call(fn: string, args?: Record<string, unknown>): Promise<SparkResult> {
  if (!sessionStore.get().userId)
    return { ok: false, reason: "no-profile", message: "sign in first" };
  // New RPCs are not in the generated types until the migration is applied.
  const { error } = await (
    supabase.rpc as unknown as (
      f: string,
      a?: Record<string, unknown>,
    ) => Promise<{ error: RpcError }>
  )(fn, args);
  if (error) return { ok: false, reason: sparkFailure(error), message: error.message ?? "failed" };
  await refreshBalance();
  return { ok: true };
}

/** Debit my wish-bank sparks on the server. Idempotent per (_reason kind, _ref). */
export function spendSparks(amount: number, reason: string, ref?: string) {
  return call("spend_my_sparks", { _amount: amount, _reason: reason, _ref: ref ?? null });
}

/** The once-per-profile welcome grant. A replay returns the first ledger row, not an error. */
export function claimWelcomeGrant() {
  return call("claim_welcome_grant");
}

async function withCloudItem(
  localId: string,
  run: (id: string) => Promise<SparkResult>,
): Promise<SparkResult> {
  if (!sessionStore.get().userId)
    return { ok: false, reason: "no-profile", message: "sign in first" };
  const id = await cloudItemId(localId).catch(() => null);
  if (!id) return { ok: false, reason: "error", message: "item not saved yet" };
  return run(id);
}

/** A wish just published: move its sparks into a server hold. */
export function reserveWish(localItemId: string, amount: number) {
  return withCloudItem(localItemId, (id) =>
    call("reserve_wish_sparks", { _item: id, _amount: amount }),
  );
}

/** A wish withdrawn before it was granted: refund its hold. */
export function releaseWishHold(localItemId: string) {
  return withCloudItem(localItemId, (id) => call("release_my_wish_hold", { _item: id }));
}

/** A Fund pledge (no sparks move). Idempotent per local id. */
export function pledgeToWish(localWishId: string, amountCents: number, localId: string) {
  return withCloudItem(localWishId, (id) =>
    call("pledge_to_wish", { _wish: id, _amount_cents: amountCents, _local_id: localId }),
  );
}

/** Settlement happened on the server (+10, hold settled): re-read, never add locally. */
export function afterSettlement() {
  return refreshBalance().catch(() => undefined);
}

/** Report a server refusal without breaking the optimistic local flow. */
export function logSparkFailure(what: string, r: SparkResult) {
  if (!r.ok && r.reason !== "unavailable" && r.reason !== "no-profile")
    console.warn(`${what}:`, r.message);
}
