import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

import { toggleGeometry, type Seat } from "@/components/living-g/EarSelector";
import { GThinMask } from "@/components/living-g/g-weight";
import { haptics } from "@/lib/haptics";
import {
  FEED_KINDS,
  NOON,
  feedEmphasis,
  giveMark,
  seatAngle,
  seatBlend,
  seatColour,
} from "@/components/onboarding/signin-emphasis";

/**
 * THE EMAIL STEP'S TOGGLE — ONE CONTINUOUS GESTURE.
 *
 * The main G's variant A piece (same construction: toggleGeometry("middle"),
 * ring 74.6 / 57.4, stem 20, orbit 283.1, the 24.5 white gap to the rim)
 * riding ONE continuous angle round the ring through all seven seats in
 * clock order. No seats to snap to, no discrete states, no clamp anywhere:
 *
 *   DRIFT    when idle it travels clockwise on its own, one lap in LAP_S
 *            seconds, gliding straight through 12:00; it waits START_MS after
 *            the screen appears, stops the moment a finger takes it or the
 *            field has focus (typing), and eases back in RESUME_MS later.
 *   DRAG     the finger carries it either way round, always the SHORT way
 *            (each move is resolved to the angle nearest the piece's own), so
 *            my g → trade is a short clockwise pull. Released, it stays put —
 *            except in the empty arc round 12:00, where it glides to the
 *            nearer of wish / give: nothing ever rests at 12:00.
 *   KEYS     arrow keys nudge it STEP_DEG.
 *   REDUCED  prefers-reduced-motion: no drift at all; dragging still works and
 *            the colour / feed emphasis still follow it.
 *
 * LIFTED OVER THE G. Wherever the piece crosses a stroke of the G (the S-curve
 * waist, the lower loop between my g and fund), a paper-coloured footprint of
 * the WHOLE piece — the ring's disc and the stem, each grown by the same
 * 24.5-unit white gap the ring keeps from the rim — is painted over the
 * (thinned) G strokes only, underneath the piece. So the ring and the stem
 * never touch a stroke: the piece reads as passing OVER the waist. The upper
 * ring is drawn AFTER that footprint (`under`), so it is never cut and never
 * opens.
 *
 * EVERY FRAME (requestAnimationFrame, no React state): the piece's rotation,
 * the footprint's position, and — only when they change — CSS custom
 * properties on the sign-in root: --seat (the two neighbouring seat colours
 * mixed by position, OKLCH), --emph-<action> (feed alpha per action) and
 * --give-mark (the give wordmark's presence). Nothing re-renders or reflows.
 */
const LAP_S = 50;
const DRIFT_DEG_PER_S = 360 / LAP_S;
const START_MS = 1200;
const RESUME_MS = 1500;
const RAMP_S = 1.2;
const STEP_DEG = 15;
const GRIP_R = 110;
const SETTLE_MS = 450;

const smooth = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const norm = (d: number) => ((((d + 90) % 360) + 360) % 360) - 90;
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
  under,
}: {
  /** The sign-in root: the per-frame custom properties are written here. */
  root: RefObject<HTMLElement | null>;
  start?: Seat;
  /** Drawn above the lift-over footprint and below the piece (the ring). */
  under?: ReactNode;
}) {
  const g = toggleGeometry("middle");
  const C = g.centre;
  const LIFT = g.EAR.gap;
  const id = useId().replace(/:/g, "");
  const piece = useRef<SVGGElement | null>(null);
  const discKnock = useRef<SVGCircleElement | null>(null);
  const stemKnock = useRef<SVGLineElement | null>(null);
  const grip = useRef<SVGCircleElement | null>(null);
  const start0 = seatAngle(start);
  const angle = useRef(start0);
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const resumeAt = useRef(0);
  const glide = useRef<{ from: number; to: number; t0: number } | null>(null);
  const reduced = useRef(false);

  const at = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: C.x + r * Math.cos(rad), y: C.y + r * Math.sin(rad) };
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
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
      piece.current?.setAttribute("transform", `rotate(${deg.toFixed(3)} ${C.x} ${C.y})`);
      const ring = at(deg, g.TRACK_R);
      const root0 = at(deg, g.RIM_R);
      discKnock.current?.setAttribute("cx", ring.x.toFixed(2));
      discKnock.current?.setAttribute("cy", ring.y.toFixed(2));
      stemKnock.current?.setAttribute("x1", root0.x.toFixed(2));
      stemKnock.current?.setAttribute("y1", root0.y.toFixed(2));
      stemKnock.current?.setAttribute("x2", ring.x.toFixed(2));
      stemKnock.current?.setAttribute("y2", ring.y.toFixed(2));
      const blend = seatBlend(deg);
      put("--seat", seatColour(blend));
      const emph = feedEmphasis(blend);
      for (const k of FEED_KINDS) put(`--emph-${k}`, (Math.round(emph[k] * 500) / 500).toFixed(3));
      put("--give-mark", (Math.round(giveMark(blend) * 500) / 500).toFixed(3));
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
      reduced.current = !!mq?.matches;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const gl = glide.current;
      if (gl) {
        const k = Math.min(1, (now - gl.t0) / SETTLE_MS);
        angle.current = gl.from + (gl.to - gl.from) * easeOut(k);
        if (k >= 1) glide.current = null;
      }
      const held = drag.current !== null || typing() || gl !== null;
      if (held) resumeAt.current = now + (gl ? 0 : RESUME_MS);
      if (held || reduced.current) speed = 0;
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

  /** NOTHING RESTS AT 12:00: a release in the empty arc glides to wish / give. */
  const settle = () => {
    let phi = norm(angle.current);
    if (phi < NOON.to - 360) phi += 360;
    const inset = 15;
    if (phi <= NOON.from + inset || phi >= NOON.to - inset) return;
    const mid = (NOON.from + NOON.to) / 2;
    const to = angle.current + ((phi < mid ? NOON.from : NOON.to) - phi);
    if (reduced.current) angle.current = to;
    else glide.current = { from: angle.current, to, t0: performance.now() };
  };

  const release = (e: React.PointerEvent<SVGElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    resumeAt.current = performance.now() + RESUME_MS;
    settle();
  };

  const ring0 = at(start0, g.TRACK_R);
  const root0 = at(start0, g.RIM_R);
  return (
    <g>
      <defs>
        <GThinMask id={`${id}-thin`} weight="middle" transformed />
      </defs>
      {/* The lift-over footprint: paper over the (thinned) G strokes only. */}
      <g mask={`url(#${id}-thin)`} pointerEvents="none">
        <circle
          ref={discKnock}
          cx={ring0.x}
          cy={ring0.y}
          r={g.EAR.outerR + LIFT}
          fill="var(--world-bg)"
        />
        <line
          ref={stemKnock}
          x1={root0.x}
          y1={root0.y}
          x2={ring0.x}
          y2={ring0.y}
          stroke="var(--world-bg)"
          strokeWidth={g.EAR.stemWidth + 2 * LIFT}
        />
      </g>
      {under}
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
            glide.current = null;
            drag.current = { id: e.pointerId, offset: angle.current - a };
            (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const a = fingerAngle(e);
            if (a === null) return;
            /* The SHORT way: the finger's angle expressed nearest the piece's. */
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
            settle();
          }}
        />
      </g>
    </g>
  );
}
