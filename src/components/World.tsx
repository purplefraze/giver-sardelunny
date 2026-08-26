import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG, type RegionKey } from "@/components/living-g/LivingG";
import { Panel } from "@/components/Panel";

export type RegionSpec = {
  label: string;
  panelTitle: string;
  panelBody: React.ReactNode;
  render?: (a: { x: number; y: number }) => React.ReactNode;
  /** When set, the press runs this instead of opening the region panel. */
  onPress?: () => void;
};

type Props = {
  world: "home" | "profile" | "community" | "wish" | "give" | "trade" | "borrow" | "lend";
  /** Optional corner word. Omit for worlds where the G colour is the only cue. */
  word?: string;
  /** Quiet page identity: which world am I in. */
  identity?: string;
  /** One quiet secondary line under the identity. */
  tagline?: string;
  regions: Record<RegionKey, RegionSpec>;
  onLocked?: (locked: boolean) => void;
  /** Every world that was opened from somewhere has a way back. */
  onBack?: () => void;
  /** False while this world is not the top of the navigation stack. */
  active?: boolean;
  /**
   * FIRST-TIME TEACHING STATE: the loop action labels show themselves once, so
   * a new user learns the G. Afterwards the G goes quiet and a press-and-hold
   * brings a label back.
   */
  teach?: boolean;
  /**
   * THE ONE ACTIVE STATE the loops are holding (e.g. the current mode). Changing
   * it unmounts the previous state's in-loop words completely.
   */
  contentKey?: string;

  /** Interactive layer drawn above the Living G (e.g. top-loop selector). */
  overlay?: React.ReactNode;
  /** True when the mode selector owns the small top circle (static ear cut). */
  children?: React.ReactNode;
};

/** One world = one enormous Living G with three independent regions. */
export function World({
  world,
  word,
  identity,
  tagline,
  regions,
  onLocked,
  onBack,
  active = true,
  teach = false,
  contentKey,

  overlay,
  children,
}: Props) {
  const [open, setOpen] = useState<RegionKey | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const pinCanvasScroll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.scrollLeft !== 0) canvas.scrollLeft = 0;
    if (canvas.scrollTop !== 0) canvas.scrollTop = 0;
  };

  useEffect(() => {
    pinCanvasScroll();
  });

  const setPanel = (key: RegionKey | null) => {
    setOpen(key);
    onLocked?.(key !== null);
  };

  // A loop panel never outlives its world: leaving the world disposes it.
  useEffect(() => {
    if (!active && open !== null) {
      setOpen(null);
      onLocked?.(false);
    }
  }, [active, open, onLocked]);

  const press = (key: RegionKey) => () => {
    const custom = regions[key].onPress;
    if (custom) custom();
    else setPanel(key);
  };

  return (
    <div
      ref={canvasRef}
      data-world={world}
      className="relative flex h-full w-full flex-col overflow-clip"
      onScroll={pinCanvasScroll}
      onPointerDownCapture={pinCanvasScroll}
      style={{
        background: "var(--world-bg)",
        color: "var(--world-ink)",
        overflow: "clip",
        pointerEvents: active ? undefined : "none",
      }}
    >
      {/* One unambiguous exit per depth: while a panel is open, only its arrow shows. */}
      {onBack && open === null ? <BackArrow onClick={onBack} /> : null}

      {word ? (
        <span className="absolute right-6 top-5 z-10 text-[11px] font-black lowercase tracking-[0.28em] opacity-55">
          {word}
        </span>
      ) : null}
      {identity ? (
        <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-1 px-8 text-center">
          <span className="text-[13px] font-black lowercase tracking-[0.34em] opacity-70">
            {identity}
          </span>
          {tagline ? (
            <span className="text-[11px] font-medium lowercase tracking-[0.02em] opacity-45">
              {tagline}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}

      {/* ONE scale system: the canonical stage owns size and anchor. */}
      <GStage>
        <LivingG
          className={G_PRESENCE}
          showLabels={teach}
          {...(contentKey === undefined ? {} : { contentKey })}
          overlay={overlay}
          regions={{
            top: { label: regions.top.label, onPress: press("top"), render: regions.top.render },
            middle: {
              label: regions.middle.label,
              onPress: press("middle"),
              render: regions.middle.render,
            },
            bottom: {
              label: regions.bottom.label,
              onPress: press("bottom"),
              render: regions.bottom.render,
            },
          }}
        />
      </GStage>

      {(["top", "middle", "bottom"] as RegionKey[]).map((key) => (
        <Panel
          key={key}
          open={open === key}
          onClose={() => setPanel(null)}
          title={regions[key].panelTitle}
        >
          {regions[key].panelBody}
        </Panel>
      ))}
    </div>
  );
}

/** Circular photo that scales with the G geometry. */
export function ringPhoto(src: string, alt: string, radius = 96) {
  return function render(a: { x: number; y: number }) {
    const id = `photo-${alt.replace(/\s+/g, "-")}-${Math.round(a.y)}`;
    return (
      <>
        <defs>
          <clipPath id={id}>
            <circle cx={a.x} cy={a.y} r={radius} />
          </clipPath>
        </defs>
        <image
          href={src}
          x={a.x - radius}
          y={a.y - radius}
          width={radius * 2}
          height={radius * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${id})`}
        />
      </>
    );
  };
}
