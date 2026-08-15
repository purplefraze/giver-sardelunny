import { useEffect, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import { G_ANCHORS, LOOP_SAFE_RADIUS } from "./g-path";
import { LOOP_ROLE_STYLE, LOOP_TEXT_FILL } from "./type-scale";

/**
 * MODE HANDLE — give / trade / borrow.
 *
 * The Living G's magnifying-glass arm becomes a physical lever. The canonical
 * geometry is never redrawn: this is a pure interaction layer drawn in the same
 * SVG user space, hinged on the small top loop.
 *
 *   right ear        -> give   (natural resting state)
 *   down, S-curve    -> trade  (the two sides meeting)
 *   left ear         -> borrow (mirror of give)
 *
 * Distinct from the profile HISTORY toggle on the top loop.
 */

export const MODES = ["give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

const HINGE = G_ANCHORS.smallRing;

/** Destinations, defined off the canonical geometry — they scale with the G. */
const SEAT: Record<Mode, { x: number; y: number }> = {
  // the arm's natural down-right ear — where it already sits
  give: { x: HINGE.x + 40, y: HINGE.y + 84 },
  // pulled down the spine, pointing into the connecting S-curve
  trade: { x: HINGE.x, y: HINGE.y + 390 },
  // the mirrored left ear
  borrow: { x: HINGE.x - 56, y: HINGE.y + 88 },
};

/** How close a finger must come before the seat starts pulling. */
const MAGNET = 96;
const SNAP = 190;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function nearest(p: { x: number; y: number }): Mode {
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

const WORD_SIZE = Math.round(LOOP_SAFE_RADIUS.top * 0.45);

/** Outer radius of the small loop's stroke: the arm leaves the rim, not the centre. */
const RIM = 64;

export function ModeHandle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragging = drag !== null;
  const last = useRef<Mode>(mode);

  const rest = SEAT[mode];

  /** Where the finger wants the head, with the seat's magnetic pull applied. */
  let target = rest;
  if (drag) {
    const near = SEAT[nearest(drag)];
    const d = dist(drag, near);
    const pull = Math.max(0, 1 - d / MAGNET) * 0.55;
    target = {
      x: drag.x + (near.x - drag.x) * pull,
      y: drag.y + (near.y - drag.y) * pull,
    };
  }

  /**
   * The arm stays hinged on the loop, so its length changes as it travels —
   * geometry attributes CSS can't transition. A tiny spring gives the snap its
   * quick-but-soft settle while the drag itself stays immediate.
   */
  const [pos, setPos] = useState(rest);
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
      const next = { x: p.x + (t.x - p.x) * 0.28, y: p.y + (t.y - p.y) * 0.28 };
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

  return (
    <g>
      {/* Quiet destinations. The active one has grown into its word. */}
      {MODES.map((m) => {
        const seat = SEAT[m];
        const active = mode === m;
        return (
          <g key={m}>
            <circle
              cx={seat.x}
              cy={seat.y}
              r={3}
              fill="var(--world-g)"
              style={{
                opacity: active ? 0 : 0.32,
                transition: `opacity 200ms ease-out`,
              }}
            />
            <text
              x={seat.x}
              y={seat.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={active ? LOOP_TEXT_FILL : "var(--world-g)"}
              className="font-black lowercase"
              pointerEvents="none"
              style={{
                fontSize: WORD_SIZE,
                letterSpacing: LOOP_ROLE_STYLE.action.tracking,
                opacity: active ? 1 : 0,
                transform: `scale(${active ? 1 : 0.4})`,
                transformOrigin: `${seat.x}px ${seat.y}px`,
                transition: `opacity 200ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1)`,
              }}
            >
              {m}
            </text>

            {/* Generous invisible target: tap a destination to send the arm. */}
            <circle
              cx={seat.x}
              cy={seat.y}
              r={30}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={m}
              className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              style={{ cursor: "pointer", outline: "none" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                commit(m);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") commit(m);
              }}
            />
          </g>
        );
      })}

      {/* The arm itself: hinged on the small loop, following the finger. */}
      <g>
        <line
          x1={HINGE.x + (RIM * (pos.x - HINGE.x)) / (dist(pos, HINGE) || 1)}
          y1={HINGE.y + (RIM * (pos.y - HINGE.y)) / (dist(pos, HINGE) || 1)}
          x2={pos.x}
          y2={pos.y}
          stroke="var(--world-g)"
          strokeWidth={dragging ? 9 : 8}
          strokeLinecap="round"
          style={{ transition: `stroke-width ${SNAP}ms ease-out` }}
        />
        {/* The head that captures the destination. */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={dragging ? 30 : 28}
          fill="none"
          stroke="var(--world-g)"
          strokeWidth={7}
          style={{ transition: `r ${SNAP}ms ease-out` }}
        />
        <circle
          id="mode-handle-grip"
          cx={pos.x}
          cy={pos.y}
          r={44}

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
            if (dist(p, SEAT[near]) < 34) commit(near);
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
