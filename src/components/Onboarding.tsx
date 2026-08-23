import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { PlayIntro } from "@/components/onboarding/PlayIntro";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import type { Mode } from "@/components/living-g/EarSelector";
import { STARTING_SPARKS } from "@/data/my-profile";
import { buzz, haptics } from "@/lib/haptics";
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

/** A person chosen from the list still carries their own world into my G. */
const CHOICE_SEAT: Record<Member["world"], Mode> = {
  giving: "give",
  wishing: "wish",
  trading: "trade",
  borrowing: "borrow",
};

/* THE OTHER PERSON WEARS THE COLOUR OF WHAT THEY ARE DOING: yellow when they
   are offering, red when they are asking, orange when they are trading. */
const ROLE_COLOUR: Record<Member["world"], string> = {
  giving: "var(--person-other-give)",
  wishing: "var(--person-other-wish)",
  trading: "var(--person-other-trade)",
  borrowing: "var(--person-other-wish)",
};

export function Onboarding({
  onDone,
}: {
  /**
   * TWO PATHS OUT OF THE OPENING. `earned` is true only when the person
   * genuinely completed the spark interaction — the sparks are never awarded
   * because an animation played.
   */
  onDone: (result: { gaveTo: string | null; earned: boolean; mode?: Mode }) => void;
}) {
  const [stage, setStage] = useState<Stage>("opening");
  const [who, setWho] = useState(0);
  const [chosen, setChosen] = useState<Member | null>(null);
  /**
   * CONTINUITY. The mode the toggle rested on when the gift landed travels with
   * the person into their own first Living G — nothing is reset.
   */
  const [giftMode, setGiftMode] = useState<Mode>("give");
  /**
   * ONE BUNDLE, ONE BALANCE. The 50 Give sparks from the intro follow the user
   * from person to person; they are only ever spent once.
   */
  const [sparks, setSparks] = useState<number | null>(STARTING_SPARKS);

  if (stage === "opening") {
    return (
      <PlayIntro
        onDone={(earned) => {
          buzz();
          /* PATH B: the spark interaction was left unfinished. My G opens, quietly. */
          if (!earned) {
            onDone({ gaveTo: null, earned: false });
            return;
          }
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
        {...(sparks !== null ? { sparks } : {})}
        onGive={(mode) => {
          if (sparks === null) return;
          setGiftMode(mode);
          // GENEROSITY LANDING ON A PERSON: the recipient is chosen.
          haptics.success();
          setSparks(null);
          setChosen(member);
          setStage("celebrate");
        }}
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
        onDone={() => onDone({ gaveTo: chosen.name, earned: true, mode: giftMode })}
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
        if (sparks === null) return;
        setGiftMode(CHOICE_SEAT[m.world]);
        haptics.success();
        setSparks(null);
        setChosen(m);
        setStage("celebrate");
      }}
    />
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
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-9"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <BackArrow onClick={onBack} />
      {/* THE QUESTION — the "giver" register, restrained: confident, not bulky. */}
      <h1
        className="text-[8.4vw] font-black lowercase leading-[1.06] tracking-[-0.045em]"
        style={{ color: "var(--giver-generosity)" }}
      >
        {QUESTION.map((phrase, i) => (
          <Spoken key={phrase} show={i < shown} duration={220}>
            {phrase}
          </Spoken>
        ))}
      </h1>

      {/* The choices arrive as one, after the question — widely tracked, calm. */}
      <div
        className="mt-14 flex flex-col items-start gap-7"
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
            className="text-left text-[13px] font-bold lowercase leading-none tracking-[0.26em] transition-opacity active:opacity-60"
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
 * THE FIRST GIFT, MADE HUMAN — AND IT LANDS AS ONE MOMENT.
 *
 * No sentence-by-sentence reveal here: the whole confirmation — the word, the
 * praise, both halves of the sparks and the way onward — arrives TOGETHER on a
 * single confident fade, with one haptic. Boom, complete. The copy and the
 * semantic colours are exactly as approved; only the timing changed.
 */
function FirstGenerosity({ username, onDone }: { username: string; onDone: () => void }) {
  /** ONE landing for the whole composition. */
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLanded(true);
      haptics.success();
    }, 90);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      {/* ONE COMPOSITION, ONE ARRIVAL. Nothing here is staggered. */}
      <div
        style={{
          opacity: landed ? 1 : 0,
          transform: landed ? "scale(1)" : "scale(0.965)",
          transition:
            "opacity 460ms cubic-bezier(0.32,0,0.24,1), transform 620ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* ONE SYSTEM, TWO REGISTERS — exactly as a profile reads: a small
            tracked label, then the statement, then quiet metered lines.
            COLOUR = MEANING: black voice, green generosity, purple the
            connection just made, yellow the other person. */}
        <p className="g-heading" style={{ color: "var(--giver-generosity)" }}>
          your first give
        </p>
        <p className="g-display mt-4" style={{ color: "var(--giver-participation)" }}>
          congrats
        </p>
        <p className="g-display-sm mt-6 max-w-[15ch]" style={{ color: "var(--giver-ink)" }}>
          you just made your first act of{" "}
          <span style={{ color: "var(--giver-generosity)" }}>generosity</span> on{" "}
          <span style={{ color: "var(--giver-generosity)" }}>giver</span>
        </p>
        <div className="g-rule mt-9 max-w-[24ch] pt-5">
          <p className="g-name max-w-[26ch]" style={{ color: "var(--giver-ink)" }}>
            <span style={{ color: "var(--giver-connection)" }}>50 sparks</span> have now been
            given to <span style={{ color: "var(--giver-community)" }}>{username}</span>
          </p>
          <p className="g-name mt-2 max-w-[26ch]" style={{ color: "var(--giver-ink)" }}>
            and <span style={{ color: "var(--giver-connection)" }}>50 sparks</span> are yours
          </p>
        </div>

      </div>

      {/* The way onward, in Giver's own language — part of the same beat. */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-end px-7"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => {
            buzz();
            onDone();
          }}
          className="g-display-sm transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0,0.24,1)] active:opacity-60"
          style={{
            color: "var(--giver-generosity)",
            opacity: landed ? 1 : 0,
            pointerEvents: landed ? "auto" : "none",
          }}
        >
          let&apos;s giver
        </button>
      </div>
    </div>
  );
}
