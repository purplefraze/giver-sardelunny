/**
 * THE WELCOME GRANT — 100 SPARKS: 50 SPARKS TO GIVE, 50 SPARKS TO WISH.
 *
 * On the first land after the magic link (the account's first session), giver
 * grants 100 sparks. Give sparks live in give (my-profile.ts `giveSparks`),
 * wish sparks live in wish (`sparks`, the wish bank). Nothing is kept in my g.
 * The moment that says so is first-land/FirstLand.tsx.
 *
 * ONCE PER ACCOUNT, NEVER REPLAYED: remembered on this device (localStorage)
 * AND on the server (spark_ledger kind 'welcome' / profiles.welcome_granted_at,
 * read in welcomeOwed), so a second phone neither replays the lines nor grants
 * twice. user_metadata is member-editable and is no longer trusted. The only count ever shown is the wish bank, at the wish seat.
 *
 * "FIRST SESSION" = the account's last sign-in is within a day of its
 * creation (a brand-new magic-link account). Older accounts are not granted.
 *
 * Server-side version (profiles.give_sparks + a one-time grant function):
 * supabase/unapplied/20260928_grant_live_give.sql — NOT applied. Until then
 * the "to give" pot is mirrored in user_metadata.sparks_to_give.
 */
import { supabase } from "@/integrations/supabase/client";
import { myProfileStore } from "@/data/my-profile";
import { claimWelcomeGrant } from "@/data/cloud/sparks";

export const WELCOME_TO_GIVE = 50;
export const WELCOME_TO_WISH = 50;

const LOCAL = "giver.welcome-grant.v1";
const FIRST_SESSION_MS = 24 * 60 * 60 * 1000;

function seenHere(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LOCAL) !== null;
  } catch {
    return false;
  }
}

function rememberHere() {
  try {
    window.localStorage.setItem(LOCAL, new Date().toISOString());
  } catch {
    /* private mode: the account flag still holds */
  }
}

/**
 * IS THE GRANT OWED on this land? Reads the stored session only (no network).
 * An account that was already granted elsewhere restores its "to give" pot
 * here and answers no.
 */
export async function welcomeOwed(): Promise<boolean> {
  if (seenHere()) return false;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;
  /*
    THE SERVER PROFILE DECIDES, not user_metadata (which the member can edit).
    profiles.welcome_granted_at / give_sparks come from my_profile(); a granted
    account restores its "to give" pot here and answers no.
  */
  const { data: profile } = await supabase.rpc("my_profile").maybeSingle();
  const server = (profile ?? null) as { give_sparks?: number; welcome_granted_at?: string | null } | null;
  const ledgered = await (supabase.from as unknown as (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> };
    };
  })("spark_ledger")
    .select("id")
    .eq("kind", "welcome")
    .limit(1);
  const granted =
    Boolean(server?.welcome_granted_at) || Boolean(!ledgered.error && ledgered.data && ledgered.data.length);
  if (granted) {
    rememberHere();
    if (!myProfileStore.get().welcomeGranted)
      myProfileStore.patch({
        welcomeGranted: true,
        ...(typeof server?.give_sparks === "number" ? { giveSparks: server.give_sparks } : {}),
      });
    return false;
  }
  const created = Date.parse(user.created_at);
  const last = Date.parse(user.last_sign_in_at ?? user.created_at);
  if (Number.isNaN(created) || Number.isNaN(last)) return false;
  return last - created <= FIRST_SESSION_MS;
}

/**
 * GRANT AND REMEMBER — called the moment the first land begins, so a reload
 * or a skip can never replay it. The account write is best effort.
 */
export function claimWelcome() {
  rememberHere();
  myProfileStore.grantWelcome(WELCOME_TO_GIVE, WELCOME_TO_WISH);
  /*
    SERVER GRANT (claim_welcome_grant, once per profile, idempotent). On
    success the balance is re-read from the server. "unavailable" = the
    migration is not applied yet: the local grant above stands as before.
  */
  void claimWelcomeGrant()
    .then((r) => {
      if (!r.ok && r.reason !== "unavailable") console.warn("welcome grant:", r.message);
    })
    .catch(() => undefined);
  void supabase.auth
    .updateUser({
      data: {
        welcome_grant_at: new Date().toISOString(),
        sparks_to_give: myProfileStore.get().giveSparks,
      },
    })
    .catch(() => undefined);
}
