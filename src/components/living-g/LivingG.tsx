import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buzz } from "@/lib/haptics";
import {
  EAR_CUT,
  RIM_PATCH,
  LOOP_CENTRE,
  arcPath,
  wedgePath,
  G_ANCHORS,
  G_REGION_BANDS,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
  
} from "./g-path";

import {
  ACTION_LINE_HEIGHT,
  ACTION_SIZE,
  ACTION_WRAP_FACTOR,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
} from "./type-scale";
import { loopOrigin, wrapLines, wrapWidth } from "./loop-layout";


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
  /** Interactive layer drawn above the artwork (eg the top-loop selector). */
  overlay?: React.ReactNode;
  /**
   * THE ONE ACTIVE STATE THE LOOPS ARE HOLDING (eg the current mode).
   * When it changes, every loop's content is UNMOUNTED and rebuilt, so no
   * previous state's words, fades or timers can survive underneath the new one.
   */
  contentKey?: string;
  /**
   * THE SELECTOR'S HOME. When the mode selector owns the small top circle, the
   * canonical ear + stem are removed ONCE by a tight static cut — applied to
   * the base artwork and every swell copy, so no fragment can peek back.
   */
  earCut?: boolean;
  /**
   * LOGO WEIGHT ONLY. Adds an outer stroke of the same colour so the Living G
   * reads as one heavy glyph beside bold type, without redrawing the path.
   */
  weight?: "normal" | "heavy";
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
 * How far a region's action copy is lifted inside its own loop, so a finger
 * never covers it. The CENTRE always comes from the loop itself (loopOrigin).
 */
const LABEL_LIFT: Record<RegionKey, number> = {
  top: 0,
  middle: 32,
  bottom: 46,
};


/**
 * PRIMARY MODE ACTION COPY — ONE fixed token per loop, from type-scale.ts.
 * Every middle-loop action ("make a wish", "propose a trade") renders at the
 * same size, and so does every bottom-loop action. Copy that is too long WRAPS
 * at the loop's own line width; the size NEVER changes with the words.
 */
const LABEL_SIZE: Record<RegionKey, number> = ACTION_SIZE;

/** Where an action's lines may run before wrapping, per loop. */
const actionWrap = (key: RegionKey) => wrapWidth(key, ACTION_WRAP_FACTOR);

/** Lines of an action, wrapped at the fixed token — never resized. */
function actionLines(label: string, key: RegionKey) {
  return wrapLines(label, LABEL_SIZE[key], actionWrap(key), "action");
}


/**
 * ONE interaction rhythm for every Living G, everywhere.
 * touch -> the loop breathes -> the word becomes readable -> haptic -> move.
 */
export const RHYTHM = {
  /** Loop swell in/out. */
  swell: 220,
  /** Cue fade in — soft and human-paced, never a flash. */
  cueIn: 620,
  /** How long the cue stays readable before navigation begins. */
  read: 300,
  /** Cue lingers, comfortably readable, then dissolves slowly. */
  cueOut: 900,
  hold: 1100,
  /** How long a deliberate press-and-hold takes to reveal a loop's label. */
  holdReveal: 1500,

} as const;

/**
 * THE SMOOTH RIM. After the static ear cut, the middle loop's own stroke is
 * redrawn as one perfect arc across that span, so the 2 o'clock section of the
 * G is a single continuous curve — no bump, kink or flat spot, in any mode.
 */
function rimPatch() {
  return (
    <path
      d={arcPath(LOOP_CENTRE.middle, RIM_PATCH.a0, RIM_PATCH.a1, RIM_PATCH.rMid)}
      fill="none"
      stroke="var(--world-g)"
      strokeWidth={RIM_PATCH.width}
      strokeLinecap="butt"
    />
  );
}

/**
 * The Living G.
 *
 * The visible artwork is the canonical traced geometry and NEVER changes shape:
 * only colour varies (via --world-g / --world-accent / --world-ink tokens).
 * Interaction lives in an invisible overlay of generous hit bands, so the G
 * looks identical whether or not a region is interactive.
 */
