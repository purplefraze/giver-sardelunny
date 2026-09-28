import { SEAT_ANGLE, toggleGeometry, type Seat } from "@/components/living-g/EarSelector";
import type { SignInFeedKind } from "@/data/signin-feed";

/**
 * THE EMAIL STEP'S CONVEYOR — pure maths, no React.
 *
 * ONE CONTINUOUS ANGLE (degrees, SVG sense: 0 = 3:00, clockwise positive,
 * unbounded) carries the toggle round the circle through all eight seats in
 * clock (spectrum) order, at the seat angles the main G uses (EarSelector
 * SEAT_ANGLE):
 *   my g 12:00 · give 1:30 · lend 3:00 · trade 4:30 · map 6:00 · fund 7:30 ·
 *   borrow 9:00 · wish 10:30 — and back to my g. 12:00 is a seat now (the
 *   conveyor DOCKS there); the old "nothing rests at 12:00" arc is gone.
 *
 * WEIGHTS. Between two neighbouring seats a (behind) and b (ahead), with t the
 * share of the arc travelled (0 at a, 1 at b), a RAISED COSINE hands the
 * weight over: w_b = (1 − cos πt) / 2, w_a = 1 − w_b. Each seat is fully lifted
 * only when the toggle sits on it, falls smoothly to 0 at its neighbours, and
 * between two seats both are partly lifted by distance — no hard cut, no dwell.
 */
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Seats in clock order starting AT 12:00 (my g), angles in [-90, 270). */
const norm = (d: number) => ((((d + 90) % 360) + 360) % 360) - 90;
export const CONVEYOR: { seat: Seat; at: number }[] = (Object.keys(SEAT_ANGLE) as Seat[])
  .map((seat) => ({ seat, at: norm(deg(SEAT_ANGLE[seat])) }))
  .sort((a, b) => a.at - b.at);

export const seatAngle = (seat: Seat) => CONVEYOR.find((c) => c.seat === seat)!.at;

/** 12:00 — my g's seat, where the conveyor docks on release. */
export const NOON = seatAngle("giver");

/**
 * Where the toggle's ring sits at give (1:30), in viewBox units: its centre
 * and outer radius. The give wordmark hangs its dotless i under it.
 */
const GEO = toggleGeometry("middle");
const GIVE_RAD = (seatAngle("give") * Math.PI) / 180;
export const GIVE_DOT = {
  x: GEO.centre.x + GEO.TRACK_R * Math.cos(GIVE_RAD),
  y: GEO.centre.y + GEO.TRACK_R * Math.sin(GIVE_RAD),
  r: GEO.EAR.outerR,
};

export type SeatBlend = { a: Seat; b: Seat; wa: number; wb: number; nearest: Seat };

export function seatBlend(angle: number): SeatBlend {
  let phi = norm(angle);
  const n = CONVEYOR.length;
  /* norm() puts 12:00 (my g, -90) first, so phi is never before the first seat. */
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

/**
 * THE GIVE WORDMARK'S PRESENCE (0..1): full on give, gone by the midpoint to
 * either neighbour, smoothstepped so it never jumps. The in-loop "giver"
 * takes the complement.
 */
export function giveMark(blend: SeatBlend): number {
  const w = blend.a === "give" ? blend.wa : blend.b === "give" ? blend.wb : 0;
  const x = Math.min(1, Math.max(0, (w - 0.6) / 0.4));
  return x * x * (3 - 2 * x);
}

/** Which feed words belong to a seat (my g and map have none of their own). */
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
 *   FLOOR = the feed's resting per-action strength.
 *   PEAK  = the strength when the toggle sits on that seat.
 * Raised for 40+ readers (design director, 28 Sep 2026) — was FLOOR
 * give .38 lend .44 trade .34 fund .25 borrow .46 wish .23, PEAK give .70
 * lend .70 trade .62 fund .55 borrow .70 wish .58. The styles.css
 * --emph-* defaults mirror FLOOR. Bright seat colours, no desaturation.
 */
export const FEED_FLOOR: Record<SignInFeedKind, number> = {
  give: 0.62,
  lend: 0.68,
  trade: 0.58,
  fund: 0.5,
  borrow: 0.7,
  wish: 0.48,
};
export const FEED_PEAK: Record<SignInFeedKind, number> = {
  give: 0.9,
  lend: 0.9,
  trade: 0.85,
  fund: 0.8,
  borrow: 0.9,
  wish: 0.82,
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
  map: "--mode-map",
};

/**
 * THE SEAT COLOUR AT THIS BLEND: the nearest seat's own token, solid. The G is
 * always one colour, so it switches to the next seat's colour in one step at
 * the midpoint between two seats; neighbouring colours are never mixed.
 */
export function seatColour(blend: SeatBlend): string {
  return `var(${MODE_VAR[blend.nearest]})`;
}
