/**
 * FIRST-GIVE CHECK — CLIENT-SIDE ONLY FOR NOW.
 * (Server version: supabase/unapplied/20260928_give_trust.sql — NOT applied.)
 *
 * A new account's first give is saved with published:false (the existing
 * items.published flag) until the person enters one fresh code sent to their
 * email (Supabase signInWithOtp for the signed-in user's own address, then
 * verifyOtp type "email" — the same path as sign-in). Passing it marks the
 * account verified on this device and publishes the waiting give.
 */
import type { Item } from "./items";

const KEY = "giver.first-give-verified.v1";

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/** The account key: the signed-in user id, or "local" for a device-only account. */
export function firstGiveVerified(account: string, myItems: readonly Item[]): boolean {
  if (read()[account]) return true;
  /* An account that already completed a give has plainly been real before. */
  return myItems.some((i) => i.type === "give" && i.status === "completed");
}

export function markFirstGiveVerified(account: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), [account]: Date.now() }));
  } catch {
    /* quiet */
  }
}
