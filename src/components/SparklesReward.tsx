import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { profileLoop } from "@/components/living-g/profile-loop";
import { PROFILE_SPARKLES } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * PROFILE COMPLETE — THE SPARKLE REWARD.
 *
 * Sparks power my own activity. SPARKLES are a different, earned reward: they
 * exist only to help somebody ELSE's wish, give, trade or borrow get seen.
 * Awarded once, for finishing the first profile. Never bought.
 */
export function SparklesReward({ onDone }: { onDone: () => void }) {
  return (
    <button
      type="button"
      data-world="participation"
      onClick={() => {
        buzz();
        onDone();
      }}
      className="relative block h-full w-full text-left"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <GStage>
        <LivingG
          className={G_PRESENCE}
          showLabels={false}
          regions={{
            middle: {
              label: "",
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "middle",
                  blocks: [
                    { text: "profile", role: "primary" },
                    { text: "complete", role: "primary" },
                  ],
                }),
            },
            bottom: {
              label: "",
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "bottom",
                  blocks: [
                    { text: "here's", role: "secondary" },
                    { text: `${PROFILE_SPARKLES} sparkles`, role: "primary" },
                    {
                      text: "use a sparkle to help someone's wish, give, trade or borrow get seen",
                      role: "tertiary",
                      lead: true,
                    },
                  ],
                }),
            },
          }}
        />
      </GStage>
    </button>
  );
}
