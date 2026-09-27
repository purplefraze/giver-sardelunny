/**
 * WHEN AND HOW LONG — the Give flow's calendar answers and its expiry line.
 * All labels lowercase, in the device's local time; stored times are UTC ISO.
 */
import type { GiveType } from "./give-lexicon";

export type WhenPick = { date: string; start?: string; end?: string };
export type Expiry =
  | { kind: "days"; days: 1 | 3 | 7 }
  | { kind: "date"; date: string; time?: string }
  | { kind: "when" };

export const EXPIRY_PRESETS = ["1 day", "3 days", "7 days", "pick a date"] as const;

const DAY = 24 * 60 * 60 * 1000;
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Types that pick a day and time on the calendar. */
export const USES_CALENDAR: Record<GiveType, boolean> = {
  "a thing": false,
  clothes: false,
  food: false,
  time: true,
  "a skill": true,
  "a hand": true,
};

export function defaultExpiry(type: GiveType): Expiry {
  return type === "a thing" || type === "clothes" ? { kind: "days", days: 7 } : { kind: "days", days: 1 };
}

export function localDate(date: string, time?: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "23:59").split(":").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2pm", "2:30pm" */
export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const h12 = ((h! + 11) % 12) + 1;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h! < 12 ? "am" : "pm"}`;
}

/** "sat 12 oct, 2pm – 4pm" */
export function whenLabel(w: WhenPick): string {
  const d = localDate(w.date, "12:00");
  const day = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  if (!w.start) return day;
  return `${day}, ${clock(w.start)}${w.end ? ` – ${clock(w.end)}` : ""}`;
}

/** The moment a picked "when" is over: its end time, else its start time. */
export function whenEnds(w: WhenPick): Date {
  return localDate(w.date, w.end ?? w.start ?? "23:59");
}

export function expiresAt(e: Expiry, when: WhenPick | null, from = Date.now()): Date {
  if (e.kind === "days") return new Date(from + e.days * DAY);
  if (e.kind === "date") return localDate(e.date, e.time ?? "23:59");
  return when ? whenEnds(when) : new Date(from + DAY);
}

/** "up for 7 days" / "up for 1 day" / "up until sat 2pm" */
export function expiryLabel(e: Expiry, when: WhenPick | null): string {
  if (e.kind === "days") return `up for ${e.days} ${e.days === 1 ? "day" : "days"}`;
  const at = expiresAt(e, when);
  const time = e.kind === "date" && !e.time ? "" : ` ${clock(`${at.getHours()}:${at.getMinutes()}`)}`;
  return `up until ${DOW[at.getDay()]}${time}`;
}

export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  /* Weeks start on monday. */
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
