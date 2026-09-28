import { ME_ID, hasLiveGive, type Item, type ItemsState } from "@/data/items";

/**
 * THE CARDINAL GIVER RULE — PARTICIPATION IS EARNED BY GIVING.
 *
 * communi-g is VISIBLE to everyone: the bottom loop shows what's happening,
 * and the feed can be opened and read. Interaction (responding, messaging,
 * sparkling, starting a connection) stays LOCKED until the person has posted
 * one active give of their own. This is NOT an onboarding step that expires —
 * it is a permanent condition, re-checked every time an engagement is attempted.
 *
 * "ACTIVE" MEANS LIVE (items.ts isLiveGive): active, published and inside its
 * window. A draft held back, an expired or a completed give does not count,
 * and neither does passing welcome sparks to somebody — that is not a give.
 */
export const hasActiveGive = (state: ItemsState) => hasLiveGive(state, ME_ID);

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

/**
 * NOBODY RECEIVES WITHOUT A LIVE GIVE OF THEIR OWN.
 *   give — the person taking it receives
 *   wish — the wish's owner receives (it is being granted)
 * Returns why a connection cannot start / settle, or null when it may.
 * Checked in the data layer (startConnection, expressIntent, updateConnection)
 * so every door — "apply for this give", "grant this wish", the conversation —
 * goes through it. Client-side until supabase/unapplied/20260928_grant_live_give.sql
 * is applied.
 */
export function receiveBlock(
  state: ItemsState,
  item: Pick<Item, "type" | "ownerId">,
  helperId: string,
): string | null {
  const receiver = item.type === "give" ? helperId : item.type === "wish" ? item.ownerId : null;
  if (receiver === null || hasLiveGive(state, receiver)) return null;
  return receiver === ME_ID
    ? "you can receive once a give of yours is live in communi-g."
    : "this wish isn’t open right now.";
}

/** Starting anything needs a live give of my own, then the receive rule. */
export function startBlock(state: ItemsState, item: Pick<Item, "type" | "ownerId">, helperId: string) {
  if (!hasLiveGive(state, helperId)) return "put a give live in communi-g first.";
  return receiveBlock(state, item, helperId);
}
