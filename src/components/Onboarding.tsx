import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { PlayIntro } from "@/components/onboarding/PlayIntro";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
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
  /**
   * ONE BUNDLE, ONE BALANCE. The 50 Give sparks from the intro follow the user
   * from person to person; they are only ever spent once.
   */
  const [sparks, setSparks] = useState<number | null>(STARTING_SPARKS);

  if (stage === "opening") {
    return (
      <PlayIntro
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
        {...(sparks !== null ? { sparks } : {})}
        onGive={() => {
          if (sparks === null) return;
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
        if (sparks === null) return;
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
 * THE FIRST GIFT, MADE HUMAN — AND IT LANDS AS ONE MOMENT.
 *
 * No sentence-by-sentence reveal here: the whole confirmation — the word, the
 * praise, both halves of the sparks and the way onward — arrives TOGETHER on a
 * single confident fade, with one haptic. Boom, complete. The copy and the
 * semantic colours are exactly as approved; only the timing changed.
 */
function FirstGenerosity({ username, onDone }: { username: string; onDone: () => void }) {
  const [asked, setAsked] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  /** ONE landing for the whole composition. */
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLanded(true);
      haptics.success();
    }, 90);
    return () => clearTimeout(t);
  }, []);

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
      {/* ONE COMPOSITION, ONE ARRIVAL. Nothing here is staggered. */}
      <div
        style={{
          opacity: landed ? 1 : 0,
          transform: landed ? "scale(1)" : "scale(0.965)",
          transition:
            "opacity 460ms cubic-bezier(0.32,0,0.24,1), transform 620ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <p
          className="text-[16vw] font-black lowercase leading-[0.88] tracking-[-0.055em]"
          style={{ color: "var(--giver-generosity)" }}
        >
          congrats
        </p>
        <p className="mt-7 max-w-[13ch] text-[8.5vw] font-black lowercase leading-[0.92] tracking-[-0.045em]">
          you just made your first act of generosity on giver
        </p>
        <p className="mt-7 max-w-[14ch] text-[7vw] font-black lowercase leading-[0.95] tracking-[-0.04em]">
          give yourself a pat on the back
        </p>
        <p className="mt-7 max-w-[16ch] text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70">
          50 sparks have now been given to {username}
        </p>
        {/* BOTH HALVES OF THE GIFT: 50 given away, 50 now yours to use. */}
        <p className="mt-5 text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70">
          and
        </p>
        <p className="mt-2 max-w-[16ch] text-[5.6vw] font-black lowercase leading-[0.98] tracking-[-0.03em] opacity-70">
          50 sparks have now been added to your account
        </p>
      </div>

      {/* The Giver call to action, in Giver's own language — part of the same beat. */}
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
