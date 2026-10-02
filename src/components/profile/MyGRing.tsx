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
 * MY G PROFILE LOOP — internal clock only.
 * Full Living G mode wheel is untouched: My G stays 12, Communi-g stays 6.
 * This view is a camera into the locked middle-loop geometry, not a new circle.
 * g-path.ts is not edited. Stroke weight is the path's own fill.
 *
 * Profile clock, clockwise from 6: my g, help, aura, past, me, now, notes, account.
 * Bead starts at 6 (my g). Arrival on my g does not exit.
 * Exit only: bead already docked on my g, then an intentional tap on that bead.
 */

const BLUE = "#2F6FED";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";

const SEATS = [
  { id: "myg", word: "my g", at: 180 },
  { id: "help", word: "help", at: 225 },
  { id: "standing", word: "aura", at: 270 },
  { id: "history", word: "past", at: 315 },
  { id: "me", word: "me", at: 0 },
  { id: "activity", word: "now", at: 45 },
  { id: "messages", word: "notes", at: 90 },
  { id: "settings", word: "account", at: 135 },
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

const MID = LOOP_CENTRE.middle;
const RIM = LOOP_RIM_RADIUS.middle;

export function MyGRing({ onClose }: { onClose: () => void; onMessages?: () => void; onAccount?: () => void }) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [deg, setDeg] = useState(180);
  const [live, setLive] = useState<SeatId>("myg");
  const [held, setHeld] = useState(false);
  const [scale, setScale] = useState(1.85);
  const [edit, setEdit] = useState<"name" | "about" | "email" | null>(null);
  const [draft, setDraft] = useState("");
  const lastTick = useRef(180);
  const dragging = useRef(false);
  const moved = useRef(0);
  const pinch = useRef(0);
  const dockedOnMyg = useRef(true);
  const onBead = useRef(false);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const read = () => {
      const r = node.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const cx = box.w / 2;
  const cy = box.h / 2;
  const orbit = Math.min(box.w, box.h) * 0.42;

  const pointerDeg = (e: { clientX: number; clientY: number }) => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return deg;
    return wrap((Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI + 90);
  };

  const finishEdit = () => {
    if (edit === "name") {
      const next = draft.trim().replace(/^@/, "");
      if (next) myProfileStore.patch({ username: `@${next}` });
    }
    if (edit === "about") myProfileStore.patch({ aboutMe: draft.trim() });
    setEdit(null);
  };

  const toggleEdit = (field: "name" | "about" | "email", value: string) => {
    if (edit === field) {
      finishEdit();
      return;
    }
    setDraft(value);
    setEdit(field);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (edit) return;
    if (e.pointerType === "touch" && pinch.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-seat-content]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = 0;
    onBead.current = Boolean(target.closest("[data-bead]"));
    dockedOnMyg.current = live === "myg";
    setHeld(true);
    const next = pointerDeg(e);
    setDeg(next);
    lastTick.current = seatOf(next).at;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
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
    const tap = moved.current < 12;
    if (dockedOnMyg.current && onBead.current && tap && seat.id === "myg") onClose();
    dockedOnMyg.current = seat.id === "myg";
    onBead.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      dragging.current = false;
      setHeld(false);
      const a = e.touches[0];
      const b = e.touches[1];
      pinch.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinch.current) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = dist / pinch.current;
    setScale((s) => Math.min(2.4, Math.max(0.72, s * ratio)));
    pinch.current = dist;
  };

  const onTouchEnd = () => {
    pinch.current = 0;
  };

  const show = held ? deg : seatOf(deg).at;
  const theta = rad(show);
  const seat = seatOf(show);
  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);
  const overview = scale < 1.05;
  const camX = cx - Math.cos(theta) * orbit * 0.55 * Math.min(scale, 1.6);
  const camY = cy - Math.sin(theta) * orbit * 0.55 * Math.min(scale, 1.6);

  const content = () => {
    if (edit) {
      return (
        <input
          autoFocus
          data-seat-content
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation();
            finishEdit();
          }}
          className="bg-transparent text-center text-base outline-none"
          style={{ color: INK, width: "70%" }}
        />
      );
    }
    if (seat.id === "myg") {
      return (
        <button type="button" data-seat-content className="text-center" onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); toggleEdit("name", name); }}>
          {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
          <p className="text-lg">@{name || "you"}</p>
          {me.aboutMe ? <p className="mt-1 text-sm opacity-70">{me.aboutMe}</p> : <p className="mt-1 text-sm opacity-40">bio</p>}
          {age != null ? <p className="mt-1 text-sm opacity-60">{age}</p> : null}
        </button>
      );
    }
    if (seat.id === "me") return <p data-seat-content>{name ? `@${name}` : "me"}</p>;
    if (seat.id === "settings") {
      return (
        <button type="button" data-seat-content className="text-sm" onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); toggleEdit("email", ""); }}>
          <p>account</p>
          <p className="mt-1 opacity-60">email · privacy · password</p>
        </button>
      );
    }
    return <p data-seat-content className="text-sm opacity-70">{seat.word}</p>;
  };

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] touch-none overflow-hidden"
      style={{ background: PAPER, color: INK }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.min(2.4, Math.max(0.72, s + (e.deltaY > 0 ? -0.08 : 0.08))));
      }}
      role="slider"
      aria-label="my g profile loop"
      aria-valuetext={seat.word}
    >
      {box.w > 0 ? (
        <div
          className="absolute"
          style={{
            left: overview ? cx : camX,
            top: overview ? cy : camY,
            width: orbit * 2,
            height: orbit * 2,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "50% 50%",
            transition: held ? "none" : "transform 280ms cubic-bezier(.2,.8,.2,1), left 280ms cubic-bezier(.2,.8,.2,1), top 280ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <svg viewBox={`${MID.x - RIM - 80} ${MID.y - RIM - 120} ${RIM * 2 + 160} ${RIM * 2 + 200}`} className="absolute inset-0 h-full w-full overflow-visible">
            <g transform={LIVING_G_TRANSFORM} fill={BLUE}>
              <path d={LIVING_G_PATH} />
            </g>
          </svg>
          {SEATS.map((s) => {
            const t = rad(s.at);
            return (
              <div
                key={s.id}
                className="absolute text-center"
                style={{
                  left: orbit + Math.cos(t) * orbit * 0.62,
                  top: orbit + Math.sin(t) * orbit * 0.62,
                  transform: "translate(-50%, -50%)",
                  color: BLUE,
                  fontSize: overview ? 11 : 13,
                  opacity: s.id === seat.id || overview ? 1 : 0.35,
                }}
              >
                {s.word}
              </div>
            );
          })}
          <div
            data-bead
            className="absolute grid place-items-center rounded-full"
            style={{
              width: 64,
              height: 64,
              left: orbit + Math.cos(theta) * orbit - 32,
              top: orbit + Math.sin(theta) * orbit - 32,
              background: PAPER,
              border: `5px solid ${BLUE}`,
            }}
          >
            <span style={{ color: BLUE, fontSize: 12 }}>{seat.word}</span>
          </div>
          {!overview ? (
            <div className="absolute inset-0 grid place-items-center px-16 text-center" data-seat-content>
              {content()}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
