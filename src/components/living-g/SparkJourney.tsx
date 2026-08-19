import { useEffect, useId, useRef, useState } from "react";
import { LIVING_G_PATH, LIVING_G_TRANSFORM } from "./g-path";
import { SparkBundle } from "./SparkBundle";
import { SPARK_END, SPARK_TRACK_D } from "./spark-track";
import { buzz } from "@/lib/haptics";


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
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

type Sample = { x: number; y: number; u: number };

export function SparkJourney({
  mode = "drag",
  count,
  onStart,
  onArrive,
  onGreen,
}: {
  /** "auto" travels bottom -> middle by itself; "drag" is the user's journey. */
  mode?: "auto" | "drag";
  /** How many Sparks this bundle carries — shown inside the bundle. */
  count?: number;
  /** The user has taken hold of the bundle. */
  onStart?: () => void;
  /** The spark has reached the end of its journey. */
  onArrive?: () => void;
  /** The green has finished resolving through the whole G. */
  onGreen?: () => void;
}) {

  const uid = useId().replace(/:/g, "");
  const rail = useRef<SVGPathElement | null>(null);
  const samples = useRef<Sample[]>([]);
  const total = useRef(1);
  const grabbed = useRef(false);
  const marks = useRef(0);
  /** Live progress, so the drag can stay local without a stale closure. */
  const uRef = useRef(0);

  const [at, setAt] = useState({ x: 0, y: 0, ready: false });
  const [u, setU] = useState(mode === "auto" ? 1 : 0);
  const [dragging, setDragging] = useState(false);
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
    // A quiet tick at each quarter of the journey — abacus, not applause.
    const mark = Math.floor(clamped * 4);
    if (mark > marks.current) {
      marks.current = mark;
      buzz(8);
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
    put(mode === "auto" ? 1 : 0, false);
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
        buzz([10, 40, 16]);
        onArrive?.();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, at.ready]);

  // Landing: the haptic, then the green travelling outward from the bead.
  useEffect(() => {
    if (mode !== "drag" || u < 1 || arrived) return;
    setArrived(true);
    buzz([12, 60, 22]);
    onArrive?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, u, arrived]);

  // THE CHANGE. Kept in its OWN effect so nothing can cancel it mid-flight.
  useEffect(() => {
    if (!arrived) return;
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

  const grab = (e: React.PointerEvent) => {
    if (arrived) return;
    grabbed.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    buzz(10);
    onStart?.();
    project(e);
  };

  const move = (e: React.PointerEvent) => {
    if (!grabbed.current || arrived) return;
    project(e);
  };

  const release = () => {
    grabbed.current = false;
    setDragging(false);
    // A gentle lock-in: within a hair of the destination, it settles there.
    if (uRef.current > 0.97) put(1);
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
          {mode === "drag" && !arrived ? (
            <path
              d={SPARK_TRACK_D}
              fill="none"
              stroke="transparent"
              strokeWidth={130}
              strokeLinecap="round"
              className="[-webkit-tap-highlight-color:transparent]"
              style={{ cursor: "grab", touchAction: "none" }}
              onPointerDown={grab}
              onPointerMove={move}
              onPointerUp={release}
              onPointerCancel={release}
            />
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
              style={{
                transform: `scale(${dragging ? 1.08 : 1})`,
                transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <SparkBundle
                r={R}
                colour="var(--giver-generosity)"
                {...(count !== undefined ? { count } : {})}
              />
            </g>
          </g>

        </>
      ) : null}
    </g>
  );
}
