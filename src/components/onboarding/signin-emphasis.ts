import { SEAT_ANGLE, type Seat } from "@/components/living-g/EarSelector";
import type { SignInFeedKind } from "@/data/signin-feed";

/**
 * THE EMAIL STEP'S CONVEYOR — pure maths, no React.
 *
 * ONE CONTINUOUS ANGLE (degrees, SVG sense: 0 = 3:00, clockwise positive,
 * unbounded) carries the toggle round the circle through all seven seats in
 * clock order, at the seat angles the main G uses (EarSelector SEAT_ANGLE):
 *   give 1:30 · lend 3:00 · my g 4:25 · trade 6:00 · fund 7:30 · borrow 9:00 ·
 *   wish 10:30 — and back to give across an EMPTY 12:00.
 *
 * WEIGHTS. Between two neighbouring seats a (behind) and b (ahead), with t the
 * share of the arc travelled (0 at a, 1 at b), a RAISED COSINE hands the
 * weight over: w_b = (1 − cos πt) / 2, w_a = 1 − w_b. Each seat is fully lifted
 * only when the toggle sits on it, falls smoothly to 0 at its neighbours, and
 * between two seats both are partly lifted by distance — no hard cut, no dwell.
 */
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Seats in clock order starting after 12:00, angles in [-90, 270). */
const norm = (d: number) => ((((d + 90) % 360) + 360) % 360) - 90;
export const CONVEYOR: { seat: Seat; at: number }[] = (Object.keys(SEAT_ANGLE) as Seat[])
  .map((seat) => ({ seat, at: norm(deg(SEAT_ANGLE[seat])) }))
  .sort((a, b) => a.at - b.at);

export const seatAngle = (seat: Seat) => CONVEYOR.find((c) => c.seat === seat)!.at;

export type SeatBlend = { a: Seat; b: Seat; wa: number; wb: number; nearest: Seat };

export function seatBlend(angle: number): SeatBlend {
  let phi = norm(angle);
  const n = CONVEYOR.length;
  /* Before the first seat (between 12:00 and give): still on the wish → give arc. */
  if (phi < CONVEYOR[0]!.at) phi += 360;
  for (let i = 0; i < n; i += 1) {
    const a = CONVEYOR[i]!;
    const b = CONVEYOR[(i + 1) % n]!;
    const bAt = i + 1 < n ? b.at : b.at + 360;
    if (phi >= a.at && phi < bAt) {
      const t = (phi - a.at) / (bAt - a.at);
      const wb = (1 - Math.cos(Math.PI * t)) / 2;
      const wa = 1 - wb;
      return { a: a.seat, b: b.seat, wa, wb, nearest: wa >= wb ? a.seat : b.seat };
    }
  }
  const first = CONVEYOR[0]!.seat;
  return { a: first, b: first, wa: 1, wb: 0, nearest: first };
}

/** Which feed words belong to a seat (My G has none of its own). */
const FEED_KIND: Partial<Record<Seat, SignInFeedKind>> = {
  give: "give",
  lend: "lend",
  trade: "trade",
  fund: "fund",
  borrow: "borrow",
  wish: "wish",
};

/**
 * FEED PROMINENCE — OPACITY ONLY (the alpha of each action's one fixed tint;
 * size and weight never change, so nothing reflows).
 *   FLOOR = the feed's existing per-action strengths (unchanged).
 *   PEAK  = the strength when the toggle sits on that seat: clearly readable,
 *           still quieter than the ink of the email field.
 */
export const FEED_FLOOR: Record<SignInFeedKind, number> = {
  give: 0.38,
  lend: 0.44,
  trade: 0.34,
  fund: 0.25,
  borrow: 0.46,
  wish: 0.23,
};
export const FEED_PEAK: Record<SignInFeedKind, number> = {
  give: 0.7,
  lend: 0.7,
  trade: 0.62,
  fund: 0.55,
  borrow: 0.7,
  wish: 0.58,
};

export const FEED_KINDS = Object.keys(FEED_FLOOR) as SignInFeedKind[];

/** Every action's current strength at this blend. */
export function feedEmphasis(blend: SeatBlend): Record<SignInFeedKind, number> {
  const out = { ...FEED_FLOOR };
  const lift = (seat: Seat, w: number) => {
    const k = FEED_KIND[seat];
    if (k) out[k] = FEED_FLOOR[k] + (FEED_PEAK[k] - FEED_FLOOR[k]) * w;
  };
  lift(blend.a, blend.wa);
  if (blend.b !== blend.a) lift(blend.b, blend.wb);
  return out;
}

/** The app-wide seat colours (styles.css --mode-*), by seat. */
const MODE_VAR: Record<Seat, string> = {
  give: "--mode-give",
  lend: "--mode-lend",
  giver: "--mode-giver",
  trade: "--mode-trade",
  fund: "--mode-fund",
  borrow: "--mode-borrow",
  wish: "--mode-wish",
};

/**
 * THE SEAT COLOUR AT THIS BLEND: the two neighbouring seats' own tokens mixed
 * by the same weights, in OKLab (OKLCH's cartesian form: perceptually even,
 * and no hue-direction flip between far-apart hues such as blue → orange).
 */
export function seatColour(blend: SeatBlend, quantum = 0.5): string {
  const pa = Math.round((blend.wa * 100) / quantum) * quantum;
  if (pa >= 100 || blend.a === blend.b) return `var(${MODE_VAR[blend.a]})`;
  if (pa <= 0) return `var(${MODE_VAR[blend.b]})`;
  return `color-mix(in oklab, var(${MODE_VAR[blend.a]}) ${pa}%, var(${MODE_VAR[blend.b]}))`;
}
