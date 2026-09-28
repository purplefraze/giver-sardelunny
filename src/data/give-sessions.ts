/**
 * REPEATING GIVES ARE COUNTED LESSON BY LESSON.
 *
 * Receivers never pay for a give. For a give that repeats (weekly, every other
 * sunday, monthly…), giver adds SESSION_SPARKS to the GIVER for every lesson /
 * session that BOTH people confirm happened, the same way a one-time give is
 * confirmed. A one-time give keeps the old rule: +10, once, when the connection
 * is verified.
 *
 * ABUSE GUARDS (mirrored in supabase/unapplied/20260928_give_sessions.sql):
 *   - at most ONE counted session per connection per cadence period
 *     (a day, a week, a fortnight or a month, read from "how often")
 *   - at most SESSION_CAP_PER_CONNECTION credited sessions per connection
 *   - at most SESSION_CAP_PER_WEEK credited sessions per giver per week,
 *     across all of their repeating gives
 * A session past a cap is still recorded as confirmed; it just earns nothing.
 *
 * Periods are counted in utc, on buckets that start on a monday
 * (1970-01-05), so the client and the server agree on every key.
 *
 * Pure: no stores, no dom.
 */
import { GENEROSITY_REWARD } from "@/data/my-profile";

/** What giver adds for one confirmed lesson — the same ten sparks as always. */
export const SESSION_SPARKS = GENEROSITY_REWARD;
export const SESSION_CAP_PER_CONNECTION = 12;
export const SESSION_CAP_PER_WEEK = 5;

export type SessionPeriod = "day" | "week" | "fortnight" | "month";

const DAY = 86_400_000;
const EPOCH_MONDAY = Date.UTC(1970, 0, 5);

/** How often a give repeats, as a counting period. Null = it does not repeat. */
export function cadencePeriod(cadence: string | undefined): SessionPeriod | null {
  const c = (cadence ?? "").trim().toLowerCase();
  if (!c || c === "one time" || c === "flexible") return null;
  if (/month/.test(c)) return "month";
  if (/fortnight|every other|every second|every (2|two) weeks|bi-?weekly/.test(c))
    return "fortnight";
  if (/\bonce\b|one[- ]?off|one time|just the once/.test(c)) return null;
  if (/daily|every day|each day/.test(c)) return "day";
  /* weekly, "every sunday", "twice a week" and anything typed: one per week. */
  return "week";
}

/** The unit a repeating give is counted in, from its kind. */
export function sessionWord(kind: string | undefined): string {
  if (kind === "a skill") return "lesson";
  if (kind === "time" || kind === "a hand") return "session";
  return "time";
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The first moment (utc ms) of the period `at` falls in. */
function periodStart(period: SessionPeriod, at: number): number {
  const day = Math.floor((at - EPOCH_MONDAY) / DAY);
  if (period === "day") return EPOCH_MONDAY + day * DAY;
  if (period === "week") return EPOCH_MONDAY + Math.floor(day / 7) * 7 * DAY;
  if (period === "fortnight") return EPOCH_MONDAY + Math.floor(day / 14) * 14 * DAY;
  const d = new Date(at);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/** "week:2026-09-28" — one key per scheduled occurrence. Same as the sql. */
export function periodKey(period: SessionPeriod, at: number): string {
  const start = periodStart(period, at);
  return period === "month" ? `month:${iso(start).slice(0, 7)}` : `${period}:${iso(start)}`;
}

/** When the next session can be counted (utc ms). */
export function nextPeriodStart(period: SessionPeriod, at: number): number {
  const start = periodStart(period, at);
  if (period === "day") return start + DAY;
  if (period === "week") return start + 7 * DAY;
  if (period === "fortnight") return start + 14 * DAY;
  const d = new Date(start);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** The giver-wide weekly bucket a credit falls in. */
export const creditWeek = (at: number) => periodKey("week", at);

/**
 * THE GIVER'S LINE on their own finished give card:
 * "giver adds 10 sparks each lesson · every other sunday". Null for gives that
 * do not repeat and for anything that is not a give.
 */
export function giverRepeatLine(
  type: string,
  details:
    { cadence?: string | undefined; extras?: Record<string, string> | undefined } | undefined,
): string | null {
  const cadence = details?.cadence?.trim();
  if (type !== "give" || !cadence || !cadencePeriod(cadence)) return null;
  const unit = sessionWord(details?.extras?.["kind"]);
  return `giver adds ${SESSION_SPARKS} sparks each ${unit} · ${cadence}`;
}
