import { useEffect, useRef, useState } from "react";
import { FormG, FormQuestion, FormSend } from "@/components/forms/UnifiedForm";
import { GIVE_LEXICON, GIVE_TYPES, inferGiveType, type GiveType } from "@/data/give-lexicon";
import { giveFirstRunStore } from "@/data/give-firstrun";
import {
  EXPIRY_PRESETS,
  USES_CALENDAR,
  defaultExpiry,
  expiresAt,
  expiryLabel,
  whenLabel,
  type Expiry,
  type WhenPick,
} from "@/data/give-when";
import { savePin, pinFor } from "@/data/give-pins";
import { itemsStore, timeWindow, type Item, type ItemDetails, type Topic } from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { ensureLiveSession } from "@/data/cloud/session";
import { pullItems, pushItems } from "@/data/cloud/items-sync";
import { pickImages } from "@/lib/pick-image";
import { prepareGivePhoto, uploadGivePhoto, type PreparedPhoto } from "@/lib/give-photo";
import { haptics } from "@/lib/haptics";
import { LocationPicker, type WhereAnswer } from "./LocationPicker";
import { WhenPicker } from "./WhenPicker";

/**
 * GIVE, ONE LINE AT A TIME (/workspace/giver-give-infer/give-infer-*.png).
 *
 * Line 1 is "what". As they type, a debounced local lexicon guess
 * (give-lexicon.ts) appears as one quiet green word with a grey "change".
 * Nothing matched → "what are you giving?" with the six choices. Then only
 * that type's lines rise in, each once the one above is answered or skipped:
 *
 *   a thing / clothes   add a photo · when can they collect it? · where is it? ·
 *                       size?/condition? · up for 7 days
 *   food                add a photo · when is it ready? · where is it? · up for 1 day
 *   time                add a photo · when are you free? · where? · up for 1 day / up until …
 *   a skill / a hand    add a photo · when? · where? · up for 1 day / up until …
 *
 * The send circle appears once what + type + where are filled.
 *
 * "WHEN" IS A CALENDAR (WhenPicker), never a silent "anytime": things and
 * clothes now ask "when can they collect it?" on the same month grid time /
 * a skill / a hand use (optional — skip leaves it open). Food keeps its
 * ready-by answers. Only time / skill / hand let the date end the give.
 *
 * FIRST RUN ONLY (give-firstrun.ts): under the heading, "stuck on what you
 * can give? tap for suggestions" — a tap shows a few words drawn from the
 * give lexicon (GIVE_LEXICON), one tap fills "what" with it.
 *
 * SAVED AS (no schema change — the existing items columns + details jsonb):
 *   text            the "what" line
 *   details.topic   thing/clothes → items / household · food → food ·
 *                   time → services / help · a skill → skills / teaching ·
 *                   a hand → home / repair
 *   details.extras  { kind, size?, condition?, ready? }
 *   details.where   the COARSE label only ("the annex", "near dundas st w",
 *                   or "online") — the exact pin stays on this device
 *   details.date / startTime / endTime / time   the calendar answer
 *   details.expiresAt   UTC ISO
 *   details.photoPath + photos[0]   the uploaded photo (post-media bucket)
 *
 * SIGNED IN = IT POSTS. No email is ever sent from here: with a live session
 * the give goes straight through; a session that cannot be renewed returns
 * the person to the G sign-in (session.ts ensureLiveSession).
 */

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
const WHEN_HINT: Record<GiveType, string> = {
  "a thing": "pick a day",
  clothes: "pick a day",
  food: "tonight after 6",
  time: "evenings, weekends…",
  "a skill": "pick a day",
  "a hand": "this week",
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

/**
 * FIRST-RUN SUGGESTIONS — words straight out of the give lexicon (stems shown
 * without their "*"), a couple per type, so a tap always lands on a type the
 * guess already knows. Only entries that really are in GIVE_LEXICON survive.
 */
const SUGGEST_FROM: Record<GiveType, string[]> = {
  "a thing": ["ladder*", "stroller*", "book*"],
  clothes: ["coat*", "hoodie*"],
  food: ["sourdough", "soup*"],
  time: ["dog walk*", "company"],
  "a skill": ["guitar", "french"],
  "a hand": ["help moving", "paint*"],
};
const SUGGESTIONS: { type: GiveType; word: string }[] = GIVE_TYPES.flatMap((type) =>
  SUGGEST_FROM[type]
    .filter((k) => GIVE_LEXICON[type].includes(k))
    .map((k) => ({ type, word: k.replace(/\*$/, "") })),
);

/** Tag options — kept minimal. */
const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const CONDITIONS = ["like new", "good", "well loved"] as const;
const READY = ["now", "in an hour", "this evening", "tomorrow"] as const;

type Where = { label: string; online: boolean; pin: WhereAnswer["pin"] | null; mode: WhereAnswer["mode"] | null };
type Screen = "form" | "map" | "when" | "ready" | "size" | "condition" | "expiry" | "expiry-date";

const INFER_MS = 450;
const FALLBACK_MS = 1100;

export function GiveFlow({ onDone, prefill }: { onDone: () => void; prefill?: Item | null }) {
  const pre = prefill?.details;
  const preKind = pre?.extras?.["kind"] as GiveType | undefined;
  const [what, setWhat] = useState(prefill?.text ?? "");
  const [guess, setGuess] = useState<GiveType | null>(() => (prefill ? inferGiveType(prefill.text) : null));
  const [picked, setPicked] = useState<GiveType | null>(preKind && GIVE_TYPES.includes(preKind) ? preKind : null);
  const [changing, setChanging] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoSkipped, setPhotoSkipped] = useState(false);
  const [photoSay, setPhotoSay] = useState<string | null>(null);
  const [when, setWhen] = useState<WhenPick | null>(
    pre?.date ? { date: pre.date, ...(pre.startTime ? { start: pre.startTime } : {}), ...(pre.endTime ? { end: pre.endTime } : {}) } : null,
  );
  const [ready, setReady] = useState<string | null>(pre?.extras?.["ready"] ?? null);
  const [whenSkipped, setWhenSkipped] = useState(false);
  const [where, setWhere] = useState<Where | null>(() => {
    if (!prefill || !pre?.where) return null;
    const pin = pinFor(prefill.id);
    return { label: pre.where, online: pre.where === "online", pin, mode: pin ? "neighbourhood" : null };
  });
  const [size, setSize] = useState<string | null>(pre?.extras?.["size"] ?? null);
  const [condition, setCondition] = useState<string | null>(pre?.extras?.["condition"] ?? null);
  const [tagsSkipped, setTagsSkipped] = useState(false);
  const [expiry, setExpiry] = useState<Expiry | null>(null);
  const [screen, setScreen] = useState<Screen>("form");
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  /* FIRST RUN: shown on this visit only; the flag is written on open. */
  const [firstRun] = useState(() => !prefill && !giveFirstRunStore.seen());
  const [suggesting, setSuggesting] = useState(false);
  useEffect(() => {
    if (firstRun) giveFirstRunStore.markSeen();
  }, [firstRun]);

  const type: GiveType | null = picked ?? guess;
  const described = what.trim().length >= 3;

  /* THE GUESS, DEBOUNCED: it only moves once typing pauses — never per key. */
  useEffect(() => {
    if (picked) return;
    const t = window.setTimeout(() => setGuess(described ? inferGiveType(what) : null), INFER_MS);
    const f = window.setTimeout(() => setFallback(described && !inferGiveType(what)), FALLBACK_MS);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(f);
    };
  }, [what, described, picked]);

  const usesCalendar = type ? USES_CALENDAR[type] : false;
  const asksWhen = type !== null;
  const whenAnswered = type === "food" ? ready !== null : when !== null;
  const whereDone = where !== null;
  const minimum = described && type !== null && whereDone;
  const effectiveExpiry: Expiry | null = type
    ? (expiry ?? (usesCalendar && when ? { kind: "when" } : defaultExpiry(type)))
    : null;

  const choose = (t: GiveType) => {
    haptics.selection();
    setPicked(t);
    setChanging(false);
    setFallback(false);
  };

  const addPhoto = async () => {
    const files = await pickImages({ multiple: false });
    const file = files[0];
    if (!file) return;
    const out = await prepareGivePhoto(file);
    if (!out.ok) {
      setPhotoSay("that photo can’t be read here — try a jpeg or png");
      return;
    }
    setPhotoSay(null);
    setPhoto(out.photo);
    haptics.light();
  };

  const finish = (say: string) => {
    setLive(say);
    setWhat("");
    setGuess(null);
    setPicked(null);
    setPhoto(null);
    setPhotoSkipped(false);
    setWhen(null);
    setReady(null);
    setWhenSkipped(false);
    setWhere(null);
    setSize(null);
    setCondition(null);
    setTagsSkipped(false);
    setExpiry(null);
    setFallback(false);
    setScreen("form");
  };

  const push = async () => {
    try {
      await pushItems();
      await pullItems();
    } catch {
      /* the give is saved on this device; it syncs on the next pass */
    }
  };

  const send = async () => {
    if (!minimum || !type || !where || !effectiveExpiry) {
      haptics.warning();
      setProblem(!described ? "what are you giving?" : !type ? "what kind of give is it?" : "where is it?");
      return;
    }
    const extras: Record<string, string> = { kind: type };
    if (size) extras["size"] = size;
    if (condition) extras["condition"] = condition;
    if (type === "food" && ready) extras["ready"] = ready;
    const details: ItemDetails = {
      topic: TOPIC_OF[type],
      extras,
      where: where.online ? "online" : where.label,
      expiresAt: expiresAt(effectiveExpiry, when).toISOString(),
      ...(type !== "food" && when
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
      setProblem(
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
      if (up) itemsStore.patch(id, { photos: [up.url], details: { ...details, photoPath: up.path } });
      else photoNote = "your give is saved — the photo couldn’t be added this time.";
    }
    void push(); // saved on this device; the sync never holds the screen
    setBusy(false);
    setProblem(photoNote);
    haptics.light();
    finish("it’s live in communi-g");
  };

  const leave = () => onDone();

  /* ---- FULL-SCREEN STEPS ---- */
  if (screen === "map" && type) {
    return (
      <LocationPicker
        prompt={WHERE_PROMPT[type]}
        initial={where?.pin && where.mode ? { pin: where.pin, label: where.label, mode: where.mode } : null}
        onBack={() => setScreen("form")}
        onDone={(a) => {
          setWhere({ label: a.label, online: false, pin: a.pin, mode: a.mode });
          setScreen("form");
        }}
      />
    );
  }
  if (screen === "when" && type) {
    return (
      <WhenPicker
        heading={WHEN_PROMPT[type]}
        initial={when}
        onBack={() => setScreen("form")}
        onDone={(p) => {
          setWhen(p);
          setScreen("form");
        }}
      />
    );
  }
  if (screen === "expiry-date") {
    return (
      <WhenPicker
        heading="up until"
        dateOnly
        onBack={() => setScreen("form")}
        onDone={(p) => {
          setExpiry({ kind: "date", date: p.date });
          setScreen("form");
        }}
      />
    );
  }
  type Q = { heading: string; options: readonly string[]; selected: string | undefined; pick: (o: string) => boolean | void };
  const question: Q | null =
    screen === "ready"
      ? { heading: "when is it ready?", options: READY as readonly string[], selected: ready ?? undefined, pick: (o: string) => setReady(o) }
      : screen === "size"
        ? { heading: "size?", options: SIZES as readonly string[], selected: size ?? undefined, pick: (o: string) => setSize(o) }
        : screen === "condition"
          ? { heading: "condition?", options: CONDITIONS as readonly string[], selected: condition ?? undefined, pick: (o: string) => setCondition(o) }
          : screen === "expiry"
            ? {
                heading: "how long is it up?",
                options: EXPIRY_PRESETS as readonly string[],
                selected: undefined,
                pick: (o: string) => {
                  if (o === "pick a date") {
                    setScreen("expiry-date");
                    return true;
                  }
                  setExpiry({ kind: "days", days: o === "1 day" ? 1 : o === "3 days" ? 3 : 7 });
                  return false;
                },
              }
            : null;
  if (question) {
    return (
      <FormQuestion
        heading={question.heading}
        options={question.options}
        selected={question.selected}
        onBack={() => setScreen("form")}
        onPick={(o) => {
          const stay = question.pick(o);
          if (stay !== true) setScreen("form");
        }}
      />
    );
  }

  /* ---- THE FORM ---- */
  return (
    <div className="uf-screen gf-screen" data-testid="give-flow">
      <FormG onBack={leave} />
      <h1 className="uf-heading">give something</h1>
      {live ? <p className="uf-say gf-live">{live}</p> : null}
      {firstRun && !what ? (
        <div className="gf-firstrun gf-rise" data-testid="give-firstrun">
          {suggesting ? (
            <>
              <span className="uf-label">try one of these</span>
              <div className="gf-suggest-row">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.word}
                    type="button"
                    className="gf-suggest"
                    onClick={() => {
                      haptics.selection();
                      setWhat(s.word);
                      setPicked(s.type);
                      setSuggesting(false);
                      input.current?.focus();
                    }}
                  >
                    {s.word}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="gf-firstrun-ask"
              onClick={() => {
                haptics.selection();
                setSuggesting(true);
              }}
            >
              stuck on what you can give? tap for suggestions
            </button>
          )}
        </div>
      ) : null}
      <div className="uf-fields gf-fields">
        <div className="gf-what">
          <label className="uf-field gf-field block">
            <span className="uf-label">what</span>
            <input
              ref={input}
              className="uf-input"
              value={what}
              maxLength={50}
              autoFocus={!prefill}
              onChange={(e) => {
                setWhat(e.target.value.slice(0, 50));
                setLive(null);
                setProblem(null);
              }}
              onBlur={() => {
                if (described && !type) setFallback(true);
              }}
              placeholder="something"
              spellCheck={false}
              aria-label="what"
            />
          </label>
          {type && !changing ? (
            <div className="gf-kind gf-rise" data-testid="give-kind">
              <b>{type}</b>
              <button type="button" onClick={() => setChanging(true)}>
                change
              </button>
            </div>
          ) : null}
          {(changing || (!type && fallback)) ? (
            <div className="gf-types gf-rise" data-testid="give-types">
              {!type ? <span className="uf-label gf-types-ask">what are you giving?</span> : null}
              <div className="gf-type-row" role="radiogroup" aria-label="what are you giving?">
                {GIVE_TYPES.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => choose(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {type ? (
          <>
            {/* ADD A PHOTO — optional, straight after what. */}
            {photo ? (
              <div className="gf-line gf-rise gf-photo">
                <img src={photo.url} alt="your photo" />
                <button type="button" className="gf-quiet" onClick={() => setPhoto(null)}>
                  remove
                </button>
              </div>
            ) : !photoSkipped ? (
              <div className="gf-line gf-rise gf-row">
                <button type="button" className="gf-add" onClick={() => void addPhoto()}>
                  add a photo
                </button>
                <button type="button" className="gf-skip" onClick={() => setPhotoSkipped(true)}>
                  skip
                </button>
              </div>
            ) : null}
            {photoSay ? <p className="uf-say gf-rise">{photoSay}</p> : null}

            {asksWhen ? (
              <div className="uf-field gf-line gf-rise">
                <span className="uf-label">{WHEN_PROMPT[type]}</span>
                <div className="gf-value-row">
                  <button
                    type="button"
                    className={`gf-value ${whenAnswered ? "" : "gf-ph"}`}
                    onClick={() => setScreen(type === "food" ? "ready" : "when")}
                  >
                    {type === "food" ? (ready ?? WHEN_HINT[type]) : when ? whenLabel(when) : WHEN_HINT[type]}
                  </button>
                  {!whenAnswered && !whenSkipped ? (
                    <button type="button" className="gf-skip" onClick={() => setWhenSkipped(true)}>
                      skip
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* where shows with the type, as in the stills */}
            {(
              <div className="uf-field gf-line gf-rise">
                <span className="uf-label">{WHERE_PROMPT[type]}</span>
                <div className="gf-value-row">
                  <button
                    type="button"
                    className={`gf-value ${where ? "" : "gf-ph"}`}
                    onClick={() => setScreen("map")}
                  >
                    {where ? where.label : "add my location"}
                  </button>
                  {CAN_BE_ONLINE[type] && !where ? (
                    <button
                      type="button"
                      className="gf-value gf-ph gf-online"
                      onClick={() => setWhere({ label: "online", online: true, pin: null, mode: null })}
                    >
                      · or online
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {(type === "a thing" || type === "clothes") && !tagsSkipped ? (
              <div className="gf-line gf-rise gf-row gf-tags">
                {type === "clothes" ? (
                  <button type="button" className={`gf-tag ${size ? "gf-tag-on" : ""}`} onClick={() => setScreen("size")}>
                    {size ? `size ${size}` : "size?"}
                  </button>
                ) : null}
                <button type="button" className={`gf-tag ${condition ? "gf-tag-on" : ""}`} onClick={() => setScreen("condition")}>
                  {condition ?? "condition?"}
                </button>
                {!size && !condition ? (
                  <button type="button" className="gf-skip" onClick={() => setTagsSkipped(true)}>
                    skip
                  </button>
                ) : null}
              </div>
            ) : null}

            {whereDone && effectiveExpiry ? (
              <div className="gf-line gf-rise">
                <button type="button" className="gf-expiry" onClick={() => setScreen("expiry")} data-testid="give-expiry">
                  {expiryLabel(effectiveExpiry, when)}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        {problem ? <p className="uf-say gf-rise">{problem}</p> : null}
      </div>
      {minimum ? <FormSend label="give it" disabled={busy} onSend={() => void send()} /> : null}
    </div>
  );
}
