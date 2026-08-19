import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { SparkBundle } from "@/components/living-g/SparkBundle";

/**
 * THE SPARK ECONOMY, TOLD IN MOTION.
 *
 *   hundred  one bundle of 100 Sparks, Giver's own light, in the middle loop
 *   wish     half of it travels UP into the top loop and becomes WISH purple
 *   give     the half left behind becomes GIVE green
 *   held     only the purple wish half remains here; the green half is now the
 *            draggable bundle owned by SparkJourney
 *
 * One hundred never becomes "another" set of Sparks: the same two halves are
 * mounted throughout and simply move and change colour.
 */
export type SplitStep = "hundred" | "wish" | "give" | "held";

const MOVE_MS = 900;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

export function SparkSplit({ step }: { step: SplitStep }) {
  const mid = LOOP_CENTRE.middle;
  const top = LOOP_CENTRE.top;
  const allocated = step !== "hundred";

  return (
    <g pointerEvents="none">
      {/* THE WHOLE: 100 Sparks, before anything is allocated. */}
      <g
        transform={`translate(${mid.x} ${mid.y})`}
        style={{
          opacity: step === "hundred" ? 1 : 0,
          transition: `opacity ${MOVE_MS * 0.5}ms ease-out`,
        }}
      >
        <SparkBundle r={62} count={100} colour="var(--world-g)" />
      </g>

      {/* THE WISH HALF. It rises into the top loop and turns purple. */}
      <g
        style={{
          transform: allocated
            ? `translate(${top.x}px, ${top.y}px)`
            : `translate(${mid.x}px, ${mid.y}px)`,
          opacity: allocated ? 1 : 0,
          transition: `transform ${MOVE_MS}ms ${EASE}, opacity ${MOVE_MS * 0.6}ms ease-out`,
        }}
      >
        <SparkBundle r={26} count={50} colour="var(--giver-connection)" />
      </g>

      {/* THE GIVE HALF. It stays where it is and turns green. */}
      <g
        transform={`translate(${mid.x} ${mid.y})`}
        style={{
          opacity: step === "wish" || step === "give" ? 1 : 0,
          transition: `opacity ${MOVE_MS * 0.6}ms ease-out`,
        }}
      >
        <SparkBundle
          r={44}
          count={50}
          colour={step === "give" ? "var(--giver-generosity)" : "var(--world-g)"}
        />
      </g>
    </g>
  );
}
