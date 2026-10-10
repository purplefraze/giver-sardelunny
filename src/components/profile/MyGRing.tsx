import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { passwordStrongEnough } from "@/data/account";
import { birthdayBounds, profileBirthdaySchema } from "@/lib/profile-birthday";
import { myProfileStore, reservedTotal } from "@/data/my-profile";
import { ME_ID, itemLine, type Item } from "@/data/items";
import { memberById } from "@/data/giver";
import { messagesOf, myConnections, myPastConnections, otherParty } from "@/data/connections";
import { eventsOf, signed, whenWord } from "@/data/ledger";
import { wallOf } from "@/data/wall";
import { sessionStore } from "@/data/cloud/session";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useItems } from "@/hooks/use-items";
import { useConnections } from "@/hooks/use-connections";
import { useLedger } from "@/hooks/use-ledger";
import { useWall } from "@/hooks/use-wall";
import { useProfilePhoto } from "@/components/profile/ProfilePhotoPicker";
import { buzz, haptics } from "@/lib/haptics";
import { inputAngle, signedTurn, scaleOf, settleDuration, easeOut, type Point } from "@/components/community/perimeter-geometry";
import { voiceCapture } from "@/intelligence/voice-capture";
import { seatPlacement } from "@/intelligence/seat-placement";
import {
  PROFILE_AREAS,
  activityTenseOf,
  areaById,
  profileAreaOf,
  type ProfileAreaId,
} from "@/intelligence/profile-areas";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  EAR_CUT,
  RIM_PATCH,
  arcPath,
  wedgePath,
} from "@/components/living-g/g-path";
import { Button } from "@/components/ui/button";
import { seatCentre, toggleGeometry } from "@/components/living-g/EarSelector";

/**
 * MY G PROFILE LOOP. Tapping My G zooms into the ACTUAL toggle circle at 12;
 * the bead rides its track, the middle loop's curve stays visible below, and
 * each seat's area opens beneath the circle in the community loop's type.
 * Seats: bio 12 · photo 1:30 · reputation 3 · chats 4:30 · my g 6 (exit) ·
 * sparks 7:30 · activity 9 · settings 10:30.
 *
 * Bead gestures: drag = travel · tap = open the seat's area (on my g: exit)
 * · hold & release = toggle record mode (does not record) · in record mode
 * tap = start/stop listening. Nothing saves without its own button.
 */

type Bio = { username: string; about: string; birthday: string };

const BLUE = "var(--mode-giver)";
const PAPER = "var(--background)";
const INK = "var(--foreground)";
/* THE ACTUAL TOGGLE CIRCLE (Oct 9): the ring the main toggle wears when it
   sits on My G at 12:00. The bead rides THAT ring's track; the middle loop's
   upper curve stays in view below it so the origin is never lost. */
const MID = LOOP_CENTRE.middle;
const RING = toggleGeometry("middle");
const C = seatCentre("giver");
const RIM = RING.RING_MID;
const OUTER = RING.EAR.outerR;
/* Camera: ring outer diameter fills ~80% of the width, a little air above. */
const FIT_W = OUTER * 1.65;
const ENTRY_MS = 420;
const HOLD_MS = 450;
const PROFILE_LENS = 0.90;

const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};
const seatOf = (angle: number) =>
  PROFILE_AREAS.reduce((best, s) => (Math.abs(turn(angle, s.at)) < Math.abs(turn(angle, best.at)) ? s : best));
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const onRim = (deg: number, radius: number = RIM) => {
  const t = rad(deg);
  return { x: C.x + Math.cos(t) * radius, y: C.y + Math.sin(t) * radius };
};
const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const field = "w-full border-b bg-transparent py-1 text-[15px] outline-none";
const btn = "g-meta underline underline-offset-4";

