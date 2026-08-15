import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buzz } from "@/lib/haptics";
import {
  EAR_CUT_STEM,
  EAR_GEOMETRY,
  G_ANCHORS,
  G_REGION_BANDS,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
  LOOP_SAFE_RADIUS,
} from "./g-path";

import { LOOP_ACTION_RATIO, LOOP_ROLE_STYLE, LOOP_TEXT_FILL } from "./type-scale";

/**
 * The one canonical presence of a full-size Living G on any screen.
 * Scale and anchor are owned by <GStage>; the artwork simply fills it.
 */
export const G_PRESENCE = "h-full w-full";

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
  /** Interactive layer drawn above the artwork (e.g. the top-loop selector). */
  overlay?: React.ReactNode;
  /**
   * THE SELECTOR'S HOME. When the mode selector owns the small top circle, the
   * canonical ear + stem are removed ONCE by a tight static cut — applied to
   * the base artwork and every swell copy, so no fragment can peek back.
   */
  earCut?: boolean;
};



const ORDER: RegionKey[] = ["top", "middle", "bottom"];

const RING: Record<RegionKey, Anchor> = {
  top: G_ANCHORS.smallRing,
  middle: G_ANCHORS.upperRing,
  bottom: G_ANCHORS.lowerRing,
};

/** How far each loop's press response reaches before dissolving away. */
const FALLOFF: Record<RegionKey, number> = {
  top: 150,
  middle: 320,
  bottom: 360,
};


/**
 * Where a region's word cue sits: inside the negative space of its own loop,
 * lifted above the point of contact so a finger never covers it.
 */
const LABEL_ANCHORS: Record<RegionKey, Anchor> = {
  top: G_ANCHORS.smallRing,
  middle: { x: G_ANCHORS.upperRing.x, y: G_ANCHORS.upperRing.y - 32 },
  bottom: { x: G_ANCHORS.lowerRing.x, y: G_ANCHORS.lowerRing.y - 46 },
};

/**
 * Primary loop ACTION words ("give", "wish", "grant", "discover"). One scale,
 * derived from each loop's safe radius so equivalent actions always carry
 * equivalent weight — substantial next to a full-screen G, never tiny labels.
 */
const LABEL_SIZE: Record<RegionKey, number> = {
  top: Math.round(LOOP_SAFE_RADIUS.top * LOOP_ACTION_RATIO),
  middle: Math.round(LOOP_SAFE_RADIUS.middle * LOOP_ACTION_RATIO),
  bottom: Math.round(LOOP_SAFE_RADIUS.bottom * LOOP_ACTION_RATIO),
};

/**
 * ONE interaction rhythm for every Living G, everywhere.
 * touch -> the loop breathes -> the word becomes readable -> haptic -> move.
 */
export const RHYTHM = {
  /** Loop swell in/out. */
  swell: 220,
  /** Cue fade in — fast enough to feel instant. */
  cueIn: 120,
  /** How long the cue stays readable before navigation begins. */
  read: 300,
  /** Cue lingers a beat after release, then dissolves. */
  cueOut: 420,
  hold: 1100,
  /** How long a deliberate press-and-hold takes to reveal a loop's label. */
  holdReveal: 1500,

} as const;

/**
 * The Living G.
 *
 * The visible artwork is the canonical traced geometry and NEVER changes shape:
 * only colour varies (via --world-g / --world-accent / --world-ink tokens).
 * Interaction lives in an invisible overlay of generous hit bands, so the G
 * looks identical whether or not a region is interactive.
 */
