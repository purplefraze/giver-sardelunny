import { ME_ID, myItems, type ItemsState } from "@/data/items";

/**
 * THE CARDINAL GIVER RULE — PARTICIPATION IS EARNED BY GIVING.
 *
 * Communi-g is VISIBLE to everyone: the bottom loop shows what's happening,
 * and the feed can be opened and read. Interaction (responding, messaging,
 * sparkling, starting a connection) stays LOCKED until the person has posted
 * one active give of their own. This is NOT an onboarding step that expires —
 * it is a permanent condition, re-checked every time an engagement is attempted.
 */
export const hasActiveGive = (state: ItemsState) => myItems(state, "give", ME_ID).length > 0;

/** Same gate, named for call sites that mean "may engage", not "may look". */
export const canEngageCommunity = hasActiveGive;

const KEY = "giver.community-unlocked.v1";

/** THE UNLOCK IS CELEBRATED EXACTLY ONCE, and the fact is persisted. */
export function claimUnlockMoment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(KEY) === "true") return false;
    window.localStorage.setItem(KEY, "true");
    return true;
  } catch {
    return false;
  }
}
