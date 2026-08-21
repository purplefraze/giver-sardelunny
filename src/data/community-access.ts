import { ME_ID, myItems, type ItemsState } from "@/data/items";

/**
 * THE CARDINAL GIVER RULE — PARTICIPATION IS EARNED BY GIVING.
 *
 * The community is only visible to people who are actually in it. One active
 * give of your own is the key: without it there is nothing to look at, and with
 * it everything opens. This is NOT an onboarding step that expires — it is a
 * permanent condition, re-checked every time the community door is touched.
 */
export const hasActiveGive = (state: ItemsState) => myItems(state, "give", ME_ID).length > 0;

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
