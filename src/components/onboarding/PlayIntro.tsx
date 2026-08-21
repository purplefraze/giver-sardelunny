import { useEffect, useRef, useState } from "react";
import { SparkJourney } from "@/components/living-g/SparkJourney";
import { SparkSplit } from "@/components/onboarding/SparkSplit";
import { IntroG } from "@/components/onboarding/IntroG";
import { G_FONT } from "@/components/living-g/g-type";
import { LOOP_CENTRE } from "@/components/living-g/g-path";

import type { RegionKey } from "@/components/living-g/LivingG";
import { EarSelector, MODES, type Mode } from "@/components/living-g/EarSelector";
import { buzz, haptics } from "@/lib/haptics";

/**
 * THE FIRST MINUTE OF GIVER — DISCOVERY, NOT EXPLANATION.
 *
 * The screen opens on the Living G alone. No welcome, no instruction, no
 * invitation to touch it: curiosity is trusted. Touching the G makes it answer,
 * twice, in one complete phrase each time. On the third touch it names itself.
 * Then a bundle of 100 sparks simply begins travelling its stroke, out and back,
 * for as long as it takes — nothing says what to do with it.
 *
 *   quiet  the G, alone, silent
 *   brand  giver · kindness as currency
 *   spark  100 sparks drifting the G's own rail until a finger catches them
 *   split  the landing: 50 rise to the top loop, 50 stay to be given
 *   gift   the remaining 50, waiting to be moved into the giving loop
 *
 * TWO PATHS. Complete the spark interaction and the richer onboarding follows.
 * Linger past roughly thirty seconds and Giver quietly opens My G instead —
 * no failure, no explanation, no countdown.
 *
 * TYPOGRAPHY IS QUIET. Copy is set small and centred in the loops' own interior
 * negative space, in the G's own coordinate system, so it can never collide with
 * the stroke, the travelling sparks or itself.
 */

type Phase = "quiet" | "brand" | "spark" | "split" | "gift";

/** Type sizes in the G's own units (576 wide) — small, fixed, never crammed. */
const BRAND = 92;
const META = 24;
const LINE = 33;

/** How long a casual, repeated touch is answered for. */
const TICKLE_MS = 2600;

/**
 * How long a person may explore the drifting sparks before My G opens quietly.
 * Three unhurried minutes: no countdown, no hint, no nudge.
 */
const PATIENCE_MS = 180000;

const FADE = "opacity 900ms cubic-bezier(0.32,0,0.24,1)";

function Line({
  show,
  x,
  y,
  size,
  colour = "var(--world-ink)",
  track = "-0.045em",
  weight = 900,
  opacity = 1,
  children,
}: {
  show: boolean;
  x: number;
  y: number;
  size: number;
  colour?: string;
  track?: string;
  weight?: number;
  opacity?: number;
  children: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={colour}
      style={{
        /* THE CANONICAL LIVING G TREATMENT — this is where it was authored. */
        fontFamily: G_FONT,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: track,
        opacity: show ? opacity : 0,
        transition: FADE,
      }}
    >
      {children}
    </text>
  );

}

