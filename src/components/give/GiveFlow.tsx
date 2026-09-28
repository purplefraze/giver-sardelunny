import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormG } from "@/components/forms/UnifiedForm";
import { GStage } from "@/components/living-g/GStage";
import { GThinMask } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX } from "@/components/living-g/g-path";
import { CAMERA, anchorOrigin } from "@/components/living-g/g-depth";
import { GIVE_TYPES, inferGiveType, type GiveType } from "@/data/give-lexicon";
import { giveHintStore } from "@/data/give-hint";
import { giverRepeatLine } from "@/data/give-sessions";
import {
  USES_CALENDAR,
  dayLabel,
  defaultExpiry,
  defaultPickDate,
  expiresAt,
  expiryLabel,
  localDate,
  todayIso,
  whenLabel,
  type Expiry,
  type WhenPick,
} from "@/data/give-when";
import { savePin, pinFor, type Pin } from "@/data/give-pins";
import {
  CADENCE_OPTIONS,
  classifyKind,
  itemsStore,
  suggestCadence,
  timeWindow,
  type Item,
  type ItemDetails,
  type Topic,
} from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { ensureLiveSession } from "@/data/cloud/session";
import { pullItems, pushItems } from "@/data/cloud/items-sync";
import { prepareGivePhoto, uploadGivePhoto, type PreparedPhoto } from "@/lib/give-photo";
import { haptics } from "@/lib/haptics";
import { LocationPicker, type WhereAnswer } from "./LocationPicker";

/**
 * GIVE, ONE QUESTION AT A TIME, ON ONE SURFACE.
 *
 * One soft mint card in the give world, the zoomed middle-loop arcs in give
 * green behind it on a mint surround. Every question sits side by side on ONE
 * horizontal track inside the card; the view slides between them and the
 * route never changes. The last track position is the finished give.
 *
 *   swipe left = next · swipe right = back (any number of steps, every
 *   earlier answer stays editable) · tapping an answer advances after 250ms
 *   · the slide follows the finger and springs; a short swipe snaps back
 *   · a light haptic on every move to another question
 *
 * THE TRACK (per type — the questions the give flow already asked):
 *   what are you giving? · what kind of give is it? ·
 *   when …? (food: when is it ready?) · how often? (time / skill / hand) ·
 *   where …? · size? (clothes) · condition? (thing / clothes) ·
 *   how long is it up? · the finished give
 *
 * BEST GUESS, WITH AN ESCAPE HATCH: every question opens with the app's best
 * guess already chosen (solid blue, weight 500; the rest the same blue at
 * 45%). Every question with choices ends with "something else", which turns
 * into an underlined line with the keyboard up; whatever is typed becomes
 * the answer.
 *
 * PHOTO: one blue plus on the card, always; it opens the phone's own picker
 * (a real <input type=file accept="image/*">). A thumbnail sits beside it;
 * tapping it offers replace / remove, on the same surface.
 *
 * FIRST GIVE ONLY: "swipe to continue" under the first answer, gone after 3s
 * or the first swipe / tap; seen is kept on the device and the account
 * (give-hint.ts — auth user metadata, no migration).
 *
 * SAVED AS (no schema change — the existing items columns + details jsonb):
 *   text            the "what" line
 *   details.topic   thing/clothes → items / household · food → food ·
 *                   time → services / help · a skill → skills / teaching ·
 *                   a hand → home / repair
 *   details.extras  { kind, size?, condition?, ready?, when?, up? } — a typed
 *                   "something else" lands here as said
 *   details.cadence one time · weekly · fortnightly · monthly · or as typed
 *   details.where   the COARSE label only — the exact pin stays on this device
 *   details.date / startTime / endTime / time   a picked day
 *   details.expiresAt   UTC ISO
 *   details.photoPath + photos[0]   the uploaded photo (post-media bucket)
 *
 * SIGNED IN = IT POSTS. No email is ever sent from here: with a live session
 * the give goes straight through; a session that cannot be renewed returns
 * the person to the G sign-in (session.ts ensureLiveSession).
 */

const BLUE = "#1E7BFF";
const GIVE_GREEN = "#4BE01E";

const TOPIC_OF: Record<GiveType, Topic> = {
  "a thing": "items / household",
  clothes: "items / household",
  food: "food",
  time: "services / help",
  "a skill": "skills / teaching",
  "a hand": "home / repair",
};

