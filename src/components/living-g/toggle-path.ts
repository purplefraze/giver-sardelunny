import { LIVING_G_BOX, LOOP_CENTRE } from "./g-path";
import { TOGGLE, trackRadius, type GWeight } from "./g-weight";

/**
 * THE TOGGLE'S PATH — THE MIDDLE LOOP'S ORBIT, AND NOTHING ELSE.
 *
 * The toggle rides the middle loop only: one circle about the middle loop's
 * centre at the orbit radius (rim + the 24.5 white gap + the ring's outer
 * radius), at every seat. 6:00 (map / communi-g) is 6 o'clock on that
 * circle, at the bottom of the middle loop where it meets the bottom loop;
 * the toggle is never on or below the bottom loop.
 *
 * The path is parametrised by the polar angle about LOOP_CENTRE.middle
 * (degrees or radians, SVG sense), so seat angles, drag (finger angle about
 * the centre, short way round), snapping and the colour / emphasis blends
 * all read the same angle. Arc length is exposed for anything that must
 * travel at an even speed (the email step's drift); on a circle it is
 * proportional to the angle.
 */

export type TrackPose = {
  /** The ring's centre. */
  x: number;
  y: number;
  /** Unit OUTWARD normal: from the G towards the ring. */
  nx: number;
  ny: number;
  /** The outward normal as an angle (degrees, SVG sense) — the piece's rotation. */
  deg: number;
};

export type TogglePath = {
  /** The pose at a polar angle about the middle loop's centre (DEGREES, any turn). */
  poseDeg: (deg: number) => TrackPose;
  /** The same, in RADIANS. */
  pose: (rad: number) => TrackPose;
  /** Arc length from 12:00 (clockwise) at a polar angle (degrees, any turn; 0..length). */
  arcAt: (deg: number) => number;
  /** The polar angle (degrees, in [-90, 270)) at an arc length (any, wraps). */
  degAt: (s: number) => number;
  length: number;
  /** The ring's lowest outer edge (at 6:00), viewBox y. */
  bottom: number;
  /** The path itself (the ring-centre line) as SVG path data — debug / stills. */
  d: string;
};

const C1 = LOOP_CENTRE.middle;
const norm = (d: number) => ((((d + 90) % 360) + 360) % 360) - 90;

function build(weight: GWeight): TogglePath {
  const r = trackRadius(weight);
  const length = 2 * Math.PI * r;
  const poseDeg = (deg: number): TrackPose => {
    const a = (deg * Math.PI) / 180;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: C1.x + r * nx, y: C1.y + r * ny, nx, ny, deg: norm(deg) };
  };
  return {
    poseDeg,
    pose: (rad: number) => poseDeg((rad * 180) / Math.PI),
    arcAt: (deg: number) => ((norm(deg) + 90) / 360) * length,
    degAt: (s: number) => ((((s % length) + length) % length) / length) * 360 - 90,
    length,
    bottom: C1.y + r + TOGGLE[weight].outerR,
    d: `M${C1.x} ${C1.y - r} a${r} ${r} 0 1 1 0 ${2 * r} a${r} ${r} 0 1 1 0 ${-2 * r} Z`,
  };
}

const cache = new Map<GWeight, TogglePath>();
/** The toggle's path at a stroke weight (memoised; pure). */
export function togglePath(weight: GWeight = "normal"): TogglePath {
  let p = cache.get(weight);
  if (!p) {
    p = build(weight);
    cache.set(weight, p);
  }
  return p;
}

/**
 * The lowest point the G's full resting extent reaches, in viewBox units:
 * the artwork's bottom (the toggle's 6:00 ring sits well above it, on the
 * middle loop), so the stage fits the G itself (1133).
 */
export const dockBottom = (weight: GWeight = "normal") =>
  Math.max(togglePath(weight).bottom, LIVING_G_BOX.height);
