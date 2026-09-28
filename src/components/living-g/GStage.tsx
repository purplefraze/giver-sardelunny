import { LIVING_G_BOX, LIVING_G_FRAME, LOOP_CENTRE } from "./g-path";
import { noonTop, restingTop, toggleReach } from "./g-weight";
import { dockBottom } from "./toggle-path";

/**
 * THE ONE canonical stage for every full-screen Living G.
 *
 * ONE SOURCE OF TRUTH. There is no onboarding size, no profile size and no
 * workspace size — every screen (onboarding, sample profiles, profile setup,
 * the persistent workspace) mounts this stage and inherits the exact same
 * artwork dimensions at a given viewport.
 *
 * The stage measures the ARTWORK — the canonical G silhouette — not the frame.
 * The frame is wider/taller only so the mode selector's full travel can never
 * clip; that overflow is allowed to bleed past the viewport and NEVER changes
 * the artwork's size or its horizontal centring, because the frame is symmetric
 * about the artwork's own centre line.
 */
export const FRAME_ASPECT = LIVING_G_FRAME.width / LIVING_G_FRAME.height;

/** Kept as the record of what the frame is built around. */
export const ARTWORK_ASPECT = LIVING_G_BOX.width / LIVING_G_BOX.height;

/** Kept as the record of how much of the FRAME the artwork itself occupies. */
export const BOX_W = LIVING_G_FRAME.width / LIVING_G_BOX.width;


/**
 * THE HEIGHT LIMIT'S BOTTOM ALLOWANCE. Only used inside CANONICAL_WIDTH's
 * height term (unchanged). The old padding that "reserved" it did nothing —
 * the stage box is absolutely positioned — and is gone.
 */
export const CTA_BAND = "1.25rem";
/** CTA_BAND in px (1.25rem at the 16px root). */
const CTA_BAND_PX = 20;

/**
 * WHAT MUST ACTUALLY FIT — the artwork PLUS the selector's true travel, without
 * the frame's decorative clearance. The frame keeps its full size (so nothing
 * inside it is ever repositioned), but the stage is sized against this inner
 * box, which lets the clearance bleed off-screen and the G itself grow.
 * DERIVED from the live toggle geometry (g-weight.tsx), never a stale number:
 * the ring's outer edge at lend (3:00) / borrow (9:00) is the orbit + the ring's
 * outer radius from the middle loop's centre (x 272, which is also the frame's
 * centre), so EDGE_AIR below is the exact paper between ring and screen edge.
 *   middle weight: reach 283.1 + 74.6 = 357.7 → x -85.7..629.7 (715.4 wide),
 *   y 298 − 357.7 = −59.7 (my g's ring, now a seat at 12:00) .. 1133 (the
 *   artwork's bottom; the 6:00 ring rides the middle loop, well above it —
 *   toggle-path.ts) = 1192.7 tall.
 * (Was 715.4 × 1353.4 while 6:00 docked outside the lower loop; 758 × 1218
 * before that.)
 */
const REACH = toggleReach("middle");
const NEEDED = {
  width: 2 * REACH,
  height: dockBottom("middle") - (LOOP_CENTRE.middle.y - REACH),
} as const;
const FRAME_OVER_W = LIVING_G_FRAME.width / NEEDED.width;
const FRAME_OVER_H = LIVING_G_FRAME.width / NEEDED.height;

/**
 * THE CANONICAL SIZE. As large as the geometry permits: the artwork and the
 * whole selector assembly stay visible at every point of the travel, the G
 * never moves as it travels, and only the frame's clearance may bleed.
 */
/**
 * EDGE AIR. The selector's extremes (lend at 3:00, borrow at 9:00) would
 * otherwise land exactly on the screen edges; this keeps a few px of paper
 * between the ring and each edge at every width. Layout only — g-path and
 * the seat angles are untouched.
 */
export const EDGE_AIR_PX = 8;
export const EDGE_AIR = `${EDGE_AIR_PX}px`;