const WHEN_PROMPT: Record<GiveType, string> = {
  "a thing": "when can they collect it?",
  clothes: "when can they collect it?",
  food: "when is it ready?",
  time: "when are you free?",
  "a skill": "when?",
  "a hand": "when?",
};
const WHERE_PROMPT: Record<GiveType, string> = {
  "a thing": "where is it?",
  clothes: "where is it?",
  food: "where is it?",
  time: "where?",
  "a skill": "where?",
  "a hand": "where?",
};
const CAN_BE_ONLINE: Record<GiveType, boolean> = {
  "a thing": false,
  clothes: false,
  food: false,
  time: true,
  "a skill": true,
  "a hand": false,
};
/** Gives that can repeat — the only ones asked "how often?". */
const ASKS_OFTEN: Record<GiveType, boolean> = {
  "a thing": false,
  clothes: false,
  food: false,
  time: true,
  "a skill": true,
  "a hand": true,
};

const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const CONDITIONS = ["like new", "good", "well loved"] as const;
const READY = ["now", "in an hour", "this evening", "tomorrow"] as const;

const OTHER = "other";
const ADVANCE_MS = 250;
const HINT_MS = 3000;

type ChoiceId = "kind" | "when" | "ready" | "often" | "where" | "size" | "condition" | "expiry";
type Opt = { key: string; label: string; pick?: "date" | "map" };
type ChoiceStep = { id: ChoiceId; ask: string; options: Opt[]; placeholder: string };
type Step = { id: "what"; ask: string } | ChoiceStep | { id: "done" };
type Where = { label: string; online: boolean; pin: Pin | null; mode: WhereAnswer["mode"] | null };

const opts = (list: readonly string[]): Opt[] => list.map((k) => ({ key: k, label: k }));

/** A stored answer back onto its question: one of the choices, or typed. */
function split(v: string | undefined, list: readonly string[]): { c?: string; o?: string } {
  if (!v) return {};
  return list.includes(v) ? { c: v } : { c: OTHER, o: v };
}

/** "10 days", "2 weeks", "a month" → days; anything else keeps the default. */
function daysSaid(text: string): number | null {
  const t = text.toLowerCase();
  const n = /(\d+)\s*(day|week|month)/.exec(t);
  if (n) {
    const k = Number(n[1]);
    const days = n[2] === "week" ? k * 7 : n[2] === "month" ? k * 30 : k;
    return days > 0 && days <= 90 ? days : null;
  }
  if (/\bweek\b/.test(t)) return 7;
  if (/\bmonth\b/.test(t)) return 30;
  if (/\btomorrow\b/.test(t)) return 1;
  return null;
}

/** A light tick on every move to another question. */
function tick() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(10);
    } catch {
      /* not allowed yet: nothing felt, nothing broken */
    }
    return;
  }
  haptics.selection();
}

/** Opens a date input's own native picker, where the browser allows it. */
function openPicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    input.showPicker();
  } catch {
    input.focus({ preventScroll: true });
    input.click();
  }
}

/** THE ZOOMED MIDDLE LOOP — the same artwork and camera numbers GDepthLevel
 *  unfurls with, held at rest in give green behind the card. */
function GiveArcs() {
  const o = anchorOrigin("middle");
  return (
    <div
      className="gv-arcs"
      aria-hidden="true"
      style={{
        transform: `translateZ(0) scale(${CAMERA.unfurl})`,
        transformOrigin: `${o.x}% ${o.y}%`,
      }}
    >
      <GStage>
        <svg viewBox={LIVING_G_VIEWBOX} className="h-full w-full overflow-visible">
          <defs>
            <GThinMask id="gv-arcs-thin" weight="middle" />
          </defs>
          <g transform={LIVING_G_TRANSFORM} fill={GIVE_GREEN}>
            <path d={LIVING_G_PATH} mask="url(#gv-arcs-thin)" />
          </g>
          <MiddleLoopClose weight="middle" fill={GIVE_GREEN} />
        </svg>
      </GStage>
    </div>
  );
}