export function MyGRing({
  onClose,
  onAccount,
  onTalk,
  onDetail,
  area,
}: {
  onClose: () => void;
  onMessages?: () => void;
  onAccount?: () => void;
  onTalk?: (connectionId: string) => void;
  onDetail?: (itemId: string) => void;
  area?: { id: ProfileAreaId; n: number };
}) {
  const me = useMyProfile();
  const root = useRef<HTMLDivElement | null>(null);
  const start: number = area ? areaById(area.id).at : 0;
  const [box, setBox] = useState({ w: 390, h: 700 });
  const [deg, setDeg] = useState<number>(start);
  const [opened, setOpened] = useState<ProfileAreaId | null>(area && area.id !== "myg" ? area.id : "bio");
  const [span, setSpan] = useState(FIT_W);
  const [intro, setIntro] = useState(() => (reduced() ? 1 : 0));
  const [recMode, setRecMode] = useState(false);
  const [typed, setTyped] = useState("");
  const [tense, setTense] = useState<"current" | "past">("current");
  const [bioDraft, setBioDraft] = useState<Bio | null>(null);
  const voice = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const degRef = useRef(start);
  const anim = useRef(0);
  const drag = useRef<{ id: number; onBead: boolean; moved: number; t: number; held: boolean; centre: Point; radii: Point; raw: number | null; down: Point } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTick = useRef<number>(seatOf(start).at);
  const dockedOnMyg = useRef(start === 180);
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
    node.focus({ preventScroll: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (intro >= 1) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ENTRY_MS);
      setIntro(k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const put = (d: number) => {
    degRef.current = d;
    setDeg(d);
  };

  /** One easeOut of the single angle; reduced motion jumps. */
  const glideTo = (target: number) => {
    cancelAnimationFrame(anim.current);
    const from = degRef.current;
    const delta = turn(from, target);
    const duration = settleDuration(delta, reduced());
    if (!duration || Math.abs(delta) < 0.5) return put(from + delta);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      put(from + delta * easeOut(k));
      if (k < 1) anim.current = requestAnimationFrame(step);
      else put(from + delta);
    };
    anim.current = requestAnimationFrame(step);
  };

  const goTo = (id: ProfileAreaId, open = true) => {
    const a = areaById(id);
    lastTick.current = a.at;
    dockedOnMyg.current = id === "myg";
    glideTo(a.at);
    setOpened(open && id !== "myg" ? id : null);
    buzz(16);
  };

  /* Voice from the main G arrives here at the same area touch reaches. */
  useEffect(() => {
    if (area && area.n) goTo(area.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area?.n]);

  useEffect(() => () => { cancelAnimationFrame(anim.current); if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const seat = seatOf(deg);
  const settledSeat = seatOf(degRef.current);

  /** Words (spoken or typed) inside My G: navigate, or fill the open area's draft. */
  const heard = (words: string) => {
    const text = words.trim();
    if (!text) return;
    const to = profileAreaOf(text);
    if (to) {
      if (to === "activity") setTense(activityTenseOf(text));
      goTo(to);
      return;
    }
    if (opened === "bio") {
      setBioDraft((d) => ({ ...(d ?? bioFrom()), about: [d?.about ?? me.aboutMe, text].filter(Boolean).join(" ") }));
    }
  };
  const heardRef = useRef(heard);
  heardRef.current = heard;
  useEffect(() => {
    if (!recMode) return;
    const off = voiceCapture.onFinal((w) => heardRef.current(w));
    return () => {
      off();
    };
  }, [recMode]);

  const bioFrom = () => ({
    username: (me.username ?? "").replace(/^@/, ""),
    about: me.aboutMe ?? "",
    birthday: me.birthday ?? "",
  });

  /* ---- camera: the bead sits toward the screen edge, the area opens inward. */
  const bead = onRim(deg);
  const aspect = box.h / Math.max(box.w, 1);
  /* Entry: one easeOut from the whole G into the toggle circle. */
  const e = 1 - Math.pow(1 - intro, 3);
  // Reuse communi-g's bounded angle lens; the original upper ring is unchanged.
  const lens = scaleOf(deg) / scaleOf(0);
  const photoNear = Math.max(0, 1 - Math.abs(turn(deg, 45)) / 45);
  const photoFit = photoNear * photoNear * (3 - 2 * photoNear);
  const closeW = span * PROFILE_LENS / lens;
  const targetW = closeW + (OUTER * 2.25 * span / FIT_W - closeW) * photoFit;
  const viewW = 778 + (targetW - 778) * e;
  const viewH = viewW * aspect;
  const screenScale = box.w / targetW;
  const a = rad(deg);
  const ringPixels = RIM * screenScale;
  const anchor = {
    x: box.w / 2 + Math.cos(a) * Math.max(0, box.w / 2 - 44),
    y: box.h / 2 + Math.sin(a) * Math.min(box.h / 2 - 64, ringPixels * .78),
  };
  // Camera follows the actual upper-ring bead, never a substitute lower path.
  const followX = bead.x - (anchor.x - box.w / 2) / screenScale;
  const followY = bead.y - (anchor.y - box.h / 2) / screenScale;
  const targetCx = followX + (C.x - followX) * photoFit;
  const targetCy = followY + (C.y + box.h * .06 / screenScale - followY) * photoFit;
  const cx = 272 + (targetCx - 272) * e;
  const cy = 520 + (targetCy - 520) * e;
  const vx = cx - viewW / 2;
  const vy = cy - viewH / 2;
  const toScreen = (p: Point) => ({
    x: ((p.x - vx) / viewW) * box.w,
    y: ((p.y - vy) / viewH) * box.h,
  });
  const hollow = toScreen(C);
  const safeRadius = (RING.EAR.innerR / viewW) * box.w;
  const photoView = opened === "photo" && !recMode;
  const panelLeft = photoView ? 20 : Math.max(20, hollow.x - safeRadius * .66);
  const panelRight = photoView ? box.w - 20 : Math.min(box.w - 20, hollow.x + safeRadius * .66);
  const panelW = Math.max(100, panelRight - panelLeft);
  const panelTop = photoView
    ? Math.min(box.h - 104, hollow.y + safeRadius + 32)
    : Math.max(24, hollow.y - safeRadius * .68);
  const panelMaxH = photoView ? box.h - panelTop - 12
    : Math.max(100, Math.min(safeRadius * 1.36, box.h - panelTop - 32));

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-interior]")) return;
    if (drag.current || !e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    const onBead = Boolean((e.target as Element).closest("[data-bead]"));
    if (!onBead) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const radii = { x: Math.max(1, rect.width / 2 - 54), y: Math.max(1, rect.height / 2 - 54) };
    const down = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, onBead, moved: 0, t: Date.now(), held: false, centre, radii, down, raw: inputAngle(down, centre, radii) };
    if (onBead) {
      holdTimer.current = setTimeout(() => {
        const d = drag.current;
        if (!d || d.moved > 10) return;
        d.held = true;
        /* Hold & release toggles record mode — it never starts recording. */
        setRecMode((r) => {
          if (r) voiceCapture.stop();
          else voiceCapture.prepare();
          return !r;
        });
        buzz(24);
      }, HOLD_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || d.held) return;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.down.x, e.clientY - d.down.y));
    const raw = inputAngle({ x: e.clientX, y: e.clientY }, d.centre, d.radii);
    if (raw === null) { d.raw = null; return; }
    const delta = d.raw === null ? 0 : signedTurn(d.raw, raw);
    d.raw = raw;
    if (d.moved > 6) clearHold();
    if (!delta) return;
    const next = degRef.current + delta;
    const nextSeat = seatOf(next);
    if (nextSeat.at !== lastTick.current) {
      lastTick.current = nextSeat.at;
      dockedOnMyg.current = false;
      setOpened(nextSeat.id === "myg" ? null : nextSeat.id);
      haptics.selection();
    }
    put(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    clearHold();
    if (e.type === "pointercancel") { glideTo(seatOf(degRef.current).at); return; }
    if (d.held) return;
    const at = seatOf(degRef.current);
    if (d.moved > 6) {
      lastTick.current = at.at;
      glideTo(at.at);
      setOpened(at.id === "myg" ? null : at.id);
      buzz(16);
      dockedOnMyg.current = at.id === "myg";
      return;
    }
    if (!d.onBead || e.type === "pointercancel") return;
    /* TAP on the bead. */
    if (recMode) {
      if (voice.state === "listening") voiceCapture.stop();
      else voiceCapture.start();
      buzz(12);
      return;
    }
    if (at.id === "myg") {
      if (dockedOnMyg.current) onClose();
      dockedOnMyg.current = true;
      return;
    }
    setOpened(at.id);
    buzz(12);
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input,textarea,button")) return;
    const i = PROFILE_AREAS.findIndex((a) => a.id === settledSeat.id);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = PROFILE_AREAS[(i + 1) % 8]; if (next) goTo(next.id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = PROFILE_AREAS[(i + 7) % 8]; if (next) goTo(next.id);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (settledSeat.id === "myg") onClose();
      else setOpened(settledSeat.id);
    } else if (e.key === "Escape") {
      if (opened) setOpened(null);
      else onClose();
    }
  };

  const name = (me.username ?? "").replace(/^@/, "");
  const showPanel = !drag.current || drag.current.held || drag.current.moved < 10;

  return (
    <div
      ref={root}
      tabIndex={0}
      role="application"
      aria-label={`my g profile loop, on ${seat.word}. arrow keys move, enter opens.`}
      data-profile-loop=""
      data-profile-seat={seat.id}
      data-profile-angle={deg}
      data-profile-camera-angle={deg}
      className="absolute inset-0 overflow-hidden outline-none"
      style={{ background: PAPER, color: INK }}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={() => {
        if (drag.current) {
          drag.current = null;
          clearHold();
          glideTo(seatOf(degRef.current).at);
        }
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          const a = e.touches[0];
          const b = e.touches[1];
          if (!a || !b) return;
          pinch.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || !pinch.current) return;
        const a = e.touches[0], b = e.touches[1];
        if (!a || !b) return;
        const ratio = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY)/pinch.current;
        setSpan(FIT_W * Math.min(1.8, Math.max(1, 1/ratio)));
      }}
      onTouchEnd={() => { if (pinch.current && span > FIT_W * 1.45) { voiceCapture.cancel(); onClose(); } else setSpan(FIT_W); pinch.current=0; }}
      onTouchCancel={() => { pinch.current=0; setSpan(FIT_W); }}
      onWheel={(e) => {
        if ((e.target as HTMLElement).closest("[data-interior]")) return;
        setSpan((s) => Math.min(FIT_W * 2.2, Math.max(FIT_W * 0.85, s + e.deltaY * 0.1)));
      }}
    >
      <svg viewBox={`${vx} ${vy} ${viewW} ${viewH}`} className="h-full w-full overflow-visible" aria-hidden>
        <defs><clipPath id="profile-photo-hollow"><circle cx={C.x} cy={C.y} r={RING.EAR.innerR-4} /></clipPath></defs>
        {seat.id === "photo" && me.photo ? <image data-profile-photo="" href={me.photo} x={C.x-RING.EAR.innerR} y={C.y-RING.EAR.innerR} width={RING.EAR.innerR*2} height={RING.EAR.innerR*2} preserveAspectRatio="xMidYMid slice" clipPath="url(#profile-photo-hollow)" /> : null}
        <path d={arcPath(MID, -104, -76, RIM_PATCH.rMid)} fill="none" stroke={BLUE} strokeWidth={8} vectorEffect="non-scaling-stroke" />
        <line x1={C.x} y1={C.y+RIM} x2={C.x} y2={C.y+RIM+12} stroke={BLUE} strokeWidth={8} vectorEffect="non-scaling-stroke" />
        <circle data-profile-rim="" cx={C.x} cy={C.y} r={RING.RING_MID} fill="none" stroke={BLUE} strokeWidth={17} vectorEffect="non-scaling-stroke" />
        <g data-bead="" style={{ cursor: "pointer", touchAction: "none" }}>
          <circle cx={bead.x} cy={bead.y} r={RING.RING_W / 2 + 3} fill={PAPER} stroke={BLUE} strokeWidth={3} />
          {recMode ? (
            <circle cx={bead.x} cy={bead.y} r={voice.state === "listening" ? 5 : 6.5} fill={BLUE} opacity={voice.state === "listening" ? 1 : 0.85}>
              {voice.state === "listening" && !reduced() ? (
                <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
              ) : null}
            </circle>
          ) : (
            <circle cx={bead.x} cy={bead.y} r={3} fill={BLUE} />
          )}
        </g>
        {/* Bigger invisible grip so the small bead is easy to catch. */}
        <circle data-bead="" cx={bead.x} cy={bead.y} r={Math.max(RING.RING_W, 22 * viewW / box.w)} fill="transparent" style={{ touchAction: "none" }} />
      </svg>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
        {PROFILE_AREAS.map(item => {
          const on = item.id === seat.id;
          if (Math.abs(turn(seat.at, item.at)) > 45) return null;
          const p = toScreen(onRim(item.at, OUTER + 11));
          if (on) p.y -= Math.abs(Math.sin(deg * Math.PI / 180)) * 58;
          const size = on ? 22 : 18;
          const half = item.word.length * size * .31;
          return <text key={item.id} data-profile-label={item.id}
            x={Math.max(half + 12, Math.min(box.w - half - 12, p.x))}
            y={Math.max(26, Math.min(box.h - 26, p.y))}
            textAnchor="middle" dominantBaseline="central" fill={BLUE} stroke={PAPER} strokeWidth={4} paintOrder="stroke"
            fontSize={size} fontWeight={on ? 900 : 700} opacity={on ? 1 : .5}
            style={{ fontFamily: "var(--giver-font)", letterSpacing: 0 }}>{item.word}</text>;
        })}
      </svg>

      {showPanel && (opened || recMode) ? (
        <div
          data-interior=""
          className={`absolute ${opened === "bio" && !recMode ? "overflow-visible" : "overflow-y-auto"} overscroll-contain touch-auto px-1 pb-3 transition-opacity duration-200`}
          style={{ left: panelLeft, top: panelTop, width: panelW, height: panelMaxH, color: INK, textAlign: "left" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!photoView ? <h1 className={`g-heading ${opened === "bio" ? "mb-2" : "mb-5"}`} style={{ color: BLUE }}>{seat.word}</h1> : null}
          {recMode ? (
            <form
              className="mb-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                heard(typed);
                setTyped("");
              }}
            >
              <input
                aria-label="type instead"
                className={field}
                style={{ borderColor: BLUE }}
                placeholder={voice.state === "unsupported" ? "type here — voice isn't available" : "or type, e.g. show my chats"}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              <Button variant="ghost" type="submit" className={btn} style={{ color: BLUE }}>go</Button>
            </form>
          ) : null}
          {opened ? (
            <Area
              id={opened}
              tense={tense}
              setTense={setTense}
              bioDraft={bioDraft}
              setBioDraft={setBioDraft}
              bioFrom={bioFrom}
              onTalk={onTalk}
              onDetail={onDetail}
              onAccount={onAccount}
            />
          ) : null}
        </div>
      ) : null}

      {recMode && voice.transcript ? (
        <p className="g-body pointer-events-none absolute inset-x-6 bottom-6 line-clamp-3 text-center text-[14px]" style={{ color: INK }} aria-live="polite">
          {voice.transcript}
        </p>
      ) : null}
      {name ? <span className="sr-only">@{name}</span> : null}
    </div>
  );
}