export function LivingG({
  regions,
  className,
  showLabels = true,
  overlay,
  contentKey = "",
  earCut = false,
  weight = "normal",
}: Props) {
  const [pressed, setPressed] = useState<RegionKey | null>(null);
  /** The temporary word cue: revealed by a deliberate press-and-hold. */
  const [cue, setCue] = useState<RegionKey | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True once a hold has revealed a label, so release does not navigate. */
  const revealed = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * LOGO WEIGHT ONLY: a same-colour outer stroke drawn before the fill, so the
   * canonical silhouette gains visual heft without redrawing its geometry.
   */
  const heavy = weight === "heavy" ? ({ stroke: "var(--world-g)", strokeWidth: 220, paintOrder: "stroke fill", strokeLinejoin: "round" } as const) : undefined;

  /**
   * ONE ACTIVE STATE AT A TIME. The instant the loops start holding a new state,
   * every in-flight cue, hold and swell of the previous one is cancelled — no
   * stale fade can carry a dead state's words into the new one.
   */
  useEffect(() => {
    if (cueTimer.current) clearTimeout(cueTimer.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    revealed.current = false;
    setCue(null);
    setPressed(null);
  }, [contentKey]);


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
      // DIRECT MANIPULATION SURFACE. The G is dragged, not scrolled: the browser
      // must be told here, on the element itself, or Android hands the gesture
      // to the page scroller halfway through a drag. Scrolling everywhere else
      // (panels, forms, lists) is untouched.
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
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
            <rect
              x="-200"
              y="-200"
              width="1200"
              height="1600"
              fill={`url(#${uid}-fall-${key})`}
            />
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
            <rect x="-200" y="-200" width="1200" height="1600" fill="#fff" />
            <path
              d={wedgePath(
                LOOP_CENTRE.middle,
                EAR_CUT.a0,
                EAR_CUT.a1,
                EAR_CUT.r0,
                EAR_CUT.r1,
              )}
              fill="#000"
            />
          </mask>
        ) : null}
      </defs>

      <g>
        {/* The cut applies to the ARTWORK only; the rim patch is drawn on top. */}
        <g {...(earCut ? { mask: `url(#${uid}-earcut)` } : {})}>
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
            <path d={LIVING_G_PATH} {...heavy} />
          </g>
        </g>
        {earCut ? rimPatch() : null}

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
                <g {...(earCut ? { mask: `url(#${uid}-earcut)` } : {})}>
                  <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
                    <path d={LIVING_G_PATH} {...heavy} />
                  </g>
                </g>
                {earCut ? rimPatch() : null}
              </g>
            </g>
          );
        })}
      </g>






      {/*
        REGION CONTENT — ONE STATE, ONE SET OF WORDS PER LOOP.
        The whole group is keyed by the active state, so switching state UNMOUNTS
        the previous state's words outright instead of fading them behind the new
        ones. And a loop's action prompt and its content are MUTUALLY EXCLUSIVE:
        while the prompt is readable the content is not mounted, and vice versa —
        two complete states can never occupy the same negative space.
      */}
      {ORDER.map((key) => {
        const region = regions?.[key];
        if (!region) return null;
        const isPressed = pressed === key;
        const ring = RING[key];
        // OPTICALLY CENTRED ON ITS OWN LOOP — never the page, the SVG or the
        // selector frame. Lifted a little so a fingertip cannot cover it.
        const origin = loopOrigin(key, LABEL_LIFT[key]);
        const lines = region.label ? actionLines(region.label, key) : [];
        const line = LABEL_SIZE[key] * ACTION_LINE_HEIGHT;
        const promptShown = lines.length > 0 && (showLabels || cue === key);

        return (
          <g key={`content-${key}-${contentKey}`} pointerEvents="none">
            {promptShown ? null : (
              <g
                style={{
                  transition: `transform ${RHYTHM.swell}ms cubic-bezier(0.22,1,0.36,1)`,
                  transform: `scale(${isPressed ? 0.985 : 1})`,
                  transformOrigin: `${ring.x}px ${ring.y}px`,
                }}
              >
                {region.render?.(ring)}
              </g>
            )}
            {promptShown ? (
              <text
                x={origin.x}
                y={origin.y - ((lines.length - 1) * line) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={LOOP_TEXT_FILL}
                className="font-black lowercase"
                style={{
                  fontSize: LABEL_SIZE[key],
                  letterSpacing: LOOP_ROLE_STYLE.action.tracking,
                  opacity: LOOP_ROLE_STYLE.action.opacity,
                  transition: `opacity ${
                    cue === key ? RHYTHM.cueIn : RHYTHM.cueOut
                  }ms ease-out`,
                }}
              >
                {lines.map((text, i) => (
                  <tspan key={text + i} x={origin.x} dy={i === 0 ? 0 : line}>
                    {text}
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
