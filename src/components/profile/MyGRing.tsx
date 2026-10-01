import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * MY PROFILE — the closed blue loop. Not My G.
 * My G is the three-loop space. On this loop it sits at 6 o'clock, and
 * landing there is the only exit. Eight seats, 45 degrees apart.
 * The bead stays on the rail. No gap. No back button. No debug marks.
 */

const BLUE = "#2F6FED";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";

const SEATS = [
  { id: "profile", word: "profile", at: 0 },
  { id: "activity", word: "activity", at: 45 },
  { id: "thanks", word: "thanks", at: 90 },
  { id: "messages", word: "messages", at: 135 },
  { id: "myg", word: "my g", at: 180 },
  { id: "settings", word: "settings", at: 225 },
  { id: "account", word: "account", at: 270 },
  { id: "help", word: "help", at: 315 },
] as const;

type SeatId = (typeof SEATS)[number]["id"];

const CX = 195;
const CY = 390;
/** Large enough that the ring has presence and may leave the viewport. */
const TRACK_R = 250;
const STROKE = 16;
const INNER = TRACK_R - STROKE / 2;
const BEAD_R = 26;

const KEY = "giver-myg-world";

type Extra = { who: string; thanks: string };

const readExtra = (): Extra => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { who: "", thanks: "" };
    return { who: "", thanks: "", ...JSON.parse(raw) };
  } catch {
    return { who: "", thanks: "" };
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
  onAccount,
}: {
  onClose: () => void;
  onMessages?: () => void;
  onAccount: () => void;
}) {
  const me = useMyProfile();
  const [deg, setDeg] = useState(0);
  const [live, setLive] = useState<SeatId>("profile");
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
  const lines = (() => {
    if (live === "profile") return [me.username ? `@${me.username}` : "", age != null ? String(age) : "", me.aboutMe, extra.who].filter(Boolean);
    if (live === "activity") {
      return [
        me.sparks ? `${me.sparks} sparks` : "",
        me.records.give.length ? `${me.records.give.length} gives` : "",
        me.records.wish.length ? `${me.records.wish.length} wishes` : "",
        me.records.trade.length ? `${me.records.trade.length} trades` : "",
        me.records.borrow.length ? `${me.records.borrow.length} borrows` : "",
      ].filter(Boolean);
    }
    if (live === "thanks") return extra.thanks ? [extra.thanks] : [];
    if (live === "messages") return [];
    if (live === "account") return [me.username ? `@${me.username}` : "", age != null ? String(age) : ""].filter(Boolean);
    return [];
  })();

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
      {live !== "myg" && lines.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-40 text-center text-sm">
            {live === "profile" && me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}
      {live === "messages" ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm" style={{ color: BLUE }}>
          nothing in motion right now
        </p>
      ) : null}
      {live === "profile" ? (
        <label className="absolute inset-x-0 top-[58%] grid place-items-center">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} />
          <button type="button" className="text-xs" style={{ color: BLUE }} onClick={() => setWriting(true)}>
            {extra.who ? "" : ""}
          </button>
        </label>
      ) : null}
      {writing && (live === "profile" || live === "thanks") ? (
        <textarea
          autoFocus
          value={live === "thanks" ? extra.thanks : extra.who}
          onChange={(e) => save(live === "thanks" ? { ...extra, thanks: e.target.value } : { ...extra, who: e.target.value })}
          onBlur={() => setWriting(false)}
          className="absolute inset-x-16 top-1/2 -translate-y-1/2 bg-transparent text-center text-sm outline-none"
          rows={3}
        />
      ) : null}
      {live === "account" ? (
        <button type="button" onClick={onAccount} className="absolute bottom-8 left-0 right-0 text-center text-[10px]" style={{ color: BLUE }}>
          account
        </button>
      ) : null}
    </div>
  );
}
