import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { loopText } from "@/components/living-g/loop-text";

type LoopCopy = { kicker?: string; lines: string[] } | null;

/**
 * One onboarding chapter: the canonical full-screen Living G in a single bold
 * colour, with the words living inside its negative space. No headings, no
 * paragraphs, no cards — the G is the screen.
 */
export function IntroG({
  world,
  middle,
  bottom,
  onAdvance,
  copyOpacity = 1,
  children,
}: {
  world: string;
  middle?: LoopCopy;
  bottom?: LoopCopy;
  onAdvance?: (() => void) | undefined;
  /** Gentle fade of the words inside the loops. The G itself never moves. */
  copyOpacity?: number;
  children?: React.ReactNode;
}) {
  const fade = {
    opacity: copyOpacity,
    transition: "opacity 600ms var(--giver-ease)",
  } as const;
  return (
    <div
      data-world={world}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--world-bg)",
        color: "var(--world-ink)",
        transition: "background-color 700ms var(--giver-ease)",
      }}
      onClick={onAdvance}
    >
      <GStage>
        <div className="h-full w-full [&_path]:transition-[fill] [&_path]:duration-[700ms] [&_path]:ease-[cubic-bezier(0.22,1,0.36,1)]">
          <LivingG
            className={G_PRESENCE}
            showLabels={false}
            regions={{
              ...(middle
                ? {
                    middle: {
                      render: (anchor) => (
                        <g style={fade}>
                          {loopText({
                            anchor,
                            region: "middle",
                            ...(middle.kicker ? { kicker: middle.kicker } : {}),
                            lines: middle.lines,
                          })}
                        </g>
                      ),
                    },
                  }
                : {}),
              ...(bottom
                ? {
                    bottom: {
                      render: (anchor) => (
                        <g style={fade}>
                          {loopText({
                            anchor,
                            region: "bottom",
                            ...(bottom.kicker ? { kicker: bottom.kicker } : {}),
                            lines: bottom.lines,
                          })}
                        </g>
                      ),
                    },
                  }
                : {}),
            }}
          />
        </div>
      </GStage>
      {children}
    </div>
  );
}

