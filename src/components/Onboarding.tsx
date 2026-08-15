import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { IntroG } from "@/components/onboarding/IntroG";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";

/**
 * The opening of Giver. Giver speaks to the new user through the ORANGE Living
 * G on warm off-white paper — orange IS the admin voice. The G never moves and
 * never resizes; only the words inside its loops change, and the colour shifts
 * only when the MEANING shifts:
 *
 *   orange  — Giver speaking
 *   purple  — sparks that are yours (your own wishes / participation)
 *   green   — sparks that are yours to gift (what you put into the community)
 *
 * Space carries meaning too: MIDDLE loop = me, BOTTOM loop = the community.
 */
type Stage = "opening" | "meet-intro" | "meet" | "choose" | "celebrate";

/** One beat of the opening: which G, and which loops speak. */
type Beat = {
  world: string;
  middle?: string[];
  bottom?: string[];
};

const OPENING: Beat[] = [
  { world: "welcome", bottom: ["welcome to", "giver"] },
  { world: "welcome", bottom: ["kindness is", "currency"] },
  // "to start you off" is addressed to the user: the middle loop is me.
  { world: "welcome", middle: ["to start", "you off"] },
  // Sparks are introduced as a gift into the world: the bottom loop.
  { world: "welcome", bottom: ["here's", "100 sparks"] },
  // Mine to use — the wish/self colour.
  { world: "sparks", middle: ["50 sparks", "are yours"] },
  // Mine to give away — the giving colour, taught spatially.
  {
    world: "gift",
    middle: ["50 sparks", "are yours"],
    bottom: ["50 sparks", "are yours", "to gift"],
  },
  { world: "welcome", bottom: ["are you", "a giver?"] },
];

/** Straight into the people. */
const MEET_INTRO: Beat[] = [{ world: "meet", bottom: ["meet three", "givers"] }];

const HOLD = 3000;
const FADE = 600;

const ROLE_COLOUR: Record<Member["world"], string> = {
  giving: "var(--giver-discovery)",
  wishing: "var(--giver-community)",
  trading: "var(--giver-trade)",
};

/** Plays a list of beats in one loop: fade in, hold, fade out. */
function useBeats(script: Beat[], active: boolean) {
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

  return { beat: script[i]!, opacity: shown ? 1 : 0, last };
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
        className="text-[13vw] font-black lowercase leading-[0.82] tracking-[-0.05em] animate-[fade-up_500ms_ease-out]"
        style={{ color: "var(--giver-profile)" }}
      >
        give your
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
            className="text-left text-[14vw] font-black lowercase leading-[0.9] tracking-[-0.05em] transition-transform active:scale-95"
            style={{ color: ROLE_COLOUR[m.world] }}
          >
            {m.username}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Giver, speaking. The colour follows the meaning, never the page. */
function OpeningSequence({ onDone }: { onDone: () => void }) {
  const { beat, opacity, last } = useBeats(OPENING, true);
  const [arrow, setArrow] = useState(false);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setArrow(true), 1400);
    return () => clearTimeout(t);
  }, [last]);

  return (
    <IntroG
      world={beat.world}
      {...(beat.middle ? { middle: { lines: beat.middle } } : {})}
      {...(beat.bottom ? { bottom: { lines: beat.bottom } } : {})}
      copyOpacity={opacity}
    >
      <ForwardCue show={last && arrow} label="yes — meet three givers" onClick={onDone} />
    </IntroG>
  );
}

/** One line, then straight into the people. */
function MeetIntro({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { beat, opacity, last } = useBeats(MEET_INTRO, true);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(onDone, HOLD);
    return () => clearTimeout(t);
  }, [last, onDone]);

  return (
    <IntroG
      world={beat.world}
      {...(beat.bottom ? { bottom: { lines: beat.bottom } } : {})}
      copyOpacity={opacity}
    >
      <BackArrow onClick={onBack} />
      <ForwardCue show label="meet them" onClick={onDone} />
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
      <h1 className="text-[19vw] font-black lowercase leading-[0.78] tracking-[-0.06em] animate-[fade-up_500ms_ease-out]">
        yippee!
      </h1>
      <p className="mt-8 max-w-[15ch] text-[7.5vw] font-black lowercase leading-[0.92] tracking-[-0.04em] animate-[fade-up_600ms_250ms_ease-out_both]">
        you just made your first act of generosity on giver.
      </p>
      <p className="mt-7 max-w-[16ch] text-[5.5vw] font-black lowercase leading-[0.95] tracking-[-0.03em] opacity-70 animate-[fade-up_600ms_500ms_ease-out_both]">
        50 sparks have been gifted to {username}.
      </p>
      <button
        type="button"
        onClick={() => {
          buzz();
          onDone();
        }}
        className="mt-auto mb-10 self-center text-[8vw] font-black lowercase leading-none tracking-[-0.04em] underline decoration-[0.1em] underline-offset-[0.18em] transition-transform active:scale-95 animate-[fade-up_600ms_750ms_ease-out_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        enter giver →
      </button>
    </div>
  );
}
