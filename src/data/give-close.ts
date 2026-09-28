/**
 * WHEN ONE OF MY GIVES STOPS BEING LIVE.
 *
 * Taken (a verified connection completes it), marked done, or past its day —
 * the give leaves communi-g, and without a live give nothing else of mine is
 * visible. The G asks once, on that close:
 *
 *   want to offer that again?
 *   or something else?
 *   without a live give, nothing else of yours is visible
 *
 * No sparks and no "+10" here: sparks on a give's handoff are a later ticket.
 *
 * We remember which of my gives were live (localStorage), so a close that
 * happened while the app was shut is still noticed on the next open. A give I
 * withdrew myself (removed) is not asked about. Each close is asked once
 * (offered again and closed again = asked again).
 */
import { ME_ID, isLiveGive, type Item, type ItemsState } from "@/data/items";

const LIVE_KEY = "giver.live-gives.v1";
const ASKED_KEY = "giver.give-close-asked.v1";

function readIds(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* best effort */
  }
}

/**
 * Record which of my gives are live now; return one that just closed (and
 * has not been asked about), or null. Call whenever items change.
 */
export function noteLiveGives(state: ItemsState, now = Date.now()): Item | null {
  if (typeof window === "undefined") return null;
  const live = state.items
    .filter((i) => i.ownerId === ME_ID && isLiveGive(i, now))
    .map((i) => i.id);
  const before = readIds(LIVE_KEY);
  writeIds(LIVE_KEY, live);
  /* A give that is live again may be asked about again when it next closes. */
  const askedBefore = readIds(ASKED_KEY);
  const stillAsked = askedBefore.filter((id) => !live.includes(id));
  if (stillAsked.length !== askedBefore.length) writeIds(ASKED_KEY, stillAsked);
  const asked = new Set(stillAsked);
  for (const id of before) {
    if (live.includes(id) || asked.has(id)) continue;
    const item = state.items.find((i) => i.id === id);
    /* Withdrawn (removed) by me: not asked. Taken, done or past its day: asked. */
    if (item) return item;
  }
  return null;
}

/** This close has been asked about — never again. */
export function markAsked(itemId: string) {
  if (typeof window === "undefined") return;
  const asked = readIds(ASKED_KEY);
  if (!asked.includes(itemId)) writeIds(ASKED_KEY, [...asked, itemId].slice(-50));
}
