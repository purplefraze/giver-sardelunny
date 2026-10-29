import { G_GEOMETRY } from "./g-path";

/**
 * THE SPARK RAIL — the centre line of the Living G's own stroke.
 *
 * EXACT, NEVER INVENTED. Since the 29 Oct 2026 redraw the G is constructed from
 * three true circles (G_GEOMETRY), so the rail is those circles' centre lines:
 * the middle circle, the S-curve's turn, and the bottom loop up to its cap.
 */
const rad = (d: number) => (d * Math.PI) / 180;
type C = { c: { x: number; y: number }; r: number };
const at = (k: C, deg: number) => ({ x: k.c.x + k.r * Math.cos(rad(deg)), y: k.c.y + k.r * Math.sin(rad(deg)) });

const MID = G_GEOMETRY.middle;
const S = G_GEOMETRY.s;
const BOT = G_GEOMETRY.bottom;

/**
 * THE JOURNEY, in the G's own coordinates.
 *   start  the middle loop's lower-right (52°, ~4-5 o'clock)
 *   then   COUNTERCLOCKWISE (decreasing angle, y-down) once round the middle
 *          loop to where the S-curve leaves it (S.leaveDeg, one turn on)
 *   then   the S-curve's turn (increasing angle about its own centre)
 *   then   into the lower loop, stopping at the round cap's centre (capDeg)
 */
const MID_FROM = 52;
const MID_TO = S.leaveDeg - 360;
const S_FROM = S.leaveDeg + 180;
const S_TO = S.joinDeg + 360;
const BOT_FROM = BOT.joinDeg;
const BOT_TO = BOT.capDeg - 360;

function build() {
  const parts: string[] = [];
  const f = (n: number) => Math.round(n * 10) / 10;
  const push = (p: { x: number; y: number }) => parts.push(`${parts.length ? "L" : "M"}${f(p.x)} ${f(p.y)}`);
  for (let a = MID_FROM; a > MID_TO; a -= 2) push(at(MID, a));
  push(at(MID, MID_TO));
  for (let a = S_FROM; a < S_TO; a += 2) push(at(S, a));
  push(at(S, S_TO));
  for (let a = BOT_FROM; a > BOT_TO; a -= 2) push(at(BOT, a));
  push(at(BOT, BOT_TO));
  return parts.join(" ");
}

/** The rail itself. */
export const SPARK_TRACK_D = build();

/** Where the spark is born: the middle loop's opening. */
export const SPARK_START = at(MID, MID_FROM);

/** Where the journey ends, and where the green begins to travel outward. */
export const SPARK_END = at(BOT, BOT_TO);