export function PlayIntro({ onDone }: { onDone: (earned: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>("quiet");
  /**
   * THE TOGGLE IS PURE PLAY HERE. Moving it only recolours the whole Living G
   * in that territory's canonical colour — it never navigates, never reveals
   * content, and never counts toward the spark interaction.
   */
  const [seat, setSeat] = useState<Mode>("give");
  const [played, setPlayed] = useState(false);
  const [taps, setTaps] = useState(0);
  /** A transient answer to a casual touch, once the G has already spoken. */
  const [tickle, setTickle] = useState(false);
  /** The split, told in two quiet statements. */
  const [told, setTold] = useState(0);
  const finished = useRef(false);

  const mid = LOOP_CENTRE.middle;
  const bot = LOOP_CENTRE.bottom;

  /* THE BRAND SETTLES, THEN THE SPARKS APPEAR. Nothing is announced. */
  useEffect(() => {
    if (phase !== "brand") return;
    const t = setTimeout(() => setPhase("spark"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  /* THE FALLBACK. Each half of the spark interaction is given its own unhurried
     window; if the person is still exploring after it, My G simply opens. */
  useEffect(() => {
    if (phase !== "spark" && phase !== "gift") return;
    const t = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDone(false);
    }, PATIENCE_MS);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  /* THE 100 HAS LANDED: the halves separate, and each one is named. */
  useEffect(() => {
    if (phase !== "split") return;
    const a = setTimeout(() => setTold(1), 700);
    const b = setTimeout(() => setTold(2), 2100);
    const c = setTimeout(() => setPhase("gift"), 3600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [phase]);

  /* A CASUAL TOUCH IS STILL ANSWERED — but never with new onboarding copy. */
  useEffect(() => {
    if (!tickle) return;
    const t = setTimeout(() => setTickle(false), TICKLE_MS);
    return () => clearTimeout(t);
  }, [tickle]);

  const touch = (_region: RegionKey) => () => {
    buzz();
    if (phase === "quiet") {
      const next = taps + 1;
      setTaps(next);
      if (next >= 3) setPhase("brand");
      return;
    }
    setTickle(true);
  };

  const press: Partial<Record<RegionKey, () => void>> = {
    top: touch("top"),
    middle: touch("middle"),
    bottom: touch("bottom"),
  };

  const done = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(true);
  };

  /** THE WORDS. One phrase at a time, whole, centred in its own quiet space. */
  const copy = (
    <g pointerEvents="none">
      {/* THE TICKLES — each one a complete phrase, never scattered. */}
      <Line show={phase === "quiet" && taps === 1} x={bot.x} y={bot.y} size={LINE} opacity={0.85}>
        hey, that tickles!
      </Line>
      <Line show={phase === "quiet" && taps === 2} x={bot.x} y={bot.y} size={LINE} opacity={0.85}>
        ha ha, that tickles.
      </Line>
      <Line show={tickle} x={bot.x} y={bot.y - LINE * 3} size={LINE} opacity={0.5}>
        hey, that tickles.
      </Line>

      {/* THE NAME. One word, alone, in the middle loop's own negative space. */}
      <Line show={phase === "brand" || phase === "spark"} x={mid.x} y={mid.y} size={BRAND}>
        giver
      </Line>
      <Line
        show={phase === "brand" || phase === "spark"}
        x={bot.x}
        y={bot.y}
        size={META}
        weight={700}
        track="0.26em"
        opacity={0.62}
      >
        kindness as currency
      </Line>

      {/* THE SPLIT, EXPLAINED BY THE NUMBERS THEMSELVES. */}
      <Line show={told >= 1} x={bot.x} y={bot.y - LINE * 0.8} size={LINE} opacity={0.9}>
        50 sparks for you
      </Line>
      <Line show={told >= 2} x={bot.x} y={bot.y + LINE * 0.8} size={LINE} opacity={0.62}>
        50 sparks for you to gift
      </Line>
    </g>
  );

  return (
    <IntroG
      /* TERRITORY COLOUR WINS ONCE THE PERSON HAS PLAYED WITH THE TOGGLE. */
      world={played ? seat : phase === "split" || phase === "gift" ? "gift" : "welcome"}
      earCut
      press={press}
      overlay={
        <>
          {copy}

          {/* THE HUNDRED, DRIFTING THE G'S OWN RAIL UNTIL IT IS CAUGHT. */}
          {phase === "spark" ? (
            <SparkJourney
              mode="gift"
              count={100}
              bob
              wash={false}
              colour="var(--giver-participation)"
              grabColour="var(--giver-connection)"
              onArrive={() => {
                haptics.success();
                setPhase("split");
              }}
            />
          ) : null}

          {/* THE HALVES. The purple half is already the person's own. */}
          {phase === "split" ? <SparkSplit step="give" /> : null}
          {phase === "gift" ? (
            <>
              <SparkSplit step="held" />
              <SparkJourney
                mode="drag"
                count={50}
                colour="var(--giver-generosity)"
                onGreen={done}
              />
            </>
          ) : null}

          {/* THE EXISTING TOGGLE, FULLY PLAYABLE — the G answers in colour. */}
          <EarSelector
            mode={seat}
            seats={MODES}
            onChange={(next) => {
              setPlayed(true);
              setSeat(next as Mode);
            }}
          />
        </>
      }
    />
  );
}
