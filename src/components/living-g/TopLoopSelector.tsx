import { useId, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import { G_ANCHORS } from "./g-path";
import { LOOP_TEXT_FILL } from "./type-scale";

/**
 * TOP-LOOP THREE-POSITION SELECTOR — the profile's HISTORY selector.
 *
 * The small top loop's handle drags around the loop between three evenly
 * spaced snap positions. Drag -> magnetic pull -> snap -> haptic click -> the
 * selected history changes:
 *
 *   position 1 -> past wishes
 *   position 2 -> past gives
 *   position 3 -> past trades
 *
 * The physical mechanism is deliberately unchanged; only its meaning is fixed.
 * The Living G geometry is untouched: this is a pure interaction layer drawn in
 * the same SVG user space, anchored on the small ring.
 */

export type TopLoopPosition = 0 | 1 | 2;

/** The three history states, in order. Lowercase, like all Giver copy. */
export const HISTORY_STATES = ["past wishes", "past gives", "past trades"] as const;

export type HistoryState = (typeof HISTORY_STATES)[number];

const CENTRE = G_ANCHORS.smallRing;
/** Orbit radius — just outside the top loop's stroke, still inside the frame. */
const ORBIT = 64;
/** Evenly spaced (120deg apart), arranged to stay inside the frame. */
const ANGLES = [-60, 60, 180] as const;
/** Content radius inside the loop's negative space. */
const CONTENT_R = 45;

const TRANSITION = 190;

const pointAt = (deg: number) => ({
  x: CENTRE.x + ORBIT * Math.cos((deg * Math.PI) / 180),
  y: CENTRE.y + ORBIT * Math.sin((deg * Math.PI) / 180),
});

const norm = (deg: number) => ((deg % 360) + 360) % 360;

function delta(a: number, b: number) {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
}

/** Nearest snap index for a raw angle. */
function nearest(angle: number): TopLoopPosition {
  let best: TopLoopPosition = 0;
  let bestD = Infinity;
  ANGLES.forEach((a, i) => {
    const d = delta(angle, a);
    if (d < bestD) {
      bestD = d;
      best = i as TopLoopPosition;
    }
  });
  return best;
}

/** One subtle haptic tick per successful snap. */
function tick(_position: TopLoopPosition) {
  buzz(10);
}

export function TopLoopSelector({
  position,
  onChange,
  content,
}: {
  position: TopLoopPosition;
  onChange: (next: TopLoopPosition) => void;
  /** Permanent top-loop content (the profile photo) — never a toggle state. */
  content?: React.ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const dragging = dragAngle !== null;
  const lastSnap = useRef<TopLoopPosition>(position);

  const restAngle = ANGLES[position];
  /** While dragging, a subtle magnetic pull toward the nearest snap point. */
  let angle = restAngle;
  if (dragAngle !== null) {
    const near = ANGLES[nearest(dragAngle)];
    const diff = ((near - dragAngle + 540) % 360) - 180;
    const pull = Math.max(0, 1 - Math.abs(diff) / 34) * 0.6;
    angle = dragAngle + diff * pull;
  }
  const handle = pointAt(angle);

  const angleFromEvent = (e: React.PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return (Math.atan2(local.y - CENTRE.y, local.x - CENTRE.x) * 180) / Math.PI;
  };

  const commit = (next: TopLoopPosition) => {
    if (next !== lastSnap.current) {
      lastSnap.current = next;
      tick(next);
      onChange(next);
    }
  };

  return (
    <g>
      {/* The loop's permanent content — the photo stays, always. */}
      {content ? <g pointerEvents="none">{content}</g> : null}

      {/* Snap positions — physical resting points belonging to the top loop. */}
      {ANGLES.map((a, i) => {
        const p = pointAt(a);
        const active = position === i;
        return (
          <g key={a}>
            {/* A detent punched into the loop's own stroke. */}
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="var(--world-bg)"
              style={{
                opacity: active ? 0 : 0.9,
                transition: `opacity ${TRANSITION}ms ease-out`,
              }}
            />
            {/* Generous invisible tap target. */}
            <circle
              cx={p.x}
              cy={p.y}
              r={22}
              fill="transparent"
              className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              style={{ cursor: "pointer", outline: "none" }}
              role="button"
              tabIndex={0}
              aria-label={HISTORY_STATES[i]}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                commit(i as TopLoopPosition);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") commit(i as TopLoopPosition);
              }}
            />
          </g>
        );
      })}

      {/* The draggable handle: same stroke language as the G itself. */}
      <g
        style={{
          transition: dragging
            ? "none"
            : `transform 260ms cubic-bezier(0.22,1,0.36,1)`,
          transform: `translate(${handle.x - CENTRE.x}px, ${handle.y - CENTRE.y}px)`,
        }}
      >
        <circle
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={dragging ? 12 : 10.5}
          fill="var(--world-bg)"
          style={{ transition: `r ${TRANSITION}ms ease-out` }}
        />
        <circle
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={dragging ? 6.4 : 5.4}
          fill="var(--world-g)"
          style={{ transition: `r ${TRANSITION}ms ease-out` }}
        />
        {/* Forgiving finger target that travels with the handle. */}
        <circle
          id={`${uid}-grip`}
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={30}
          fill="transparent"
          className="touch-none outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
          style={{ cursor: "grab", outline: "none" }}
          role="slider"
          tabIndex={0}
          aria-label="history selector"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={position + 1}
          aria-valuetext={HISTORY_STATES[position]}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as SVGElement).setPointerCapture?.(e.pointerId);
            const a = angleFromEvent(e);
            setDragAngle(a ?? restAngle);
          }}
          onPointerMove={(e) => {
            if (dragAngle === null) return;
            e.stopPropagation();
            const a = angleFromEvent(e);
            if (a === null) return;
            setDragAngle(a);
            const near = nearest(a);
            // Snap while dragging once the finger is convincingly close.
            if (delta(a, ANGLES[near]) < 16) commit(near);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (dragAngle !== null) commit(nearest(dragAngle));
            setDragAngle(null);
          }}
          onPointerCancel={() => {
            if (dragAngle !== null) commit(nearest(dragAngle));
            setDragAngle(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              commit(((position + 1) % 3) as TopLoopPosition);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              commit(((position + 2) % 3) as TopLoopPosition);
            }
          }}
        />
      </g>
    </g>
  );
}

/** Shared content helper: the photo that fills the top loop. */
export const topLoopContent = {
  photo: (href: string, key: string) => (
    <>
      <defs>
        <clipPath id={`top-loop-photo-${key}`}>
          <circle cx={CENTRE.x} cy={CENTRE.y} r={CONTENT_R} />
        </clipPath>
      </defs>
      <image
        href={href}
        x={CENTRE.x - CONTENT_R}
        y={CENTRE.y - CONTENT_R}
        width={CONTENT_R * 2}
        height={CONTENT_R * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#top-loop-photo-${key})`}
      />
    </>
  ),
  /** The selected history state, named just under the loop. */
  stateLabel: (label: string) => (
    <text
      x={CENTRE.x}
      y={CENTRE.y + CONTENT_R + 58}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={LOOP_TEXT_FILL}
      className="font-black lowercase"
      style={{ fontSize: 19, letterSpacing: "-0.03em", opacity: 0.8 }}
    >
      {label}
    </text>
  ),
};
