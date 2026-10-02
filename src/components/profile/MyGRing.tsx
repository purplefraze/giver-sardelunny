import { useEffect, useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * MY PROFILE is the top loop, closer. Not a page.
 * Camera zooms in. Arm points down. Bead rides the rail.
 * Arriving at 6 o'clock does not leave. A tap there does.
 * Pinch out morphs the circle into the screen edge.
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
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;

export function MyGRing({ onClose }: { onClose: () => void; onMessages?: () => void; onAccount?: () => void }) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const [deg, setDeg] = useState(0);
  const [live, setLive] = useState<SeatId>("me");
  const [held, setHeld] = useState(false);
  const [near, setNear] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<"name" | "about" | null>(null);
  const [draft, setDraft] = useState("");
  const lastTick = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(0);
  const pinch = useRef(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setNear(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pointerDeg = (e: React.PointerEvent) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return deg;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height * 0.42;
    return wrap((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
  };

  const finishEdit = () => {
    if (edit === "name") {
      const next = draft.trim().replace(/^@/, "");
      if (next) myProfileStore.patch({ username: `@${next}` });
    }
    if (edit === "about") myProfileStore.patch({ aboutMe: draft.trim() });
    setEdit(null);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (open || e.pointerType === "touch" && pinch.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = 0;
    setHeld(true);
    const next = pointerDeg(e);
    setDeg(next);
    lastTick.current = seatOf(next).at;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || open) return;
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
    if (moved.current < 10 && seat.id === "myg") onClose();
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
    if (ratio > 1.18 && !open) setOpen(true);
    if (ratio < 0.82 && open) setOpen(false);
    if (ratio < 0.72 && !open) onClose();
    pinch.current = dist;
  };

  const show = held ? deg : seatOf(deg).at;
  const theta = rad(show);
  const word = seatOf(show).word;
  const name = (me.username ?? "").replace(/^@/, "");
  const age = ageFrom(me.birthday);
  const zoom = open ? 1.35 : near ? 1 : 0.22;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] touch-none"
      style={{
        background: PAPER,
        color: INK,
        boxShadow: open ? `inset 0 0 0 10px ${BLUE}` : "none",
        transition: "box-shadow 280ms ease",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onClick={() => { if (open && edit) finishEdit(); }}
      role="slider"
      aria-label="my profile"
      aria-valuetext={word}
    >
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: open ? "140vw" : "118vw",
          height: open ? "140vw" : "118vw",
          transform: `translate(-50%, -50%) scale(${zoom})`,
          transition: held ? "none" : "transform 320ms ease, width 320ms ease, height 320ms ease",
          opacity: open ? 0.15 : 1,
        }}
      >
        <div className="absolute inset-0 rounded-full" style={{ border: `16px solid ${BLUE}` }} />
        {SEATS.map((seat) => {
          const t = rad(seat.at);
          return (
            <div
              key={seat.id}
              className="absolute rounded-full"
              style={{
                width: 8,
                height: 8,
                left: `calc(50% + ${Math.cos(t) * 46}% - 4px)`,
                top: `calc(50% + ${Math.sin(t) * 46}% - 4px)`,
                background: BLUE,
                opacity: 0.45,
              }}
            />
          );
        })}
        <div
          className="absolute"
          style={{
            width: 8,
            height: 72,
            left: "calc(50% - 4px)",
            top: "100%",
            background: BLUE,
            borderRadius: 4,
          }}
        />
        <div
          className="absolute grid place-items-center rounded-full"
          style={{
            width: 72,
            height: 72,
            left: `calc(50% + ${Math.cos(theta) * 46}% - 36px)`,
            top: `calc(50% + ${Math.sin(theta) * 46}% - 36px)`,
            background: PAPER,
            border: `5px solid ${BLUE}`,
          }}
        >
          <span style={{ color: BLUE, fontSize: word.length > 7 ? 10 : 13 }}>{word}</span>
        </div>
      </div>

      {!open ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-16 text-center">
          {live === "me" && (me.photo || name) ? (
            <div>
              {me.photo ? <img src={me.photo} alt="" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" /> : null}
              {name ? <p className="text-lg">@{name}</p> : null}
              {age != null ? <p className="mt-1 text-sm opacity-60">{age}</p> : null}
            </div>
          ) : null}
          {live === "standing" && me.sparks > 0 ? <p>{me.sparks} sparks</p> : null}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          {me.photo ? <img src={me.photo} alt="" className="mb-6 h-24 w-24 rounded-full object-cover" /> : null}
          {edit === "name" ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-center text-2xl outline-none"
              style={{ color: INK }}
            />
          ) : (
            <button
              type="button"
              className="text-2xl"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(name);
                setEdit("name");
              }}
            >
              @{name || "you"}
            </button>
          )}
          {age != null ? <p className="mt-2 text-sm opacity-60">{age}</p> : null}
          {edit === "about" ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="mt-8 w-full bg-transparent text-center text-base outline-none"
              rows={3}
            />
          ) : (
            <button
              type="button"
              className="mt-8 max-w-xs text-base opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(me.aboutMe ?? "");
                setEdit("about");
              }}
            >
              {me.aboutMe || "a line about you"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
