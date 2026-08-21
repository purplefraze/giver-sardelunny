import { useEffect, useState } from "react";
import { SparkJourney } from "@/components/living-g/SparkJourney";
import { SparkSplit } from "@/components/onboarding/SparkSplit";
import { IntroG, type LoopCopy } from "@/components/onboarding/IntroG";
import type { RegionKey } from "@/components/living-g/LivingG";
import { buzz, haptics } from "@/lib/haptics";

/**
 * THE FIRST MINUTE OF GIVER — DISCOVERY, NOT EXPLANATION.
 *
 * Nothing is announced. One enormous Living G sits on the paper and simply
 * waits. Touching it is the whole interface: the loop that was touched answers,
 * playfully, in its own negative space. Only after the G has been played with
 * does it say its own name, hand over 100 sparks, and ask to be given away.
 *
 *   play   the G alone; a touched loop replies ("hey" / "that tickles")
 *   name   it finally introduces itself: giver / kindness is currency
 *   sparks 100 sparks arrive on its stroke
 *   drag   the person walks the sparks along the stroke themselves
 *   split  50 to wish with · 50 to give away
 *
 * The Living G's geometry, scale, loops, swell and haptics are untouched: this
 * is only what the loops SAY, and when.
 */

type Phase = "play" | "name" | "sparks" | "drag" | "split";

/** A word alone in the middle loop; supporting language in the bottom loop. */
const BRAND = 0.9;
const PHRASE = 0.8;

/**
 * WHAT A TOUCHED LOOP SAYS. One reply per touch, in order — the G is being
 * discovered, so it reacts rather than instructs. After the last reply it is
 * ready to say its name.
 */
const REPLIES: { middle: string[]; bottom?: string[] }[] = [
  { middle: ["hey"] },
  { middle: ["that tickles"] },
  { middle: ["again?"], bottom: ["you like touching things"] },
  { middle: ["okay okay"], bottom: ["i'll tell you my name"] },
];

/** How long the G waits, quietly, before it dares to hint at being touched. */
const HINT_MS = 3600;

export function PlayIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("play");
  /** How many times the G has been touched, and where it was touched last. */
  const [touches, setTouches] = useState(0);
  const [where, setWhere] = useState<RegionKey>("middle");
  const [hint, setHint] = useState(false);
  const [arrived, setArrived] = useState(false);

  /* THE ONLY INVITATION: after a long, patient pause, one small word. */
  useEffect(() => {
    if (phase !== "play" || touches > 0) return;
    const t = setTimeout(() => setHint(true), HINT_MS);
    return () => clearTimeout(t);
  }, [phase, touches]);

  /* A COMPLETE THOUGHT, THEN THE NEXT. The split resolves into the people. */
  useEffect(() => {
    if (phase !== "split") return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const touch = (region: RegionKey) => () => {
    if (phase !== "play") return;
    buzz();
    setHint(false);
    setWhere(region);
    setTouches((n) => {
      const next = n + 1;
      if (next >= REPLIES.length) setPhase("name");
      return next;
    });
  };

  const say = (lines: string[] | undefined, scale: number): LoopCopy | undefined =>
    lines ? { lines, plan: lines, scale } : undefined;

  /** The reply belongs to the loop that was touched, never to the whole G. */
  const reply = touches > 0 ? REPLIES[Math.min(touches, REPLIES.length) - 1]! : undefined;

  let middle: LoopCopy | undefined;
  let bottom: LoopCopy | undefined;

  if (phase === "play") {
    /* The touched loop answers; if it was the top loop, the middle speaks for
       it, because words never live inside the small circle. */
    const answer = reply?.middle;
    if (where === "bottom") {
      bottom = say(answer, PHRASE);
      middle = say(reply?.bottom, BRAND);
    } else {
      middle = say(answer, BRAND);
      bottom = say(reply?.bottom, PHRASE);
    }
    if (!reply && hint) bottom = { lines: ["touch me"], plan: ["touch me"], scale: PHRASE, opacity: 0.5 };
  } else if (phase === "name") {
    middle = say(["giver"], BRAND);
    bottom = say(["kindness is", "currency"], PHRASE);
  } else if (phase === "sparks") {
    middle = say(["giver"], BRAND);
    bottom = say(["here's", "100 sparks"], PHRASE);
  } else if (phase === "drag") {
    middle = arrived ? say(["giver"], BRAND) : undefined;
    bottom = arrived
      ? undefined
      : { lines: ["slide to spark change"], plan: ["slide to spark change"], scale: PHRASE };
  } else {
    middle = { lines: ["50", "to wish with"], plan: ["50", "to wish with"], scale: BRAND, hero: true };
    bottom = { lines: ["50", "to give away"], plan: ["50", "to give away"], scale: PHRASE, hero: true };
  }

  /* TAPPING ANYWHERE ONLY MOVES THE STORY ON once the G has spoken. */
  const advance =
    phase === "name"
      ? () => {
          buzz();
          setPhase("sparks");
        }
      : phase === "sparks"
        ? () => {
            buzz();
            setPhase("drag");
          }
        : undefined;

  return (
    <IntroG
      world={phase === "split" ? "gift" : "welcome"}
      {...(middle ? { middle } : {})}
      {...(bottom ? { bottom } : {})}
      {...(advance ? { onAdvance: advance } : {})}
      {...(phase === "play" || phase === "name"
        ? { press: { top: touch("top"), middle: touch("middle"), bottom: touch("bottom") } }
        : {})}
      {...(phase === "sparks"
        ? { overlay: <SparkSplit step="hundred" /> }
        : phase === "drag"
          ? {
              overlay: (
                <>
                  <SparkSplit step="held" />
                  <SparkJourney
                    mode="drag"
                    count={100}
                    onArrive={() => {
                      setArrived(true);
                      haptics.success();
                    }}
                    onGreen={() => setPhase("split")}
                  />
                </>
              ),
            }
          : {})}
    />
  );
}
