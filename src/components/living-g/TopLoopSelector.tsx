import { useId, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import { G_ANCHORS } from "./g-path";

/**
 * TOP-LOOP THREE-POSITION SELECTOR.
 *
 * A tiny physical gadget built into the Living G: the small top loop's handle
 * can be dragged around the loop between three evenly spaced snap positions.
 * Drag -> magnetic pull -> snap -> haptic click -> the top-loop content changes.
 *
 * The Living G geometry is untouched: this is a pure interaction/content layer
 * drawn in the same SVG user space, anchored on the small ring.
 */

export type TopLoopPosition = 0 | 1 | 2;

const CENTRE = G_ANCHORS.smallRing;
/** Orbit radius — just outside the top loop's stroke, still inside the frame. */
const ORBIT = 64;
/** Evenly spaced (120deg apart), starting above the loop. */
const ANGLES = [-90, 30, 150] as const;
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

/**
 * Hook for a future sound layer: one tick per snap. Deliberately silent for now
 * — haptics carry the confirmation.
 */
function tick(_position: TopLoopPosition) {
  buzz(10);
}

export function TopLoopSelector({
  position,
  onChange,
  states,
}: {
  position: TopLoopPosition;
  onChange: (next: TopLoopPosition) => void;
  /** Content for each snap position, drawn inside the top loop. */
  states: [React.ReactNode, React.ReactNode, React.ReactNode];
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
      {/* Top-loop content: one state visible at a time, softly cross-faded. */}
      <g pointerEvents="none">
        {states.map((node, i) => (
          <g
            key={i}
            style={{
              opacity: position === i ? 1 : 0,
              transition: `opacity ${TRANSITION}ms ease-out`,
            }}
          >
            {node}
          </g>
        ))}
      </g>

      {/* Snap positions — physical resting points belonging to the top loop. */}
      {ANGLES.map((a, i) => {
        const p = pointAt(a);
        const active = position === i;
        return (
          <g key={a}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3.4}
              fill="var(--world-g)"
              style={{
                opacity: active ? 0 : 0.32,
                transition: `opacity ${TRANSITION}ms ease-out`,
              }}
            />
            {/* Generous invisible tap target. */}
            <circle
              cx={p.x}
              cy={p.y}
              r={22}
              fill="transparent"
              className="[-webkit-tap-highlight-color:transparent]"
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={`Top loop position ${i + 1}`}
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
          r={dragging ? 10 : 8.6}
          fill="var(--world-g)"
          style={{ transition: `r ${TRANSITION}ms ease-out` }}
        />
        <circle cx={CENTRE.x} cy={CENTRE.y} r={3.1} fill="var(--world-bg)" />
        {/* Forgiving finger target that travels with the handle. */}
        <circle
          id={`${uid}-grip`}
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={30}
          fill="transparent"
          className="[-webkit-tap-highlight-color:transparent] touch-none"
          style={{ cursor: "grab" }}
          role="slider"
          tabIndex={0}
          aria-label="Top loop selector"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={position + 1}
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

/** Shared content helpers so every profile's selector looks the same. */
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
  /** Prototype demonstration state only — not final architecture. */
  sparks: (count: number) => (
    <>
      <text
        x={CENTRE.x}
        y={CENTRE.y - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-ink)"
        className="font-black"
        style={{ fontSize: 30, letterSpacing: "-0.05em" }}
      >
        {count}
      </text>
      <text
        x={CENTRE.x}
        y={CENTRE.y + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-ink)"
        className="font-black uppercase"
        style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.6 }}
      >
        Sparks
      </text>
    </>
  ),
  /** Deliberately unassigned third state. */
  placeholder: () => (
    <circle
      cx={CENTRE.x}
      cy={CENTRE.y}
      r={17}
      fill="none"
      stroke="var(--world-ink)"
      strokeWidth={2.2}
      opacity={0.28}
    />
  ),
};
