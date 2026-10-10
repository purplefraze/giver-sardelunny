import { EAR_GEOMETRY, LIVING_G_BOX, LIVING_G_PATH, LIVING_G_TRANSFORM, LOOP_CENTRE, LOOP_RIM_RADIUS } from "./g-path";

/**
 * THE G'S STROKE WEIGHT — without touching the traced path.
 *
 * The canonical path (g-path.ts) is a filled outline whose stroke is baked in:
 * the middle loop measures 53.5 units (inner 143, outer 196.5). The MIDDLE
 * weight is 28.5 units. It is drawn by ERODING the same outline evenly on both
 * sides: a luminance mask of the path, filled white and stroked black
 * (round joins) at twice the per-side reduction. The path data never changes;
 * every contour (outer edge and every loop's inner edge) moves in by the same
 * 12.5 units, so the loops' centre lines, the S-curve and the G's scale stay
 * exactly where they were.
 *
 *   per side   (53.5 − 28.5) / 2 = 12.5 units
 *   mask stroke  2 × 12.5 = 25 units = 250 in potrace space (× 0.1 transform)
 */
export type GWeight = "normal" | "middle";

export const G_STROKE = { normal: 53.5, middle: 28.5 } as const;

/** How far each edge of the stroke moves in at a weight (units). */
export const strokeInset = (weight: GWeight = "normal") =>
  (G_STROKE.normal - G_STROKE[weight]) / 2;

/** The middle loop's outer rim at a weight (196.5 → 184 at middle). */
export const rimRadius = (weight: GWeight = "normal") => LOOP_RIM_RADIUS.middle - strokeInset(weight);

/**
 * THE TOGGLE PIECE at each weight (ring outer/inner radius, stem width, units).
 *   normal   the traced ear: outer 79, inner 50 (29-unit ring), stem 34.
 *   middle   THIN-TOGGLE VARIANT A, set so that at 390px (scale 0.52279
 *            px/unit, see GStage) the ring is 78px across with a 9px stroke
 *            and the stem is ~10.5px: outer 74.6 (149.2 across), stroke 17.2,
 *            inner 57.4, stem 20. All scale with the G.
 */
export const TOGGLE = {
  normal: { outerR: EAR_GEOMETRY.outerR, innerR: EAR_GEOMETRY.innerR, stemWidth: EAR_GEOMETRY.stemWidth },
  middle: { outerR: 74.6, innerR: 57.4, stemWidth: 20 },
} as const;

/**
 * The toggle's orbit: rim + the unchanged 24.5 white gap + the ring's outer
 * radius. normal 196.5 + 24.5 + 79 = 300; middle 184 + 24.5 + 74.6 = 283.1.
 */
export const trackRadius = (weight: GWeight = "normal") =>
  rimRadius(weight) + EAR_GEOMETRY.gap + TOGGLE[weight].outerR;

/** How far the toggle assembly reaches from the middle loop's centre (orbit + ring). */
export const toggleReach = (weight: GWeight = "normal") => trackRadius(weight) + TOGGLE[weight].outerR;

/**
 * The toggle ring's HIGHEST RESTING top edge (give 1:30 / wish 10:30, ±45°
 * from 12:00) in viewBox units. 12:00 is not a seat; mid-drag the ring passes
 * above this.
 */
export const restingTop = (weight: GWeight = "normal") =>
  LOOP_CENTRE.middle.y - trackRadius(weight) * Math.SQRT1_2 - TOGGLE[weight].outerR;

/** The toggle ring's top edge when dragged through 12:00 (not a seat). */
export const noonTop = (weight: GWeight = "normal") => LOOP_CENTRE.middle.y - toggleReach(weight);

/**
 * The G's lowest painted point (the bottom loop's outer edge) in viewBox units.
 * The traced outline's lowest point is y ≈ 1132.5 (box 1133); eroding moves
 * that convex edge up by exactly the per-side inset: 1120.5 at middle.
 */
export const gBottom = (weight: GWeight = "normal") => LIVING_G_BOX.height - strokeInset(weight);

/**
 * The erosion mask, in potrace space. Reference it from an element drawn in
 * the same space (inside a LIVING_G_TRANSFORM group), or pass `transformed`
 * to draw it in viewBox space.
 */
export function GThinMask({ id, weight, transformed = false, middleWidth }: { id: string; weight: GWeight; transformed?: boolean; middleWidth?: number }) {
  const w = strokeInset(weight) * 2 * 10;
  const path = (
    <>
      <path d={LIVING_G_PATH} fill="#fff" stroke="#000" strokeWidth={w} strokeLinejoin="round" />
      {middleWidth !== undefined ? <>
        <defs><clipPath id={`${id}-middle-band`}><rect x="-4000" y="5730" width="16000" height="10000" /></clipPath></defs>
        <path d={LIVING_G_PATH} fill="none" stroke="#000" strokeWidth={(G_STROKE.normal - middleWidth) * 10} strokeLinejoin="round" clipPath={`url(#${id}-middle-band)`} />
      </> : null}
    </>
  );
  return transformed ? (
    <mask id={id} maskUnits="userSpaceOnUse" x={-400} y={-400} width={1600} height={2000}>
      <g transform={LIVING_G_TRANSFORM}>{path}</g>
    </mask>
  ) : (
    <mask id={id} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={16000} height={20000}>
      {path}
    </mask>
  );
}