/**
 * THE G'S SCALE IN PX PER VIEWBOX UNIT for a w × h screen: CANONICAL_WIDTH
 * over the frame's width, in numbers (0.52279 at 390 × 844). Anything drawn
 * outside the G that must match the G's toggle exactly (communi-gy's
 * PerimeterToggle) sizes itself with this.
 */
export const gPxPerUnit = (w: number, h: number) =>
  Math.max(0, Math.min((w - 2 * EDGE_AIR_PX) / NEEDED.width, (h - CTA_BAND_PX) / NEEDED.height));

const CANONICAL_WIDTH = `min(calc((100% - 2 * ${EDGE_AIR}) * ${FRAME_OVER_W.toFixed(5)}), calc((var(--app-h, 100dvh) - ${CTA_BAND}) * ${FRAME_OVER_H.toFixed(5)}))`;



/**
 * VERTICAL PLACE — CENTRED. The G's extent runs from its top (the toggle
 * ring's highest RESTING edge, give 1:30 / wish 10:30: viewBox y ≈ 23.2) to its
 * bottom (the bottom loop's lowest edge at the middle weight: y = 1120.5).
 * That extent is centred in the stage's height, so the paper above equals the
 * paper below — but its top never rises above G_TOP_MIN, the line 10px under
 * the "sign in" / @name seal (whose box ends at 25.55px).
 *
 * The stage box is a size container, so the same numbers CANONICAL_WIDTH uses
 * can be read in px here (cqw/cqh). The width itself is untouched.
 */
export const G_TOP_MIN = "35.5px";
/* THE EXTENT is my g's ring at 12:00 (a seat) down to the artwork's bottom:
   noonTop .. dockBottom. */
const EXTENT_OVER_W = ((dockBottom("middle") - noonTop("middle")) / LIVING_G_FRAME.width).toFixed(5);
/** CANONICAL_WIDTH, spelled in container units (identical value: the stage fills its container). */
const STAGE_W = `min(calc((100cqw - 2 * ${EDGE_AIR}) * ${FRAME_OVER_W.toFixed(5)}), calc((var(--app-h, 100dvh) - ${CTA_BAND}) * ${FRAME_OVER_H.toFixed(5)}))`;
/*
 * G_TOP places the NOON line (my g's ring top at 12:00): the extent centred,
 * never less than EDGE_AIR under the screen's top, and the give / wish ring
 * tops (restingTop, ~83 units lower) never above G_TOP_MIN (the seal line).
 * The height term of CANONICAL_WIDTH keeps the whole extent inside the
 * screen minus CTA_BAND, so the G's bottom keeps ≥ EDGE_AIR below it too.
 */
const NOON_OVER_W = ((restingTop("middle") - noonTop("middle")) / LIVING_G_FRAME.width).toFixed(5);
const G_TOP = `max(${EDGE_AIR}, calc(${G_TOP_MIN} - ${NOON_OVER_W} * ${STAGE_W}), calc((100cqh - ${EXTENT_OVER_W} * ${STAGE_W}) / 2))`;
/* As a share of the stage box's OWN height, so a translate can apply it
   (a `top` percentage would read the screen's height, not the stage's). */
const TOP_OVER_H = (((noonTop("middle") - LIVING_G_FRAME.y) / LIVING_G_FRAME.height) * 100).toFixed(4);

export function GStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" style={{ containerType: "size" }}>
      <div
        // EXPLICIT centring, not flex alignment: the frame is intentionally
        // wider than the viewport (selector clearance), and a centred flex item
        // that overflows can be nudged or shrunk by the browser. left/translate
        // pins the artwork's own centre line to the screen's centre line, and
        // shrink-0 + min-width make shrinking impossible.
        className="pointer-events-auto absolute left-1/2 shrink-0 grow-0 basis-auto"
        style={{
          top: G_TOP,
          transform: `translate(-50%, -${TOP_OVER_H}%)`,
          width: CANONICAL_WIDTH,
          minWidth: CANONICAL_WIDTH,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
