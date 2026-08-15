import { useEffect, useId, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
  LOOP_SAFE_RADIUS,
} from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * MODE = WHERE THE SELECTOR SITS ON THE MIDDLE LOOP.
 *
 * A BEAD LOCKED TO A CIRCULAR RAIL. The rail is the middle loop's own measured
 * circumference; the bead is the G's small top ear — CIRCULAR END + ARM as ONE
 * RIGID ASSEMBLY, never two elements.
 *
 * The whole mechanism is ONE ANGLE. The assembly is the canonical path itself,
 * ROTATED about the middle loop's optical centre. Because the arm's root lies on
 * the loop's rim, a pure rotation about that centre keeps the root seated on the
 * rim at every angle and swings the arm naturally with the circular end. Nothing
 * is redrawn, nothing is translated, no geometry is left behind.
 *
 * The base G is drawn through a mask that removes ONLY the ear assembly outside
 * the rim (disc at the ear's home, minus everything inside the rim circle), so
 * the loop underneath is always a perfect smooth curve, and the canonical path
 * is never destructively altered. The travelling piece wears the same mask, so
 * the cut edge always lines up with the rim.
 *
 *   upper-right (~2 o'clock)  -> give   (canonical home)
 *   upper-left  (~10 o'clock) -> wish
 *   lower-right (~4-5)        -> trade
 *   lower-left  (~7-8)        -> borrow
 *
 * The S-curve is never a mode destination.
 */

export const MODES = ["wish", "give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

type P = { x: number; y: number };

/** The assembly's canonical home (circular end centre) and the disc carrying it. */
const HOME: P = { x: 502, y: 76 };
const EAR_R = 150;

/** THE RAIL — the middle loop's measured centre and outer rim, in viewBox space. */
const TRACK_C: P = LOOP_CENTRE.middle;
const RIM_R = LOOP_RIM_RADIUS.middle;

const HOME_ANGLE = Math.atan2(HOME.y - TRACK_C.y, HOME.x - TRACK_C.x);
const LOWER_ANGLE = Math.abs(HOME_ANGLE);

/** Four balanced seats on the rail (SVG space: negative y is up). */
const SEAT_ANGLE: Record<Mode, number> = {
  give: HOME_ANGLE, // ~2 o'clock (canonical home)
  wish: -(Math.PI - LOWER_ANGLE), // ~10 o'clock
  trade: LOWER_ANGLE, // ~4-5 o'clock, raised out of the bottom
  borrow: Math.PI - LOWER_ANGLE, // ~7-8 o'clock, raised out of the bottom
};

/** No free rotation: travel is bounded by the outermost pair of seats. */
const ANGLE_MIN = SEAT_ANGLE.wish;
const ANGLE_MAX = SEAT_ANGLE.borrow;

/** How near a seat (in radians of travel) counts as captured. */
const CAPTURE = 0.34;

const clampAngle = (a: number) => Math.min(ANGLE_MAX, Math.max(ANGLE_MIN, a));

/** Rotate a point about the rail centre. */
function spin(p: P, delta: number): P {
  const c = Math.cos(delta);
  const s = Math.sin(delta);
  const dx = p.x - TRACK_C.x;
  const dy = p.y - TRACK_C.y;
  return { x: TRACK_C.x + dx * c - dy * s, y: TRACK_C.y + dx * s + dy * c };
}

/** A point just outside the rim at a given rail angle — where hints live. */
const onRim = (angle: number, out = 16): P => ({
  x: TRACK_C.x + (RIM_R + out) * Math.cos(angle),
  y: TRACK_C.y + (RIM_R + out) * Math.sin(angle),
});

function nearestSeat(angle: number): Mode {
  let best: Mode = "give";
  let bestD = Infinity;
  for (const m of MODES) {
    const d = Math.abs(angle - SEAT_ANGLE[m]);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/** The captured word lives in the assembly's own negative space. */
const WORD_SIZE = Math.round(LOOP_SAFE_RADIUS.top * 0.5);

export function EarSelector({
  mode,
  onChange,
  onTap,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
  /** A simple tap on the piece opens the profile; a drag changes mode. */
  onTap?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = drag !== null;
  const last = useRef<Mode>(mode);
  /** Tap vs drag: where the gesture started, and whether it ever travelled. */
  const gesture = useRef<{ start: P; moved: boolean } | null>(null);

  /** ONE SOURCE OF TRUTH: the assembly's angle on the rail. */
  const restAngle = SEAT_ANGLE[mode];

  let target = restAngle;
  if (drag !== null) {
    const seat = SEAT_ANGLE[nearestSeat(drag)];
    const pull = Math.max(0, 1 - Math.abs(drag - seat) / CAPTURE) * 0.55;
    target = clampAngle(drag + (seat - drag) * pull);
  }

  const [angle, setAngle] = useState(restAngle);
  const angleRef = useRef(angle);
  const targetRef = useRef(target);
  targetRef.current = target;
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (dragging) {
      angleRef.current = targetRef.current;
      setAngle(targetRef.current);
      return;
    }
    const step = () => {
      const t = targetRef.current;
      const next = angleRef.current + (t - angleRef.current) * 0.22;
      if (Math.abs(t - next) < 0.0015) {
        angleRef.current = t;
        setAngle(t);
        raf.current = null;
        return;
      }
      angleRef.current = next;
      setAngle(next);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [dragging, mode, target]);

  const delta = angle - HOME_ANGLE;
  const deg = (delta * 180) / Math.PI;
  /** Where the circular end actually is right now — text and hit area follow it. */
  const ear = spin(HOME, delta);

  const angleFrom = (e: React.PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(ctm.inverse());
    return {
      point: { x: local.x, y: local.y } as P,
      // FINGER FREE, SELECTOR RAILED: only the angle is taken from the finger.
      angle: clampAngle(Math.atan2(local.y - TRACK_C.y, local.x - TRACK_C.x)),
    };
  };

  const commit = (next: Mode) => {
    if (next !== last.current) {
      last.current = next;
      buzz(10);
      onChange(next);
    }
  };

  /** On arrival the word speaks up, then settles back into a restrained state. */
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setReveal(true);
    const t = setTimeout(() => setReveal(false), 1400);
    return () => clearTimeout(t);
  }, [mode]);

  const end = () => {
    const g = gesture.current;
    if (drag !== null && g?.moved) commit(nearestSeat(drag));
    else if (g && !g.moved) onTap?.();
    gesture.current = null;
    setDrag(null);
  };

  return (
    <g>
      <defs>
        {/*
          ONE STENCIL for both halves of the illusion: the disc that carries the
          assembly, with everything inside the loop's rim cut back out so the rim
          itself is never touched. Referenced from inside the rotating group, its
          rim circle is invariant (it is centred on the axis of rotation) while
          its ear disc travels with the piece.
        */}
        <mask id={`${uid}-piece`} maskUnits="userSpaceOnUse">
          <circle cx={HOME.x} cy={HOME.y} r={EAR_R} fill="#fff" />
          <circle cx={TRACK_C.x} cy={TRACK_C.y} r={RIM_R} fill="#000" />
        </mask>
        <mask id={`${uid}-base`} maskUnits="userSpaceOnUse">
          <rect x={0} y={0} width={576} height={1133} fill="#fff" />
          <circle cx={HOME.x} cy={HOME.y} r={EAR_R} fill="#000" />
          <circle cx={TRACK_C.x} cy={TRACK_C.y} r={RIM_R} fill="#fff" />
        </mask>
      </defs>

      {/*
        The base G, redrawn ONCE through the stencil, so the ear's home reads as
        a perfectly smooth rim the instant the assembly leaves it. The canonical
        path underneath is untouched.
      */}
      <g mask={`url(#${uid}-base)`}>
        <g transform={LIVING_G_TRANSFORM} fill="var(--world-bg)">
          <path d={LIVING_G_PATH} />
        </g>
      </g>

      {/* Subtle destination hints, seated on the rail itself. Never a drawn ring. */}
      {MODES.map((m) => {
        const hint = onRim(SEAT_ANGLE[m]);
        const active = mode === m && !dragging;
        return (
          <circle
            key={m}
            cx={hint.x}
            cy={hint.y}
            r={5}
            fill="var(--world-g)"
            pointerEvents="none"
            style={{
              opacity:
                active || Math.abs(angle - SEAT_ANGLE[m]) < 0.22 ? 0 : 0.22,
              transition: "opacity 200ms ease-out",
            }}
          />
        );
      })}

      {/* THE ONE RIGID ASSEMBLY — circular end and arm, rotated as one. */}
      <g transform={`rotate(${deg} ${TRACK_C.x} ${TRACK_C.y})`}>
        <g mask={`url(#${uid}-piece)`}>
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
            <path d={LIVING_G_PATH} />
          </g>
        </g>
      </g>

      {/* dot -> word: the mode reads inside the piece that carries it */}
      <text
        x={ear.x}
        y={ear.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-g)"
        className="font-black lowercase"
        pointerEvents="none"
        style={{
          fontSize: WORD_SIZE,
          letterSpacing: LOOP_ROLE_STYLE.action.tracking,
          opacity: dragging ? 0 : reveal ? 0.95 : 0.4,
          transform: `scale(${dragging ? 0.3 : 1})`,
          transformOrigin: `${ear.x}px ${ear.y}px`,
          transition:
            "opacity 200ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {mode}
      </text>

      {/* Invisible grip, travelling with the circular end. */}
      <circle
        cx={ear.x}
        cy={ear.y}
        r={96}
        fill="transparent"
        className="touch-none outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
        style={{ cursor: "grab", outline: "none" }}
        role="slider"
        tabIndex={0}
        aria-label="mode"
        aria-valuemin={1}
        aria-valuemax={MODES.length}
        aria-valuenow={MODES.indexOf(mode) + 1}
        aria-valuetext={mode}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as SVGElement).setPointerCapture?.(e.pointerId);
          const at = angleFrom(e);
          gesture.current = { start: at?.point ?? ear, moved: false };
          setDrag(at?.angle ?? restAngle);
        }}
        onPointerMove={(e) => {
          if (drag === null) return;
          e.stopPropagation();
          const at = angleFrom(e);
          if (!at) return;
          const g = gesture.current;
          if (g && !g.moved && dist(at.point, g.start) > 14) g.moved = true;
          setDrag(at.angle);
          if (!g?.moved) return;
          const near = nearestSeat(at.angle);
          if (Math.abs(at.angle - SEAT_ANGLE[near]) < 0.2) commit(near);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          end();
        }}
        onPointerCancel={end}
        onKeyDown={(e) => {
          const i = MODES.indexOf(mode);
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            commit(MODES[(i + 1) % MODES.length]!);
          }
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            commit(MODES[(i + MODES.length - 1) % MODES.length]!);
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTap?.();
          }
        }}
      />
    </g>
  );
}
