import { useEffect, useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";

/**
 * Profile loop. Camera only. The artwork is the locked path, drawn once.
 * The bead is in that same user space, on the middle-loop rim, so it cannot
 * detach. Mode wheel is not this file: out there My G stays at 12.
 * Here, 180 is 6 o'clock and the bead starts there. Arrival does not exit.
 */

const BLUE = "#1E7BFF";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";
const C = LOOP_CENTRE.middle;
const RIM = LOOP_RIM_RADIUS.middle;

const SEATS = [
  { id: "myg", word: "my g", at: 180 },
  { id: "help", word: "help", at: 225 },
  { id: "aura", word: "aura", at: 270 },
  { id: "past", word: "past", at: 315 },
  { id: "me", word: "me", at: 0 },
  { id: "now", word: "now", at: 45 },
  { id: "notes", word: "notes", at: 90 },
  { id: "account", word: "account", at: 135 },
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
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const onRim = (deg: number, radius: number = RIM) => {
  const t = rad(deg);
  return { x: C.x + Math.cos(t) * radius, y: C.y + Math.sin(t) * radius };
};

export function MyGRing({
  onClose,
}: {
  onClose: () => void;
  onMessages?: () => void;
  onAccount?: () => void;
}) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 390, h: 700 });
  const [deg, setDeg] = useState(180);
  const [held, setHeld] = useState(false);
  const [span, setSpan] = useState(340);
  const [edit, setEdit] = useState<SeatId | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const lastTick = useRef(180);
  const dragging = useRef(false);
  const moved = useRef(0);
  const dockedOnMyg = useRef(true);
  const pinch = useRef(0);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const read = () => {
      const r = node.getBoundingClientRect();
      if (r.width && r.height) setBox({ w: r.width, h: r.height });
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const show = held ? deg : seatOf(deg).at;
  const seat = seatOf(show);
  const bead = onRim(show);
  const aspect = box.h / Math.max(box.w, 1);
  const viewW = span;
  const viewH = span * aspect;
  const viewBox = `${bead.x - viewW / 2} ${bead.y - viewH / 2} ${viewW} ${viewH}`;

  const pointerDeg = (e: { clientX: number; clientY: number }) => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return deg;
    const x = bead.x - viewW / 2 + ((e.clientX - rect.left) / rect.width) * viewW;
    const y = bead.y - viewH / 2 + ((e.clientY - rect.top) / rect.height) * viewH;
    return wrap((Math.atan2(y - C.y, x - C.x) * 180) / Math.PI + 90);
  };

  const commit = (id: SeatId) => {
    if (id === "myg" || id === "me") {
      const username = (draft["username"] ?? "").trim().replace(/^@/, "");
      if (username) myProfileStore.patch({ username: `@${username}` });
      if (draft["bio"] !== undefined) myProfileStore.patch({ aboutMe: draft["bio"].trim() });
    }
    setEdit(null);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-interior]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = 0;
    setHeld(true);
    setDeg(pointerDeg(e));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
    const next = pointerDeg(e);
    const nextSeat = seatOf(next);
    if (nextSeat.at !== lastTick.current) {
      lastTick.current = nextSeat.at;
      dockedOnMyg.current = false;
      buzz(8);
    }
    setDeg(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeld(false);
    const next = seatOf(pointerDeg(e));
    setDeg(next.at);
    lastTick.current = next.at;
    buzz(16);
    const tap = moved.current < 14;
    const onBead = (e.target as HTMLElement).closest("[data-bead]");
    if (tap && next.id === "myg" && dockedOnMyg.current && onBead) {
      onClose();
      return;
    }
    dockedOnMyg.current = next.id === "myg";
  };

  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);
  const interior = onRim(seat.at, RIM * 0.62);

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-none overflow-hidden"
      style={{ background: PAPER, color: INK }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          dragging.current = false;
          setHeld(false);
          const a = e.touches[0];
          const b = e.touches[1];
          if (!a || !b) return;
          pinch.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || !pinch.current) return;
        const a = e.touches[0];
        const b = e.touches[1];
        if (!a || !b) return;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / pinch.current;
        setSpan((s) => Math.min(820, Math.max(280, s / ratio)));
        pinch.current = dist;
      }}
      onWheel={(e) => setSpan((s) => Math.min(820, Math.max(280, s + e.deltaY * 0.4)))}
    >
      <svg viewBox={viewBox} className="h-full w-full overflow-visible" aria-label="my g profile loop">
        <g transform={LIVING_G_TRANSFORM}>
          <path d={LIVING_G_PATH} fill={BLUE} />
        </g>
        {SEATS.map((item) => {
          const p = onRim(item.at, RIM * 0.72);
          const on = item.id === seat.id;
          return (
            <text
              key={item.id}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              fill={BLUE}
              fontSize={on ? 13 : 11}
              opacity={span > 520 || on ? 1 : 0}
            >
              {item.word}
            </text>
          );
        })}
        <foreignObject x={interior.x - 70} y={interior.y - 36} width={140} height={90}>
          <div
            data-interior=""
            style={{ color: INK, textAlign: "center", fontSize: 13, lineHeight: 1.3 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (edit === seat.id) commit(seat.id);
              else {
                setDraft({
                  username: (me.username ?? "").replace(/^@/, ""),
                  bio: me.aboutMe ?? "",
                });
                setEdit(seat.id);
              }
            }}
          >
            {edit === seat.id && seat.id === "myg" ? (
              <>
                <input value={draft["username"] ?? ""} placeholder="username" onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} style={{ width: "100%", textAlign: "center", background: "transparent" }} />
                <input value={draft["bio"] ?? ""} placeholder="bio" onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} style={{ width: "100%", textAlign: "center", background: "transparent" }} />
              </>
            ) : seat.id === "myg" ? (
              <>
                <div>@{name || "you"}</div>
                <div>{me.aboutMe || "bio"}</div>
                {age != null ? <div>{age}</div> : null}
              </>
            ) : seat.id === "account" ? (
              <div>email · privacy · password</div>
            ) : (
              <div>{seat.word}</div>
            )}
          </div>
        </foreignObject>
        <g data-bead="" style={{ cursor: "pointer" }}>
          <circle cx={bead.x} cy={bead.y} r={28} fill={PAPER} stroke={BLUE} strokeWidth={5} />
          <text x={bead.x} y={bead.y + 4} textAnchor="middle" fill={BLUE} fontSize={11}>
            {seat.word}
          </text>
        </g>
      </svg>
    </div>
  );
}
