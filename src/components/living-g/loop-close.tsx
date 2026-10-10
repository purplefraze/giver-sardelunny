import { LOOP_CENTRE } from "./g-path";
import { G_STROKE } from "./g-weight";

/**
 * THE MIDDLE LOOP IS CLOSED (Frazer, 28 Sep 2026).
 *
 * The traced artwork (g-path.ts, locked) leaves a narrow opening in the
 * middle loop's stroke between about 4:30 and 5:30, where the S-curve leaves
 * the loop. On the full G the middle loop always reads as one closed ring, so
 * the opening is bridged AT RENDER TIME with one short band of the loop's own
 * stroke, at the weight being drawn. The path data is never edited.
 *
 * The band follows the traced stroke's measured centre line (ray-cast from
 * the loop's centre with isPointInFill): 170.75 units on the right-hand side
 * (inner 144.5, outer 197 at 40–50°) easing to 177.75 along the bottom
 * (inner 150, outer 205.5 at 80–90°), where the bowl sits a little lower.
 * Both ends are buried in existing ink, so there is no step at either join,
 * and the S-curve still leaves the loop in one line.
 *
 * The bottom loop keeps its opening: this touches the middle loop only.
 */
export const MIDDLE_CLOSE = {
  /** Degrees in SVG space (0 = 3 o'clock, clockwise). Both ends sit in ink. */
  from: 38,
  to: 88,
  /** The centre line eases from `rFrom` (by `easeFrom`) to `rTo` (by `easeTo`). */
  rFrom: 170.75,
  rTo: 177.75,
  easeFrom: 50,
  easeTo: 78,
} as const;

/** The band's centre line as a polyline, one point per degree. */
const CLOSE_PATH = (() => {
  const c = LOOP_CENTRE.middle;
  const m = MIDDLE_CLOSE;
  const pts: string[] = [];
  for (let d = m.from; d <= m.to; d += 1) {
    const t = Math.min(1, Math.max(0, (d - m.easeFrom) / (m.easeTo - m.easeFrom)));
    const r = m.rFrom + (m.rTo - m.rFrom) * t * t * (3 - 2 * t);
    const a = (d * Math.PI) / 180;
    pts.push(`${(c.x + r * Math.cos(a)).toFixed(2)} ${(c.y + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}`;
})();

/** The stroke width at each weight (heavy adds its 22-unit outline). */
const CLOSE_WIDTH = {
  normal: G_STROKE.normal,
  middle: G_STROKE.middle,
  heavy: G_STROKE.normal + 22,
} as const;

export function MiddleLoopClose({
  weight = "normal",
  fill = "var(--world-g)",
  strokeWidth,
}: {
  weight?: keyof typeof CLOSE_WIDTH;
  fill?: string;
  strokeWidth?: number;
}) {
  return (
    <path
      d={CLOSE_PATH}
      fill="none"
      stroke={fill}
      strokeWidth={strokeWidth ?? CLOSE_WIDTH[weight]}
      strokeLinecap="butt"
      strokeLinejoin="round"
      pointerEvents="none"
      data-middle-close=""
    />
  );
}
