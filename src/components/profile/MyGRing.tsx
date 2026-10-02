import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * MY PROFILE. Closed blue rail. The bead is the control.
 * It follows the thumb in screen space. The ring does not scale or pan.
 * Snap only on release. My G at 6 o'clock is the exit.
 */

const BLUE = "#2F6FED";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";

const SEATS = [
  { id: "me", word: "me", at: 0 },
  { id: "activity", word: "activity", at: 45 },
  { id: "messages", word: "messages", at: 90 },
  { id: "settings", word: "settings", at: 135 },
  { id: "myg", word: "my g", at: 180 },
  { id: "help", word: "help", at: 225 },
  { id: "standing", word: "standing", at: 270 },
  { id: "history", word: "history", at: 315 },
] as const;

type SeatId = (typeof SEATS)[number]["id"];

const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};
const seatOf = (angle: number) =>
  SEATS.reduce((best, seat) =>
    Math.abs(turn(angle, seat.at)) < Math.abs(turn(angle, best.at)) ? seat : best,
  );

export function MyGRing({ onClose }: { onClose: () => void; onMessages?: () => void; onAccount?: () => void }) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const [deg, setDeg] = useState(0);
  const [live, setLive] = useState<SeatId>("me");
  const [held, setHeld] = useState(false);
  const lastTick = useRef(0);
  const dragging = useRef(false);

  const pointerDeg = (e: React.PointerEvent) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return deg;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height * 0.46;
    return wrap((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setHeld(true);
    const next = pointerDeg(e);
    setDeg(next);
    setLive(seatOf(next).id);
    lastTick.current = seatOf(next).at;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = pointerDeg(e);
    const seat = seatOf(next);
    if (seat.at !== lastTick.current) {
      lastTick.current = seat.at;
      buzz(8);
    }
    setDeg(next);
    setLive(seat.id);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeld(false);
    const seat = seatOf(pointerDeg(e));
    setDeg(seat.at);
    setLive(seat.id);
    buzz(16);
    if (seat.id === "myg") onClose();
  };

  const show = held ? deg : seatOf(deg).at;
  const theta = ((show - 90) * Math.PI) / 180;
  const word = seatOf(show).word;
  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] touch-none"
      style={{ background: PAPER, color: INK }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      aria-label="my profile"
      aria-valuetext={word}
    >
      <div
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
        style={{ width: "86vw", height: "86vw", maxWidth: 520, maxHeight: 520 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: `14px solid ${BLUE}` }}
        />
        <div
          className="absolute grid place-items-center rounded-full"
          style={{
            width: 64,
            height: 64,
            left: `calc(50% + ${Math.cos(theta) * 50}% - 32px)`,
            top: `calc(50% + ${Math.sin(theta) * 50}% - 32px)`,
            background: PAPER,
            border: `5px solid ${BLUE}`,
          }}
        >
          <span style={{ color: BLUE, fontSize: word.length > 7 ? 9 : 12, lineHeight: 1 }}>{word}</span>
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-10 text-center text-sm">
          {live === "me" ? (
            <div>
              {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
              {name ? <p>@{name}</p> : null}
              {age != null ? <p>{age}</p> : null}
            </div>
          ) : null}
          {live === "messages" ? <p style={{ color: BLUE }}>nothing in motion right now</p> : null}
          {live === "standing" && me.sparks > 0 ? <p>{me.sparks} sparks</p> : null}
        </div>
      </div>
    </div>
  );
}
