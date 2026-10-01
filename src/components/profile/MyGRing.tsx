import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * MY G — a blue world, not a form.
 * One circle. The bead sits on the track. The word lives only in the bead.
 * The hole stays empty until that place already has something.
 * Pinching changes the scale of this same place. Living G path is not used.
 */

const BLUE = "#2F6FED";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";

const PLACES = [
  { id: "me", word: "me" },
  { id: "who", word: "who" },
  { id: "aura", word: "aura" },
  { id: "footprint", word: "footprint" },
  { id: "thanks", word: "thanks" },
  { id: "life", word: "life" },
  { id: "messages", word: "messages" },
] as const;

type PlaceId = (typeof PLACES)[number]["id"];

const CX = 195;
const CY = 390;
const TRACK_R = 148;
const STROKE = 17;
const INNER = TRACK_R - STROKE / 2;
const BEAD_R = 28;
const ARM = 12;
const ARM_W = 10;

const KEY = "giver-myg-world";

type Extra = { who: string; thanks: string; life: string };

const readExtra = (): Extra => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { who: "", thanks: "", life: "" };
    return { who: "", thanks: "", life: "", ...JSON.parse(raw) };
  } catch {
    return { who: "", thanks: "", life: "" };
  }
};

const ang = (i: number) => -Math.PI / 2 + (i / PLACES.length) * Math.PI * 2;

export function MyGRing({
  onClose,
  onMessages,
  onAccount,
}: {
  onClose: () => void;
  onMessages: () => void;
  onAccount: () => void;
}) {
  const me = useMyProfile();
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [editing, setEditing] = useState(false);
  const [extra, setExtra] = useState<Extra>(readExtra);
  const drag = useRef<number | null>(null);
  const pinch = useRef<number | null>(null);
  const place = PLACES[index];
  const wide = scale < 0.78;

  const save = (next: Extra) => {
    setExtra(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* a note can wait */
    }
  };

  const photo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (url) myProfileStore.setPhoto(url, url, { x: 0.5, y: 0.5, zoom: 1 });
    };
    reader.readAsDataURL(file);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (wide) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 390 - CX;
    const y = ((e.clientY - box.top) / box.height) * 780 - CY;
    drag.current = Math.atan2(y, x);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current == null || wide) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 390 - CX;
    const y = ((e.clientY - box.top) / box.height) * 780 - CY;
    const next = Math.atan2(y, x);
    let delta = next - drag.current;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.42) return;
    setIndex((i) => (i + (delta > 0 ? 1 : -1) + PLACES.length) % PLACES.length);
    setEditing(false);
    drag.current = next;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.current == null) pinch.current = dist;
    setScale((s) => Math.min(1, Math.max(0.58, s * (dist / (pinch.current || dist)))));
    pinch.current = dist;
  };

  const known = () => {
    const age = ageFrom(me.birthday);
    if (place.id === "me") {
      const bits = [me.username ? `@${me.username}` : "", age != null ? String(age) : "", me.aboutMe].filter(Boolean);
      return { photo: me.photo, lines: bits };
    }
    if (place.id === "who") return { photo: null, lines: extra.who ? [extra.who] : [] };
    if (place.id === "thanks") return { photo: null, lines: extra.thanks ? [extra.thanks] : [] };
    if (place.id === "life") return { photo: null, lines: extra.life ? [extra.life] : [] };
    if (place.id === "aura") {
      const lines = [];
      if (me.sparks) lines.push(`${me.sparks} sparks`);
      return { photo: null, lines };
    }
    if (place.id === "footprint") {
      const lines = [
        me.records.give.length ? `${me.records.give.length} gives` : "",
        me.records.wish.length ? `${me.records.wish.length} wishes` : "",
        me.records.trade.length ? `${me.records.trade.length} trades` : "",
        me.records.borrow.length ? `${me.records.borrow.length} borrows` : "",
      ].filter(Boolean);
      return { photo: null, lines };
    }
    return { photo: null, lines: [] as string[] };
  };

  const body = known();
  const hasInterior = Boolean(body.photo) || body.lines.length > 0;
  const theta = ang(index);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const armEnd = INNER;
  const beadAt = armEnd + ARM + BEAD_R;

  return (
    <div className="relative h-full" style={{ background: PAPER }} onTouchMove={onTouchMove} onTouchEnd={() => { pinch.current = null; }}>
      <button type="button" onClick={onClose} className="absolute left-4 top-4 z-10 text-xs" style={{ color: BLUE }} aria-label="back">
        back
      </button>
      <svg
        viewBox="0 0 390 780"
        className="h-full w-full"
        style={{ transform: `scale(${scale})`, transformOrigin: "50% 46%" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
      >
        <circle cx={CX} cy={CY} r={TRACK_R} fill="none" stroke={BLUE} strokeWidth={STROKE} />
        {PLACES.map((p, i) => {
          const a = ang(i);
          const tick = INNER - 1;
          return (
            <circle key={p.id} cx={CX + Math.cos(a) * tick} cy={CY + Math.sin(a) * tick} r={2.2} fill={BLUE} opacity={i === index ? 0 : 0.45} />
          );
        })}
        <g transform={`translate(${CX + ux * beadAt} ${CY + uy * beadAt}) rotate(${(theta * 180) / Math.PI})`}>
          <rect x={-BEAD_R - ARM} y={-ARM_W / 2} width={ARM} height={ARM_W} fill={BLUE} />
          <circle r={BEAD_R} fill={PAPER} stroke={BLUE} strokeWidth={7} />
          <text textAnchor="middle" y={4} fill={BLUE} fontSize={place.word.length > 8 ? 8 : 11} fontFamily="Helvetica, sans-serif">
            {place.word}
          </text>
        </g>
      </svg>
      {!wide && hasInterior ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-36 text-center text-sm" style={{ color: INK }}>
            {body.photo ? <img src={body.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
            {body.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}
      {!wide ? (
        <button
          type="button"
          className="absolute inset-0 m-auto h-28 w-28"
          aria-label={place.word}
          onClick={() => {
            if (place.id === "messages") onMessages();
            else setEditing(true);
          }}
        />
      ) : null}
      {editing && !wide && (place.id === "who" || place.id === "thanks" || place.id === "life") ? (
        <textarea
          autoFocus
          value={extra[place.id]}
          onChange={(e) => save({ ...extra, [place.id]: e.target.value })}
          onBlur={() => setEditing(false)}
          className="absolute inset-x-16 top-1/2 -translate-y-1/2 bg-transparent text-center text-sm outline-none"
          rows={3}
        />
      ) : null}
      {editing && !wide && place.id === "me" ? (
        <label className="absolute inset-x-0 top-1/2 grid -translate-y-1/2 place-items-center">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} />
          <span className="text-xs" style={{ color: BLUE }}>picture</span>
        </label>
      ) : null}
      {wide ? (
        <button type="button" onClick={onAccount} className="absolute bottom-6 left-0 right-0 text-center text-[10px]" style={{ color: BLUE }}>
          account
        </button>
      ) : null}
    </div>
  );
}
