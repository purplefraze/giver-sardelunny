import {
  LIVING_G_BOX,
  LIVING_G_FRAME,
  SATELLITE_ENVELOPE,
  STAGE_TOP_RESERVE,
  STAGE_WINDOW,
} from "./g-path";


/**
 * THE ONE canonical stage for every full-screen Living G.
 *
 * ONE SOURCE OF TRUTH. There is no onboarding size, no profile size and no
 * workspace size — every screen (onboarding, sample profiles, profile setup,
 * the persistent workspace) mounts this stage and inherits the exact same
 * artwork dimensions at a given viewport.
 *
 * THE WORLD IS STATIONARY. The stage measures the ARTWORK — the canonical G
 * silhouette — against the screen once, and never moves or resizes it again:
 * the selector is an independent layer drawn over the same fixed canvas, so no
 * seat, drag or label can shift the G by a single pixel.
 */

/** Kept as the record of what the frame is built around. */
export const ARTWORK_ASPECT = LIVING_G_BOX.width / LIVING_G_BOX.height;

/**
 * THE CLEAN BOTTOM BAND. The one strip of paper the artwork never enters, so a
 * bottom text action ("let's giver") can sit centred, outside the G's stroke.
 * Reserved on EVERY screen so the canonical size is identical everywhere.
 */
export const CTA_BAND = "2.6rem";

/**
 * THE WORLD FILLS THE PHONE.
 *
   * Width: the artwork takes `artworkFit` of the screen, so the sized box — which
   * is the drawing surface, not the artwork — is that much wider again.
   * Height: bounded by --app-h (a measured height) so a collapsing address bar
   * cannot resize the artwork mid-animation. Toggle controls are ignored by this
   * sizing: they are an overlay and never make the Living G smaller.
 */
const WIDTH_LIMIT = `${(
  (STAGE_WINDOW.envelopeFit * LIVING_G_FRAME.width * 100) / SATELLITE_ENVELOPE.width
).toFixed(3)}%`;
/**
 * The five satellites are not symmetrical about the artwork, so the SILHOUETTE's
 * centre line — not the frame's — is pinned to the screen's centre line.
 */
const CENTRE_OFFSET = `${(
  ((LIVING_G_FRAME.x + LIVING_G_FRAME.width / 2 - SATELLITE_ENVELOPE.centre) * 100) /
  LIVING_G_FRAME.width
).toFixed(4)}%`;
/**
 * Height is measured against the ARTWORK plus the toggle's visible ring reserve
 * only (STAGE_TOP_RESERVE) — never the selector's whole travel envelope — so the
 * toggle can never be the reason the world is small.
 */
const VERTICAL_UNITS = LIVING_G_BOX.height + STAGE_TOP_RESERVE;
const HEIGHT_LIMIT = `calc((var(--app-h, 100dvh) - ${CTA_BAND}) * ${(LIVING_G_FRAME.width / VERTICAL_UNITS).toFixed(5)})`;
const CANONICAL_WIDTH = `min(${WIDTH_LIMIT}, ${HEIGHT_LIMIT})`;


export function GStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      // The clean bottom band is reserved on EVERY screen, so the canonical
      // artwork lands at the identical size and position everywhere.
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${CTA_BAND})` }}
    >
      <div
        // A FIXED CANVAS. left/translate pins the frame's centre line to the
        // screen's centre line, once and forever: there is no state, no seat and
        // no control width in this transform, so the Living G occupies the exact
        // same pixels in every selector state and throughout a drag.
        className="pointer-events-auto absolute bottom-0 left-1/2 shrink-0 grow-0 basis-auto"
        style={{
          width: CANONICAL_WIDTH,
          minWidth: CANONICAL_WIDTH,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
          transform: `translateX(calc(-50% + ${CENTRE_OFFSET}))`,
        }}
      >

        {children}
      </div>
    </div>
  );
}
