import { useState } from "react";
import { haptics } from "@/lib/haptics";

/**
 * THE PROFILE PHOTO'S OWN LIVING G TOGGLE.
 *
 * The same physical idea as the Living G's toggle, in miniature: one bead that
 * travels the rim of my photo and sits in three seats. It is never a row of
 * icons, never a menu, and never a badge count shouted in large type.
 *
 *   1:30 — messages  (RED)
 *   3:00 — sparks    (PURPLE)
 *   4:30 — sparkles  (PINK)
 *
 * FIRST TAP SELECTS. SECOND TAP OPENS. Selecting says the word; opening walks
 * into that history.
 */

export type PhotoSeat = "messages" | "sparks" | "sparkles";

export const PHOTO_SEATS: PhotoSeat[] = ["messages", "sparks", "sparkles"];

/** Clock angles, in degrees from 12 o'clock, clockwise. */
const SEAT_ANGLE: Record<PhotoSeat, number> = {
  messages: 45,
  sparks: 90,
  sparkles: 135,
};

const SEAT_COLOUR: Record<PhotoSeat, string> = {
  messages: "var(--giver-messages)",
  sparks: "var(--giver-sparks)",
  sparkles: "var(--giver-sparkles)",
};

export function ProfilePhotoToggle({
  /** Diameter of the photo circle this rides on. */
  size,
  counts,
  onOpen,
}: {
  size: number;
  counts: Record<PhotoSeat, number>;
  onOpen: (seat: PhotoSeat) => void;
}) {
  const [seat, setSeat] = useState<PhotoSeat | null>(null);
  const radius = size / 2;
  const bead = Math.max(15, Math.round(size * 0.115));

  return (
    <>
      {PHOTO_SEATS.map((s) => {
        const angle = (SEAT_ANGLE[s] - 90) * (Math.PI / 180);
        const x = radius + radius * Math.cos(angle);
        const y = radius + radius * Math.sin(angle);
        const on = seat === s;
        return (
          <button
            key={s}
            type="button"
            aria-label={`${s}${counts[s] ? `, ${counts[s]}` : ""}`}
            onClick={() => {
              /* FIRST TAP SELECTS, SECOND TAP OPENS. */
              if (on) {
                haptics.success();
                onOpen(s);
                return;
              }
              haptics.selection();
              setSeat(s);
            }}
            className="absolute flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              left: x,
              top: y,
              width: on ? bead * 1.28 : bead,
              height: on ? bead * 1.28 : bead,
              transform: "translate(-50%, -50%)",
              background: SEAT_COLOUR[s],
              opacity: on ? 1 : 0.34,
              /* THE BEAD SITS ON THE RIM, so the rim shows through around it. */
              boxShadow: "0 0 0 3px var(--giver-paper, #fff)",
            }}
          >
            {counts[s] ? (
              <span
                className="text-[9px] font-black tabular-nums"
                style={{ color: "var(--giver-paper, #fff)" }}
              >
                {counts[s] > 99 ? "99" : counts[s]}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* THE SELECTED SEAT SAYS ITS OWN WORD — quietly, beside the circle. */}
      {seat ? (
        <span
          className="absolute whitespace-nowrap text-[11px] font-black lowercase tracking-[0.26em]"
          style={{
            left: size + 14,
            top: radius + radius * Math.sin((SEAT_ANGLE[seat] - 90) * (Math.PI / 180)) - 7,
            color: SEAT_COLOUR[seat],
          }}
        >
          {seat}
        </span>
      ) : null}
    </>
  );
}
