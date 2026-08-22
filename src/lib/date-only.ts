/**
 * DATE-ONLY VALUES. A date of birth is a day on a calendar, not a moment in
 * time. `new Date("1988-08-03")` is parsed as UTC midnight, so anyone west of
 * Greenwich sees 2 august — the classic off-by-one. Every calendar day in the
 * app therefore travels as a plain "YYYY-MM-DD" string and is only ever turned
 * into a Date through here, at LOCAL midnight, so the day never moves.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** THE STRING FORM OF A DAY. Local parts, never toISOString (that is UTC). */
export function toDateOnly(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A DAY, AT LOCAL MIDNIGHT. Returns null for anything that isn't a real day. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = ISO_DAY.exec(value.trim());
  if (!m) {
    /* A stray legacy timestamp: keep its calendar day, drop the clock. */
    const loose = new Date(value);
    if (Number.isNaN(loose.getTime())) return null;
    return parseDateOnly(toDateOnly(loose));
  }
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  /* Reject 31 february and friends — the roll-over would change the day. */
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

/** NORMALISE WHATEVER WAS STORED into the one canonical day string. */
export function normaliseDateOnly(value: string | null | undefined): string {
  const d = parseDateOnly(value);
  return d ? toDateOnly(d) : "";
}

/** TODAY, AS A DAY. */
export const todayDateOnly = () => toDateOnly(new Date());

/** WHOLE YEARS BETWEEN TWO DAYS, counted on the calendar, not in milliseconds. */
export function yearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  if (months < 0 || (months === 0 && to.getDate() < from.getDate())) years -= 1;
  return years;
}

/** A DAY, WRITTEN OUT: "3 august 1988". Formatted from local parts only. */
export function formatDateOnly(
  value: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const d = parseDateOnly(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", opts).toLowerCase();
}
