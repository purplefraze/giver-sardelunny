import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * MY PROFILE — closed blue ring. Not My G.
 * My G is the three-loop space and sits at 6 o'clock. That seat is the exit.
 * Eight seats, 45 degrees. The bead stays on the rail.
 * The hole stays empty until that seat already has an object.
 * Help and account are not stations. Living G path is not used.
 */

const BLUE = "#2F6FED";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";
const GIVE = "#4ECB4A";
const WISH = "#7A5AF8";
const TRADE = "#E07A3D";
const FUND = "#8A5A3A";
const LEND = "#C6D64A";
const BORROW = "#C45AD4";

const SEATS = [
  { id: "me", word: "me", at: 0 },
  { id: "who", word: "who", at: 45 },
  { id: "around", word: "around", at: 90 },
  { id: "footprint", word: "footprint", at: 135 },
  { id: "myg", word: "my g", at: 180 },
  { id: "thanks", word: "thanks", at: 225 },
  { id: "standing", word: "standing", at: 270 },
  { id: "messages", word: "messages", at: 315 },
] as const;

type SeatId = (typeof SEATS)[number]["id"];

const CX = 195;
const CY = 390;
const TRACK_R = 250;
const STROKE = 16;
const INNER = TRACK_R - STROKE / 2;
const BEAD_R = 26;

const KEY = "giver-myg-world";

type Extra = { who: string; around: string; thanks: string };

const readExtra = (): Extra => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { who: "", around: "", thanks: "" };
    return { who: "", around: "", thanks: "", ...JSON.parse(raw) };
  } catch {
    return { who: "", around: "", thanks: "" };
  }
};

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};

export function MyGRing({
  onClose,
}: {
  onClose: () => void;
  onMessages?: () => void;
  onAccount?: () => void;
}) {
  const me = useMyProfile();
  const [deg, setDeg] = useState(0);
  const [live, setLive] = useState<SeatId>("me");
  const [held, setHeld] = useState(false);
  const [extra, setExtra] = useState<Extra>(readExtra);
  const [writing, setWriting] = useState(false);
  const svg = useRef<SVGSVGElement | null>(null);

  const save = (next: Extra) => {
    setExtra(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* a note can wait */
    }
  };

  const nearest = (angle: number) =>
    SEATS.reduce((best, seat) =>
      Math.abs(turn(angle, seat.at)) < Math.abs(turn(angle, best.at)) ? seat : best,
    );

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
    setWriting(false);
    setDeg(pointerDeg(e));
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!held) return;
    setDeg(pointerDeg(e));
  };

  const onPointerUp = () => {
    if (!held) return;
    const seat = nearest(deg);
    setHeld(false);
    setDeg(seat.at);
    setLive(seat.id);
    if (seat.id === "myg") onClose();
  };

  const photo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (url) myProfileStore.setPhoto(url, url, { x: 0.5, y: 0.5, zoom: 1 });
    };
    reader.readAsDataURL(file);
  };

  const age = ageFrom(me.birthday);
  const marks = [
    ...me.records.give.map((item) => ({ id: item, color: GIVE, word: item })),
    ...me.records.wish.map((item) => ({ id: item, color: WISH, word: item })),
    ...me.records.trade.map((item) => ({ id: item, color: TRADE, word: item })),
    ...me.records.borrow.map((item) => ({ id: item, color: BORROW, word: item })),
  ].slice(0, 3);

  const theta = rad(held ? deg : nearest(deg).at);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const beadAt = INNER - BEAD_R - 2;
  const scale = held ? 0.86 : 1;
  const word = (held ? nearest(deg) : SEATS.find((s) => s.id === live) ?? SEATS[0]).word;

  return (
    <div className="relative h-full overflow-hidden" style={{ background: PAPER, color: INK }}>
      <svg
        ref={svg}
        viewBox="0 0 390 780"
        className="h-full w-full touch-none"
        style={{ transform: `scale(${scale})`, transformOrigin: "50% 50%", transition: held ? "none" : "transform 180ms ease-out" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <circle cx={CX} cy={CY} r={TRACK_R} fill="none" stroke={BLUE} strokeWidth={STROKE} />
        <g transform={`translate(${CX + ux * beadAt} ${CY + uy * beadAt})`}>
          <circle r={BEAD_R} fill={PAPER} stroke={BLUE} strokeWidth={6} />
          <text textAnchor="middle" y={4} fill={BLUE} fontSize={word.length > 8 ? 8 : 11} fontFamily="Helvetica, sans-serif">
            {word}
          </text>
        </g>
      </svg>
      {live === "me" && (me.photo || me.username) ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm">
          <div>
            {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
            {me.username ? <p>@{me.username}</p> : null}
            {age != null ? <p>{age}</p> : null}
          </div>
        </div>
      ) : null}
      {live === "me" ? (
        <label className="absolute inset-0 grid place-items-center">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} />
          <span className="h-28 w-28" />
        </label>
      ) : null}
      {live === "who" && extra.who ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center px-16 text-center text-sm">{extra.who}</p>
      ) : null}
      {live === "around" && extra.around ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center px-16 text-center text-sm">{extra.around}</p>
      ) : null}
      {live === "thanks" && extra.thanks ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center px-16 text-center text-sm">{extra.thanks}</p>
      ) : null}
      {(live === "who" || live === "around" || live === "thanks") && !writing ? (
        <button type="button" className="absolute inset-0" aria-label={live} onClick={() => setWriting(true)} />
      ) : null}
      {writing && (live === "who" || live === "around" || live === "thanks") ? (
        <textarea
          autoFocus
          value={extra[live]}
          onChange={(e) => save({ ...extra, [live]: e.target.value })}
          onBlur={() => setWriting(false)}
          className="absolute inset-x-16 top-1/2 -translate-y-1/2 bg-transparent text-center text-sm outline-none"
          rows={3}
        />
      ) : null}
      {live === "footprint" && marks.length > 0 ? (
        <ul className="pointer-events-none absolute inset-0 grid place-items-center text-sm">
          <li className="space-y-2 text-center">
            {marks.map((mark) => (
              <p key={mark.id} style={{ color: mark.color }}>{mark.word}</p>
            ))}
          </li>
        </ul>
      ) : null}
      {live === "standing" && me.sparks > 0 ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm">{me.sparks} sparks</p>
      ) : null}
      {live === "messages" ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm" style={{ color: BLUE }}>
          nothing in motion right now
        </p>
      ) : null}
      <span className="hidden" style={{ color: LEND }} />
    </div>
  );
}
