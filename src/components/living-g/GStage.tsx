import { LIVING_G_BOX, LIVING_G_FRAME } from "./g-path";

/**
 * THE canonical stage for every full-screen Living G.
 *
 * ONE scale system, everywhere, and it is sized by THE ARTWORK — not by the
 * frame: the G's own silhouette takes up to 94% of the usable viewport height
 * (or 96% of its width, whichever binds first), with its locked aspect ratio
 * preserved. The frame's small selector overflow is added OUTSIDE that
 * measurement, so padding can never shrink the G.
 *
 * Huge, never cropped. Surrounding content adapts around it — the G never
 * shrinks to make room, because it is positioned independently of page content.
 */
const W = LIVING_G_FRAME.width / LIVING_G_BOX.width; // frame width per artwork width
const ART_ASPECT = LIVING_G_BOX.width / LIVING_G_BOX.height;

/**
 * CENTRE THE ARTWORK, NEVER THE FRAME. The frame's selector overflow is
 * asymmetric (more room on the left than the right), so flex-centring the frame
 * would push the canonical G to the right. These offsets move the frame so the
 * CANONICAL BOX's centre lands exactly on the stage centre — pure positioning,
 * no effect on scale.
 */
const ART_CX = LIVING_G_BOX.x + LIVING_G_BOX.width / 2;
const ART_CY = LIVING_G_BOX.y + LIVING_G_BOX.height / 2;
const FRAME_CX = LIVING_G_FRAME.x + LIVING_G_FRAME.width / 2;
const FRAME_CY = LIVING_G_FRAME.y + LIVING_G_FRAME.height / 2;
const SHIFT_X = -((ART_CX - FRAME_CX) / LIVING_G_FRAME.width) * 100;
const SHIFT_Y = -((ART_CY - FRAME_CY) / LIVING_G_FRAME.height) * 100;

export function GStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div
        className="pointer-events-auto"
        style={{
          // artwork width = min(96% of stage width, 94dvh * artwork aspect)
          width: `min(${(96 * W).toFixed(3)}%, calc(94dvh * ${(ART_ASPECT * W).toFixed(5)}))`,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
          transform: `translate(${SHIFT_X.toFixed(4)}%, ${SHIFT_Y.toFixed(4)}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

