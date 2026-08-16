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
          width: `min(100%, calc(100dvh * ${FRAME_ASPECT.toFixed(5)}))`,
          aspectRatio: `${LIVING_G_FRAME.width} / ${LIVING_G_FRAME.height}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
