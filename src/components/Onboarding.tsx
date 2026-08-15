import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { IntroG } from "@/components/onboarding/IntroG";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";

/**
 * The opening of Giver. ONE orange Living G speaks on warm off-white paper:
 * it never moves, never resizes, never changes colour. Only the words in its
 * bottom loop change. Then we meet three people, each in their role colour.
 */
type Stage = "opening" | "meet-intro" | "meet" | "choose" | "celebrate";

/** Each opening message: ~3s on screen, gentle fade between. */
const OPENING: string[][] = [
  ["Welcome to", "Giver"],
  ["Kindness is", "currency"],
  ["To start", "you off"],
  ["Here's", "100 Sparks"],
  ["50 Sparks", "are yours"],
  ["50 Sparks", "are yours", "to gift"],
  ["Are you", "a Giver?"],
];

/** Straight into the people — no "someone giving / wishing / trading". */
const MEET_INTRO: string[][] = [["Meet three", "Givers"]];

const HOLD = 3000;
const FADE = 600;

const ROLE_COLOUR: Record<Member["world"], string> = {
  giving: "var(--giver-discovery)",
  wishing: "var(--giver-community)",
  trading: "var(--giver-trade)",
};

/** Plays a list of messages in one loop: fade in, hold, fade out. */
function useMessages(script: string[][], onEnd: () => void, active: boolean) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);
  const last = i === script.length - 1;

  useEffect(() => {
    if (!active) return;
    setI(0);
    setShown(true);
  }, [active, script]);

  useEffect(() => {
    if (!active || last) return;
    const out = setTimeout(() => setShown(false), HOLD);
    const next = setTimeout(() => {
      setI((v) => v + 1);
      setShown(true);
    }, HOLD + FADE);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [active, i, last, script]);

  return { lines: script[i]!, opacity: shown ? 1 : 0, last, onEnd };
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
          setStage("meet-intro");
        }}
      />
    );
  }

  if (stage === "meet-intro") {
    return (
      <MeetIntro
        onBack={() => setStage("opening")}
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
        onBack={() => setStage("meet-intro")}
        onPrev={() => setWho((w) => Math.max(0, w - 1))}
        onNext={() => setWho((w) => Math.min(MEMBERS.length - 1, w + 1))}
        onDone={() => setStage("choose")}
      />
    );
  }

  if (stage === "celebrate" && chosen) {
    return <Celebration username={chosen.username} onDone={() => onDone(chosen.name)} />;
  }

  // Give your 50 — the first act of generosity. Not optional.
  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)" }}
    >
      <BackArrow
        onClick={() => {
          setWho(MEMBERS.length - 1);
          setStage("meet");
        }}
      />
      <h1
        className="text-[13vw] font-black uppercase leading-[0.82] tracking-[-0.05em] animate-[fade-up_500ms_ease-out]"
        style={{ color: "var(--giver-profile)" }}
      >
        Give your
        <br />
        50.
      </h1>
      <div className="mt-10 flex flex-col items-start gap-4">
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              buzz([10, 40, 18]);
              setChosen(m);
              setStage("celebrate");
            }}
            className="text-left text-[14vw] font-black uppercase leading-[0.9] tracking-[-0.05em] transition-transform active:scale-95"
            style={{ color: ROLE_COLOUR[m.world] }}
          >
            {m.username}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The orange G, speaking. Copy lives only in the bottom loop. */
function OpeningSequence({ onDone }: { onDone: () => void }) {
  const { lines, opacity, last } = useMessages(OPENING, onDone, true);
  const [arrow, setArrow] = useState(false);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setArrow(true), 1400);
    return () => clearTimeout(t);
  }, [last]);

  return (
    <IntroG world="welcome" bottom={{ lines }} copyOpacity={opacity}>
      <ForwardCue show={last && arrow} label="Yes — meet three Givers" onClick={onDone} />
    </IntroG>
  );
}

/** One line, then straight into the people. */
function MeetIntro({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { lines, opacity, last } = useMessages(MEET_INTRO, onDone, true);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(onDone, HOLD);
    return () => clearTimeout(t);
  }, [last, onDone]);

  return (
    <IntroG world="welcome" bottom={{ lines }} copyOpacity={opacity}>
      <BackArrow onClick={onBack} />
      <ForwardCue show label="Meet them" onClick={onDone} />
    </IntroG>
  );
}

/** The only forward affordance in onboarding: one small arrow, safe area kept. */
function ForwardCue({
  show,
  label,
  onClick,
}: {
  show: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex justify-end px-7"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center text-3xl font-bold leading-none transition-opacity duration-500 active:scale-90"
        style={{ opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/** One editorial column, one alignment axis. Green is the accent, never the flood. */
function Celebration({ username, onDone }: { username: string; onDone: () => void }) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-7 pt-20"
      style={{ background: "var(--giver-paper)", color: "var(--giver-profile)" }}
    >
      <h1 className="text-[19vw] font-black uppercase leading-[0.78] tracking-[-0.06em] animate-[fade-up_500ms_ease-out]">
        Yippee!
      </h1>
      <p className="mt-8 max-w-[15ch] text-[7.5vw] font-black uppercase leading-[0.92] tracking-[-0.04em] animate-[fade-up_600ms_250ms_ease-out_both]">
        You just made your first act of generosity on Giver.
      </p>
      <p className="mt-7 max-w-[16ch] text-[5.5vw] font-black uppercase leading-[0.95] tracking-[-0.03em] opacity-70 animate-[fade-up_600ms_500ms_ease-out_both]">
        50 Sparks have been gifted to {username}.
      </p>
      <button
        type="button"
        onClick={() => {
          buzz();
          onDone();
        }}
        className="mt-auto mb-10 self-center text-[8vw] font-black uppercase leading-none tracking-[-0.04em] underline decoration-[0.1em] underline-offset-[0.18em] transition-transform active:scale-95 animate-[fade-up_600ms_750ms_ease-out_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        Enter Giver →
      </button>
    </div>
  );
}
