import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG, type RegionKey } from "@/components/living-g/LivingG";
import { loopText } from "@/components/living-g/loop-text";

export type LoopCopy = {
  kicker?: string;
  lines: string[];
  /** The COMPLETE composition this loop is building toward — layout is fixed. */
  plan?: string[];
  /** Deliberate emphasis for a transitional beat. */
  scale?: number;
  /** Per-loop presence, so one loop can hold while another changes. */
  opacity?: number;
  /** First line is the hero number/word; the rest support it. */
  hero?: boolean;
};


/**
 * One coordinated beat: colour and copy always move together. This is also the
 * FADE-OUT duration of a thought that is being replaced — slow enough to feel
 * like a breath, never a cut.
 */
export const BEAT_MS = 200;

/** World colour keeps its unhurried polish: only the copy rhythm is quick. */
export const WORLD_MS = 700;

/**
 * One onboarding chapter: the canonical full-screen Living G in a single bold
 * colour, with the words living inside its negative space. No headings, no
 * paragraphs, no cards — the G is the screen.
 */
export function IntroG({
  world,
  top,
  middle,
  bottom,
  onAdvance,
  copyOpacity = 1,
  overlay,
  stage,
  children,
}: {
  world: string;
  top?: LoopCopy | undefined;
  middle?: LoopCopy | undefined;
  bottom?: LoopCopy | undefined;
  onAdvance?: (() => void) | undefined;
  /** Gentle fade of the words inside the loops. The G itself never moves. */
  copyOpacity?: number;
  /** Interactive layer drawn above the artwork (e.g. the travelling spark). */
  overlay?: React.ReactNode;
  /**
   * THE CAMERA. A transform applied to the STAGE only (never the paper), so the
   * very same Living G that spells GIVER can be zoomed into at full size. The
   * geometry is untouched: only the camera moves.
   */
  stage?: React.CSSProperties;
  children?: React.ReactNode;
}) {

  const region = (key: RegionKey, copy: LoopCopy | undefined) => {
    if (!copy) return {};
    return {
      [key]: {
        render: (anchor: { x: number; y: number }) => (
          <g
            style={{
              opacity: (copy.opacity ?? 1) * copyOpacity,
              transition: `opacity ${BEAT_MS}ms var(--giver-ease)`,
            }}
          >
            {loopText({
              anchor,
              region: key,
              ...(copy.kicker ? { kicker: copy.kicker } : {}),
              lines: copy.lines,
              ...(copy.plan ? { plan: copy.plan } : {}),
              ...(copy.scale ? { scale: copy.scale } : {}),
              ...(copy.hero ? { hero: true } : {}),
            })}

          </g>
        ),
      },
    };
  };

  return (
    <div
      data-world={world}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--world-bg)",
        color: "var(--world-ink)",
        transition: `background-color ${WORLD_MS}ms var(--giver-ease)`,
      }}
      onClick={onAdvance}
    >
      <GStage>
        <div
          className="h-full w-full [&_path]:ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ ["--beat" as string]: `${BEAT_MS}ms` }}
        >
          <div className="h-full w-full [&_path]:transition-[fill] [&_path]:duration-[700ms]">
            <LivingG
              className={G_PRESENCE}
              showLabels={false}
              {...(overlay ? { overlay } : {})}
              regions={{
                ...region("top", top),
                ...region("middle", middle),
                ...region("bottom", bottom),
              }}
            />
          </div>
        </div>
      </GStage>
      {children}
    </div>
  );
}
