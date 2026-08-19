import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { CTA_BAND } from "@/components/living-g/GStage";
import { SparkJourney } from "@/components/living-g/SparkJourney";

import { BEAT_MS, IntroG, type LoopCopy } from "@/components/onboarding/IntroG";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * The opening of Giver. Giver speaks to the new user through the ORANGE Living
 * G on warm off-white paper — orange IS the admin voice. The G never moves and
 * never resizes; only the words inside its loops change, and the colour shifts
 * only when the MEANING shifts:
 *
 *   orange  — Giver speaking
 *   green   — the sparks that are now yours (to wish with, and to gift)
 *
 * Space carries meaning too: MIDDLE loop = me, BOTTOM loop = the community.
 * Colour and copy always arrive together, as one beat.
 */
type Stage = "opening" | "meet" | "choose" | "celebrate";

type Loop = "top" | "middle" | "bottom";

/** One beat of the opening: which G, which loops speak, and how long it holds. */
type Beat = {
  world: string;
  top?: string[];
  middle?: string[];
  bottom?: string[];
  /** Deliberate emphasis for a single transitional beat ("so..."). */
  scale?: Partial<Record<Loop, number>>;
  /** First line of a loop is the hero ("50"); the rest support it. */
  hero?: Partial<Record<Loop, boolean>>;
  /** How long this composition holds before the next beat. */
  hold?: number;
};

/**
 * Calm rhythm: a word gently arrives, it settles, and only then does the next
 * word begin. Each value is a SETTLE time — the fade itself (LOOP_WORD_MS) runs
 * underneath it, so consecutive words overlap softly rather than snapping.
 */
const WORD_BEAT = 720;
const COMPOSITION = 1350;
/** A brand name needs room: it lands, and then it is allowed to sit there. */
const HERO_BEAT = 1150;
/** The empty G, breathing — before anything is said, and between thoughts. */
const BREATH = 480;
/** A small beat between thoughts: enough air, never a dramatic wait. */
const SHORT_BEAT = 360;

/**
 * OPENING TYPE HIERARCHY, as shared tokens — never per-word guesses.
 *   BRAND  — the brand word, alone in the middle loop
 *   PHRASE — supporting language in the bottom loop
 *   PAYOFF — the invitation, once the spark has created change
 */
const BRAND = { middle: 0.9 } as const;
const PHRASE = { middle: 0.9, bottom: 0.8 } as const;
const BOTTOM_ONLY = { bottom: 0.8 } as const;
const PAYOFF = { bottom: 0.78 } as const;

/**
 * THE OPENING. No greeting, no "welcome to": the brand word simply arrives, and
 * every phrase after it hands over while the previous one is still on the paper.
 * It ends holding "spark change" — the moment the spark itself is released.
 */
const OPENING: Beat[] = [
  // 1 — the orange G, alone, breathing.
  { world: "welcome", hold: BREATH },

  // 1 — GIVER, in the middle loop. It stays for the whole first movement.
  { world: "welcome", middle: ["giver"], scale: BRAND, hold: HERO_BEAT },

  // 2 — KINDNESS · AS · CURRENCY builds underneath, while "giver" holds.
  { world: "welcome", middle: ["giver"], bottom: ["kindness"], scale: PHRASE, hold: WORD_BEAT },
  {
    world: "welcome",
    middle: ["giver"],
    bottom: ["kindness", "as"],
    scale: PHRASE,
    hold: WORD_BEAT,
  },
  {
    world: "welcome",
    middle: ["giver"],
    bottom: ["kindness", "as", "currency"],
    scale: PHRASE,
    hold: COMPOSITION,
  },

  // …then ONLY the phrase leaves. "giver" stays exactly where it is.
  { world: "welcome", middle: ["giver"], scale: BRAND, hold: SHORT_BEAT },

  // 3 — SPARK · CHANGE, still under "giver".
  { world: "welcome", middle: ["giver"], bottom: ["spark"], scale: PHRASE, hold: WORD_BEAT },
  {
    world: "welcome",
    middle: ["giver"],
    bottom: ["spark", "change"],
    scale: PHRASE,
    hold: COMPOSITION,
  },

  // …and now ONLY "giver" leaves. "spark change" holds for the rest of the way.
  { world: "welcome", bottom: ["spark", "change"], scale: BOTTOM_ONLY, hold: SHORT_BEAT },

  // 4 — HERE'S · 100 SPARKS, in the middle loop.
  {
    world: "welcome",
    middle: ["here's"],
    bottom: ["spark", "change"],
    scale: BOTTOM_ONLY,
    hold: WORD_BEAT,
  },
  {
    world: "welcome",
    middle: ["here's", "100 sparks"],
    bottom: ["spark", "change"],
    scale: BOTTOM_ONLY,
    hold: COMPOSITION,
  },
  { world: "welcome", bottom: ["spark", "change"], scale: BOTTOM_ONLY, hold: SHORT_BEAT },

  // 5 — 50 TO WISH.
  {
    world: "welcome",
    middle: ["50", "to wish"],
    hero: { middle: true },
    bottom: ["spark", "change"],
    scale: BOTTOM_ONLY,
    hold: COMPOSITION,
  },
  { world: "welcome", bottom: ["spark", "change"], scale: BOTTOM_ONLY, hold: SHORT_BEAT },

  // 6 — 50 TO GIVE. This is the phrase that BECOMES the spark.
  {
    world: "welcome",
    middle: ["50", "to give"],
    hero: { middle: true },
    bottom: ["spark", "change"],
    scale: BOTTOM_ONLY,
    hold: COMPOSITION,
  },

  // 7 — the middle loop empties as the spark is released at its opening.
  { world: "welcome", bottom: ["spark", "change"], scale: BOTTOM_ONLY },
];




