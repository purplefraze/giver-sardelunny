/**
 * THE WELCOME GRANT — 100 SPARKS: 50 SPARKS TO GIVE, 50 SPARKS TO WISH.
 *
 * On the first land after the magic link (the account's first session), giver
 * grants 100 sparks. Give sparks live in give (my-profile.ts `giveSparks`),
 * wish sparks live in wish (`sparks`, the wish bank). Nothing is kept in my g.
 * The moment that says so is first-land/FirstLand.tsx.
 *
 * ONCE PER ACCOUNT, NEVER REPLAYED: remembered on this device (localStorage)
 * AND on the account (auth user_metadata.welcome_grant_at — the same pattern
 * as the give hint), so a second phone neither replays the lines nor grants
 * twice. The only count ever shown is the wish bank, at the wish seat.
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
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (meta["welcome_grant_at"]) {
    rememberHere();
    const pot = Number(meta["sparks_to_give"]);
    const me = myProfileStore.get();
    if (!me.welcomeGranted)
      myProfileStore.patch({
        welcomeGranted: true,
        ...(Number.isFinite(pot) ? { giveSparks: pot } : {}),
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
  void supabase.auth
    .updateUser({
      data: {
        welcome_grant_at: new Date().toISOString(),
        sparks_to_give: myProfileStore.get().giveSparks,
      },
    })
    .catch(() => undefined);
}