export function LivingG({ regions, className, showLabels = true, overlay }: Props) {
  const [pressed, setPressed] = useState<RegionKey | null>(null);
  /** The temporary word cue: revealed by a deliberate press-and-hold. */
  const [cue, setCue] = useState<RegionKey | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True once a hold has revealed a label, so release does not navigate. */
  const revealed = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const release = () => {
    setPressed(null);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    // The word lingers a beat after the finger lifts, then softly dissolves.
    if (revealed.current) {
      if (cueTimer.current) clearTimeout(cueTimer.current);
      cueTimer.current = setTimeout(() => setCue(null), RHYTHM.cueOut);
    }
  };

  useEffect(
    () => () => {
      if (cueTimer.current) clearTimeout(cueTimer.current);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );
  const uid = useId().replace(/:/g, "");

  /** PRESS AND HOLD teaches the loop again — a soft fade, never a tooltip. */
  const holdCue = (key: RegionKey) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      revealed.current = true;
      buzz(10);
      if (cueTimer.current) clearTimeout(cueTimer.current);
      setCue(key);
    }, RHYTHM.holdReveal);
  };


  return (
    <svg
      viewBox={LIVING_G_VIEWBOX}
      className={cn("h-full w-full select-none overflow-visible", className)}
    >
      {/*
        Canonical geometry, drawn once and never transformed, plus one
        soft-masked copy per region on top. Only the pressed region's copy
        swells, so a single loop breathes while the rest stays perfectly still —
        and because the base beneath is always fully opaque, no boundary, seam
        or rectangle is ever visible.
      */}
      <defs>
        {/*
          Soft radial falloffs centred on each loop, so a swell reads as that
          loop breathing and dissolves organically into the rest of the stroke —
          never a straight edge or a boundary line anywhere.
        */}
        {ORDER.map((key) => (
          <radialGradient
            key={key}
            id={`${uid}-fall-${key}`}
            gradientUnits="userSpaceOnUse"
            cx={RING[key].x}
            cy={RING[key].y}
            r={FALLOFF[key]}
          >
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
        ))}
        {ORDER.map((key) => (
          <mask key={key} id={`${uid}-mask-${key}`}>
            <rect x="0" y="0" width="576" height="1133" fill={`url(#${uid}-fall-${key})`} />
          </mask>
        ))}
        {/*
          THE STATIC EAR CUT — a tight disc over the small top circle plus a
          short band over its stem, stopping just outside the middle loop's rim
          so the rim, the spine and every neighbouring stroke are untouched.
          One cut, applied once, identical in every mode.
        */}
        {earCut ? (
          <mask id={`${uid}-earcut`} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="576" height="1133" fill="#fff" />
            <line
              x1={EAR_CUT_STEM.x1}
              y1={EAR_CUT_STEM.y1}
              x2={EAR_CUT_STEM.x2}
              y2={EAR_CUT_STEM.y2}
              stroke="#000"
              strokeWidth={EAR_GEOMETRY.cutStemWidth}
            />
            <circle
              cx={EAR_GEOMETRY.home.x}
              cy={EAR_GEOMETRY.home.y}
              r={EAR_GEOMETRY.cutR}
              fill="#000"
            />
          </mask>
        ) : null}
      </defs>

      <g {...(earCut ? { mask: `url(#${uid}-earcut)` } : {})}>
        <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
          <path d={LIVING_G_PATH} />
        </g>

        {ORDER.map((key) => {
          const isPressed = pressed === key;
          const ring = RING[key];
          return (
            <g key={`art-${key}`} mask={`url(#${uid}-mask-${key})`}>
              <g
                style={{
                  transition: `transform ${RHYTHM.swell}ms cubic-bezier(0.22,1,0.36,1)`,
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
      </g>





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
              style={{
                transition: `transform ${RHYTHM.swell}ms cubic-bezier(0.22,1,0.36,1)`,
                transform: `scale(${isPressed ? 0.985 : 1})`,
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
                fill={LOOP_TEXT_FILL}
                className="font-black lowercase"
                style={{
                  fontSize: LABEL_SIZE[key],
                  letterSpacing: LOOP_ROLE_STYLE.action.tracking,
                  opacity: showLabels || cue === key ? LOOP_ROLE_STYLE.action.opacity : 0,
                  transition: `opacity ${
                    cue === key ? RHYTHM.cueIn : RHYTHM.cueOut
                  }ms ease-out`,
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
              revealed.current = false;
              setPressed(key);
              holdCue(key);
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
              // A hold TEACHES; only a tap travels.
              if (revealed.current) {
                revealed.current = false;
                return;
              }
              buzz();
              if (navTimer.current) clearTimeout(navTimer.current);
              const run = region.onPress;
              navTimer.current = setTimeout(() => run?.(), RHYTHM.read);
            }}


            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") region.onPress?.();
            }}
          />
        );
      })}

      {overlay}
    </svg>

  );
}