const HOLD = COMPOSITION;


const ROLE_COLOUR: Record<Member["world"], string> = {
  // Every sample person is ANOTHER PERSON from my perspective: BLUE.
  giving: "var(--giver-others)",
  wishing: "var(--giver-others)",
  trading: "var(--giver-others)",
  borrowing: "var(--giver-others)",
};

const LOOPS: Loop[] = ["top", "middle", "bottom"];

const same = (a?: string[], b?: string[]) =>
  (a ?? []).join("|") === (b ?? []).join("|");

type LoopState = Record<Loop, { lines: string[]; opacity: number }>;

const EMPTY: LoopState = {
  top: { lines: [], opacity: 0 },
  middle: { lines: [], opacity: 0 },
  bottom: { lines: [], opacity: 0 },
};

/** Commit a beat's composition. Pure, so index and copy always agree. */
function commit(prev: LoopState, beat: Beat): LoopState {
  const out = { ...prev };
  for (const key of LOOPS) {
    const lines = beat[key];
    if (lines) out[key] = { lines, opacity: 1 };
    else out[key] = { ...prev[key], opacity: 0 };
  }
  return out;
}

/**
 * Plays a list of beats. Each loop is treated independently: a loop only fades
 * when its own words change, so a message can hold while another arrives.
 *
 * THE INDEX AND THE COPY ARE ONE STATE. A beat's composition is committed in the
 * SAME update that advances the index, so no frame can ever pair a new phrase
 * with the previous beat's reveal count — that mismatch was the flash of a
 * finished phrase before its animation began.
 */