function Area({
  id,
  tense,
  setTense,
  bioDraft,
  setBioDraft,
  bioFrom,
  onTalk,
  onDetail,
  onAccount,
}: {
  id: ProfileAreaId;
  tense: "current" | "past";
  setTense: (t: "current" | "past") => void;
  bioDraft: Bio | null;
  setBioDraft: (d: Bio | null) => void;
  bioFrom: () => Bio;
  onTalk?: ((id: string) => void) | undefined;
  onDetail?: ((id: string) => void) | undefined;
  onAccount?: (() => void) | undefined;
}): ReactNode {
  const me = useMyProfile();
  const items = useItems();
  const links = useConnections();
  const ledger = useLedger();
  const walls = useWall();
  const photo = useProfilePhoto();
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.getServer);
  const [pass, setPass] = useState({ a: "", b: "", note: "" });

  if (id === "bio") {
    const d = bioDraft ?? bioFrom();
    const set = (k: keyof Bio, v: string) => setBioDraft({ ...d, [k]: v });
    const dirty = bioDraft !== null && JSON.stringify(bioDraft) !== JSON.stringify(bioFrom());
    const birthdayResult = profileBirthdaySchema().safeParse(d.birthday);
    const birthdayError = birthdayResult.success ? "" : birthdayResult.error.issues[0]?.message ?? "enter a valid birthday";
    const row = (k: keyof Bio, label: string, multi = false) => (
      <label className="mb-2 block">
        <span className="g-meta block opacity-60">{label}</span>
        {multi ? (
          <textarea className={`${field} resize-none`} rows={2} maxLength={1000} value={d[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
        ) : (
          <input className={field} value={d[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
        )}
      </label>
    );
    return (
      <div data-profile-bio="">
        {row("username", "username")}
        {row("about", "about me", true)}
        <label className="mb-2 block">
          <span className="g-meta block">birthday · only you</span>
          <input type="date" aria-label="birthday" aria-invalid={Boolean(birthdayError)} aria-describedby={birthdayError ? "profile-birthday-error" : undefined} {...birthdayBounds()} className={`${field} min-h-11 min-w-0 max-w-full`} value={d.birthday} onChange={e => set("birthday", e.target.value)} />
        </label>
        {birthdayError ? <p id="profile-birthday-error" role="alert" className="g-meta mb-2">{birthdayError}</p> : null}
        <div className="flex gap-4">
          <Button variant="ghost"
            type="button"
            className={btn}
            style={{ color: BLUE, opacity: dirty ? 1 : 0.4 }}
            disabled={!dirty || Boolean(birthdayError)}
            onClick={() => {
              if (!profileBirthdaySchema().safeParse(d.birthday).success) return;
              const u = (d.username ?? "").trim().replace(/^@/, "");
              myProfileStore.patch({
                ...(u ? { username: `@${u}` } : {}),
                aboutMe: (d.about ?? "").trim(),
                birthday: d.birthday,
              });
              setBioDraft(null);
              buzz(16);
            }}
          >
            save
          </Button>
          {dirty ? <Button variant="ghost" type="button" className={btn} onClick={() => setBioDraft(null)}>undo</Button> : null}
        </div>
      </div>
    );
  }

  if (id === "photo") {
    return (
      <div className="flex flex-col items-center gap-3">
        {!me.photo ? <p className="g-body">no photo yet.</p> : null}
        <div className="grid w-full min-w-0 grid-cols-2 gap-2">
          <Button variant="ghost" type="button" className="g-body min-w-0 p-1 underline underline-offset-4 hover:bg-transparent" style={{ color: BLUE }} onClick={() => void photo.choose()}>
            {photo.loading ? "opening…" : me.photo ? "change photo" : "add a photo"}
          </Button>
          {me.photoSource ? (
            <Button variant="ghost" type="button" className="g-body min-w-0 p-1 underline underline-offset-4 hover:bg-transparent" onClick={() => me.photoSource && photo.reposition(me.photoSource, me.photoCrop)}>reposition</Button>
          ) : null}
        </div>
        {photo.failed ? <p className="g-meta">that picture couldn't be read. try another.</p> : null}
        {photo.cropper ? <div className="fixed inset-0 z-50">{photo.cropper}</div> : null}
      </div>
    );
  }

  if (id === "reputation") {
    const wall = wallOf(walls, ME_ID);
    const done = myPastConnections(links);
    if (!wall.length && !done.length) {
      return <p className="g-body">nothing yet. when someone you've helped confirms it happened, or leaves you a note, it shows here.</p>;
    }
    return (
      <div>
        <p className="g-body mb-3">{done.length} confirmed {done.length === 1 ? "exchange" : "exchanges"} · {wall.length} {wall.length === 1 ? "note" : "notes"}</p>
        {wall.map((c) => (
          <p key={c.id} className="g-body mb-2">“{c.text}” <span className="g-meta opacity-60">{memberById(c.fromId)?.username ?? ""}</span></p>
        ))}
      </div>
    );
  }

  if (id === "chats") {
    const mine = myConnections(links);
    if (!mine.length) return <p className="g-body">no conversations yet. they start when you connect over a give, wish, trade or borrow.</p>;
    return (
      <ul>
        {mine.map((c) => {
          const who = memberById(otherParty(c))?.username ?? "someone";
          const last = messagesOf(links, c.id).at(-1);
          return (
            <li key={c.id} className="mb-3">
              <Button variant="ghost" type="button" className="w-full text-left" onClick={() => onTalk?.(c.id)}>
                <span className="g-name block text-[15px]">{who}</span>
                <span className="g-meta block truncate opacity-60">{last?.text ?? "no messages yet"}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (id === "sparks") {
    const ev = eventsOf(ledger, "spark").slice(0, 20);
    return (
      <div>
        <p className="g-heading text-[28px]" style={{ letterSpacing: 0 }}>{me.sparks}</p>
        <p className="g-meta mb-3 opacity-60">
          sparks available · {reservedTotal(me)} held in wishes · {me.giveSparks} to give · {me.sparkles} sparkles
        </p>
        {ev.length ? (
          ev.map((e) => (
            <p key={e.id} className="g-body mb-1 flex justify-between gap-3 text-[14px]">
              <span>{e.say}</span>
              <span className="shrink-0">{signed(e.amount)} · {whenWord(e.at)}</span>
            </p>
          ))
        ) : (
          <p className="g-body">no spark movements recorded yet.</p>
        )}
      </div>
    );
  }

  if (id === "activity") {
    const mine = items.items.filter((i) => i.ownerId === ME_ID && (tense === "current" ? i.status === "active" || i.status === "paused" : i.status === "completed" || i.status === "archived"));
    const kind = (i: Item) => (i.type === "borrow" && i.side === "lend" ? "lend" : i.type);
    return (
      <div>
        <div className="mb-3 flex gap-4">
          {(["current", "past"] as const).map((t) => (
            <Button variant="ghost" key={t} type="button" className={btn} style={{ color: t === tense ? BLUE : INK, opacity: t === tense ? 1 : 0.5 }} onClick={() => setTense(t)}>
              {t}
            </Button>
          ))}
        </div>
        {mine.length ? (
          mine.map((i) => (
            <Button variant="ghost" key={i.id} type="button" className="mb-2 block w-full text-left" onClick={() => onDetail?.(i.id)}>
              <span className="g-meta mr-2 opacity-60">{kind(i)}</span>
              <span className="g-body">{itemLine(i)}</span>
            </Button>
          ))
        ) : (
          <p className="g-body">no {tense} gives, wishes, trades, borrows, lends or funds.</p>
        )}
      </div>
    );
  }

  if (id === "settings") {
    return (
      <div>
        <p className="g-meta mb-3 opacity-60">{session.email ?? "not signed in"}</p>
        {session.userId ? (
          <form
            className="mb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pass.a !== pass.b || !passwordStrongEnough(pass.a)) {
                setPass({ ...pass, note: "use matching passwords with 8 characters, a letter and a number." });
                return;
              }
              const { error } = await supabase.auth.updateUser({ password: pass.a });
              setPass({ a: "", b: "", note: error ? "that didn't save. try again." : "password changed." });
            }}
          >
            <input type="password" autoComplete="new-password" className={`${field} mb-2`} placeholder="new password" value={pass.a} onChange={(e) => setPass({ ...pass, a: e.target.value })} />
            <input type="password" autoComplete="new-password" className={`${field} mb-2`} placeholder="again" value={pass.b} onChange={(e) => setPass({ ...pass, b: e.target.value })} />
            <Button variant="ghost" type="submit" className={btn} style={{ color: BLUE }}>change password</Button>
            {pass.note ? <p className="g-meta mt-1">{pass.note}</p> : null}
          </form>
        ) : null}
        <div className="flex flex-col items-start gap-2">
          <Button variant="ghost" type="button" className={btn} onClick={() => onAccount?.()}>account, birthday & privacy</Button>
          {session.userId ? <Button variant="ghost" type="button" className={btn} onClick={() => void supabase.auth.signOut()}>sign out</Button> : null}
        </div>
      </div>
    );
  }
  return null;
}
