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
  const down = useRef<{ x: number; y: number } | null>(null);
  const release = () => setPressed(null);


  return (
    <svg
      viewBox={LIVING_G_VIEWBOX}
      className={cn("h-full w-full select-none", className)}
    >
      <defs>
        {ORDER.map((key) => (
          <clipPath key={key} id={`g-band-${key}`}>
            <rect {...G_REGION_BANDS[key]} />
          </clipPath>
        ))}
      </defs>

      {/* Canonical geometry */}
      <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
        <path d={LIVING_G_PATH} />
      </g>

      {/* Pressed-region colour response: same path, clipped, never re-drawn */}
      {ORDER.map((key) => (
        <g
          key={key}
          clipPath={`url(#g-band-${key})`}
          className="transition-opacity duration-150"
          style={{ opacity: pressed === key ? 1 : 0 }}
          pointerEvents="none"
        >
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-accent)">
            <path d={LIVING_G_PATH} />
          </g>
        </g>
      ))}

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
            {showLabels && region.label ? (
              <text
                x={label.x}
                y={label.y - ((words.length - 1) * 30) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--world-ink)"
                className="font-black uppercase transition-transform duration-150"
                style={{
                  fontSize: key === "top" ? 26 : 30,
                  letterSpacing: "-0.045em",
                  transform: `scale(${isPressed ? 0.94 : 1})`,
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
            role="button"
            tabIndex={0}
            aria-label={region.label ?? key}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              down.current = { x: e.clientX, y: e.clientY };
              setPressed(key);
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
