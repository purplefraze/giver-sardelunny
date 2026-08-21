import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { seatCentre, type Seat } from "@/components/living-g/EarSelector";
import { SparkBundle } from "@/components/living-g/SparkBundle";

/**
 * THE SPARK ECONOMY, TOLD IN MOTION.
 *
 *   hundred  one bundle of 100 Sparks in the middle loop — GREEN, because they
 *            came straight from Giver and nothing has been exchanged yet
 *   collect  the hundred has divided: 50 GREEN (mine) and 50 PURPLE (to gift)
 *            both gathered in the middle loop
 *   rise     the green 50 shoot out of the middle loop into the toggle loop
 *            wherever the toggle actually is right now
 *   held     the green 50 live in that loop's negative space; the purple 50 are
 *            the draggable bundle owned by SparkJourney
 *
 * COLOUR IS RELATIONSHIP, NOT POSITION. Giver -> me is green and stays green;
 * only the half being prepared for another person turns purple.
 */
export type SplitStep = "hundred" | "collect" | "rise" | "held";

const MOVE_MS = 900;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

export function SparkSplit({ step, seat }: { step: SplitStep; seat: Seat }) {
  const mid = LOOP_CENTRE.middle;
  /**
   * DESTINATION = CURRENT TOGGLE LOOP, never "the Give position". The selector
   * IS the small loop, so its live centre for whatever seat the toggle already
   * occupies is the target. The toggle is never moved to meet the sparks.
   */
  const top = seatCentre(seat);
  const split = step !== "hundred";
  const risen = step === "rise" || step === "held";

  return (
    <g pointerEvents="none">
      {/* THE WHOLE: 100 Sparks straight from Giver — GREEN from the first frame. */}
      <g
        transform={`translate(${mid.x} ${mid.y})`}
        style={{
          opacity: step === "hundred" ? 1 : 0,
          transition: `opacity ${MOVE_MS * 0.4}ms ease-out`,
        }}
      >
        <SparkBundle r={62} count={100} colour="var(--giver-generosity)" />
      </g>

      {/* MY HALF. It gathers in the middle loop first, THEN shoots up into
          whichever loop the toggle is presently sitting in, and settles inside
          its negative space. Still green: these are simply mine now. */}
      <g
        style={{
          transform: risen
            ? `translate(${top.x}px, ${top.y}px)`
            : `translate(${mid.x}px, ${mid.y}px)`,
          opacity: split ? 1 : 0,
          transition: `transform ${MOVE_MS}ms ${EASE}, opacity ${MOVE_MS * 0.4}ms ease-out`,
        }}
      >
        <g
          style={{
            /* A quiet living breath once settled in the loop's open interior. */
            transform: risen ? "scale(1)" : "scale(1.6)",
            transition: `transform ${MOVE_MS}ms ${EASE}`,
          }}
        >
          <SparkBundle
            r={26}
            count={50}
            colour="var(--giver-generosity)"
            stroke="var(--world-bg)"
          />
        </g>
      </g>

      {/* THE GIFT HALF. It stays in the middle loop and becomes PURPLE: it is
          now being prepared for a person-to-person give. */}
      <g
        transform={`translate(${mid.x} ${mid.y})`}
        style={{
          opacity: step === "collect" || step === "rise" ? 1 : 0,
          transition: `opacity ${MOVE_MS * 0.5}ms ease-out`,
        }}
      >
        <SparkBundle r={44} count={50} colour="var(--giver-connection)" />
      </g>
    </g>
  );
}
