import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buzz, haptics } from "@/lib/haptics";
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
import { G_STROKE, GThinMask } from "./g-weight";
import { MiddleLoopClose } from "./loop-close";


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
   * When it changes, in-loop content CROSSFADES (LOOP_LABEL.fadeMs) — the G
   * surface stays mounted; only the material shifts. Never remount the <g>.
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
   * MIDDLE: the same outline eroded to a 28.5-unit stroke (g-weight.tsx).
   */
  weight?: "normal" | "heavy" | "middle";
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
function rimPatch(thin = false) {
  /* The patch's centre line (rMid) is the stroke's centre line at every
     weight; only its width follows the weight (53.5 → 28.5). */
  return (
    <path
      d={arcPath(LOOP_CENTRE.middle, RIM_PATCH.a0, RIM_PATCH.a1, RIM_PATCH.rMid)}
      fill="none"
      stroke="var(--world-g)"
      strokeWidth={thin ? G_STROKE.middle : RIM_PATCH.width}
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
  /** The one pointer allowed to drive the current press. */
  const tapId = useRef<number | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * LOGO WEIGHT ONLY: a same-colour outer stroke drawn before the fill, so the
   * canonical silhouette gains visual heft without redrawing its geometry.
   */
  const heavy = weight === "heavy" ? ({ stroke: "var(--world-g)", strokeWidth: 220, paintOrder: "stroke fill", strokeLinejoin: "round" } as const) : undefined;
  const thin = weight === "middle";

  /**
   * ONE ACTIVE STATE AT A TIME. Cancel in-flight cues on seat change.
   * In-loop words crossfade via <LoopLabels> (LOOP_LABEL.fadeMs); this G
   * surface stays mounted — contentKey must NEVER appear in a region <g> key.
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
        {thin ? <GThinMask id={`${uid}-thin`} weight="middle" /> : null}
      </defs>

      <g>
        {/* The cut applies to the ARTWORK only; the rim patch is drawn on top. */}
        <g {...(earCut ? { mask: `url(#${uid}-earcut)` } : {})}>
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
            <path d={LIVING_G_PATH} {...heavy} {...(thin ? { mask: `url(#${uid}-thin)` } : {})} />
          </g>
        </g>
        {earCut ? rimPatch(thin) : null}
        {/* THE MIDDLE LOOP, CLOSED at render time (loop-close.tsx). */}
        <MiddleLoopClose weight={weight} />

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
                    <path d={LIVING_G_PATH} {...heavy} {...(thin ? { mask: `url(#${uid}-thin)` } : {})} />
                  </g>
                </g>
                {earCut ? rimPatch(thin) : null}
                <MiddleLoopClose weight={weight} />
              </g>
            </g>
          );
        })}
      </g>






      {/*
        REGION CONTENT — surface stays; seat words crossfade in <LoopLabels>
        (LOOP_LABEL.fadeMs). Region <g> keys are stable (never contentKey).
        Prompt and content remain mutually exclusive inside each loop.
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
          <g key={`content-${key}`} pointerEvents="none">
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
            aria-label={region.label || (region.panelTitle ? `${key} loop: ${region.panelTitle}` : key)}
            className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
            style={{ cursor: "pointer", outline: "none" }}

            // ONE POINTER, ONE PRESS. Everything happens on pointer events, so
            // mouse, touch and stylus travel the same path and no synthetic
            // click is needed (Android suppresses those often enough to matter).

            onPointerDown={(e) => {
              if (tapId.current !== null) return;
              tapId.current = e.pointerId;
              (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
              down.current = { x: e.clientX, y: e.clientY };
              revealed.current = false;
              setPressed(key);
              // THE SWELL IS FELT AS IT IS SEEN. Fired inside the gesture itself,
              // which is exactly what Android requires, and the quietest tick we
              // have so a finger resting on the G never buzzes.
              haptics.selection();
              holdCue(key);
            }}

            onPointerUp={(e) => {
              if (tapId.current !== e.pointerId) return;
              tapId.current = null;
              try {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
              } catch {
                /* already released */
              }
              release();
              // A swipe across the G must not fire a region.
              const d = down.current;
              if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
              // A hold TEACHES; only a tap travels.
              if (revealed.current) {
                revealed.current = false;
                return;
              }
              // THE REGION HAS TAKEN. A single light tick, in the gesture, and
              // the deeper pulse is left to the G's own unfurl.
              haptics.light();

              if (navTimer.current) clearTimeout(navTimer.current);
              const run = region.onPress;
              navTimer.current = setTimeout(() => run?.(), RHYTHM.read);
            }}
            onPointerCancel={(e) => {
              // Android may cancel the gesture: forget it cleanly so the next
              // tap works immediately.
              if (tapId.current === e.pointerId) tapId.current = null;
              release();
            }}
            onLostPointerCapture={(e) => {
              if (tapId.current === e.pointerId) {
                tapId.current = null;
                release();
              }
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
