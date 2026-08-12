import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buzz } from "@/lib/haptics";
import {
  G_ANCHORS,
  G_REGION_BANDS,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
} from "./g-path";

export type RegionKey = "top" | "middle" | "bottom";

export type Anchor = { x: number; y: number };

export type GRegion = {
  label?: string;
  onPress?: () => void;
  /** Extra SVG content drawn at the region's ring centre (photo, sparks…). */
  render?: ((anchor: Anchor) => React.ReactNode) | undefined;
};

type Props = {
  regions?: Partial<Record<RegionKey, GRegion>>;
  className?: string;
  showLabels?: boolean;
};

const ORDER: RegionKey[] = ["top", "middle", "bottom"];

/** Where a region's words sit (kept clear of the strokes). */
const LABEL_ANCHORS: Record<RegionKey, Anchor> = {
  top: { x: 150, y: 96 },
  middle: G_ANCHORS.upperRing,
  bottom: G_ANCHORS.lowerRing,
};

/**
 * The Living G.
 *
 * The visible artwork is the canonical traced geometry and NEVER changes shape:
 * only colour varies (via --world-g / --world-accent / --world-ink tokens).
 * Interaction lives in an invisible overlay of generous hit bands, so the G
 * looks identical whether or not a region is interactive.
 */
export function LivingG({ regions, className, showLabels = true }: Props) {
  const [pressed, setPressed] = useState<RegionKey | null>(null);
  /** The temporary word cue: appears on press, fades away on its own. */
  const [cue, setCue] = useState<RegionKey | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const release = () => setPressed(null);

  const showCue = (key: RegionKey) => {
    setCue(key);
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setCue(null), 900);
  };



  const pressAnchor = pressed
    ? pressed === "top"
      ? G_ANCHORS.smallRing
      : pressed === "middle"
        ? G_ANCHORS.upperRing
        : G_ANCHORS.lowerRing
    : null;

  return (
    <svg
      viewBox={LIVING_G_VIEWBOX}
      className={cn("h-full w-full select-none", className)}
    >
      {/* Canonical geometry — subtle swell + brightness at the pressed region */}
      <g
        className="transition-[transform,filter] duration-150 ease-out"
        style={{
          transform: `scale(${pressed ? 1.012 : 1})`,
          transformOrigin: pressAnchor
            ? `${pressAnchor.x}px ${pressAnchor.y}px`
            : "center",
          filter: pressed ? "brightness(1.06)" : "none",
        }}
      >
        <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
          <path d={LIVING_G_PATH} />
        </g>
      </g>


      {/* Region content */}
      {ORDER.map((key) => {
        const region = regions?.[key];
        if (!region) return null;
        const isPressed = pressed === key;
        const ring =
          key === "top"
            ? G_ANCHORS.smallRing
            : key === "middle"
              ? G_ANCHORS.upperRing
              : G_ANCHORS.lowerRing;
        const label = LABEL_ANCHORS[key];
        const words = (region.label ?? "").split(" ");

        return (
          <g key={`content-${key}`} pointerEvents="none">
            <g
              className="transition-transform duration-150"
              style={{
                transform: `scale(${isPressed ? 0.94 : 1})`,
                transformOrigin: `${ring.x}px ${ring.y}px`,
              }}
            >
              {region.render?.(ring)}
            </g>
            {region.label ? (
              <text
                x={label.x}
                y={label.y - ((words.length - 1) * 30) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--world-ink)"
                className="font-black uppercase transition-[opacity,transform] duration-300 ease-out"
                style={{
                  fontSize: key === "top" ? 26 : 30,
                  letterSpacing: "-0.045em",
                  opacity: showLabels || cue === key ? 0.72 : 0,
                  transform: `scale(${isPressed ? 0.96 : 1})`,
                  transformOrigin: `${label.x}px ${label.y}px`,
                }}
              >
                {words.map((word, i) => (
                  <tspan key={word + i} x={label.x} dy={i === 0 ? 0 : 30}>
                    {word}
                  </tspan>
                ))}
              </text>
            ) : null}

          </g>
        );
      })}

      {/* Invisible hit areas */}
      {ORDER.map((key) => {
        const region = regions?.[key];
        if (!region?.onPress) return null;
        return (
          <rect
            key={`hit-${key}`}
            {...G_REGION_BANDS[key]}
            fill="transparent"
            stroke="none"
            role="button"
            tabIndex={0}
            aria-label={region.label ?? key}
            className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
            style={{ cursor: "pointer", outline: "none" }}

            onPointerDown={(e) => {
              down.current = { x: e.clientX, y: e.clientY };
              setPressed(key);
              showCue(key);
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") showCue(key);
            }}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}

            onClick={(e) => {
              // A horizontal swipe across the G must not fire a region.
              const d = down.current;
              if (
                d &&
                Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10
              ) {
                return;
              }
              buzz();
              region.onPress?.();
            }}

            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") region.onPress?.();
            }}
          />
        );
      })}
    </svg>
  );
}
