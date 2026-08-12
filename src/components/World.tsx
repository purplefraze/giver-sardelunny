import { useState } from "react";
import { LivingG, type RegionKey } from "@/components/living-g/LivingG";
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
  world: "home" | "profile" | "community" | "wish" | "give";
  /** Optional corner word. Omit for worlds where the G colour is the only cue. */
  word?: string;
  regions: Record<RegionKey, RegionSpec>;
  onLocked?: (locked: boolean) => void;
  children?: React.ReactNode;
};

/** One world = one enormous Living G with three independent regions. */
export function World({ world, word, regions, onLocked, children }: Props) {
  const [open, setOpen] = useState<RegionKey | null>(null);

  const setPanel = (key: RegionKey | null) => {
    setOpen(key);
    onLocked?.(key !== null);
  };

  const press = (key: RegionKey) => () => {
    const custom = regions[key].onPress;
    if (custom) custom();
    else setPanel(key);
  };


  return (
    <div
      data-world={world}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <span className="absolute left-6 top-5 z-10 text-[11px] font-black uppercase tracking-[0.3em] opacity-55">
        {word}
      </span>
      {children}


      {/* Scale reference: the G occupies ~80% of viewport height, centred. */}
      <div className="flex flex-1 items-center justify-center">
        <LivingG
          className="h-[80%] max-w-[86%]"
          showLabels={false}
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
      </div>

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
