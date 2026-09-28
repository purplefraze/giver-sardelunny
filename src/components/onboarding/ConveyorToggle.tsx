import { useEffect, useId, useRef, type RefObject } from "react";

import { toggleGeometry, type Seat } from "@/components/living-g/EarSelector";
import { GThinMask } from "@/components/living-g/g-weight";
import { haptics } from "@/lib/haptics";
import {
  FEED_KINDS,
  feedEmphasis,
  seatAngle,
  seatBlend,
  seatColour,
} from "@/components/onboarding/signin-emphasis";

/**
 * THE EMAIL STEP'S TOGGLE — ONE CONTINUOUS GESTURE.
 *
 * The main G's variant A piece (same construction: toggleGeometry("middle"),
 * ring 74.6 / 57.4, stem 20, orbit 283.1, the 24.5 white gap to the rim, the
 * white knock-out where it crosses a stroke of the G) riding ONE continuous
 * angle round the circle through all seven seats in clock order. No seats to
 * snap to, no discrete states:
 *
 *   DRIFT    when idle it travels clockwise on its own, one lap in LAP_S
 *            seconds; it waits START_MS after the screen appears, stops the
 *            moment a finger takes it or the field has focus (typing), and
 *            eases back in RESUME_MS after release / blur.
 *   DRAG     the finger carries it anywhere round the loop (both ways, across
 *            12:00 too); released, it simply stays where it was let go.
 *   KEYS     arrow keys nudge it STEP_DEG.
 *   REDUCED  prefers-reduced-motion: no drift at all; dragging still works and
 *            the colour / feed emphasis still follow it.
 *
 * EVERY FRAME (requestAnimationFrame, no React state): the piece's rotation,
 * and — only when they actually change — CSS custom properties on the sign-in
 * root: --seat (the two neighbouring seat colours mixed by position, OKLab)
 * and --emph-<action> (feed alpha per action). Nothing re-renders, nothing
 * reflows.
 */
const LAP_S = 50;
const DRIFT_DEG_PER_S = 360 / LAP_S;
const START_MS = 1200;
const RESUME_MS = 1500;
const RAMP_S = 1.2;
const STEP_DEG = 15;
const GRIP_R = 110;

const smooth = (x: number) => x * x * (3 - 2 * x);
const SEAT_NAME: Record<Seat, string> = {
  give: "give",
  lend: "lend",
  giver: "my g",
  trade: "trade",
  fund: "fund",
  borrow: "borrow",
  wish: "wish",
};

