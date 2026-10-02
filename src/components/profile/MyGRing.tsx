import { useEffect, useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";
import {
  LIVING_G_BOX,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";

/**
 * Profile loop camera. Mode wheel is not this file.
 * Artwork is the locked Living G path, in LIVING_G_BOX units.
 * Bead and path share that space, so the bead cannot leave the rail.
 * Inside this clock only: 6 o'clock is my g, 12 o'clock is me.
 * Arrival on my g does not exit. A later tap on the docked bead does.
 */

const BLUE = "#2F6FED";
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
const at = (deg: number, radius: number) => ({
  x: C.x + Math.cos(rad(deg)) * radius,
  y: C.y + Math.sin(rad(deg)) * radius,
});

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
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState("");
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
  const bead = at(show, RIM);
  const follow = box.h ? (box.h * 0.92) / (RIM * 1.15) : 2;
  const wide = box.h ? (Math.min(box.w, box.h) * 0.86) / (RIM * 2.4) : 0.8;
  const scale = overview ? wide : follow;
  const focus = overview ? C : bead;
  const ox = box.w / 2 - focus.x * scale;
  const oy = box.h / 2 - focus.y * scale;

  const pointerDeg = (e: { clientX: number; clientY: number }) => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return deg;
    const x = (e.clientX - rect.left - ox) / scale;
    const y = (e.clientY - rect.top - oy) / scale;
    return wrap((Math.atan2(y - C.y, x - C.x) * 180) / Math.PI + 90);
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
    const onBead = Boolean((e.target as HTMLElement).closest("[data-bead]"));
    if (tap && onBead && next.id === "myg" && dockedOnMyg.current) {
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
    if (ratio > 1.14) setOverview(true);
    if (ratio < 0.86) setOverview(false);
    pinch.current = dist;
  };

  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);

  const lock = () => {
    if (live === "myg") {
      const username = draft.trim().replace(/^@/, "");
      if (username) myProfileStore.patch({ username: `@${username}` });
    }
    if (live === "me" || live === "myg") {
      if (draft.trim()) myProfileStore.patch({ aboutMe: draft.trim() });
    }
    setEdit(false);
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
      onTouchEnd={() => {
        pinch.current = 0;
      }}
      role="slider"
      aria-label="my g profile loop"
      aria-valuetext={seat.word}
    >
      {box.w > 0 ? (
        <div
          className="absolute left-0 top-0"
          style={{
            width: LIVING_G_BOX.width,
            height: LIVING_G_BOX.height,
            transform: `translate(${ox}px, ${oy}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: held ? "none" : "transform 360ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <svg
            viewBox={`0 0 ${LIVING_G_BOX.width} ${LIVING_G_BOX.height}`}
            width={LIVING_G_BOX.width}
            height={LIVING_G_BOX.height}
            className="absolute left-0 top-0 overflow-visible"
            aria-hidden
          >
            <g transform={LIVING_G_TRANSFORM}>
              <path d={LIVING_G_PATH} fill={BLUE} />
            </g>
          </svg>
          {SEATS.map((item) => {
            const p = at(item.at, RIM * 0.62);
            const on = item.id === live;
            if (!overview && !on) return null;
            return (
              <button
                key={item.id}
                type="button"
                data-interior=""
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-transparent text-center"
                style={{
                  left: overview ? p.x : C.x,
                  top: overview ? p.y : C.y,
                  width: overview ? 90 : 180,
                  color: INK,
                  opacity: on || overview ? 1 : 0.4,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (overview) return;
                  if (edit) lock();
                  else {
                    setDraft(item.id === "myg" ? name : me.aboutMe ?? "");
                    setEdit(true);
                  }
                }}
              >
                <div className="lowercase" style={{ color: BLUE, fontSize: overview ? 11 : 13 }}>
                  {item.word}
                </div>
                {!overview && on && item.id === "myg" ? (
                  edit ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(ev) => setDraft(ev.target.value)}
                      className="mt-1 w-full bg-transparent text-center outline-none"
                    />
                  ) : (
                    <div>
                      {me.photo ? (
                        <img src={me.photo} alt="" className="mx-auto mt-2 h-14 w-14 rounded-full object-cover" />
                      ) : null}
                      <p className="mt-1">@{name || "you"}</p>
                      {me.aboutMe ? <p className="mt-1 text-sm opacity-70">{me.aboutMe}</p> : null}
                      {age != null ? <p className="text-sm opacity-60">{age}</p> : null}
                    </div>
                  )
                ) : null}
              </button>
            );
          })}
          <div
            data-bead
            className="absolute grid place-items-center rounded-full"
            style={{
              width: 58,
              height: 58,
              left: bead.x - 29,
              top: bead.y - 29,
              background: PAPER,
              border: `4px solid ${BLUE}`,
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
