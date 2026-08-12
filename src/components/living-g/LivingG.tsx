import { useId, useRef, useState } from "react";
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

const RING: Record<RegionKey, Anchor> = {
  top: G_ANCHORS.smallRing,
  middle: G_ANCHORS.upperRing,
  bottom: G_ANCHORS.lowerRing,
};

/**
 * Where a region's word cue sits: inside the negative space of its own loop,
 * lifted above the point of contact so a finger never covers it.
 */
const LABEL_ANCHORS: Record<RegionKey, Anchor> = {
  top: G_ANCHORS.smallRing,
  middle: { x: G_ANCHORS.upperRing.x, y: G_ANCHORS.upperRing.y - 66 },
  bottom: { x: G_ANCHORS.lowerRing.x, y: G_ANCHORS.lowerRing.y - 96 },
};

const LABEL_SIZE: Record<RegionKey, number> = {
  top: 15,
  middle: 30,
  bottom: 30,
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
  const uid = useId().replace(/:/g, "");

  const showCue = (key: RegionKey) => {
    setCue(key);
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setCue(null), 900);
  };

  return (
    <svg
      viewBox={LIVING_G_VIEWBOX}
      className={cn("h-full w-full select-none", className)}
    >
      {/*
        Canonical geometry, drawn as three band-clipped copies so a press can
        swell ONLY its own region while the rest stays perfectly still.
      */}
      <defs>
        {/*
          Soft-edged region masks. Adjacent fades are exact complements, so the
          unpressed G renders as one continuous shape; while a region swells the
          feather hides the boundary entirely (never a visible line or box).
        */}
        <linearGradient id={`${uid}-fade-top`} gradientUnits="userSpaceOnUse" x1="0" y1="156" x2="0" y2="204">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id={`${uid}-fade-mid`} gradientUnits="userSpaceOnUse" x1="0" y1="576" x2="0" y2="624">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${uid}-mask-top`}>
          <rect x="0" y="0" width="576" height="156" fill="#fff" />
          <rect x="0" y="156" width="576" height="48" fill={`url(#${uid}-fade-top)`} />
        </mask>
        <mask id={`${uid}-mask-middle`}>
          <rect x="0" y="156" width="576" height="48" fill={`url(#${uid}-fade-top)`} transform="rotate(180 288 180)" />
          <rect x="0" y="204" width="576" height="372" fill="#fff" />
          <rect x="0" y="576" width="576" height="48" fill={`url(#${uid}-fade-mid)`} />
        </mask>
        <mask id={`${uid}-mask-bottom`}>
          <rect x="0" y="576" width="576" height="48" fill={`url(#${uid}-fade-mid)`} transform="rotate(180 288 600)" />
          <rect x="0" y="624" width="576" height="509" fill="#fff" />
        </mask>
      </defs>

      {ORDER.map((key) => {
        const isPressed = pressed === key;
        const ring = RING[key];
        return (
          <g key={`art-${key}`} mask={`url(#${uid}-mask-${key})`}>
            <g
              className="transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${isPressed ? 1.022 : 1})`,
                transformOrigin: `${ring.x}px ${ring.y}px`,
              }}
            >
              <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
                <path d={LIVING_G_PATH} />
              </g>
            </g>
          </g>
        );
      })}


      {/* Region content */}
      {ORDER.map((key) => {
        const region = regions?.[key];
        if (!region) return null;
        const isPressed = pressed === key;
        const ring = RING[key];
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
                y={label.y - ((words.length - 1) * LABEL_SIZE[key]) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--world-ink)"
                className="font-black uppercase transition-[opacity] duration-300 ease-out"
                style={{
                  fontSize: LABEL_SIZE[key],
                  letterSpacing: "-0.045em",
                  opacity: showLabels || cue === key ? 0.72 : 0,
                }}
              >
                {words.map((word, i) => (
                  <tspan
                    key={word + i}
                    x={label.x}
                    dy={i === 0 ? 0 : LABEL_SIZE[key]}
                  >
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
