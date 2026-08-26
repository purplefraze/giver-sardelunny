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
const FRAME_ASPECT = LIVING_G_FRAME.width / LIVING_G_FRAME.height;

/** Kept as the record of what the frame is built around. */
export const ARTWORK_ASPECT = LIVING_G_BOX.width / LIVING_G_BOX.height;

/** How much of the FRAME the artwork itself occupies. */
const BOX_W = LIVING_G_FRAME.width / LIVING_G_BOX.width;
const BOX_H = LIVING_G_FRAME.height / LIVING_G_BOX.height;

/**
 * THE CLEAN BOTTOM BAND. The one strip of paper the artwork never enters, so a
 * bottom text action ("let's giver") can sit centred, outside the G's stroke.
 * Reserved on EVERY screen so the canonical size is identical everywhere.
 */
export const CTA_BAND = "2.6rem";

/**
 * THE CANONICAL SIZE. The FRAME — artwork plus the selector's full travel and
 * its clearance — is what must fit the viewport, so the whole selector assembly
 * is visible at every point of its travel and the G never moves as it travels.
 * The G is therefore as large as it can be while that holds: the frame takes the
 * full usable width, or the full usable height, whichever binds first.
 */
const CANONICAL_WIDTH = `min(100%, calc((var(--app-h, 100dvh) - ${CTA_BAND}) * 0.99 * ${FRAME_ASPECT.toFixed(5)}))`;


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
