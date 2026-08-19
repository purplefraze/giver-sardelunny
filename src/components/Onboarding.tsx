import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
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

/**
 * OPENING TYPE HIERARCHY, as shared tokens — never per-word guesses.
 *   BRAND  — a word alone in the middle loop
 *   PHRASE — supporting language in the bottom loop
 */
const BRAND = 0.9;
const PHRASE = 0.8;

/**
 * THE OPENING, AS ONE CONTINUOUS STORY. Each slide is a COMPLETE thought that
 * arrives whole — never word by word — and hands straight over to the next.
 */
type Slide = { middle?: string[]; bottom?: string[]; hold: number };

const WORDS: Slide[] = [
  { middle: ["giver"], hold: 900 },
  { bottom: ["kindness is", "currency."], hold: 1250 },
  { middle: ["here's", "100 sparks."], hold: 1250 },
  { bottom: ["50 to wish.", "50 to give."], hold: 1400 },
];

const ROLE_COLOUR: Record<Member["world"], string> = {
  // Every sample person is ANOTHER PERSON from my perspective: BLUE.
  giving: "var(--giver-others)",
  wishing: "var(--giver-others)",
  trading: "var(--giver-others)",
  borrowing: "var(--giver-others)",
};

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
    return <FirstGenerosity username={chosen.username} onDone={() => onDone(chosen.name)} />;
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
 * THE OPENING — ONE CONTINUOUS SHOT, never a stack of slides.
 *
 *   word   the composition reads as GIVER: the Living G IS the g
 *   zoom   "iver" collapses into the spark while the camera flies into the
 *          very same G until it reaches its canonical full-screen size
 *   auto   the spark travels the G's own stroke, bottom loop -> middle loop
 *   words  giver / kindness is currency / here's 100 sparks / 50 + 50
 *   drag   the spark is handed over: the user walks it along the rail
 *   green  arrival, haptic, colour change — and straight into the community
 */
type Phase = "word" | "zoom" | "auto" | "words" | "drag" | "done";

/** The camera: how small the G is while it is only a letter. */
const LETTER_SCALE = 0.12;
const LETTER_SHIFT = "-16vw";
const ZOOM_MS = 900;
const WORD_HOLD = 850;

