import { LIVING_G_BOX, LIVING_G_FRAME } from "./g-path";

/**
 * THE canonical stage for every full-screen Living G.
 *
 * ONE scale system, everywhere. The stage lays out the FRAME — the artwork plus
 * exactly the room the mode selector needs across its full travel — as large as
 * the usable viewport allows, so NOTHING (ring, arm, word or seat) can ever clip
 * at a screen edge.
 *
 * The frame is symmetric about the artwork's own centre line, so centring the
 * frame keeps the canonical G perfectly horizontally centred. Vertically the
 * frame carries its overflow ABOVE the artwork only, which lands the G slightly
 * lower in the viewport — using the space that used to be wasted underneath and
 * buying the selector clearance overhead.
 *
 * The G stays viewport-dominant: at 402x645 the artwork still stands ~576px
 * tall, essentially the size it has always been.
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
 */
export const CTA_BAND = "2.6rem";


export function GStage({
  children,
  /**
   * DOMINANT: no mode selector on screen (the opening onboarding), so the frame
   * is allowed to bleed past the viewport and the ARTWORK — not the frame — is
   * measured. This is the canonical huge G: ~94% of the viewport height.
   */
  dominant = false,
}: {
  children: React.ReactNode;
  dominant?: boolean;
}) {
  if (dominant) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-end justify-center"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${CTA_BAND})` }}
      >
        <div
          className="pointer-events-auto shrink-0"
          style={{
            // Artwork target: 94% of the usable height (viewport minus the clean
            // CTA band), 96% of viewport width. shrink-0 is LOAD-BEARING: the
            // frame is WIDER than the artwork on purpose so the selector can
            // never clip, and a flex child would otherwise be shrunk to the
            // container width — silently reducing the canonical G every time the
            // frame grew.
            width: `min(${(96 * BOX_W).toFixed(3)}vw, calc((100dvh - ${CTA_BAND}) * 0.99 * ${(BOX_H * FRAME_ASPECT).toFixed(5)}))`,
            aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
          }}
        >
          {children}
        </div>
      </div>
    );
  }


  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-end justify-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.35rem)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div
        className="pointer-events-auto"
        style={{
          // The frame already CONTAINS the selector's full travel, so it may use
          // the whole usable width: this is the canonical G at the largest size
          // that still guarantees nothing clips. Every full-size Living G —
          // workspace, profile setup, sample profiles — is measured here.
          width: `min(100%, calc(100dvh * ${FRAME_ASPECT.toFixed(5)} * 0.995))`,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

