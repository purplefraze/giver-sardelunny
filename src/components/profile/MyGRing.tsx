import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * MY G — the profile as a blue ring, the same idea as the communi-g loop.
 * Spin the bead to fill one part. Pinch open to see the whole page.
 * Does not publish, and does not touch the Living G path.
 */

const BLUE = "var(--giver-blue)";
const INK = "var(--giver-ink)";
const PAPER = "var(--giver-paper)";

const SEATS = [
  { id: "me", label: "me", ask: "a picture, an age, a few words" },
  { id: "standing", label: "standing", ask: "reputation, aura, sparks, what you've done" },
  { id: "notes", label: "notes", ask: "appreciation, a recommendation" },
  { id: "neighborhood", label: "around", ask: "what you like to do nearby" },
  { id: "messages", label: "messages", ask: "people waiting" },
] as const;

type SeatId = (typeof SEATS)[number]["id"];

const KEY = "giver-myg-notes";

type Notes = { notes: string; fun: string; bio: string };

const readNotes = (): Notes => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { notes: "", fun: "", bio: "" };
    return { notes: "", fun: "", bio: "", ...JSON.parse(raw) };
  } catch {
    return { notes: "", fun: "", bio: "" };
  }
};

export function MyGRing({
  onClose,
  onMessages,
}: {
  onClose: () => void;
  onMessages: () => void;
}) {
  const me = useMyProfile();
  const [seat, setSeat] = useState<SeatId>("me");
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<Notes>(readNotes);
  const drag = useRef<{ x: number; y: number; angle: number } | null>(null);
  const pinch = useRef<number | null>(null);

  const save = (next: Notes) => {
    setNotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* words can wait */
    }
  };

  const age = ageFrom(me.birthday);
  const bio = notes.bio || me.aboutMe;
  const angleOf = (id: SeatId) => SEATS.findIndex((s) => s.id === id) * (360 / SEATS.length);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    drag.current = { x: cx, y: cy, angle: Math.atan2(e.clientY - cy, e.clientX - cx) };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const next = Math.atan2(e.clientY - g.y, e.clientX - g.x);
    let delta = next - g.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.35) return;
    const dir = delta > 0 ? 1 : -1;
    const i = SEATS.findIndex((s) => s.id === seat);
    setSeat(SEATS[(i + dir + SEATS.length) % SEATS.length].id);
    g.angle = next;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.current == null) pinch.current = dist;
    if (dist - pinch.current > 48) setExpanded(true);
    if (pinch.current - dist > 48) setExpanded(false);
  };

  const photo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (url) myProfileStore.setPhoto(url, url, { x: 0.5, y: 0.5, zoom: 1 });
    };
    reader.readAsDataURL(file);
  };

  const face = () => {
    if (seat === "me") {
      return (
        <>
          <label className="block">
            <span className="sr-only">picture</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} />
            <span
              className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full text-xs"
              style={{ background: me.photo ? `center/cover url(${me.photo})` : "color-mix(in oklab, var(--giver-blue) 18%, white)", color: BLUE }}
            >
              {me.photo ? "" : "add a picture"}
            </span>
          </label>
          <p className="mt-3 text-sm" style={{ color: INK }}>{age != null ? `${age}` : "age not set"}</p>
          <textarea
            value={bio}
            onChange={(e) => save({ ...notes, bio: e.target.value })}
            placeholder="a little bio"
            maxLength={160}
            className="mt-2 w-full resize-none bg-transparent text-center text-sm outline-none"
            rows={3}
          />
        </>
      );
    }
    if (seat === "standing") {
      return (
        <ul className="space-y-2 text-sm" style={{ color: INK }}>
          <li>sparks · {me.sparks}</li>
          <li>gives · {me.records.give.length}</li>
          <li>wishes · {me.records.wish.length}</li>
          <li>trades · {me.records.trade.length}</li>
          <li>aura · quiet, for now</li>
        </ul>
      );
    }
    if (seat === "notes") {
      return (
        <textarea
          value={notes.notes}
          onChange={(e) => save({ ...notes, notes: e.target.value })}
          placeholder="a note of appreciation, or a recommendation"
          className="w-full resize-none bg-transparent text-center text-sm outline-none"
          rows={5}
        />
      );
    }
    if (seat === "neighborhood") {
      return (
        <textarea
          value={notes.fun}
          onChange={(e) => save({ ...notes, fun: e.target.value })}
          placeholder="what you like to do around here"
          className="w-full resize-none bg-transparent text-center text-sm outline-none"
          rows={5}
        />
      );
    }
    return (
      <button type="button" onClick={onMessages} className="text-sm underline" style={{ color: BLUE }}>
        open messages
      </button>
    );
  };

  if (expanded) {
    return (
      <div className="h-full overflow-y-auto px-6 py-8" style={{ background: PAPER, color: INK }}>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs" style={{ color: BLUE }}>
          back to the ring
        </button>
        <h1 className="mt-4 text-2xl">my g</h1>
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wide" style={{ color: BLUE }}>me</h2>
          <p className="mt-1">{bio || "no bio yet"}</p>
          <p className="text-sm">{age != null ? age : "age not set"}</p>
        </section>
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wide" style={{ color: BLUE }}>standing</h2>
          <p className="mt-1 text-sm">{me.sparks} sparks · {me.records.give.length} gives · {me.records.wish.length} wishes</p>
        </section>
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wide" style={{ color: BLUE }}>notes</h2>
          <p className="mt-1">{notes.notes || "nothing yet"}</p>
        </section>
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wide" style={{ color: BLUE }}>around</h2>
          <p className="mt-1">{notes.fun || "nothing yet"}</p>
        </section>
        <button type="button" onClick={onClose} className="mt-8 text-sm">close</button>
      </div>
    );
  }

  return (
    <div
      className="relative grid h-full place-items-center"
      style={{ background: PAPER }}
      onTouchMove={onTouchMove}
      onTouchEnd={() => { pinch.current = null; }}
    >
      <button type="button" onClick={onClose} className="absolute left-4 top-4 text-xs" style={{ color: BLUE }}>
        back
      </button>
      <button type="button" onClick={() => setExpanded(true)} className="absolute right-4 top-4 text-xs" style={{ color: BLUE }}>
        whole page
      </button>
      <div
        className="relative h-72 w-72"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
      >
        <div className="absolute inset-6 rounded-full" style={{ boxShadow: `inset 0 0 0 10px ${BLUE}` }} />
        {SEATS.map((s) => {
          const a = (angleOf(s.id) - 90) * (Math.PI / 180);
          const x = 50 + Math.cos(a) * 46;
          const y = 50 + Math.sin(a) * 46;
          const on = s.id === seat;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeat(s.id)}
              className="absolute grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: on ? BLUE : PAPER,
                color: on ? PAPER : BLUE,
                boxShadow: `inset 0 0 0 2px ${BLUE}`,
              }}
            >
              {s.label}
            </button>
          );
        })}
        <div className="absolute inset-16 grid place-items-center text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: BLUE }}>{SEATS.find((s) => s.id === seat)?.ask}</p>
            <div className="mt-3">{face()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
