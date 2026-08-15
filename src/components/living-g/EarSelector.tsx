import { useEffect, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import { EAR_GEOMETRY, LOOP_CENTRE, LOOP_RIM_RADIUS, LOOP_SAFE_RADIUS } from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * MODE = WHERE THE SELECTOR SITS ON THE MIDDLE LOOP.
 *
 * ONE SMALL PHYSICAL PIECE CLIPPED TO THE RIM. The piece is AUTHORED geometry —
 * one ring (the circular end) plus one stem — built in local coordinates on a
 * single radial axis: the stem's root sits on the middle loop's measured rim,
 * the stem runs outward, the ring sits just beyond it. The two can never drift
 * apart, because they are defined relative to the same axis and placed by ONE
 * rotation about ONE centre with ONE angle.
 *
 * The canonical Living G is NEVER rotated, copied, deformed or cut at the
 * selector's live position. Its original ear is removed once by a tight static
 * cut in <LivingG> (see EAR_GEOMETRY), so the rim underneath stays a perfectly
 * smooth curve in every mode.
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

/** THE ONE TRACK — the middle loop's measured centre and outer rim. */
const TRACK_C: P = LOOP_CENTRE.middle;
const RIM_R = LOOP_RIM_RADIUS.middle;

/**
 * THE ONE RADIUS, derived from the rim — never from where the ear happens to
 * live in the artwork: rim + gap + the ring's own radius.
 */
const TRACK_R = RIM_R + EAR_GEOMETRY.gap + EAR_GEOMETRY.outerR;

/** The ring, in the assembly's local terms. */
const RING_MID = (EAR_GEOMETRY.innerR + EAR_GEOMETRY.outerR) / 2;
const RING_W = EAR_GEOMETRY.outerR - EAR_GEOMETRY.innerR;

/**
 * The stem: root tucked just UNDER the rim so the join is seamless at every
 * angle, tip buried in the ring's stroke so the two read as one solid piece.
 */
const STEM_FROM = RIM_R - 8;
const STEM_TO = TRACK_R - EAR_GEOMETRY.innerR - 6;
const STEM_HALF = EAR_GEOMETRY.stemWidth / 2;

/** Angles are measured in SVG space (0 = 3 o'clock, negative = upward). */
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Four seats on the one track. The upper-left / lower-left pair is pulled in
 * from a true mirror so the whole piece — ring and stem — stays inside the
 * framed silhouette at rest, never off the edge of the screen.
 */
/**
 * Four seats on the one track, all inside the arc where the middle loop's rim
 * is actually FREE. Below about 4 o'clock the rim is occupied by the S-curve
 * and the bottom loop, so a seat there would bury the piece in the spine: the
 * lower pair is raised into the clean arc instead. Travel is bounded by the
 * outermost pair, and every seat keeps the whole piece inside the framed G.
 */
const SEAT_ANGLE: Record<Mode, number> = {
  wish: rad(-126), // ~10 o'clock
  borrow: rad(-88), // ~12 o'clock, raised clear of the spine
  give: rad(-44), // ~2 o'clock (canonical home)
  trade: rad(28), // ~3-4 o'clock, raised clear of the S-curve
};

/** No free rotation: travel is bounded by the outermost pair of seats. */
const ANGLE_MIN = SEAT_ANGLE.wish;
const ANGLE_MAX = SEAT_ANGLE.trade;


/** How near a seat (in radians of travel) counts as captured. */
const CAPTURE = 0.34;

const clampAngle = (a: number) => Math.min(ANGLE_MAX, Math.max(ANGLE_MIN, a));

/** A point on the track at a given angle, at any radius. */
const at = (angle: number, r: number): P => ({
  x: TRACK_C.x + r * Math.cos(angle),
  y: TRACK_C.y + r * Math.sin(angle),
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

/** The captured word lives in the piece's own negative space. */
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
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = drag !== null;
  const last = useRef<Mode>(mode);
  /** Tap vs drag: where the gesture started, and whether it ever travelled. */
  const gesture = useRef<{ start: P; moved: boolean } | null>(null);

  /** ONE SOURCE OF TRUTH: the assembly's angle on the track. */
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

  const deg = (angle * 180) / Math.PI;
  /** Where the ring actually is right now — text and hit area follow it. */
  const ear = at(angle, TRACK_R);

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
      {/* Subtle destination hints, seated on the track itself. Never a drawn ring. */}
      {MODES.map((m) => {
        const hint = at(SEAT_ANGLE[m], RIM_R + 16);
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

      {/*
        THE ONE RIGID ASSEMBLY. Authored on the +x radial axis in local terms,
        then placed by a single rotation about the track centre. Stem root under
        the rim, ring beyond it, distance between them fixed by construction.
      */}
      <g
        transform={`rotate(${deg} ${TRACK_C.x} ${TRACK_C.y})`}
        pointerEvents="none"
      >
        <rect
          x={TRACK_C.x + STEM_FROM}
          y={TRACK_C.y - STEM_HALF}
          width={STEM_TO - STEM_FROM}
          height={STEM_HALF * 2}
          rx={STEM_HALF * 0.5}
          fill="var(--world-g)"
        />
        <circle
          cx={TRACK_C.x + TRACK_R}
          cy={TRACK_C.y}
          r={RING_MID}
          fill="none"
          stroke="var(--world-g)"
          strokeWidth={RING_W}
        />
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

      {/* Invisible grip, travelling with the ring. */}
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
          const grab = angleFrom(e);
          gesture.current = { start: grab?.point ?? ear, moved: false };
          setDrag(grab?.angle ?? restAngle);
        }}
        onPointerMove={(e) => {
          if (drag === null) return;
          e.stopPropagation();
          const move = angleFrom(e);
          if (!move) return;
          const g = gesture.current;
          if (g && !g.moved && dist(move.point, g.start) > 14) g.moved = true;
          setDrag(move.angle);
          if (!g?.moved) return;
          const near = nearestSeat(move.angle);
          if (Math.abs(move.angle - SEAT_ANGLE[near]) < 0.2) commit(near);
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