export function GiveFlow({ onDone, prefill }: { onDone: () => void; prefill?: Item | null }) {
  const pre = prefill?.details;
  const preExtras = pre?.extras ?? {};

  /* ---- ANSWERS ---- */
  const [what, setWhat] = useState(prefill?.text ?? "");
  const [choice, setChoice] = useState<Partial<Record<ChoiceId, string>>>(() => {
    const c: Partial<Record<ChoiceId, string>> = {};
    const put = (id: ChoiceId, s: { c?: string }) => {
      if (s.c) c[id] = s.c;
    };
    put("kind", split(preExtras["kind"], GIVE_TYPES));
    if (pre?.date) c.when = "pick";
    else put("when", split(preExtras["when"], ["this weekend"]));
    put("ready", split(preExtras["ready"], READY));
    put("often", split(pre?.cadence, CADENCE_OPTIONS));
    if (pre?.where === "online") c.where = "online";
    put("size", split(preExtras["size"], SIZES));
    put("condition", split(preExtras["condition"], CONDITIONS));
    if (preExtras["up"]) c.expiry = OTHER;
    return c;
  });
  const [other, setOther] = useState<Partial<Record<ChoiceId, string>>>(() => {
    const o: Partial<Record<ChoiceId, string>> = {};
    const put = (id: ChoiceId, s: { o?: string }) => {
      if (s.o) o[id] = s.o;
    };
    put("kind", split(preExtras["kind"], GIVE_TYPES));
    if (!pre?.date) put("when", split(preExtras["when"], ["this weekend"]));
    put("ready", split(preExtras["ready"], READY));
    put("often", split(pre?.cadence, CADENCE_OPTIONS));
    put("size", split(preExtras["size"], SIZES));
    put("condition", split(preExtras["condition"], CONDITIONS));
    if (preExtras["up"]) o.expiry = preExtras["up"];
    return o;
  });
  const [editing, setEditing] = useState<ChoiceId | null>(null);
  /** Back to the best guess. */
  const unset = (id: ChoiceId) =>
    setChoice((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  const [pickDate, setPickDate] = useState<string | null>(pre?.date ?? null);
  const [upDate, setUpDate] = useState<string | null>(null);
  const [mapWhere, setMapWhere] = useState<Where | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* ---- THE TRACK ---- */
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<"off" | "on" | "gone">("off");

  const root = useRef<HTMLDivElement | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const whatInput = useRef<HTMLInputElement | null>(null);
  const otherInput = useRef<HTMLInputElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const whenDate = useRef<HTMLInputElement | null>(null);
  const upDateInput = useRef<HTMLInputElement | null>(null);
  const advance = useRef<number | undefined>(undefined);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    w: number;
    on: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  /* The best guess for "where": this give's own place when posting again,
     else the place of my most recent give (its pin stays on this device). */
  const whereGuess = useMemo<Where | null>(() => {
    if (prefill && pre?.where && pre.where !== "online") {
      const pin = pinFor(prefill.id);
      return { label: pre.where, online: false, pin, mode: pin ? "neighbourhood" : null };
    }
    const mine = itemsStore
      .get()
      .items.filter(
        (i) =>
          i.ownerId === "me" &&
          i.type === "give" &&
          i.details?.where &&
          i.details.where !== "online",
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!mine?.details?.where) return null;
    const pin = pinFor(mine.id);
    return { label: mine.details.where, online: false, pin, mode: pin ? "neighbourhood" : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const described = what.trim().length >= 3;
  const lexGuess = useMemo(() => inferGiveType(what), [what]);
  const typed = (id: ChoiceId) => (other[id] ?? "").trim();

  const kindRaw =
    choice.kind === OTHER && typed("kind") ? OTHER : (choice.kind ?? lexGuess ?? "a thing");
  const type: GiveType =
    kindRaw === OTHER
      ? (inferGiveType(typed("kind")) ?? lexGuess ?? "a thing")
      : (kindRaw as GiveType);
  const usesCalendar = USES_CALENDAR[type];

  const guessOf = (id: ChoiceId, when: WhenPick | null): string | null => {
    switch (id) {
      case "kind":
        return lexGuess ?? "a thing";
      case "when":
        return usesCalendar ? "this weekend" : "today";
      case "ready":
        return "now";
      case "often": {
        const c = suggestCadence(what, classifyKind(what));
        return c && (CADENCE_OPTIONS as readonly string[]).includes(c) ? c : "one time";
      }
      case "where":
        return whereGuess ? "guess" : CAN_BE_ONLINE[type] ? "online" : null;
      case "size":
        return null;
      case "condition":
        return "good";
      case "expiry": {
        if (usesCalendar && when) return "when";
        const d = defaultExpiry(type);
        return d.kind === "days" && d.days === 7 ? "7 days" : "1 day";
      }
    }
  };

  /* What each question currently answers: the choice, or the best guess
     (a blank "something else", an unpicked day or an unpicked place fall back). */
  const rawPick = (id: ChoiceId): string | null => {
    const c = choice[id];
    if (c === OTHER) return typed(id) ? OTHER : null;
    if (c === "pick" && id === "when" && !pickDate) return null;
    if (c === "pick" && id === "expiry" && !upDate) return null;
    if (c === "map" && !mapWhere) return null;
    if (c === "guess" && !whereGuess) return null;
    if (c === "online" && !CAN_BE_ONLINE[type]) return null;
    return c ?? null;
  };

  /* A concrete day, when there is one: "today" or a picked day. */
  const whenRaw = rawPick("when") ?? guessOf("when", null);
  const concreteWhen: WhenPick | null =
    type === "food"
      ? null
      : whenRaw === "today"
        ? { date: todayIso() }
        : whenRaw === "pick" && pickDate
          ? {
              date: pickDate,
              ...(pre?.date === pickDate && pre?.startTime ? { start: pre.startTime } : {}),
              ...(pre?.date === pickDate && pre?.startTime && pre?.endTime
                ? { end: pre.endTime }
                : {}),
            }
          : null;

  const pickOf = (id: ChoiceId): string | null => {
    const r = rawPick(id);
    if (r === "when" && !(usesCalendar && concreteWhen)) return guessOf(id, concreteWhen);
    return r ?? guessOf(id, concreteWhen);
  };

  const whereAnswer: Where | null = (() => {
    const p = pickOf("where");
    if (p === "guess") return whereGuess;
    if (p === "online") return { label: "online", online: true, pin: null, mode: null };
    if (p === "map") return mapWhere;
    if (p === OTHER) return { label: typed("where"), online: false, pin: null, mode: null };
    return null;
  })();

  const expiry: Expiry = (() => {
    const p = pickOf("expiry");
    const fallback = defaultExpiry(type);
    if (p === "1 day") return { kind: "days", days: 1 };
    if (p === "3 days") return { kind: "days", days: 3 };
    if (p === "7 days") return { kind: "days", days: 7 };
    if (p === "when") return { kind: "when" };
    if (p === "pick" && upDate) return { kind: "date", date: upDate };
    if (p === OTHER) {
      const d = daysSaid(typed("expiry"));
      return d ? { kind: "days", days: d } : fallback;
    }
    return fallback;
  })();

  const steps: Step[] = useMemo(() => {
    const list: Step[] = [
      { id: "what", ask: "what are you giving?" },
      {
        id: "kind",
        ask: "what kind of give is it?",
        options: opts(GIVE_TYPES),
        placeholder: "something handmade",
      },
    ];
    if (type === "food") {
      list.push({
        id: "ready",
        ask: WHEN_PROMPT.food,
        options: opts(READY),
        placeholder: "after 6 tonight",
      });
    } else {
      list.push({
        id: "when",
        ask: WHEN_PROMPT[type],
        options: [
          { key: "today", label: "today" },
          { key: "this weekend", label: "this weekend" },
          {
            key: "pick",
            label: pickDate ? dayLabel(localDate(pickDate, "12:00")) : "pick a day",
            pick: "date",
          },
        ],
        placeholder: "weekday evenings",
      });
    }
    if (ASKS_OFTEN[type]) {
      list.push({
        id: "often",
        ask: "how often?",
        options: opts(CADENCE_OPTIONS),
        placeholder: "every other sunday",
      });
    }
    list.push({
      id: "where",
      ask: WHERE_PROMPT[type],
      options: [
        ...(whereGuess ? [{ key: "guess", label: whereGuess.label }] : []),
        ...(CAN_BE_ONLINE[type] ? [{ key: "online", label: "online" }] : []),
        { key: "map", label: mapWhere ? mapWhere.label : "on the map", pick: "map" as const },
      ],
      placeholder: "near dundas west station",
    });
    if (type === "clothes")
      list.push({ id: "size", ask: "size?", options: opts(SIZES), placeholder: "10 us" });
    if (type === "a thing" || type === "clothes") {
      list.push({
        id: "condition",
        ask: "condition?",
        options: opts(CONDITIONS),
        placeholder: "one small scratch",
      });
    }
    list.push({
      id: "expiry",
      ask: "how long is it up?",
      options: [
        ...opts(["1 day", "3 days", "7 days"]),
        ...(usesCalendar && concreteWhen
          ? [{ key: "when", label: `until ${whenLabel(concreteWhen)}` }]
          : []),
        {
          key: "pick",
          label: upDate ? `until ${dayLabel(localDate(upDate))}` : "pick a date",
          pick: "date" as const,
        },
      ],
      placeholder: "until the weekend",
    });
    list.push({ id: "done" });
    return list;
    // concreteWhen is derived from the deps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type,
    pickDate,
    upDate,
    mapWhere,
    whereGuess,
    usesCalendar,
    concreteWhen?.date,
    concreteWhen?.start,
    concreteWhen?.end,
  ]);

  const last = steps.length - 1;
  const at = Math.min(index, last);
  const stepIndex = (id: Step["id"]) => steps.findIndex((s) => s.id === id);

  /* ---- MOVING ALONG THE TRACK ---- */
  const go = useCallback(
    (to: number) => {
      window.clearTimeout(advance.current);
      const next = Math.max(0, Math.min(to, last));
      if (at === 0 && next > 0 && !described) {
        haptics.warning();
        whatInput.current?.focus({ preventScroll: true });
        return;
      }
      setHint((h) => (h === "on" ? "gone" : h));
      if (next === at) return;
      tick();
      setPhotoMenu(false);
      setIndex(next);
    },
    [at, last, described],
  );
  const goRef = useRef(go);
  goRef.current = go;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const advanceFrom = (id: Step["id"]) => {
    window.clearTimeout(advance.current);
    advance.current = window.setTimeout(() => {
      const i = stepsRef.current.findIndex((s) => s.id === id);
      if (i >= 0) goRef.current(i + 1);
    }, ADVANCE_MS);
  };

  useEffect(() => () => window.clearTimeout(advance.current), []);

  /* Leaving a question closes its keyboard; a blank "something else" returns
     the question to its best guess. */
  useEffect(() => {
    const a = document.activeElement;
    if (a instanceof HTMLElement && !panels.current[at]?.contains(a)) a.blur();
    if (viewport.current) viewport.current.scrollLeft = 0;
  }, [at]);

  useEffect(() => {
    if (editing) otherInput.current?.focus({ preventScroll: true });
  }, [editing]);

  /* The first question opens with the keyboard up, as before. */
  useEffect(() => {
    if (!prefill) whatInput.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* FIRST GIVE ONLY: the one hint. */
  useEffect(() => {
    if (prefill) return;
    let dead = false;
    let t: number | undefined;
    void giveHintStore.seen().then((seen) => {
      if (dead || seen) return;
      setHint("on");
      giveHintStore.markSeen();
      t = window.setTimeout(() => setHint((h) => (h === "on" ? "gone" : h)), HINT_MS);
    });
    return () => {
      dead = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Once faded, the hint leaves the surface for good. */
  useEffect(() => {
    if (hint !== "gone") return;
    const t = window.setTimeout(() => setHint("off"), 900);
    return () => window.clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || mapOpen) return;
      if (photoMenu) setPhotoMenu(false);
      else if (at > 0) goRef.current(at - 1);
      else onDone();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [at, mapOpen, photoMenu, onDone]);

  const choose = (step: ChoiceStep, opt: Opt | null) => {
    window.clearTimeout(advance.current);
    setHint((h) => (h === "on" ? "gone" : h));
    setSay(null);
    if (!opt) {
      setChoice((c) => ({ ...c, [step.id]: OTHER }));
      setEditing(step.id);
      return;
    }
    setEditing(null);
    setChoice((c) => ({ ...c, [step.id]: opt.key }));
    haptics.selection();
    if (opt.pick === "date") {
      openPicker(step.id === "expiry" ? upDateInput.current : whenDate.current);
      return;
    }
    if (opt.pick === "map") {
      setMapOpen(true);
      return;
    }
    advanceFrom(step.id);
  };

  /* ---- GESTURES: the slide follows the finger, then springs. ---- */
  const onPointerDown = (e: React.PointerEvent) => {
    setHint((h) => (h === "on" ? "gone" : h));
    if (mapOpen) return;
    if ((e.target as Element).closest("[data-noswipe]")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      w: viewport.current?.clientWidth ?? 360,
      on: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      g.on = true;
      window.clearTimeout(advance.current);
      setPhotoMenu(false);
      setDragging(true);
      try {
        root.current?.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety */
      }
    }
    const resist =
      (at === 0 && dx > 0) || (at === last && dx < 0) || (at === 0 && dx < 0 && !described);
    setDrag(resist ? dx * 0.28 : dx);
  };
  const endGesture = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.on) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 60);
    setDragging(false);
    setDrag(0);
    if (cancelled) return;
    const dx = e.clientX - g.x;
    const v = dx / Math.max(e.timeStamp - g.t, 1);
    const far = Math.abs(dx) > g.w * 0.22 || (Math.abs(v) > 0.5 && Math.abs(dx) > 30);
    if (far) go(at + (dx < 0 ? 1 : -1));
  };

  /* ---- PHOTO ---- */
  const onFile = async (file: File | undefined) => {
    setPhotoMenu(false);
    if (!file) return;
    const out = await prepareGivePhoto(file);
    if (!out.ok) {
      haptics.warning();
      setSay("that photo can’t be read here — try a jpeg or png");
      return;
    }
    setSay(null);
    setPhoto(out.photo);
    haptics.light();
  };
  const openPhotos = () => {
    setPhotoMenu(false);
    const input = fileInput.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  /* ---- PUBLISH (the existing path) ---- */
  const push = async () => {
    try {
      await pushItems();
      await pullItems();
    } catch {
      /* the give is saved on this device; it syncs on the next pass */
    }
  };

  const send = async () => {
    if (busy || live) return;
    const where = whereAnswer;
    if (!described) {
      haptics.warning();
      setIndex(0);
      return;
    }
    if (!where || !where.label) {
      haptics.warning();
      setIndex(stepIndex("where"));
      return;
    }
    const kindLabel = kindRaw === OTHER ? typed("kind") : type;
    const extras: Record<string, string> = { kind: kindLabel };
    if (type === "clothes") {
      const s = pickOf("size");
      if (s) extras["size"] = s === OTHER ? typed("size") : s;
    }
    if (type === "a thing" || type === "clothes") {
      const c = pickOf("condition");
      if (c) extras["condition"] = c === OTHER ? typed("condition") : c;
    }
    if (type === "food") {
      const r = pickOf("ready");
      if (r) extras["ready"] = r === OTHER ? typed("ready") : r;
    } else {
      const w = pickOf("when");
      if (w === "this weekend") extras["when"] = "this weekend";
      if (w === OTHER) extras["when"] = typed("when");
    }
    if (pickOf("expiry") === OTHER) extras["up"] = typed("expiry");
    const often = ASKS_OFTEN[type] ? pickOf("often") : null;
    const when = concreteWhen;
    const details: ItemDetails = {
      topic: TOPIC_OF[type],
      extras,
      where: where.online ? "online" : where.label,
      expiresAt: expiresAt(expiry, when).toISOString(),
      ...(often ? { cadence: often === OTHER ? typed("often") : often } : {}),
      ...(when
        ? {
            date: when.date,
            ...(when.start ? { startTime: when.start } : {}),
            ...(when.end ? { endTime: when.end } : {}),
            ...(when.start ? { time: timeWindow(when.start, when.end) } : {}),
          }
        : {}),
    };
    setBusy(true);
    /* A dead session goes back to the G sign-in — never a login email. */
    if ((await ensureLiveSession()) === "ended") {
      setBusy(false);
      return;
    }
    const result = myProfileStore.addItem("give", what.trim(), undefined, undefined, { details });
    if (!result.ok || !result.id) {
      setBusy(false);
      haptics.warning();
      setSay(
        result.reason === "account"
          ? (result.say ?? "finish your account in my g to publish this.")
          : "you can have three gives at a time — remove one to add another.",
      );
      return;
    }
    const id = result.id;
    if (where.pin && !where.online) savePin(id, where.pin);
    let photoNote: string | null = null;
    if (photo) {
      const up = await uploadGivePhoto(id, photo);
      if (up)
        itemsStore.patch(id, { photos: [up.url], details: { ...details, photoPath: up.path } });
      else photoNote = "your give is saved — the photo couldn’t be added this time.";
    }
    void push(); // saved on this device; the sync never holds the screen
    setBusy(false);
    setSay(photoNote);
    haptics.light();
    setLive("it’s live in communi-g");
  };

  /* ---- THE FINISHED GIVE'S QUIET LINES ---- */
  const lineOf = (s: ChoiceStep): string => {
    const p = pickOf(s.id);
    /* A REPEATING GIVE shows its cadence. The per-lesson sparks line
       (giverRepeatLine) is null while SESSION_SPARKS is held at 0 until the
       phone-tap ticket, so the plain cadence shows. */
    if (s.id === "often") {
      const cadence = p === OTHER ? typed(s.id) : (p ?? "");
      const kind = kindRaw === OTHER ? typed("kind") : type;
      return giverRepeatLine("give", { cadence, extras: { kind } }) ?? cadence;
    }
    if (p === OTHER) return typed(s.id);
    switch (s.id) {
      case "kind":
        return type;
      case "when":
        return p === "pick" && pickDate ? whenLabel(concreteWhen ?? { date: pickDate }) : (p ?? "");
      case "ready":
        return `ready ${p}`;
      case "where":
        return whereAnswer?.label ?? "where?";
      case "size":
        return p ? `size ${p}` : "size?";
      case "expiry":
        /* Always the real day it comes down, e.g. "up until mon 5 oct". */
        return expiry.kind === "days"
          ? `up until ${dayLabel(expiresAt(expiry, concreteWhen))}`
          : expiryLabel(expiry, concreteWhen);
      default:
        return p ?? "";
    }
  };

  const hintOn = hint === "on";

  return (
    <div
      ref={root}
      className="gv-root"
      data-testid="give-flow"
      data-step={steps[at]?.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endGesture(e, false)}
      onPointerCancel={(e) => endGesture(e, true)}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <GiveArcs />

      <div className="gv-card">
        <div className="gv-g" data-noswipe>
          <FormG onBack={onDone} colour={live ? GIVE_GREEN : BLUE} height={28} />
        </div>

        {/* THE PHOTO — a blue plus, and once added a small thumbnail beside it. */}
        <div className="gv-photo" data-noswipe>
          {photo ? (
            <button
              type="button"
              className="gv-thumb"
              aria-label="your photo — replace or remove"
              aria-expanded={photoMenu}
              onClick={() => setPhotoMenu((m) => !m)}
            >
              <img src={photo.url} alt="" />
            </button>
          ) : null}
          <button type="button" className="gv-plus" aria-label="add a photo" onClick={openPhotos}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 4.5v15M4.5 12h15"
                fill="none"
                stroke={BLUE}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="gv-file"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {photo && photoMenu ? (
            <div className="gv-photo-menu" role="menu">
              <button type="button" role="menuitem" className="gv-a" onClick={openPhotos}>
                replace
              </button>
              <button
                type="button"
                role="menuitem"
                className="gv-a"
                onClick={() => {
                  setPhoto(null);
                  setPhotoMenu(false);
                  haptics.light();
                }}
              >
                remove
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={viewport}
          className="gv-viewport"
          onScroll={(e) => {
            (e.currentTarget as HTMLDivElement).scrollLeft = 0;
          }}
        >
          <div
            className="gv-track"
            style={{
              transform: `translate3d(calc(${-at * 100}% + ${drag}px), 0, 0)`,
              transition: dragging ? "none" : undefined,
            }}
          >
            {steps.map((s, i) => (
              <section
                key={s.id}
                ref={(el) => {
                  panels.current[i] = el;
                }}
                className="gv-panel"
                data-panel={s.id}
                aria-hidden={i !== at}
                inert={i !== at && !dragging ? true : undefined}
              >
                {s.id === "what" ? (
                  <>
                    <h2 className="gv-q">{s.ask}</h2>
                    <div className="gv-answers">
                      <input
                        ref={whatInput}
                        className="gv-line"
                        value={what}
                        maxLength={50}
                        onChange={(e) => {
                          setWhat(e.target.value.slice(0, 50));
                          setSay(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") goRef.current(1);
                        }}
                        placeholder="something"
                        spellCheck={false}
                        enterKeyHint="next"
                        aria-label="what are you giving?"
                      />
                    </div>
                    {hint !== "off" ? (
                      <p
                        className={`gv-hint ${hintOn ? "" : "gv-hint--gone"}`}
                        data-testid="give-hint"
                        aria-hidden={!hintOn}
                      >
                        swipe to continue
                      </p>
                    ) : null}
                  </>
                ) : s.id === "done" ? (
                  <>
                    <h2 className="gv-q">{what.trim() || "what are you giving?"}</h2>
                    {photo ? <img className="gv-done-photo" src={photo.url} alt="" /> : null}
                    <div className="gv-summary">
                      {steps.map((q) =>
                        q.id === "what" || q.id === "done" ? null : (
                          <button
                            key={q.id}
                            type="button"
                            className="gv-a gv-sum"
                            disabled={!!live}
                            onClick={() => go(stepIndex(q.id))}
                          >
                            {lineOf(q)}
                          </button>
                        ),
                      )}
                    </div>
                    {say ? <p className="gv-a gv-say">{say}</p> : null}
                    {live ? (
                      <p className="gv-a gv-say" role="status">
                        {live}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="gv-send"
                        aria-label="give it"
                        disabled={busy}
                        onClick={() => void send()}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M5 12h13.5M13 6.5 18.5 12 13 17.5"
                            fill="none"
                            stroke="#EEF9EA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="gv-q">{s.ask}</h2>
                    <div className="gv-answers" role="radiogroup" aria-label={s.ask}>
                      {s.options.map((o) => {
                        const on = pickOf(s.id) === o.key && editing !== s.id;
                        return (
                          <div key={o.key} className="gv-opt">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={on}
                              className="gv-a"
                              onClick={() => choose(s, o)}
                            >
                              {o.label}
                            </button>
                            {o.pick === "date" ? (
                              <input
                                ref={s.id === "expiry" ? upDateInput : whenDate}
                                type="date"
                                className="gv-date"
                                tabIndex={-1}
                                aria-hidden="true"
                                min={todayIso()}
                                value={
                                  (s.id === "expiry" ? upDate : pickDate) ??
                                  (s.id === "expiry" ? defaultPickDate() : todayIso())
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) return;
                                  if (s.id === "expiry") setUpDate(v);
                                  else setPickDate(v);
                                  setChoice((c) => ({ ...c, [s.id]: "pick" }));
                                  advanceFrom(s.id);
                                }}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                      {editing === s.id || (choice[s.id] === OTHER && typed(s.id)) ? (
                        <input
                          ref={editing === s.id ? otherInput : undefined}
                          className="gv-line gv-line--on"
                          value={other[s.id] ?? ""}
                          maxLength={40}
                          placeholder={s.placeholder}
                          spellCheck={false}
                          enterKeyHint="next"
                          aria-label={`${s.ask} something else`}
                          onFocus={() => {
                            setEditing(s.id);
                            setChoice((c) => ({ ...c, [s.id]: OTHER }));
                          }}
                          onChange={(e) => {
                            const v = e.target.value.slice(0, 40);
                            setOther((o) => ({ ...o, [s.id]: v }));
                            setChoice((c) => ({ ...c, [s.id]: OTHER }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                              if (typed(s.id)) goRef.current(i + 1);
                            }
                          }}
                          onBlur={() => {
                            setEditing((ed) => (ed === s.id ? null : ed));
                            if (!typed(s.id)) unset(s.id);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={false}
                          className="gv-a"
                          onClick={() => choose(s, null)}
                        >
                          something else
                        </button>
                      )}
                    </div>
                  </>
                )}
              </section>
            ))}
          </div>
        </div>
        {say && steps[at]?.id !== "done" ? (
          <p className="gv-a gv-say gv-say--float">{say}</p>
        ) : null}
      </div>

      {mapOpen ? (
        <div data-noswipe>
          <LocationPicker
            prompt={WHERE_PROMPT[type]}
            initial={
              mapWhere?.pin && mapWhere.mode
                ? { pin: mapWhere.pin, label: mapWhere.label, mode: mapWhere.mode }
                : null
            }
            onBack={() => {
              setMapOpen(false);
              if (!mapWhere) unset("where");
            }}
            onDone={(a) => {
              setMapWhere({ label: a.label, online: false, pin: a.pin, mode: a.mode });
              setChoice((c) => ({ ...c, where: "map" }));
              setMapOpen(false);
              advanceFrom("where");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