function useBeats(script: Beat[]) {
  const [state, setState] = useState<{ i: number; loops: LoopState }>(() => ({
    i: 0,
    loops: commit(EMPTY, script[0]!),
  }));
  const { i, loops } = state;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const last = i === script.length - 1;

  useEffect(() => {
    const beat = script[i]!;
    const next = script[i + 1];
    if (!next) return;

    const hold = beat.hold ?? HOLD;

    // A loop only fades when its thought is REPLACED. When the next beat simply
    // adds a word to what is already there, the existing words hold perfectly
    // still and only the new word fades in.
    const grows = (key: Loop) => {
      const a = beat[key] ?? [];
      const b = next[key] ?? [];
      return b.length >= a.length && same(a, b.slice(0, a.length));
    };
    const replaced = LOOPS.filter((key) => !grows(key));

    const advance = (delay: number) =>
      setTimeout(
        () => setState((s) => ({ i: s.i + 1, loops: commit(s.loops, script[s.i + 1]!) })),
        delay,
      );

    if (replaced.length === 0) {
      timers.current = [advance(hold)];
      return () => timers.current.forEach(clearTimeout);
    }

    const fade = setTimeout(() => {
      setState((s) => {
        const out = { ...s.loops };
        for (const key of replaced) out[key] = { ...s.loops[key], opacity: 0 };
        return { i: s.i, loops: out };
      });
    }, hold);
    timers.current = [fade, advance(hold + BEAT_MS)];
    return () => timers.current.forEach(clearTimeout);
  }, [i, script]);


  /**
   * THE FINAL COMPOSITION, KNOWN IN ADVANCE. A loop's plan is the fullest form
   * of the phrase it is currently building — found by walking forward while the
   * next beat only ADDS to what is already there. Layout is computed from that
   * plan, so a revealed word never moves when the next one arrives.
   */
  const plan = (key: Loop): string[] => {
    // A loop that is FADING OUT (or merely holding a previous thought) must
    // never adopt a future beat's composition: doing so swapped the words in
    // while the group was still visible — the "100 sparks" pre-flash.
    if (!script[i]![key]) return loops[key].lines;
    let j = i;
    while (j + 1 < script.length) {
      const a = script[j]![key] ?? [];
      const b = script[j + 1]![key] ?? [];
      if (!(b.length >= a.length && same(a, b.slice(0, a.length)))) break;
      j += 1;
    }
    return script[j]![key] ?? [];
  };

  /** The last beat that actually spoke through this loop owns its treatment. */
  const owner = (key: Loop): Beat => {
    for (let j = i; j >= 0; j -= 1) if (script[j]![key]) return script[j]!;
    return script[i]!;
  };

  const copy = (key: Loop): LoopCopy | undefined => {
    if (!loops[key].lines.length) return undefined;
    const full = plan(key);
    const own = owner(key);
    const scale = own.scale?.[key];
    const hero = own.hero?.[key];
    return {
      lines: loops[key].lines,
      plan:
        full.length >= loops[key].lines.length &&
        same(loops[key].lines, full.slice(0, loops[key].lines.length))
          ? full
          : loops[key].lines,
      opacity: loops[key].opacity,
      ...(scale ? { scale } : {}),
      ...(hero ? { hero } : {}),
    };
  };


  return { world: script[i]!.world, copy, last };
}



export function Onboarding({ onDone }: { onDone: (gaveTo: string | null) => void }) {
  const [stage, setStage] = useState<Stage>("opening");
  const [who, setWho] = useState(0);
  const [chosen, setChosen] = useState<Member | null>(null);

  if (stage === "opening") {
    return (
      <OpeningSequence
        onDone={() => {
          buzz();
          setWho(0);
          setStage("meet");
        }}
      />
    );
  }

  if (stage === "meet") {
    const member = MEMBERS[who]!;
    return (
      <MemberExample
        member={member}
        first={who === 0}
        last={who === MEMBERS.length - 1}
        onBack={() => setStage("opening")}
        onPrev={() => setWho((w) => Math.max(0, w - 1))}
        onNext={() => setWho((w) => Math.min(MEMBERS.length - 1, w + 1))}
        onDone={() => setStage("choose")}
      />
    );
  }


  if (stage === "celebrate" && chosen) {
    return (
      <FirstGenerosity
        username={chosen.username}
        onDone={() => onDone(chosen.name)}
      />
    );
  }

  // The first act of generosity. Not optional: one of the four, or nothing.
  return (
    <ChooseRecipient
      onBack={() => {
        setWho(MEMBERS.length - 1);
        setStage("meet");
      }}
      onChoose={(m) => {
        buzz([10, 40, 18]);
        setChosen(m);
        setStage("celebrate");
      }}
    />
  );
}

/**
 * Giver, speaking — and then handing over. The scripted words end holding "spark
 * change"; from that moment the lesson becomes PHYSICAL: a spark is released at
 * the middle loop's opening and travels the G's own path (it can be dragged, or
 * it will travel on its own). When it lands, the green resolves outward from
 * where it landed, and only then does Giver make the invitation.
 */
