// LIVING G — REDRAWN 29 Oct 2026 to Frazer's reference
// /workspace/giver-g/frazer_reference_2026-09-28.jpg (Sep 28 phone screenshot of
// the orange G; text, background and the trade ring ignored). This replaces the
// old IMG_2366 trace. Geometry is LOCKED to that reference: change it only with
// Frazer's explicit approval.
//
// CONSTRUCTED, NOT TRACED: one line of even weight built from three true
// circles joined tangent-continuously (G_GEOMETRY below), so the stroke has one
// thickness everywhere. The filled outline carries the stroke at the baked
// weight G_GEOMETRY.stroke (53.5 units, = G_STROKE.normal); the paint layers
// erode it evenly to the drawn weight (see g-weight.tsx).
//   middle  closed circle, centre (272,298), centre-line radius 169.75
//   S-curve leaves the middle circle at 76.79° (≈5:30) on a circle of radius 57.39
//           about (323.91,519.13), turning the other way
//   bottom  joins at 280.34° and runs round to a round cap at -58° (≈1 o'clock),
//           centre (270,814.65), centre-line radius 243 — the open upper-right gap
// The small top ring of the old trace is gone: the toggle (seat marker) is a
// separate piece that rides the middle loop (EarSelector / toggle-path.ts).
// SPACING FIX (29 Oct 2026): the middle-to-lower gap closed from 99 to 50.4 units
// (outer edges 494.5 / 544.9) so the visible gap is ≈0.245 of the middle loop's
// outer width, as in the reference; the bottom loop moved up 48.6 and the box
// is 1084.4 tall. The flip transform still uses 1133 (authoring space only).
// Authored in potrace space (×10, y flipped) so the existing flip transform and
// every erosion mask (×10 stroke widths) keep working unchanged.
// ONE OUTLINE, NO INNER EDGES: the outline is the true union (outer contour +
// the middle hole), because the erosion masks stroke every edge of the path; an
// edge lying inside the ink (an overlap seam) would be eaten as a gap.
export const LIVING_G_PATH = "M3835.4 6732.3A1965 1965 0 1 1 3169 6437A306.4 306.4 0 1 0 3184.1 5837.2A2697.5 2697.5 0 1 1 4129.5 5471.1A267.5 267.5 0 0 1 3846 5017.4A2162.5 2162.5 0 1 0 3088.1 5310.9A841.4 841.4 0 0 1 3835.4 6732.3ZM4150 8350A1430 1430 0 1 0 1290 8350A1430 1430 0 1 0 4150 8350Z";

/** The constructed centre-line geometry of the G, in viewBox units. */
export const G_GEOMETRY = {
  stroke: 53.5,
  middle: { c: { x: 272, y: 298 }, r: 169.75 },
  s: { c: { x: 323.91, y: 519.13 }, r: 57.39, leaveDeg: 76.79, joinDeg: 100.34 },
  bottom: { c: { x: 270, y: 814.65 }, r: 243, joinDeg: -79.66, capDeg: -58 },
} as const;

/** The artwork's own box. Never scaled or moved. */
export const LIVING_G_BOX = { x: 0, y: 0, width: 576, height: 1084.4 } as const;

/**
 * The FRAME: the artwork's box plus the room the mode selector's assembly needs
 * across its ENTIRE travel around the middle loop (ring centre orbit radius 300
 * about (272,298), ring outer radius 79 → x -107..651, y -81..), plus a small
 * CLEARANCE so the ring is never flush with the edge at the extremes. The frame
 * is derived from the selector's TRUE extremes (x -107..651 plus 10 units of
 * clearance = -117..661), NOT from a symmetric artwork-centred box: the frame
 * centre (x = 272) sits left of the artwork centre (x = 288), so centring the
 * frame on screen gives the G a small CONSTANT rightward offset and lets it be
 * as large as the geometry permits. It is FIXED: it never
 * depends on where the selector currently sits. Nothing decorative lives here:
 * every extra unit shrinks the G on screen.
 */
export const LIVING_G_FRAME = { x: -117, y: -95, width: 778, height: 1179.4 } as const;



/** Path space (after the flip transform) */
export const LIVING_G_VIEWBOX = `${LIVING_G_FRAME.x} ${LIVING_G_FRAME.y} ${LIVING_G_FRAME.width} ${LIVING_G_FRAME.height}`;
export const LIVING_G_TRANSFORM = "translate(0,1133) scale(0.1,-0.1)";

/**
 * The three regions, named. Internal keys stay top / middle / bottom.
 *   top     the TOGGLE: the movable seat marker riding the middle loop
 *           (home 1:30 = give); its label follows its seat.
 *   middle  the middle loop (the upper big circle of the drawn G)
 *   bottom  communi-g, the community loop (the lower big loop)
 */
export const G_REGION_NAMES = { top: "toggle", middle: "middle", bottom: "communi-g" } as const;