function OpeningSequence({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("word");
  const [i, setI] = useState(0);
  const [fading, setFading] = useState(false);
  const [green, setGreen] = useState(false);
  const [arrived, setArrived] = useState(false);

  // word -> zoom -> auto: no waiting, no empty screens.
  useEffect(() => {
    if (phase !== "word") return;
    const t = setTimeout(() => setPhase("zoom"), WORD_HOLD);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "zoom") return;
    const t = setTimeout(() => setPhase("auto"), ZOOM_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // The scripted thoughts: each arrives whole, holds, and hands over.
  useEffect(() => {
    if (phase !== "words") return;
    const slide = WORDS[i]!;
    const out = setTimeout(() => setFading(true), slide.hold);
    const next = setTimeout(() => {
      if (i + 1 < WORDS.length) {
        setFading(false);
        setI(i + 1);
      } else {
        setPhase("drag");
      }
    }, slide.hold + BEAT_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [phase, i]);

  // The colour change IS the transition into the community. Nothing in between.
  useEffect(() => {
    if (!green) return;
    const t = setTimeout(onDone, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [green]);

  const slide = phase === "words" ? WORDS[i]! : undefined;
  const say = (lines: string[] | undefined, scale: number): LoopCopy | undefined =>
    lines ? { lines, plan: lines, scale, opacity: fading ? 0 : 1 } : undefined;

  const middle: LoopCopy | undefined =
    phase === "drag"
      ? { lines: ["drag"], plan: ["drag"], scale: BRAND, opacity: arrived ? 0 : 1 }
      : say(slide?.middle, BRAND);

  const bottom: LoopCopy | undefined =
    phase === "drag"
      ? {
          lines: ["sparks change."],
          plan: ["sparks change."],
          scale: PHRASE,
          opacity: arrived ? 0 : 1,
        }
      : say(slide?.bottom, PHRASE);

  const small = phase === "word";

  return (
    <IntroG
      world={green ? "gift" : "welcome"}
      {...(middle ? { middle } : {})}
      {...(bottom ? { bottom } : {})}
      stage={{
        transformOrigin: "50% 50%",
        transform: small
          ? `translate(${LETTER_SHIFT}, 0) scale(${LETTER_SCALE})`
          : "translate(0, 0) scale(1)",
        transition: `transform ${ZOOM_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}
      {...(phase === "auto"
        ? { overlay: <SparkJourney mode="auto" onArrive={() => setPhase("words")} /> }
        : phase === "drag"
          ? {
              overlay: (
                <SparkJourney
                  mode="drag"
                  onArrive={() => setArrived(true)}
                  onGreen={() => setGreen(true)}
                />
              ),
            }
          : {})}
    >
      <Wordmark phase={phase} />
    </IntroG>
  );
}

/**
 * [LIVING G]IVER. The letters belong to the same word as the artwork, and when
 * the camera pushes in they COLLAPSE INTO THE SPARK rather than disappearing —
 * one object becoming another, never a cut.
 */
function Wordmark({ phase }: { phase: Phase }) {
  const show = phase === "word" || phase === "zoom";
  if (!show) return null;
  const holding = phase === "word";
  const letters = ["i", "v", "e", "r"];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <span
        className="flex items-center font-black lowercase leading-none tracking-[-0.05em]"
        style={{ fontSize: "12dvh", transform: "translateX(8.5vw)", color: "var(--world-g)" }}
      >
        {letters.map((l, k) => (
          <span
            key={l + k}
            className="inline-block"
            style={{
              // Every letter travels to the SAME point — the spark — shrinking
              // as it goes, so four letters read as one bead forming.
              transform: holding
                ? "translate(0,0) scale(1)"
                : `translate(calc(${LETTER_SHIFT} - ${(letters.length - k) * 2.2}rem), 0) scale(0.12)`,
              opacity: holding ? 1 : 0,
              transition: `transform ${ZOOM_MS}ms cubic-bezier(0.5,0,0.2,1) ${k * 40}ms, opacity ${ZOOM_MS}ms ease-in ${k * 40}ms`,
            }}
          >
            {l}
          </span>
        ))}
      </span>

      {/* THE BEAD the letters become. It hands over to the real spark on the G. */}
      <span
        className="absolute rounded-full"
        style={{
          width: "3.6vh",
          height: "3.6vh",
          left: `calc(50% + ${LETTER_SHIFT})`,
          background: "var(--giver-generosity)",
          opacity: holding ? 0 : 1,
          transform: holding ? "scale(0.4)" : "scale(1)",
          transition: `opacity ${ZOOM_MS * 0.6}ms ease-out, transform ${ZOOM_MS}ms cubic-bezier(0.22,1,0.36,1)`,
        }}
      />
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
function FirstGenerosity({ username, onDone }: { username: string; onDone: () => void }) {
  const [asked, setAsked] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  // Reward flash: pop in fast, hold just long enough to read, then let the user move on instantly.
  const { shown, settled } = useSpeech(6, 140, 600);

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
        duration={180}
        className="text-[16vw] font-black lowercase leading-[0.88] tracking-[-0.055em]"
        style={{ color: "var(--giver-generosity)" }}
      >
        congrats
      </Spoken>
      <Spoken
        show={shown >= 2}
        duration={180}
        className="mt-7 max-w-[13ch] text-[8.5vw] font-black lowercase leading-[0.92] tracking-[-0.045em]"
      >
        you just made your first act of generosity on giver
      </Spoken>
      <Spoken
        show={shown >= 3}
        duration={180}
        className="mt-7 max-w-[14ch] text-[7vw] font-black lowercase leading-[0.95] tracking-[-0.04em]"
      >
        give yourself a pat on the back
      </Spoken>
      <Spoken
        show={shown >= 4}
        duration={180}
        className="mt-7 max-w-[16ch] text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70"
      >
        50 sparks have now been given to {username}
      </Spoken>
      {/* BOTH HALVES OF THE GIFT: 50 given away, 50 now yours to use. */}
      <Spoken
        show={shown >= 5}
        duration={180}
        className="mt-5 text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70"
      >
        and
      </Spoken>
      <Spoken
        show={shown >= 6}
        duration={180}
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
          className="text-[7vw] font-black lowercase leading-none tracking-[-0.045em] transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0,0.24,1)] active:opacity-60"
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
