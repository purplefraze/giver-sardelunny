import { useEffect, useId, useRef, useState } from "react";
import { LIVING_G_PATH, LIVING_G_TRANSFORM } from "./g-path";
import { SparkBundle } from "./SparkBundle";
import { SPARK_END, SPARK_TRACK_D } from "./spark-track";
import { haptics } from "@/lib/haptics";

/**
 * THE TRAVELLING SPARK — a bead riding INSIDE the Living G's own stroke, on the
 * rail measured off the canonical geometry (see spark-track.ts).
 *
 * Two modes, one rail:
 *   auto  — the introduction. The bead travels the rail on its own, from the
 *           bottom loop's opening up through the spine into the middle loop.
 *           No drag, no colour change: it simply shows that sparks travel.
 *   drag  — the lesson. The bead starts at the middle loop and can only be
 *           moved by a finger, projected onto the rail so it can never leave
 *           the stroke. On arrival the green resolves outward from the landing
 *           point: the action causes the colour, never the other way round.
 */

/** The green resolving through the G from the landing point. */
const WASH_MS = 1100;

/** The introductory journey: quick, confident, unmistakably along the stroke. */
const AUTO_MS = 2200;

/** Ease-in-out: it sets off gently and settles gently. No bounce. */
/**
 * WHERE THE TWO LOOPS MEET. The rail runs middle loop -> S-curve -> bottom loop,
 * so the spine sits a little past halfway along its length. Crossing it is the
 * one structural landmark of the journey, and the only thing felt in transit.
 */
const SPINE_U = 0.52;

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

type Sample = { x: number; y: number; u: number };

