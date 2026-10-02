import { useEffect, useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";
import {
  EAR_GEOMETRY,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";

/**
 * MY G PROFILE LOOP — a camera inside the existing Living G, not a new page.
 *
 * The mode wheel is not this component. Out there, My G stays at 12 and
 * Communi-g stays at 6. This clock exists only after that 12 o'clock tap.
 *
 * Inside: bead starts at 6 o'clock, labelled my g. 12 o'clock is me.
 * The artwork is the locked path. Nothing here edits g-path.ts.
 * Arrival on my g does not exit. A later tap on the already-docked bead does.
 */

const BLUE = "#1E7BFF";
const PAPER = "#F7F4EF";
const INK = "#1C1A17";

const C = LOOP_CENTRE.middle;
const RIM = LOOP_RIM_RADIUS.middle;
const ORBIT = RIM + EAR_GEOMETRY.gap + EAR_GEOMETRY.outerR;

/** Profile-loop clock. 0 is 12 o'clock. 180 is 6 o'clock. Not the mode wheel. */
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

export function MyGRing({
  onClose,
}: {
  onClose: () => void;
  onMessages?: () => void;
  onAccount?: () => void;
}) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [deg, setDeg] = useState(180);
  const [live, setLive] = useState<SeatId>("myg");
  const [held, setHeld] = useState(false);
  const [overview, setOverview] = useState(false);
  const [edit, setEdit] = useState<SeatId | null>(null);
  const [locked, setLocked] = useState<Partial<Record<SeatId, boolean>>>({});
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
      setBox({ w: r.width, h: r.height });
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const show = held ? deg : seatOf(deg).at;
  const seat = seatOf(show);
  const theta = rad(show);
  const bead = {
    x: C.x + Math.cos(theta) * ORBIT,
    y: C.y + Math.sin(theta) * ORBIT,
  };

  const focus = overview ? 0.72 : 1.85;
  const ox = box.w / 2 - bead.x * focus;
  const oy = box.h / 2 - bead.y * focus;

  const pointerDeg = (e: { clientX: number; clientY: number }) => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return deg;
    const x = (e.clientX - rect.left - ox) / focus;
    const y = (e.clientY - rect.top - oy) / focus;
    return wrap((Math.atan2(y - C.y, x - C.x) * 180) / Math.PI + 90);
  };

  const commit = (id: SeatId) => {
    if (id === "myg" || id === "me") {
      const username = (draft.username ?? "").trim().replace(/^@/, "");
      if (username) myProfileStore.patch({ username: `@${username}` });
      if (draft.bio !== undefined) myProfileStore.patch({ aboutMe: draft.bio.trim() });
    }
    setEdit(null);
    setLocked((prev) => ({ ...prev, [id]: true }));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-interior]")) return;
    if (e.pointerType === "touch" && pinch.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = 0;
    setHeld(true);
    const next = pointerDeg(e);
    setDeg(next);
    lastTick.current = seatOf(next).at;
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
    setLive(nextSeat.id);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeld(false);
    const next = seatOf(pointerDeg(e));
    setDeg(next.at);
    setLive(next.id);
    buzz(16);
    const tap = moved.current < 12;
    if (tap && next.id === "myg" && dockedOnMyg.current) {
      onClose();
      return;
    }
    dockedOnMyg.current = next.id === "myg";
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
    if (ratio > 1.12) setOverview(true);
    if (ratio < 0.88) setOverview(false);
    pinch.current = dist;
  };

  const onInterior = (id: SeatId) => {
    if (overview) return;
    if (edit === id) {
      commit(id);
      return;
    }
    setDraft({
      username: (me.username ?? "").replace(/^@/, ""),
      bio: me.aboutMe ?? "",
      age: ageFrom(me.birthday)?.toString() ?? "",
    });
    setEdit(id);
    setLocked((prev) => ({ ...prev, [id]: false }));
  };

  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);

  const interior = (id: SeatId) => {
    if (edit === id && !overview) {
      if (id === "myg") {
        return (
          <div data-interior="" className="grid gap-1 text-center" onPointerDown={(e) => e.stopPropagation()}>
            <input className="bg-transparent text-center text-base outline-none" value={draft.username ?? ""} placeholder="username" onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} />
            <textarea className="bg-transparent text-center text-sm outline-none" rows={2} value={draft.bio ?? ""} placeholder="bio" onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} />
            <input className="bg-transparent text-center text-sm outline-none" value={draft.age ?? ""} placeholder="age" onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value }))} />
            <span className="text-[10px] tracking-widest" style={{ color: BLUE }}>tap again to lock</span>
          </div>
        );
      }
      return (
        <div data-interior="" className="text-center text-sm" onPointerDown={(e) => e.stopPropagation()}>
          <span className="text-[10px] tracking-widest" style={{ color: BLUE }}>tap again to lock</span>
        </div>
      );
    }
    if (id === "myg") {
      return (
        <div>
          {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-2 h-16 w-16 rounded-full object-cover" /> : null}
          <p>@{name || "you"}</p>
          {me.aboutMe ? <p className="mt-1 text-sm opacity-70">{me.aboutMe}</p> : <p className="mt-1 text-sm opacity-40">bio</p>}
          {age != null ? <p className="mt-1 text-sm opacity-60">{age}</p> : null}
        </div>
      );
    }
    if (id === "me") return <p>@{name || "you"}</p>;
    if (id === "aura") return <p>{me.sparks > 0 ? `${me.sparks} sparks` : "aura"}</p>;
    if (id === "account") return <p className="text-sm opacity-70">email · privacy · password</p>;
    return <p className="text-sm opacity-60">{SEATS.find((s) => s.id === id)?.word}</p>;
  };

  const place = (at: number, radius: number) => {
    const t = rad(at);
    return { left: C.x + Math.cos(t) * radius, top: C.y + Math.sin(t) * radius };
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
      onWheel={(e) => {
        if (e.deltaY > 8) setOverview(true);
        if (e.deltaY < -8) setOverview(false);
      }}
      role="slider"
      aria-label="my g profile loop"
      aria-valuetext={seat.word}
    >
      {box.w > 0 ? (
        <div
          className="absolute left-0 top-0"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${ox}px, ${oy}px) scale(${focus})`,
            transformOrigin: "0 0",
            transition: held ? "none" : "transform 380ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <svg viewBox={LIVING_G_VIEWBOX} width={778} height={1228} className="absolute overflow-visible" aria-hidden>
            <g transform={LIVING_G_TRANSFORM}>
              <path d={LIVING_G_PATH} fill={BLUE} />
            </g>
          </svg>
          {(overview ? SEATS : [seat]).map((item) => {
            const p = place(item.at, overview ? RIM * 0.55 : 0);
            return (
              <button
                key={item.id}
                type="button"
                data-interior=""
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-transparent text-center"
                style={{ left: overview ? p.left : C.x, top: overview ? p.top : C.y, width: overview ? 120 : 200, color: INK }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onInterior(item.id);
                }}
              >
                <div className="lowercase" style={{ color: BLUE, fontSize: overview ? 11 : 13 }}>{item.word}</div>
                {interior(item.id)}
                {locked[item.id] ? <div className="text-[10px] tracking-widest" style={{ color: BLUE }}>locked</div> : null}
              </button>
            );
          })}
          <div
            className="absolute grid place-items-center rounded-full"
            style={{
              width: 64,
              height: 64,
              left: bead.x - 32,
              top: bead.y - 32,
              background: PAPER,
              border: `5px solid ${BLUE}`,
              color: BLUE,
              fontSize: 11,
            }}
          >
            {seat.word}
          </div>
        </div>
      ) : null}
    </div>
  );
}