function OpeningSequence({ onDone }: { onDone: () => void }) {
  const { world, copy, last } = useBeats(OPENING);
  const [phase, setPhase] = useState<"script" | "travel" | "arriving" | "landed">("script");
  const [green, setGreen] = useState(false);
  const [cue, setCue] = useState(false);

  // The spark is released the moment "50 to give" has left the middle loop.
  useEffect(() => {
    if (!last || phase !== "script") return;
    const t = setTimeout(() => setPhase("travel"), 320);
    return () => clearTimeout(t);
  }, [last, phase]);

  useEffect(() => {
    if (phase !== "landed") return;
    const t = setTimeout(() => setCue(true), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  const scripted = copy("bottom");
  const bottom: LoopCopy | undefined =
    phase === "landed"
      ? {
          lines: ["and make", "someone's day!"],
          plan: ["and make", "someone's day!"],
          scale: PAYOFF.bottom,
          opacity: 1,
        }
      : phase === "arriving" && scripted
        ? { ...scripted, opacity: 0 }
        : scripted;

  return (
    <IntroG
      world={green ? "gift" : world}
      top={copy("top")}
      middle={copy("middle")}
      bottom={bottom}
      {...(phase !== "script"
        ? {
            overlay: (
              <SparkJourney
                onArrive={() => {
                  setPhase("arriving");
                  // The phrase it replaces is allowed to leave first.
                  setTimeout(() => setPhase("landed"), BEAT_MS);
                }}
                onGreen={() => setGreen(true)}
              />
            ),
          }
        : {})}
    >
      <LetsGiver show={cue} onClick={onDone} />
    </IntroG>
  );
}

/**
 * THE GIVER CALL TO ACTION. Not a button, not a pill, not an arrow — just the
 * words, in Giver's own language: let's giver.
 */
function LetsGiver({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <div
      // A quiet next step in the BOTTOM-RIGHT corner, outside the artwork.
      className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-end pr-7"
      // The stage reserves this exact strip, so the words never cross the stroke.
      style={{
        height: `calc(env(safe-area-inset-bottom) + ${CTA_BAND})`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="px-1 text-[5.2vw] font-black lowercase leading-none tracking-[-0.045em] transition-opacity duration-[900ms] ease-[cubic-bezier(0.32,0,0.24,1)] active:opacity-60"
        style={{
          // The bright G green, never the deep furniture tint.
          color: "var(--world-g)",
          opacity: show ? 1 : 0,
          pointerEvents: show ? "auto" : "none",
        }}
      >

        let&apos;s giver
      </button>
    </div>
  );
}



/**
 * A sequence of lines that arrive one after another with the established fade
 * rhythm — no typewriter, no popping. Reports when the whole thought has
 * settled, so what comes next can wait its turn.
 */
function useSpeech(count: number, step = 1100, settle = 1400) {
  const [shown, setShown] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= count; i += 1) {
      timers.push(setTimeout(() => setShown(i), i * step));
    }
    timers.push(setTimeout(() => setSettled(true), count * step + settle));
    return () => timers.forEach(clearTimeout);
  }, [count, step, settle]);

  return { shown, settled };
}

/** One line of speech: it simply becomes present, slowly and softly. */
function Spoken({
  show,
  className,
  style,
  duration = 780,
  children,
}: {
  show: boolean;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn("block", className)}
      style={{
        opacity: show ? 1 : 0,
        transition: `opacity ${duration}ms cubic-bezier(0.32,0,0.24,1)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/**
 * THE QUESTION SPEAKS FIRST. Giver asks, phrase by phrase; only once the whole
 * question has settled do the four people arrive — all together.
 */
const QUESTION = ["who", "would you", "like to give", "your 50 sparks", "to?"];

function ChooseRecipient({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (m: Member) => void;
}) {
  const { shown, settled } = useSpeech(QUESTION.length, 180, 800);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <BackArrow onClick={onBack} />
      <h1
        className="text-[13vw] font-black lowercase leading-[0.92] tracking-[-0.05em]"
        style={{ color: "var(--giver-generosity)" }}
      >
        {QUESTION.map((phrase, i) => (
          <Spoken key={phrase} show={i < shown} duration={220}>
            {phrase}
          </Spoken>
        ))}
      </h1>

      {/* The choices arrive as one, after the question. */}
      <div
        className="mt-11 flex flex-col items-start gap-4"
        style={{
          opacity: settled ? 1 : 0,
          transition: "opacity 700ms cubic-bezier(0.32,0,0.24,1)",
          pointerEvents: settled ? "auto" : "none",
        }}
      >
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChoose(m)}
            className="text-left text-[9.5vw] font-black lowercase leading-[0.95] tracking-[-0.05em] transition-transform active:scale-95"
            style={{ color: ROLE_COLOUR[m.world] }}
          >
            {m.username}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * THE FIRST GIFT, MADE HUMAN. A warm pat on the back, the sparks confirmed,
 * then one honest question about messaging — asked, never assumed.
 */
function FirstGenerosity({
  username,
  onDone,
}: {
  username: string;
  onDone: () => void;
}) {
  const [asked, setAsked] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  // MEANINGFUL BEAT: nothing advances on its own here. The user reads, then taps.
  const { shown, settled } = useSpeech(6, 1500, 1600);

  if (asked) {
    return (
      <MessagingConsent
        username={username}
        allowed={allowed}
        onAnswer={(yes) => {
          buzz();
          setAllowed(yes);
        }}
        onDone={onDone}
      />
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <Spoken
        show={shown >= 1}
        className="text-[16vw] font-black lowercase leading-[0.88] tracking-[-0.055em]"
        style={{ color: "var(--giver-generosity)" }}
      >
        congrats
      </Spoken>
      <Spoken
        show={shown >= 2}
        className="mt-7 max-w-[13ch] text-[8.5vw] font-black lowercase leading-[0.92] tracking-[-0.045em]"
      >
        you just made your first act of generosity on giver
      </Spoken>
      <Spoken
        show={shown >= 3}
        className="mt-7 max-w-[14ch] text-[7vw] font-black lowercase leading-[0.95] tracking-[-0.04em]"
      >
        give yourself a pat on the back
      </Spoken>
      <Spoken
        show={shown >= 4}
        className="mt-7 max-w-[16ch] text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70"
      >
        50 sparks have now been given to {username}
      </Spoken>
      {/* BOTH HALVES OF THE GIFT: 50 given away, 50 now yours to use. */}
      <Spoken
        show={shown >= 5}
        className="mt-5 text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70"
      >
        and
      </Spoken>
      <Spoken
        show={shown >= 6}
        className="mt-2 max-w-[16ch] text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70"
      >
        50 sparks have now been added to your account
      </Spoken>

      {/* The Giver call to action, in Giver's own language. */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-end px-7"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => {
            buzz();
            setAsked(true);
          }}
          className="text-[7vw] font-black lowercase leading-none tracking-[-0.045em] transition-opacity duration-[900ms] ease-[cubic-bezier(0.32,0,0.24,1)] active:opacity-60"
          style={{
            color: "var(--giver-generosity)",
            opacity: settled ? 1 : 0,
            pointerEvents: settled ? "auto" : "none",
          }}
        >
          let&apos;s giver
        </button>
      </div>
    </div>
  );
}


/** Messaging is a permission, so Giver asks. "not now" costs nothing. */
function MessagingConsent({
  username,
  allowed,
  onAnswer,
  onDone,
}: {
  username: string;
  allowed: boolean | null;
  onAnswer: (yes: boolean) => void;
  onDone: () => void;
}) {
  const { shown } = useSpeech(2, 1300, 900);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <Spoken
        show={shown >= 1}
        className="max-w-[14ch] text-[8.5vw] font-black lowercase leading-[0.94] tracking-[-0.045em]"
      >
        {username} might want to say thanks.
      </Spoken>

      {allowed === null ? (
        <Spoken
          show={shown >= 2}
          className="mt-8 max-w-[13ch] text-[10.5vw] font-black lowercase leading-[0.9] tracking-[-0.05em]"
          style={{ color: "var(--giver-generosity)" }}
        >
          okay if they message you?
        </Spoken>
      ) : (
        <Spoken
          show
          className="mt-8 max-w-[15ch] text-[7vw] font-black lowercase leading-[0.95] tracking-[-0.04em] opacity-70"
        >
          {allowed
            ? `you can now message each other`
            : `no messages for now. ${username} still felt it.`}
        </Spoken>
      )}

      <div
        className="mt-12 flex items-baseline gap-9"
        style={{
          opacity: allowed === null && shown >= 2 ? 1 : 0,
          transition: "opacity 700ms cubic-bezier(0.32,0,0.24,1)",
          pointerEvents: allowed === null && shown >= 2 ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="text-[9vw] font-black lowercase leading-none tracking-[-0.05em] transition-transform active:scale-95"
          style={{ color: "var(--giver-generosity)" }}
        >
          yes
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className="text-[6.5vw] font-black lowercase leading-none tracking-[-0.04em] opacity-70 transition-transform active:scale-95"
        >
          not now
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          buzz();
          onDone();
        }}
        className="absolute inset-x-0 bottom-0 mx-auto w-fit text-center text-[10vw] font-black lowercase leading-[0.88] tracking-[-0.05em] transition-transform active:scale-95"
        style={{
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
          /* GIVER'S OWN GUIDANCE = PARTICIPATION = ORANGE. */
          color: "var(--giver-participation)",
          opacity: allowed === null ? 0 : 1,
          transition: "opacity 800ms cubic-bezier(0.32,0,0.24,1)",
          pointerEvents: allowed === null ? "none" : "auto",
        }}
      >
        let's build
        <br />
        your profile
      </button>
    </div>
  );
}

