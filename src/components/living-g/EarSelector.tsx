import { useEffect, useId, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_SAFE_RADIUS,
} from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * MODE = WHERE THE EAR IS.
 *
 * No control is added to the Living G: the G's own small top ear — arm and
 * circular end together, as ONE piece — IS the control. The piece is the
 * canonical path itself, clipped to a disc around its home and translated as a
 * unit, so nothing is ever redrawn and no ghost arm is left behind. Its home is
 * repainted in the world background at the same radius, so the resting GIVE
 * state is pixel-identical to the canonical G.
 *
 * FOUR seats sit on an INVISIBLE circular track around the middle loop:
 *
 *   upper-right -> give   (canonical home)
 *   upper-left  -> wish   (mirror of give)
 *   lower-right -> trade
 *   lower-left  -> borrow (mirror of trade)
 *
 * The S-curve is never a mode destination. Separate from the profile HISTORY
 * toggle.
 */

export const MODES = ["wish", "give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

type P = { x: number; y: number };

/**
 * The ear's canonical home and the disc that carries it, measured off the
 * canonical path so the disc contains the whole piece (circular end + arm) and
 * nothing else — the middle loop is over 100 units away.
 */
const HOME: P = { x: 502, y: 76 };
const EAR_R = 112;

/** The invisible track: a circle around the middle loop, through the ear's home. */
const TRACK_C: P = { x: 288, y: LOOP_CENTRE.middle.y };
const TRACK_R = Math.hypot(HOME.x - TRACK_C.x, HOME.y - TRACK_C.y);

/** Seat angles on the track (SVG space: negative y is up). */
const HOME_ANGLE = Math.atan2(HOME.y - TRACK_C.y, HOME.x - TRACK_C.x);

/** Wrap an angle into (-pi, pi] so comparisons never straddle the seam. */
const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

const SEAT_ANGLE: Record<Mode, number> = {
  give: HOME_ANGLE, // upper-right
  wish: norm(Math.PI - HOME_ANGLE), // upper-left
  trade: -HOME_ANGLE, // lower-right
  borrow: norm(Math.PI + HOME_ANGLE), // lower-left
};


const onTrack = (angle: number): P => ({
  x: TRACK_C.x + TRACK_R * Math.cos(angle),
  y: TRACK_C.y + TRACK_R * Math.sin(angle),
});

const SEAT: Record<Mode, P> = {
  wish: onTrack(SEAT_ANGLE.wish),
  give: onTrack(SEAT_ANGLE.give),
  trade: onTrack(SEAT_ANGLE.trade),
  borrow: onTrack(SEAT_ANGLE.borrow),
};

/** Travel is bounded by the designed ends of the track: trade and borrow. */
const ANGLE_MIN = SEAT_ANGLE.give; // upper-right (negative)
const ANGLE_MAX = SEAT_ANGLE.trade; // lower-right (positive)

const SNAP_MS = 200;
/** How near a seat (in radians of travel) counts as captured. */
const CAPTURE = 0.38;

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Project a free point onto the track: keep its angle, clamp it to the designed
 * span of travel, and pin it to the circumference.
 */
function project(p: P): { angle: number; point: P } {
  let a = Math.atan2(p.y - TRACK_C.y, p.x - TRACK_C.x);
  // Work in the right half's frame, mirrored for the left half, so the piece
  // travels the short way around the top and never behind the bottom loop.
  const left = Math.cos(a) < 0;
  const mirrored = left ? norm(Math.PI - a) : a;
  const clamped = Math.min(ANGLE_MAX, Math.max(ANGLE_MIN, mirrored));
  a = left ? norm(Math.PI - clamped) : clamped;

  return { angle: a, point: onTrack(a) };
}

function nearest(p: P): Mode {
  let best: Mode = "give";
  let bestD = Infinity;
  for (const m of MODES) {
    const d = dist(p, SEAT[m]);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

/** The captured word lives in the ear's own negative space, so it travels with it. */
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
  const [drag, setDrag] = useState<P | null>(null);
  const dragging = drag !== null;
  const last = useRef<Mode>(mode);
  /** Tap vs drag: where the gesture started, and whether it ever travelled. */
  const gesture = useRef<{ start: P; moved: boolean } | null>(null);

  const rest = SEAT[mode];

  /** Under the finger, but always ON the track, with a magnetic pull to seats. */
  let target = rest;
  if (drag) {
    const { angle, point } = project(drag);
    let nearAngle = SEAT_ANGLE[mode];
    let nearDelta = Infinity;
    for (const m of MODES) {
      const d = Math.abs(angle - SEAT_ANGLE[m]);
      if (d < nearDelta) {
        nearDelta = d;
        nearAngle = SEAT_ANGLE[m];
      }
    }
    const pull = Math.max(0, 1 - nearDelta / CAPTURE) * 0.6;
    target = onTrack(angle + (nearAngle - angle) * pull);
    void point;
  }

  /** Immediate under the finger, quick-but-soft settle on release. */
  const [pos, setPos] = useState<P>(rest);
  const posRef = useRef(pos);
  const targetRef = useRef(target);
  targetRef.current = target;
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (dragging) {
      posRef.current = targetRef.current;
      setPos(targetRef.current);
      return;
    }
    const step = () => {
      const t = targetRef.current;
      const p = posRef.current;
      const next = { x: p.x + (t.x - p.x) * 0.24, y: p.y + (t.y - p.y) * 0.24 };
      if (dist(next, t) < 0.4) {
        posRef.current = t;
        setPos(t);
        raf.current = null;
        return;
      }
      posRef.current = next;
      setPos(next);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [dragging, mode, target.x, target.y]);

  const pointFrom = (e: React.PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
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
    if (drag && g?.moved) commit(nearest(project(drag).point));
    else if (g && !g.moved) onTap?.();
    gesture.current = null;
    setDrag(null);
  };

  return (
    <g>
      <defs>
        <clipPath id={`${uid}-ear`}>
          <circle cx={HOME.x} cy={HOME.y} r={EAR_R} />
        </clipPath>
      </defs>

      {/* Tiny destination hints on the invisible track. Never a drawn circle. */}
      {MODES.map((m) => {
        const seat = SEAT[m];
        const active = mode === m && !dragging;
        return (
          <circle
            key={m}
            cx={seat.x}
            cy={seat.y}
            r={5}
            fill="var(--world-g)"
            pointerEvents="none"
            style={{
              opacity: active || dist(pos, seat) < 60 ? 0 : 0.22,
              transition: "opacity 200ms ease-out",
            }}
          />
        );
      })}

      {/* The piece's home, cleared at exactly the radius it occupies. */}
      <circle cx={HOME.x} cy={HOME.y} r={EAR_R} fill="var(--world-bg)" />

      {/* THE ONE MOVABLE PIECE — arm and circular end together. */}
      <g transform={`translate(${pos.x - HOME.x},${pos.y - HOME.y})`}>
        <g clipPath={`url(#${uid}-ear)`}>
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
            <path d={LIVING_G_PATH} />
          </g>
        </g>
        {/* dot -> word: the mode reads inside the piece that carries it */}
        <text
          x={HOME.x}
          y={HOME.y}
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
            transformOrigin: `${HOME.x}px ${HOME.y}px`,
            transition:
              "opacity 200ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {mode}
        </text>
        <circle
          cx={HOME.x}
          cy={HOME.y}
          r={EAR_R}
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
            const p = pointFrom(e) ?? rest;
            gesture.current = { start: p, moved: false };
            setDrag(p);
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            e.stopPropagation();
            const p = pointFrom(e);
            if (!p) return;
            const g = gesture.current;
            if (g && !g.moved && dist(p, g.start) > 14) g.moved = true;
            setDrag(p);
            if (!g?.moved) return;
            const on = project(p).point;
            const near = nearest(on);
            if (dist(on, SEAT[near]) < 60) commit(near);
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
    </g>
  );
}

export const EAR_SNAP_MS = SNAP_MS;
