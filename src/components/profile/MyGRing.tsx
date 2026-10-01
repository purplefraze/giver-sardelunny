import { useRef, useState } from "react";
import { ageFrom } from "@/data/account";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * MY G — a personal world, not a form.
 * Same idea as the communi-g loop: one blue place, locations around it,
 * the bead moves and the interior changes. Pinch out and it is the same
 * place, only wide enough to see every location at once.
 * Existing account fields are read, never asked again.
 */

const BLUE = "var(--giver-blue)";
const INK = "var(--giver-ink)";
const PAPER = "var(--giver-paper)";

const PLACES = [
  { id: "identity", label: "me", line: "this is me" },
  { id: "who", label: "who", line: "beyond the account" },
  { id: "aura", label: "aura", line: "how i show up" },
  { id: "footprint", label: "footprint", line: "what i have done here" },
  { id: "thanks", label: "thanks", line: "what people have said" },
  { id: "life", label: "life", line: "what i like around here" },
  { id: "messages", label: "messages", line: "people i am talking to" },
] as const;

type PlaceId = (typeof PLACES)[number]["id"];

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
  const [place, setPlace] = useState<PlaceId>("identity");
  const [scale, setScale] = useState(1);
  const [extra, setExtra] = useState<Extra>(readExtra);
  const drag = useRef<{ y: number; angle: number } | null>(null);
  const pinch = useRef<number | null>(null);
  const wide = scale < 0.72;

  const save = (next: Extra) => {
    setExtra(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* a note can wait */
    }
  };

  const age = ageFrom(me.birthday);
  const name = me.username ? `@${me.username}` : "your name is already on the account";

  const spin = (dir: number) => {
    const i = PLACES.findIndex((p) => p.id === place);
    setPlace(PLACES[(i + dir + PLACES.length) % PLACES.length].id);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (wide) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.current = {
      y: rect.top + rect.height / 2,
      angle: Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || wide) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next = Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2));
    let delta = next - g.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.4) return;
    spin(delta > 0 ? 1 : -1);
    g.angle = next;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.current == null) pinch.current = dist;
    const next = Math.min(1, Math.max(0.55, scale * (dist / pinch.current)));
    setScale(next);
    pinch.current = dist;
  };

  const photo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (url) myProfileStore.setPhoto(url, url, { x: 0.5, y: 0.5, zoom: 1 });
    };
    reader.readAsDataURL(file);
  };

  const interior = (id: PlaceId) => {
    if (id === "identity") {
      return (
        <>
          <label className="block">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} />
            <span
              className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full text-[10px]"
              style={{ background: me.photo ? `center/cover url(${me.photo})` : "color-mix(in oklab, var(--giver-blue) 16%, white)", color: BLUE }}
            >
              {me.photo ? "" : "picture"}
            </span>
          </label>
          <p className="mt-2 text-sm" style={{ color: INK }}>{name}</p>
          <p className="text-xs" style={{ color: BLUE }}>{age != null ? age : "birthday already on the account, or not yet"}</p>
          <p className="mt-2 text-sm" style={{ color: INK }}>{me.aboutMe || "a short introduction, when you want one"}</p>
        </>
      );
    }
    if (id === "who") {
      return (
        <textarea
          value={extra.who}
          onChange={(e) => save({ ...extra, who: e.target.value })}
          placeholder="something the community would not know from the account"
          className="w-full resize-none bg-transparent text-center text-sm outline-none"
          rows={4}
        />
      );
    }
    if (id === "aura") {
      return (
        <ul className="space-y-1 text-sm" style={{ color: INK }}>
          <li>{me.sparks} sparks</li>
          <li>aura still quiet</li>
          <li>{me.records.give.length + me.records.wish.length + me.records.trade.length + me.records.borrow.length} things in motion</li>
        </ul>
      );
    }
    if (id === "footprint") {
      return (
        <ul className="space-y-1 text-sm" style={{ color: INK }}>
          <li>{me.records.give.length} gives</li>
          <li>{me.records.wish.length} wishes</li>
          <li>{me.records.trade.length} trades</li>
          <li>{me.records.borrow.length} borrows and lends</li>
        </ul>
      );
    }
    if (id === "thanks") {
      return (
        <textarea
          value={extra.thanks}
          onChange={(e) => save({ ...extra, thanks: e.target.value })}
          placeholder="a thank-you, when someone leaves one"
          className="w-full resize-none bg-transparent text-center text-sm outline-none"
          rows={4}
        />
      );
    }
    if (id === "life") {
      return (
        <textarea
          value={extra.life}
          onChange={(e) => save({ ...extra, life: e.target.value })}
          placeholder="what you like to do around the neighborhood"
          className="w-full resize-none bg-transparent text-center text-sm outline-none"
          rows={4}
        />
      );
    }
    return (
      <button type="button" onClick={onMessages} className="text-sm underline" style={{ color: BLUE }}>
        open messages
      </button>
    );
  };

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: PAPER, color: INK }}
      onTouchMove={onTouchMove}
      onTouchEnd={() => { pinch.current = null; }}
    >
      <button type="button" onClick={onClose} className="absolute left-4 top-4 z-10 text-xs" style={{ color: BLUE }}>back</button>
      <button type="button" onClick={() => setScale(wide ? 1 : 0.62)} className="absolute right-4 top-4 z-10 text-xs" style={{ color: BLUE }}>
        {wide ? "move in" : "see it all"}
      </button>
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, width: 320, height: 320 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
      >
        <div className="absolute inset-8 rounded-full" style={{ boxShadow: `inset 0 0 0 12px ${BLUE}` }} />
        {PLACES.map((p, i) => {
          const a = (i / PLACES.length) * Math.PI * 2 - Math.PI / 2;
          const on = p.id === place && !wide;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPlace(p.id); setScale(1); }}
              className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[9px]"
              style={{
                left: `${50 + Math.cos(a) * 48}%`,
                top: `${50 + Math.sin(a) * 48}%`,
                background: on ? BLUE : PAPER,
                color: on ? PAPER : BLUE,
                boxShadow: `inset 0 0 0 2px ${BLUE}`,
              }}
            >
              {p.label}
            </button>
          );
        })}
        {!wide ? (
          <div className="absolute inset-16 grid place-items-center px-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: BLUE }}>{PLACES.find((p) => p.id === place)?.line}</p>
              <div className="mt-3">{interior(place)}</div>
            </div>
          </div>
        ) : null}
      </div>
      {wide ? (
        <div className="absolute inset-x-0 bottom-0 max-h-[46%] overflow-y-auto px-6 pb-8 text-sm">
          <p style={{ color: BLUE }}>the whole g, still the same place</p>
          {PLACES.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPlace(p.id); setScale(1); }} className="mt-3 block text-left">
              <span style={{ color: BLUE }}>{p.label}</span>
              <span className="ml-2">{p.line}</span>
            </button>
          ))}
          <button type="button" onClick={onAccount} className="mt-4 block text-xs" style={{ color: BLUE }}>
            account details, only if something is missing
          </button>
        </div>
      ) : null}
    </div>
  );
}
