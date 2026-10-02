import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * MY PROFILE — closed blue rail. The bead is the navigation.
 * Touch the bead, it follows the thumb. Snap only on release.
 * My G is 6 o'clock and the only exit. Nothing covers the bead.
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

const CX = 195;
const CY = 340;
const TRACK_R = 280;
const STROKE = 16;
const INNER = TRACK_R - STROKE / 2;
const BEAD_R = 28;

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
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
  const [deg, setDeg] = useState(0);
  const [live, setLive] = useState<SeatId>("me");
  const [held, setHeld] = useState(false);
  const svg = useRef<SVGSVGElement | null>(null);
  const lastTick = useRef(0);

  const pointerDeg = (e: React.PointerEvent) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return deg;
    const x = ((e.clientX - box.left) / box.width) * 390 - CX;
    const y = ((e.clientY - box.top) / box.height) * 780 - CY;
    return wrap((Math.atan2(y, x) * 180) / Math.PI + 90);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setHeld(true);
    const next = pointerDeg(e);
    setDeg(next);
    lastTick.current = seatOf(next).at;
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!held) return;
    const next = pointerDeg(e);
    const crossed = seatOf(next).at;
    if (crossed !== lastTick.current) {
      lastTick.current = crossed;
      buzz(8);
    }
    setDeg(next);
  };

  const onPointerUp = () => {
    if (!held) return;
    const seat = seatOf(deg);
    setHeld(false);
    setDeg(seat.at);
    setLive(seat.id);
    buzz(16);
    if (seat.id === "myg") onClose();
  };

  const show = held ? deg : seatOf(deg).at;
  const theta = rad(show);
  const beadAt = INNER - BEAD_R - 1;
  const word = (held ? seatOf(deg) : SEATS.find((s) => s.id === live) ?? SEATS[0]).word;
  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);
  const scale = held ? 0.9 : 1;

  return (
    <div className="relative h-full overflow-hidden" style={{ background: PAPER, color: INK }}>
      <svg
        ref={svg}
        viewBox="0 0 390 780"
        className="absolute inset-0 h-full w-full touch-none"
        style={{ transform: `scale(${scale})`, transformOrigin: "50% 42%", transition: held ? "none" : "transform 180ms ease-out" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="my profile"
        aria-valuetext={word}
      >
        <circle cx={CX} cy={CY} r={TRACK_R} fill="none" stroke={BLUE} strokeWidth={STROKE} />
        <circle cx={CX} cy={CY} r={TRACK_R} fill="none" stroke="transparent" strokeWidth={64} />
        <g transform={`translate(${CX + Math.cos(theta) * beadAt} ${CY + Math.sin(theta) * beadAt})`}>
          <circle r={44} fill="transparent" />
          <circle r={BEAD_R} fill={PAPER} stroke={BLUE} strokeWidth={6} />
          <text textAnchor="middle" y={4} fill={BLUE} fontSize={word.length > 8 ? 8 : 11} fontFamily="Helvetica, sans-serif">
            {word}
          </text>
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center px-16 text-center text-sm">
        {live === "me" ? (
          <div>
            {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
            {name ? <p>@{name}</p> : null}
            {age != null ? <p>{age}</p> : null}
          </div>
        ) : null}
        {live === "activity" ? <p style={{ color: BLUE }}>nothing in motion right now</p> : null}
        {live === "messages" ? <p style={{ color: BLUE }}>nothing in motion right now</p> : null}
        {live === "settings" ? <p style={{ color: BLUE }}>account stays quiet</p> : null}
        {live === "help" ? <p style={{ color: BLUE }}>giver</p> : null}
        {live === "standing" && me.sparks > 0 ? <p>{me.sparks} sparks</p> : null}
        {live === "history" ? <p style={{ color: BLUE }}>{me.records.give.length + me.records.wish.length + me.records.trade.length + me.records.borrow.length || ""}</p> : null}
      </div>
    </div>
  );
}
