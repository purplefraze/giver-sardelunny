import { LOOP_CENTRE } from "./g-path";

/**
 * THE SPARK RAIL — the centre line of the Living G's own stroke.
 *
 * MEASURED, NEVER INVENTED. The two radius tables below were ray-cast against
 * the canonical filled path (`LIVING_G_PATH`) with `isPointInFill`, from each
 * loop's measured optical centre, at 8° steps starting at -180°. Each value is
 * the MIDDLE of that loop's ink at that angle — i.e. the rail a bead would ride
 * if it sat inside the stroke.
 *
 * READ-ONLY measurement, exactly like LOOP_RIM_RADIUS: the canonical geometry is
 * never edited, moved or redrawn to make the rail. The rail is derived FROM it.
 */
const MID_R: readonly number[] = [
  170, 169, 169, 169, 169, 169, 169, 169, 169, 170, 170, 170, 170, 170, 170, 170,
  170, 170, 172, 170, 171, 171, 171, 172, 172, 172, 172, 172, 171, 171, 170, 170,
  181, 179, 178, 178, 178, 177, 177, 175, 174, 173, 172, 171, 171,
];

const BOT_R: readonly number[] = [
  242, 242, 242, 242, 243, 244, 245, 247, 248, 249, 250, 250, 251, 259, 242, 246,
  245, 244, 244, 244, 243, 243, 243, 244, 245, 246, 248, 251, 253, 257, 259, 261,
  263, 264, 263, 263, 261, 259, 256, 253, 251, 248, 245, 244, 243,
];

const STEP = 8;

/** Median of three, so a spine junction can never dent the rail. */
function smooth(table: readonly number[], i: number) {
  const n = table.length;
  const a = table[(i - 1 + n) % n]!;
  const b = table[i % n]!;
  const c = table[(i + 1) % n]!;
  return a + b + c - Math.min(a, b, c) - Math.max(a, b, c);
}

/** The measured stroke-centre radius at any angle, linearly interpolated. */
function radius(table: readonly number[], deg: number, lo: number, hi: number) {
  const k = (((deg + 180) % 360) + 360) % 360 / STEP;
  const i = Math.floor(k);
  const f = k - i;
  const r = smooth(table, i) * (1 - f) + smooth(table, i + 1) * f;
  return Math.min(hi, Math.max(lo, r));
}

const rad = (d: number) => (d * Math.PI) / 180;

function ride(
  centre: { x: number; y: number },
  table: readonly number[],
  deg: number,
  lo: number,
  hi: number,
) {
  const r = radius(table, deg, lo, hi);
  return { x: centre.x + r * Math.cos(rad(deg)), y: centre.y + r * Math.sin(rad(deg)) };
}

/**
 * THE JOURNEY, in the G's own coordinates.
 *
 *   start  the middle loop's lower-right edge (~4-5 o'clock), where the bowl
 *          begins narrowing toward the S-curve
 *   then   COUNTERCLOCKWISE around the middle loop (decreasing angle, y-down):
 *          right side, top, left side, back down to the lower right
 *   then   through the connecting S-curve
 *   then   into the lower loop, stopping at its upper-right edge (~1-2 o'clock)
 */
const MID_FROM = 52; // lower-right of the bowl: where the journey begins
const MID_TO = -298; // = 62°, the spine junction, one full turn later
const BOT_FROM = -84; // where the spine meets the lower loop
const BOT_TO = -48; // upper-right of the lower loop: the destination


function build() {
  const parts: string[] = [];
  const f = (n: number) => Math.round(n * 10) / 10;

  const first = ride(LOOP_CENTRE.middle, MID_R, MID_FROM, 166, 174);
  parts.push(`M${f(first.x)} ${f(first.y)}`);
  for (let a = MID_FROM - 2; a >= MID_TO; a -= 2) {
    const p = ride(LOOP_CENTRE.middle, MID_R, a, 166, 174);
    parts.push(`L${f(p.x)} ${f(p.y)}`);
  }

  // The spine, as one smooth curve between the two measured junctions. Its
  // control points sit on the spine's own measured ink centre (x ~ 380).
  const enter = ride(LOOP_CENTRE.bottom, BOT_R, BOT_FROM, 240, 266);
  parts.push(`C374 486 383 545 ${f(enter.x)} ${f(enter.y)}`);

  for (let a = BOT_FROM - 2; a >= BOT_TO; a -= 2) {
    const p = ride(LOOP_CENTRE.bottom, BOT_R, a, 240, 266);
    parts.push(`L${f(p.x)} ${f(p.y)}`);
  }

  return parts.join(" ");
}

/** The rail itself. Built once from the measurements above. */
export const SPARK_TRACK_D = build();

/** Where the spark is born: the middle loop's opening. */
export const SPARK_START = ride(LOOP_CENTRE.middle, MID_R, MID_FROM, 166, 174);

/** Where the journey ends, and where the green begins to travel outward. */
export const SPARK_END = ride(LOOP_CENTRE.bottom, BOT_R, BOT_TO, 240, 266);
