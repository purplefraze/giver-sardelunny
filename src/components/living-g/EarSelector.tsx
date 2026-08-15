import { useEffect, useId, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import {
  G_ANCHORS,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_SAFE_RADIUS,
} from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * MODE = WHERE THE EAR IS.
 *
 * No control is added to the Living G: the G's own small top ear IS the control.
 * The ear is the canonical path itself, clipped to a disc around its home and
 * moved as one piece. Its home is repainted in the world background at exactly
 * the same radius, so the resting GIVE state is pixel-identical to the
 * canonical G — nothing extra is ever drawn.
 *
 *   right                 -> give   (canonical home)
 *   down, at the S-curve  -> trade  (two sides meeting)
 *   left                  -> borrow (mirrored)
 *
 * Separate from the profile HISTORY toggle.
 */

export const MODES = ["give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

type P = { x: number; y: number };

/** The ear's canonical home, and the disc that carries it. */
const HOME: P = G_ANCHORS.smallRing;
const EAR_R = 74;

/** The three resting configurations, in viewBox space. */
const SEAT: Record<Mode, P> = {
  give: HOME,
  // docked in the concave of the central S-curve: exchange, two sides meeting
  trade: { x: 470, y: 524 },
  // mirrored across the G
  borrow: { x: 80, y: 80 },
};

const MAGNET = 110;
const SNAP_MS = 200;

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

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

/** Where a captured word sits: clear of the ear, never over the stroke. */
const WORD_OFFSET: Record<Mode, P> = {
  give: { x: 0, y: 104 },
  trade: { x: 0, y: 104 },
  borrow: { x: 0, y: 104 },
};

const WORD_SIZE = Math.round(LOOP_SAFE_RADIUS.top * 0.78);

export function EarSelector({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [drag, setDrag] = useState<P | null>(null);
  const dragging = drag !== null;
  const last = useRef<Mode>(mode);

  const rest = SEAT[mode];

  /** Finger position with the seats' gentle magnetic pull applied. */
  let target = rest;
  if (drag) {
    const near = SEAT[nearest(drag)];
    const d = dist(drag, near);
    const pull = Math.max(0, 1 - d / MAGNET) * 0.6;
    target = {
      x: drag.x + (near.x - drag.x) * pull,
      y: drag.y + (near.y - drag.y) * pull,
    };
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

  /** Mirror the ear once it lives on the left, so the G reads as reconfigured. */
  const mirrored = mode === "borrow" && !dragging;
  const flip = mirrored
    ? ` translate(${HOME.x},${HOME.y}) scale(-1,1) translate(${-HOME.x},${-HOME.y})`
    : "";

  return (
    <g>
      <defs>
        <clipPath id={`${uid}-ear`}>
          <circle cx={HOME.x} cy={HOME.y} r={EAR_R} />
        </clipPath>
      </defs>

      {/* Tiny destination hints, integrated with the geometry. */}
      {MODES.map((m) => {
        const seat = SEAT[m];
        const active = mode === m && !dragging;
        return (
          <g key={m} pointerEvents="none">
            <circle
              cx={seat.x}
              cy={seat.y}
              r={5}
              fill="var(--world-g)"
              style={{
                opacity: active || dist(pos, seat) < 60 ? 0 : 0.22,
                transition: "opacity 200ms ease-out",
              }}
            />
            <text
              x={seat.x + WORD_OFFSET[m].x}
              y={seat.y + WORD_OFFSET[m].y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--world-g)"
              className="font-black lowercase"
              style={{
                fontSize: WORD_SIZE,
                letterSpacing: LOOP_ROLE_STYLE.action.tracking,
                opacity: active ? 0.9 : 0,
                transform: `scale(${active ? 1 : 0.3})`,
                transformOrigin: `${seat.x + WORD_OFFSET[m].x}px ${
                  seat.y + WORD_OFFSET[m].y
                }px`,
                transition:
                  "opacity 200ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {m}
            </text>
          </g>
        );
      })}

      {/* The ear's home, cleared at exactly the radius the ear occupies. */}
      <circle cx={HOME.x} cy={HOME.y} r={EAR_R} fill="var(--world-bg)" />

      {/* The one existing ear, travelling. */}
      <g
        transform={`translate(${pos.x - HOME.x},${pos.y - HOME.y})${flip}`}
        style={{ transition: mirrored ? `none` : undefined }}
      >
        <g clipPath={`url(#${uid}-ear)`}>
          <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
            <path d={LIVING_G_PATH} />
          </g>
        </g>
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
          aria-valuemax={3}
          aria-valuenow={MODES.indexOf(mode) + 1}
          aria-valuetext={mode}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as SVGElement).setPointerCapture?.(e.pointerId);
            setDrag(pointFrom(e) ?? rest);
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            e.stopPropagation();
            const p = pointFrom(e);
            if (!p) return;
            setDrag(p);
            const near = nearest(p);
            if (dist(p, SEAT[near]) < 44) commit(near);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (drag) commit(nearest(drag));
            setDrag(null);
          }}
          onPointerCancel={() => {
            if (drag) commit(nearest(drag));
            setDrag(null);
          }}
          onKeyDown={(e) => {
            const i = MODES.indexOf(mode);
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              commit(MODES[(i + 1) % 3]!);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              commit(MODES[(i + 2) % 3]!);
            }
          }}
        />
      </g>
    </g>
  );
}

export const EAR_SNAP_MS = SNAP_MS;
