import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { BEAT_MS, IntroG, type LoopCopy } from "@/components/onboarding/IntroG";
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
 *   green   — the sparks that are now yours (to wish with, and to gift)
 *
 * Space carries meaning too: MIDDLE loop = me, BOTTOM loop = the community.
 * Colour and copy always arrive together, as one beat.
 */
type Stage = "opening" | "meet-intro" | "meet" | "choose" | "celebrate";

type Loop = "top" | "middle" | "bottom";

/** One beat of the opening: which G, and which loops speak. */
type Beat = {
  world: string;
  top?: string[];
  middle?: string[];
  bottom?: string[];
};

const OPENING: Beat[] = [
  { world: "welcome", bottom: ["welcome to", "giver"] },
  { world: "welcome", bottom: ["kindness as", "currency"] },
  // Addressed to the user: the middle loop is me.
  { world: "welcome", middle: ["to help you", "get started..."] },
  { world: "welcome", bottom: ["here's", "100 sparks", "from giver"] },
  // ONE coordinated beat: the G turns green as the green words arrive.
  { world: "gift", middle: ["50 sparks", "for you", "to wish"] },
  // The middle message HOLDS while the bottom half of the gift appears.
  {
    world: "gift",
    middle: ["50 sparks", "for you", "to wish"],
    bottom: ["50 sparks", "for you", "to gift"],
  },
  { world: "gift", top: ["so..."] },
  { world: "gift", bottom: ["are you", "a giver?"] },
];

/** Straight into the people. */
const MEET_INTRO: Beat[] = [{ world: "meet", bottom: ["meet four", "givers"] }];

const HOLD = 3000;

const ROLE_COLOUR: Record<Member["world"], string> = {
  giving: "var(--giver-discovery)",
  wishing: "var(--giver-community)",
  trading: "var(--giver-trade)",
  borrowing: "var(--giver-borrow)",
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

/**
 * Plays a list of beats. Each loop is treated independently: a loop only fades
 * when its own words change, so a message can hold while another arrives.
 */
function useBeats(script: Beat[]) {
  const [i, setI] = useState(0);
  const [loops, setLoops] = useState<LoopState>(EMPTY);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const last = i === script.length - 1;

  useEffect(() => {
    const beat = script[i]!;
    const next = script[i + 1];

    setLoops((prev) => {
      const out = { ...prev };
      for (const key of LOOPS) {
        const lines = beat[key];
        if (lines && !same(prev[key].lines, lines)) {
          out[key] = { lines, opacity: 1 };
        } else if (lines) {
          out[key] = { lines, opacity: 1 };
        } else {
          out[key] = { ...prev[key], opacity: 0 };
        }
      }
      return out;
    });

    if (!next) return;

    // Fade only what is about to change; everything else holds.
    const fade = setTimeout(() => {
      setLoops((prev) => {
        const out = { ...prev };
        for (const key of LOOPS) {
          if (!same(prev[key].lines, next[key])) {
            out[key] = { ...prev[key], opacity: 0 };
          }
        }
        return out;
      });
    }, HOLD);
    const advance = setTimeout(() => setI((v) => v + 1), HOLD + BEAT_MS);
    timers.current = [fade, advance];
    return () => timers.current.forEach(clearTimeout);
  }, [i, script]);

  const copy = (key: Loop): LoopCopy | undefined =>
    loops[key].lines.length
      ? { lines: loops[key].lines, opacity: loops[key].opacity }
      : undefined;

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

  // The first act of generosity. Not optional: one of the four, or nothing.
  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <BackArrow
        onClick={() => {
          setWho(MEMBERS.length - 1);
          setStage("meet");
        }}
      />
      <h1
        className="max-w-[13ch] text-[8.5vw] font-black lowercase leading-[0.98] tracking-[-0.04em] animate-[fade-up_500ms_ease-out]"
        style={{ color: "var(--giver-profile)" }}
      >
        who would you like to gift your 50 sparks to?
      </h1>
      <div className="mt-12 flex flex-col items-start gap-5">
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              buzz([10, 40, 18]);
              setChosen(m);
              setStage("celebrate");
            }}
            className="text-left text-[11vw] font-black lowercase leading-[0.95] tracking-[-0.05em] transition-transform active:scale-95"
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
  const { world, copy, last } = useBeats(OPENING);
  const [arrow, setArrow] = useState(false);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setArrow(true), 1400);
    return () => clearTimeout(t);
  }, [last]);

  return (
    <IntroG
      world={world}
      top={copy("top")}
      middle={copy("middle")}
      bottom={copy("bottom")}
    >
      <ForwardCue show={last && arrow} label="yes — meet four givers" onClick={onDone} />
    </IntroG>
  );
}

/** One line, then straight into the people. */
function MeetIntro({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { world, copy, last } = useBeats(MEET_INTRO);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(onDone, HOLD);
    return () => clearTimeout(t);
  }, [last, onDone]);

  return (
    <IntroG world={world} bottom={copy("bottom")}>
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
        you just made your first act of generosity on giver
      </p>
      <p className="mt-7 max-w-[16ch] text-[5.5vw] font-black lowercase leading-[0.95] tracking-[-0.03em] opacity-70 animate-[fade-up_600ms_500ms_ease-out_both]">
        50 sparks have been gifted to {username}
      </p>
      <button
        type="button"
        onClick={() => {
          buzz();
          onDone();
        }}
        className="mt-auto mb-10 self-center text-[8vw] font-black lowercase leading-none tracking-[-0.04em] transition-transform active:scale-95 animate-[fade-up_600ms_750ms_ease-out_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        enter giver
      </button>
    </div>
  );
}
