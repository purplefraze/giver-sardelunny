/**
 * QUIET REVIEW FLAGS — CLIENT-SIDE ONLY FOR NOW (see the unapplied migration
 * supabase/migrations/20260928000000_give_trust_UNAPPLIED.sql.txt for the
 * server version, a private table nobody but admins can read).
 *
 * Every one of MY gives that ends without being matched — taken down while
 * still open, or expired unmatched — is logged here. Crossing the threshold
 * sets a flag for review. Nothing is shown to the person, nothing is blocked.
 *
 *   THRESHOLD: 3 unmatched/cancelled gives within 30 days, or 5 in total.
 *
 * No imports on purpose, so the item layer can call it without a cycle.
 */

const KEY = "giver.review-flags.v1";
const DAY = 24 * 60 * 60 * 1000;
export const REVIEW_WINDOW_DAYS = 30;
export const REVIEW_IN_WINDOW = 3;
export const REVIEW_LIFETIME = 5;

export type GiveEnd = { itemId: string; reason: "cancelled" | "unmatched"; at: number };
type State = { events: GiveEnd[]; flaggedAt?: number };

function read(): State {
  if (typeof window === "undefined") return { events: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : { events: [] };
  } catch {
    return { events: [] };
  }
}

export function reviewFlagged(state = read(), now = Date.now()): boolean {
  const recent = state.events.filter((e) => now - e.at <= REVIEW_WINDOW_DAYS * DAY).length;
  return recent >= REVIEW_IN_WINDOW || state.events.length >= REVIEW_LIFETIME;
}

/** Log one of MY gives ending unmatched. Silent; never throws. */
export function logGiveEnd(itemId: string, reason: GiveEnd["reason"], at = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    const s = read();
    if (s.events.some((e) => e.itemId === itemId)) return;
    const next: State = { ...s, events: [...s.events, { itemId, reason, at }] };
    if (!next.flaggedAt && reviewFlagged(next, at)) next.flaggedAt = at;
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quiet by design */
  }
}
