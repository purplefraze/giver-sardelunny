import { reservedTotal } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";

/**
 * SPARKS ARE HONEST OR THEY ARE NOTHING.
 *
 * Available sparks and the sparks a wish is holding are shown SEPARATELY, so
 * nothing is ever silently spent, and nothing is paid before two people agree
 * an interaction actually happened.
 */
export function SparkBalance({ onPress }: { onPress?: () => void }) {
  const me = useMyProfile();
  const held = reservedTotal(me);

  return (
    <button
      type="button"
      onClick={onPress}
      className="absolute left-4 top-4 z-20 flex flex-col items-start text-left"
      aria-label={`${me.sparks} sparks available, ${held} held in wishes`}
    >
      <span
        className="text-[13px] font-black lowercase tracking-[0.22em]"
        style={{ color: "var(--giver-sparks)" }}
      >
        {me.sparks} ✨
      </span>
      {held ? (
        <span className="text-[10px] font-black lowercase tracking-[0.22em] opacity-45">
          {held} in wishes
        </span>
      ) : null}
    </button>
  );
}
