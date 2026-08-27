import { LIVING_G_BOX, LIVING_G_FRAME } from "./g-path";

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
 * THE CLEAN BOTTOM BAND. The one strip of paper the artwork never enters, so a
 * bottom text action ("let's giver") can sit centred, outside the G's stroke.
 * Reserved on EVERY screen so the canonical size is identical everywhere. Kept
 * as tight as the text itself needs, because every unit here shrinks the G.
 */
export const CTA_BAND = "2rem";

/**
 * WHAT MUST ACTUALLY FIT — the artwork PLUS the selector's true travel, without
 * the frame's decorative clearance. The frame keeps its full size (so nothing
 * inside it is ever repositioned), but the stage is sized against this inner
 * box, which lets the clearance bleed off-screen and the G itself grow.
 *   selector extremes measured in g-path: x -107..651, y -85..1133
 */
const NEEDED = { width: 758, height: 1218 } as const;
const FRAME_OVER_W = LIVING_G_FRAME.width / NEEDED.width;
const FRAME_OVER_H = LIVING_G_FRAME.width / NEEDED.height;

/**
 * THE CANONICAL SIZE. As large as the geometry permits: the artwork and the
 * whole selector assembly stay visible at every point of the travel, the G
 * never moves as it travels, and only the frame's clearance may bleed.
 */
const CANONICAL_WIDTH = `min(calc(100% * ${FRAME_OVER_W.toFixed(5)}), calc((var(--app-h, 100dvh) - ${CTA_BAND}) * ${FRAME_OVER_H.toFixed(5)}))`;



export function GStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      // The clean bottom band is reserved on EVERY screen, so the canonical
      // artwork lands at the identical size and position everywhere.
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${CTA_BAND})` }}
    >
      <div
        // EXPLICIT centring, not flex alignment: the frame is intentionally
        // wider than the viewport (selector clearance), and a centred flex item
        // that overflows can be nudged or shrunk by the browser. left/translate
        // pins the artwork's own centre line to the screen's centre line, and
        // shrink-0 + min-width make shrinking impossible.
        className="pointer-events-auto absolute bottom-0 left-1/2 shrink-0 grow-0 basis-auto -translate-x-1/2"
        style={{
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