export function SparkJourney({
  mode = "drag",
  count,
  bob = false,
  colour = "var(--giver-generosity)",
  grabColour,
  wash: washOn = true,
  washColour = "var(--giver-generosity)",
  onStart,
  onArrive,
  onGreen,
}: {
  /**
   * "auto" travels bottom -> middle by itself; "drag" is the user's journey
   * along the rail into the bottom loop; "gift" is the same rail walked the
   * OTHER way — from the bottom-loop stroke up through the S-curve and round
   * the middle loop toward this person's top loop.
   */
  mode?: "auto" | "drag" | "gift";
  /** How many Sparks this bundle carries — shown inside the bundle. */
  count?: number;
  /**
   * CURIOSITY, NOT INSTRUCTION. The bundle drifts along the rail by itself,
   * reaches an end, rebounds and comes back — until a finger takes hold of it.
   * No arrows, no destination, no copy: the motion is the whole invitation.
   */
  bob?: boolean;
  /** Its resting colour, and what a successful catch turns it into. */
  colour?: string;
  grabColour?: string;
  /** Whether the landing washes the whole G in the bundle's colour. */
  wash?: boolean;
  /** The colour that resolves outward from a successful landing. */
  washColour?: string;
  /** The user has taken hold of the bundle. */
  onStart?: () => void;
  /** The spark has reached the end of its journey. */
  onArrive?: () => void;
  /** The wash has finished resolving through the whole G. */
  onGreen?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const rail = useRef<SVGPathElement | null>(null);
  const samples = useRef<Sample[]>([]);
  const total = useRef(1);
  const grabbed = useRef(false);
  /** Which side of the spine the bead was last on, so a crossing is felt once. */
  const crossed = useRef<boolean | null>(null);
  /** Live progress, so the drag can stay local without a stale closure. */
  const uRef = useRef(0);
  /** Where the bundle was when the finger first caught it. */
  const caught = useRef(0);

  const [at, setAt] = useState({ x: 0, y: 0, ready: false });
  /** Where this journey begins and ends on the shared rail. */
  const FROM = mode === "drag" ? 0 : 1;
  const TO = mode === "gift" ? 0 : 1;
  const draggable = mode === "drag" || mode === "gift";

  const [u, setU] = useState(FROM);
  const [dragging, setDragging] = useState(false);
  /** Once touched, the drifting stops for good and the colour answers. */
  const [held, setHeld] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [wash, setWash] = useState(0);

  /** Where on the rail is progress u? Straight from the path itself. */
  const put = (next: number, tick = true) => {
    const path = rail.current;
    if (!path) return;
    const clamped = Math.min(1, Math.max(0, next));
    const p = path.getPointAtLength(clamped * path.getTotalLength());
    uRef.current = clamped;
    setU(clamped);
    setAt({ x: p.x, y: p.y, ready: true });

    if (!tick) return;
    /**
     * ONE MILESTONE, NOT A RATTLE. The only thing worth feeling mid-journey is
     * the architecture of the G itself: leaving one loop and crossing the
     * S-curve into the other. It is felt ONCE per pass, in whichever direction
     * the sparks are travelling, and never again until the bead crosses back.
     */
    const past = clamped >= SPINE_U;
    if (crossed.current === null) crossed.current = past;
    else if (crossed.current !== past) {
      crossed.current = past;
      haptics.medium();
    }
  };

  // The rail, sampled once, so a finger can be projected onto it precisely.
  useEffect(() => {
    const path = rail.current;
    if (!path) return;
    const len = path.getTotalLength();
    total.current = len;
    const out: Sample[] = [];
    const N = 1200;
    for (let i = 0; i <= N; i += 1) {
      const s = i / N;
      const p = path.getPointAtLength(s * len);
      out.push({ x: p.x, y: p.y, u: s });
    }
    samples.current = out;
    put(FROM, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * THE INTRODUCTION. The bead walks the rail backwards — from the bottom loop's
   * opening, round the loop, through the spine, into the middle loop — entirely
   * on its own. It never leaves the stroke because it is always ON the rail.
   */
  useEffect(() => {
    if (mode !== "auto" || !at.ready) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / AUTO_MS);
      put(1 - ease(k), false);
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        haptics.success();
        onArrive?.();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, at.ready]);

  /**
   * THE DRIFT. Left alone, the bundle simply travels the G's own rail: out, a
   * gentle rebound, back again, for as long as it takes. Nothing is explained.
   */
  useEffect(() => {
    if (!bob || !at.ready || held || arrived) return;
    let raf = 0;
    const start = performance.now();
    const SPAN = 0.68;
    const CYCLE = 7200;
    const step = (now: number) => {
      const t = ((now - start) % CYCLE) / CYCLE;
      /* One smooth out-and-back, eased at both ends: never a mechanical loop. */
      const swing = t < 0.5 ? ease(t * 2) : ease((1 - t) * 2);
      put(swing * SPAN, false);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bob, at.ready, held, arrived]);

  // Landing: the haptic, then the green travelling outward from the bead.
  useEffect(() => {
    if (!draggable || arrived) return;
    if (!held && bob) return;
    if (TO === 1 ? u < 1 : u > 0) return;
    setArrived(true);
    /* THE LANDING. The strongest, most meaningful haptic in the whole app: the
       sparks have arrived and the G is about to change. */
    haptics.success();
    onArrive?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, u, arrived]);

  // THE CHANGE. Kept in its OWN effect so nothing can cancel it mid-flight.
  useEffect(() => {
    if (!arrived) return;
    if (mode !== "drag" || !washOn) {
      onGreen?.();
      return;
    }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / WASH_MS);
      setWash(ease(k));
      if (k < 1) raf = requestAnimationFrame(step);
      else onGreen?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived]);

  /** Client point -> the G's own coordinates. */
  const local = (e: React.PointerEvent) => {
    const svg = rail.current?.ownerSVGElement;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(m.inverse());
  };

  /**
   * MAGNETIC, AND LOCAL. The nearest point ON THE RAIL, searched only within a
   * short ARC-LENGTH stretch either side of where the bead already is, so the
   * bead slides along the wire continuously and can never hop across a gap.
   */
  const STEP_LEN = 70; // how far along the wire one move may advance
  const REACH = 260; // how far off the wire the finger may stray

  const project = (e: React.PointerEvent) => {
    const p = local(e);
    if (!p) return;
    const here = uRef.current;
    const win = STEP_LEN / Math.max(1, total.current);
    let best: Sample | undefined;
    let d = Infinity;
    for (const s of samples.current) {
      if (Math.abs(s.u - here) > win) continue;
      const k = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
      if (k < d) {
        d = k;
        best = s;
      }
    }
    if (best && d <= REACH * REACH) put(best.u);
  };

  /** The one finger driving this slide; any other touch is ignored. */
  const activeId = useRef<number | null>(null);

  const grab = (e: React.PointerEvent) => {
    if (arrived) return;
    if (activeId.current !== null) return;
    activeId.current = e.pointerId;
    grabbed.current = true;
    caught.current = uRef.current;
    setHeld(true);
    setDragging(true);

    // CAPTURE: the slide survives the finger straying off the rail's grip, and
    // keeps receiving moves right through the loops and the S-curve.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // PICKUP: the lightest possible acknowledgement, once per drag.
    haptics.light();
    onStart?.();
    project(e);
  };

  const move = (e: React.PointerEvent) => {
    if (activeId.current !== e.pointerId) return;
    if (!grabbed.current || arrived) return;
    project(e);
  };

  /**
   * THE SLIDE ALWAYS FINISHES. Let go past the halfway point and the bundle
   * GLIDES the rest of the way on its own, smoothly, and lands — so the gesture
   * can never end in an ambiguous "did that work?" state.
   */
  const glide = useRef(0);
  const complete = () => {
    const from = uRef.current;
    const start = performance.now();
    const ms = 420;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      put(from + (TO - from) * ease(k));
      if (k < 1) glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  };

  /**
   * RELEASE OR CANCELLATION, HANDLED THE SAME WAY: the bead keeps its last
   * valid position on the rail and the control is immediately grabbable again.
   */
  const release = (e?: React.PointerEvent) => {
    if (e) {
      if (activeId.current !== null && activeId.current !== e.pointerId) return;
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId))
          e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* the browser already dropped it */
      }
    }
    activeId.current = null;
    grabbed.current = false;
    setDragging(false);
    const travelled = TO === 1 ? uRef.current : 1 - uRef.current;
    /* A MERE TOUCH IS NOT A DRAG: a bundle caught mid-drift and let go without
       being moved stays exactly where the finger found it. */
    const moved = Math.abs(uRef.current - caught.current) > 0.02;
    // A gentle lock-in near the end; a confident finish from halfway onward.
    if (travelled > 0.97) put(TO);
    else if (moved && travelled > 0.5) complete();
  };

  const R = count !== undefined ? 44 : 34;

  return (
    <g>
      {/* The rail. Present, measured, and completely invisible. */}
      <path ref={rail} d={SPARK_TRACK_D} fill="none" stroke="none" />

      {/* GREEN RESOLVING OUTWARD from where the spark landed. */}
      {wash > 0 ? (
        <>
          <defs>
            <mask id={`${uid}-wash`} maskUnits="userSpaceOnUse">
              <rect x="-400" y="-400" width="1600" height="2000" fill="#000" />
              <circle cx={SPARK_END.x} cy={SPARK_END.y} r={wash * 1750} fill="#fff" />
            </mask>
          </defs>
          <g mask={`url(#${uid}-wash)`} pointerEvents="none">
            <g transform={LIVING_G_TRANSFORM} fill="var(--giver-generosity)">
              <path d={LIVING_G_PATH} />
            </g>
          </g>
        </>
      ) : null}

      {at.ready ? (
        <>
          {/* A generous invisible grip along the rail, so the bead is easy to
              take hold of without any visible control appearing on the G. */}
          {draggable && !arrived ? (
            <>
              <path
                d={SPARK_TRACK_D}
                fill="none"
                stroke="transparent"
                strokeWidth={160}
                strokeLinecap="round"
                className="[-webkit-tap-highlight-color:transparent]"
                style={{ cursor: "grab", touchAction: "none" }}
                onPointerDown={grab}
                onPointerMove={move}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
              />
              {/* And a generous disc on the bead itself, so the bundle can be
                  taken hold of without hunting for the rail. */}
              <circle
                cx={at.x}
                cy={at.y}
                r={110}
                fill="transparent"
                className="[-webkit-tap-highlight-color:transparent]"
                style={{ cursor: "grab", touchAction: "none" }}
                onPointerDown={grab}
                onPointerMove={move}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
              />
            </>
          ) : null}

          {/* THE SPARKS. A bundle of light, riding inside the stroke. */}
          <g
            pointerEvents="none"
            transform={`translate(${at.x} ${at.y})`}
            style={{
              opacity: arrived ? 0 : 1,
              transition: `opacity ${WASH_MS}ms ease-out`,
            }}
          >
            <g
              className="[&_circle]:transition-[fill] [&_circle]:duration-[90ms] [&_path]:transition-[fill] [&_path]:duration-[90ms]"
              style={{
                transform: `scale(${dragging ? 1.08 : 1})`,
                transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <SparkBundle
                r={R}
                /* TOUCH IS THE ONLY THING THAT COLOURS IT: the bundle rests in
                   its own colour, answers the finger while it is physically
                   held, and returns the instant the finger lifts. */
                colour={dragging && grabColour ? grabColour : colour}

                {...(count !== undefined ? { count } : {})}
              />
            </g>
          </g>
        </>
      ) : null}
    </g>
  );
}
