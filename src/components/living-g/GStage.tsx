import {
  LIVING_G_BOX,
  LIVING_G_FRAME,
  STAGE_OVERDRAW,
  STAGE_PAN_VAR,
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
 * THE WORLD IS SIZED FIRST. The stage measures the ARTWORK — the canonical G
 * silhouette — against the screen, and the frame's extra room for the selector's
 * travel is simply allowed to bleed past the edges. Sizing the whole envelope
 * instead would cost the world a third of its width on a phone; keeping the
 * toggles reachable is the camera's job, not the world's (see stagePanPercent).
 */
const FRAME_ASPECT = LIVING_G_FRAME.width / LIVING_G_FRAME.height;

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
 * cannot resize the artwork mid-animation. On tall/narrow phones width wins and
 * the world is as big as the glass allows; on short/wide screens height wins and
 * the whole frame, selector travel included, fits with room to spare.
 */
const WIDTH_LIMIT = `${(STAGE_WINDOW.artworkFit * STAGE_OVERDRAW * 100).toFixed(3)}%`;
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
        // EXPLICIT centring, not flex alignment: left/translate pins the frame's
        // centre line to the screen's centre line, while shrink-0 + min-width
        // make shrinking impossible. The pan rides in the SAME transform, in
        // percentages of this box, so the camera can slide the world sideways
        // just far enough to bring a live toggle inside the glass.
        className="pointer-events-auto absolute bottom-0 left-1/2 shrink-0 grow-0 basis-auto"
        style={{
          width: CANONICAL_WIDTH,
          minWidth: CANONICAL_WIDTH,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
          transform: `translateX(calc(-50% + var(${STAGE_PAN_VAR}, 0%)))`,
          transition: "transform 140ms cubic-bezier(0.22, 0.9, 0.24, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