export function ConveyorToggle({
  root,
  start = "give",
}: {
  /** The sign-in root: the per-frame custom properties are written here. */
  root: RefObject<HTMLElement | null>;
  start?: Seat;
}) {
  const g = toggleGeometry("middle");
  const C = g.centre;
  const id = useId().replace(/:/g, "");
  const piece = useRef<SVGGElement | null>(null);
  const knock = useRef<SVGCircleElement | null>(null);
  const grip = useRef<SVGCircleElement | null>(null);
  const start0 = seatAngle(start);
  const angle = useRef(start0);
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const resumeAt = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const written = new Map<string, string>();
    const put = (name: string, value: string) => {
      if (written.get(name) === value) return;
      written.set(name, value);
      el.style.setProperty(name, value);
    };
    const typing = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && el.contains(a) && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
    };

    let painted = NaN;
    let seat = "";
    const paint = () => {
      const deg = angle.current;
      if (Math.abs(deg - painted) < 0.005) return;
      painted = deg;
      const rad = (deg * Math.PI) / 180;
      piece.current?.setAttribute("transform", `rotate(${deg.toFixed(3)} ${C.x} ${C.y})`);
      knock.current?.setAttribute("cx", (C.x + g.TRACK_R * Math.cos(rad)).toFixed(2));
      knock.current?.setAttribute("cy", (C.y + g.TRACK_R * Math.sin(rad)).toFixed(2));
      const blend = seatBlend(deg);
      put("--seat", seatColour(blend));
      const emph = feedEmphasis(blend);
      for (const k of FEED_KINDS) put(`--emph-${k}`, (Math.round(emph[k] * 500) / 500).toFixed(3));
      if (blend.nearest !== seat) {
        seat = blend.nearest;
        el.setAttribute("data-signin-seat", seat);
        grip.current?.setAttribute("aria-valuetext", SEAT_NAME[blend.nearest]);
        if (drag.current) haptics.selection();
      }
    };

    let raf = 0;
    let last = performance.now();
    let speed = 0;
    resumeAt.current = last + START_MS;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const held = drag.current !== null || typing();
      if (held) resumeAt.current = now + RESUME_MS;
      if (held || reduce?.matches) speed = 0;
      else if (now >= resumeAt.current) speed = Math.min(1, speed + dt / RAMP_S);
      if (speed > 0) angle.current += DRIFT_DEG_PER_S * dt * smooth(speed);
      paint();
      raf = requestAnimationFrame(frame);
    };
    paint();
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once loop
  }, []);

  /** The finger's angle about the track centre, in the SVG's own units. */
  const fingerAngle = (e: React.PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(ctm.inverse());
    return (Math.atan2(local.y - C.y, local.x - C.x) * 180) / Math.PI;
  };

  const release = (e: React.PointerEvent<SVGElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    resumeAt.current = performance.now() + RESUME_MS;
  };

  const rad0 = (start0 * Math.PI) / 180;
  return (
    <g>
      <defs>
        <GThinMask id={`${id}-thin`} weight="middle" transformed />
      </defs>
      {/* The white gap where the ring crosses a (thinned) stroke of the G. */}
      <circle
        ref={knock}
        cx={C.x + g.TRACK_R * Math.cos(rad0)}
        cy={C.y + g.TRACK_R * Math.sin(rad0)}
        r={g.RING_MID}
        fill="none"
        stroke="var(--world-bg)"
        strokeWidth={g.RING_W + g.KNOCK_GAP * 2}
        mask={`url(#${id}-thin)`}
        pointerEvents="none"
      />
      <g ref={piece} transform={`rotate(${start0} ${C.x} ${C.y})`}>
        <rect
          x={C.x + g.STEM_FROM}
          y={C.y - g.STEM_HALF}
          width={g.STEM_TO - g.STEM_FROM}
          height={g.STEM_HALF * 2}
          rx={g.STEM_HALF * 0.5}
          fill="var(--world-g)"
          pointerEvents="none"
        />
        <circle
          cx={C.x + g.TRACK_R}
          cy={C.y}
          r={g.RING_MID}
          fill="var(--world-bg)"
          stroke="var(--world-g)"
          strokeWidth={g.RING_W}
          pointerEvents="none"
        />
        {/* Invisible grip, travelling with the ring. */}
        <circle
          ref={grip}
          cx={C.x + g.TRACK_R}
          cy={C.y}
          r={GRIP_R}
          fill="transparent"
          role="slider"
          tabIndex={0}
          aria-label="seat"
          aria-valuetext={SEAT_NAME[start]}
          className="outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
          style={{ cursor: "grab", touchAction: "none", outline: "none" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (drag.current) return;
            const a = fingerAngle(e);
            if (a === null) return;
            drag.current = { id: e.pointerId, offset: angle.current - a };
            (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const a = fingerAngle(e);
            if (a === null) return;
            /* Continuous: the finger's angle expressed nearest the piece's. */
            let next = a + d.offset;
            next += 360 * Math.round((angle.current - next) / 360);
            angle.current = next;
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onKeyDown={(e) => {
            const by =
              e.key === "ArrowRight" || e.key === "ArrowDown"
                ? STEP_DEG
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -STEP_DEG
                  : 0;
            if (!by) return;
            e.preventDefault();
            angle.current += by;
            resumeAt.current = performance.now() + RESUME_MS;
          }}
        />
      </g>
    </g>
  );
}