/** The toggle's home seat (1:30, give) on its orbit: rim 196.5 + gap 24.5 + ring 79 = 300. */
const TOGGLE_HOME = { x: 272 + 300 * Math.SQRT1_2, y: 298 - 300 * Math.SQRT1_2 };

/** Feature centres in viewBox space (label / content placement, swell origins). */
export const G_ANCHORS = {
  toggle: TOGGLE_HOME,
  middle: { x: 272, y: 298 },
  communiG: { x: 270, y: 814.65 },
} as const;

/**
 * Invisible hit bands, in viewBox space, split at the drawn shape:
 *   toggle    above the middle circle (y < 101.5) — the toggle at home sits here
 *   middle    the middle circle down through the S-curve's upper half (to 570)
 *   communi-g the bottom loop (outer top 544.9) down to the box's foot
 */
export const G_REGION_BANDS = {
  top: { x: 0, y: 0, width: 576, height: 100 },
  middle: { x: 0, y: 100, width: 576, height: 420 },
  bottom: { x: 0, y: 520, width: 576, height: 564.4 },
} as const;

/**
 * Largest circle that fits inside each loop's negative space, pulled in for
 * breathing room. CONTENT-ONLY constants: they never affect geometry.
 *   top     the toggle ring's hole (inner 50)
 *   middle  inner edge 143 (169.75 − 26.75)
 *   bottom  inner edge 216.25 (243 − 26.75)
 */
export const LOOP_SAFE_RADIUS = {
  top: 40,
  middle: 122,
  bottom: 180,
} as const;

/**
 * The lower loop's white opening (exact: a circle of radius 216.25). Typography
 * may read it; artwork may not.
 */
export const BOTTOM_LOOP_INTERIOR = {
  cx: 270,
  cy: 814.65,
  rx: 216.25,
  ry: 216.25,
  /** Clear paper retained between painted glyphs and the coloured stroke. */
  inset: 15,
} as const;

/**
 * Centre of each loop's negative space. CONTENT-ONLY: in-loop typography is
 * centred here. top = the toggle at its home seat.
 */
export const LOOP_CENTRE = {
  top: TOGGLE_HOME,
  middle: { x: 272, y: 298 },
  bottom: { x: 270, y: 814.65 },
} as const;

/** OUTER rim radius of each loop's stroke (exact, at the baked 53.5 weight). */
export const LOOP_RIM_RADIUS = {
  top: 79,
  middle: 196.5,
  bottom: 269.75,
} as const;

/**
 * THE TOGGLE (seat marker), authored: a ring and a stem riding the middle
 * loop. It is NOT part of the letterform.
 *   home      the ring centre at its home seat (1:30)
 *   innerR/outerR   ring hole and outer edge
 *   stemWidth width of the stem that joins it to the middle loop
 *   gap       clearance between the middle loop's rim and the ring's outer edge
 */
export const EAR_GEOMETRY = {
  home: TOGGLE_HOME,
  innerR: 50,
  outerR: 79,
  stemWidth: 34,
  gap: 24.5,
  cutR: 100,
  cutStemWidth: 54,
} as const;

/**
 * THE STATIC EAR CUT. The redrawn G has no ear, so this wedge (upper right of
 * the middle circle) now removes nothing but the middle rim's own arc, which
 * RIM_PATCH redraws as the IDENTICAL circle (169.75, 53.5 wide). Kept so the
 * render stack is unchanged.
 */
export const EAR_CUT = { a0: -64, a1: -24, r0: 184, r1: 440 } as const;

/** THE RIM PATCH — exactly the middle circle's stroke (169.75 ± 26.75). */
export const RIM_PATCH = {
  a0: -80,
  a1: -8,
  rMid: 169.75,
  width: 53.5,
} as const;

type Pt = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const on = (c: Pt, deg: number, r: number): Pt => ({
  x: c.x + r * Math.cos(rad(deg)),
  y: c.y + r * Math.sin(rad(deg)),
});

/** An annular wedge (used only as a MASK shape, never as visible artwork). */
export function wedgePath(c: Pt, a0: number, a1: number, r0: number, r1: number) {
  const p0 = on(c, a0, r0);
  const p1 = on(c, a1, r0);
  const p2 = on(c, a1, r1);
  const p3 = on(c, a0, r1);
  const big = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x} ${p0.y} A${r0} ${r0} 0 ${big} 1 ${p1.x} ${p1.y} L${p2.x} ${p2.y} A${r1} ${r1} 0 ${big} 0 ${p3.x} ${p3.y} Z`;
}

/** A plain circular arc, stroked to become a segment of a loop's own rim. */
export function arcPath(c: Pt, a0: number, a1: number, r: number) {
  const p0 = on(c, a0, r);
  const p1 = on(c, a1, r);
  const big = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x} ${p0.y} A${r} ${r} 0 ${big} 1 ${p1.x} ${p1.y}`;
}
