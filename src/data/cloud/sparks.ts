/**
 * SPARKS ARE SERVER-OWNED (supabase/unapplied/20261015_01_spark_lock.sql).
 *
 * Once 01 is applied the profiles guard trigger silently keeps the old value of
 * sparks / sparkles / give_sparks / reserved / sparks_seeded / rewarded /
 * welcome_granted_at / is_sample / sample_key, and 01b makes any PATCH that
 * names them fail 42501. The only member-facing writers are these RPCs:
 *   - spend_my_sparks(_amount, _reason, _ref)  debit `sparks` only, ledgered
 *   - claim_welcome_grant()                    +50 sparks, +50 give_sparks, once
 * After every call the balance is re-read from the server (my_profile) so the
 * local store never drifts from the ledger.
 */
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";

export type SparkFailure = "sparks" | "gate" | "no-profile" | "bad-amount" | "unavailable" | "error";

export type SparkResult = { ok: true } | { ok: false; reason: SparkFailure; message: string };

type RpcError = { code?: string; message?: string } | null;

/** One mapping for every server refusal the spark lock / live-give gate can raise. */
export function sparkFailure(error: RpcError): SparkFailure {
  const msg = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  if (msg.includes("insufficient sparks")) return "sparks";
  if (msg.includes("live give") || code === "42501" || msg.includes("row-level security")) return "gate";
  if (msg.includes("no profile")) return "no-profile";
  if (msg.includes("bad amount")) return "bad-amount";
  /* Function not deployed yet (migration unapplied): PostgREST PGRST202 / 42883. */
  if (code === "PGRST202" || code === "42883" || msg.includes("could not find the function")) return "unavailable";
  return "error";
}

/** Plain-words line for a gate refusal on connect / conversation / message. */
export function gateLine(error: RpcError): string | null {
  return sparkFailure(error) === "gate" ? "put a give out first — then you can connect." : null;
}

/** Pull my_profile and copy the server-owned balances into the local store. */
export async function refreshBalance() {
  await sessionStore.refresh();
  const p = sessionStore.get().profile as
    | (NonNullable<ReturnType<typeof sessionStore.get>["profile"]> & {
        give_sparks?: number;
        welcome_granted_at?: string | null;
      })
    | null;
  if (!p) return;
  myProfileStore.patch({
    sparks: p.sparks,
    sparkles: p.sparkles,
    ...(typeof p.give_sparks === "number" ? { giveSparks: p.give_sparks } : {}),
    ...(p.welcome_granted_at ? { welcomeGranted: true } : {}),
  });
}

async function call(fn: string, args?: Record<string, unknown>): Promise<SparkResult> {
  if (!sessionStore.get().userId) return { ok: false, reason: "no-profile", message: "sign in first" };
  // New RPCs are not in the generated types until the migration is applied.
  const { error } = await (supabase.rpc as unknown as (
    f: string,
    a?: Record<string, unknown>,
  ) => Promise<{ error: RpcError }>)(fn, args);
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
