import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { LOWER_STATIONS, clampLower, lowerAngle, lowerToken, lowerWord, nearestLower, type CgStation } from "./lower-stations";
export type { CgStation } from "./lower-stations";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";
import { ARM_LENGTH, SNAP_MS, TRACK_PATH, TRACK_WIDTH, sPath, crossings, easeOut, frameOf, inputAngle, settleDuration, signedTurn, wrap, type Point } from "./perimeter-geometry";

const clockOf = lowerAngle;
const STATIONS = LOWER_STATIONS.map(s => s.value);
const LABELED = LOWER_STATIONS;
const DETENTS = Array.from({ length: 29 }, (_, i) => ({ angle: -i * 11.25, value: i }));
const nearest = nearestLower;
const ink = (s: CgStation) => `var(${lowerToken(s)})`;
/** Height of the centred category + communi-g lockup (two short lines). */
const HEADER_H = 50;
type Gesture = { id: number; centre: Point; radii: Point; raw: number | null; down: Point; moved: boolean; target: HTMLButtonElement };

/** ONE angle → one paint. Only release owns an animation; no camera timer.
 * A stable gesture-space ellipse is INPUT only, never a frozen camera/lens. */
/** Tap = onTap (never exits) · stationary hold = onHold (record mode toggle). */
/** backdrop = content clipped to the loop's hollow (the map at 12).
 * onBack = a deliberate tap on the toggle once SETTLED at the outside "back". */
/** header = the centred communi-g lockup at the top of the hollow (one line each).
 * backdropHidden keeps the map mounted (centre/zoom kept) while a detail shows. */
export function PerimeterToggle({ value, onChange, onTap, onHold, onBack, record = false, listening = false, backdrop, backdropHidden = false, header, children, flow = false }: { value: CgStation; onChange: (next: CgStation) => void; onTap?: () => void; onHold?: () => void; onBack?: () => void; record?: boolean; listening?: boolean; backdrop?: ReactNode; backdropHidden?: boolean; header?: ReactNode; children?: ReactNode; flow?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [angle, setAngle] = useState(() => clockOf(value));
  const angleRef = useRef(angle);
  const [shown, setShown] = useState<CgStation>(value);
  const shownRef = useRef<CgStation>(value);
  const [held, setHeld] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const raf = useRef(0);
  const previousValue = useRef(value);
  const external = useRef(false);
  const callbacks = useRef({ onChange, onTap, onHold, onBack });
  callbacks.current = { onChange, onTap, onHold, onBack };
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldLong = useRef(false);
  const clearHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; };
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth > 1 && el.clientHeight > 1) setSize({ w: el.clientWidth, h: el.clientHeight }); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const show = (station: CgStation) => {
    if (station === shownRef.current) return;
    shownRef.current = station; setShown(station);
    // Content changes at real station crossings; 12:00 is the all-types map; no wrapped station crossings.
    if (station === "back") return; // reaching back never leaves, never changes content
    if (!external.current) { previousValue.current = station; callbacks.current.onChange(station); }
  };
  const put = (next: number, tactile = false) => {
    next = clampLower(next);
    const before = angleRef.current;
    /* The lower route is OPEN (not periodic): only real, in-range crossings. */
    const events = LABELED.filter(st => next > before ? st.angle > before && st.angle <= next : st.angle < before && st.angle >= next)
      .sort((a, b) => next > before ? a.angle - b.angle : b.angle - a.angle).map(st => st.value);
    if (!external.current) for (const station of events) show(station);
    if (tactile && crossings(before, next, DETENTS).length > 0) haptics.selection();
    angleRef.current = next; setAngle(next);
  };
  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0; setSnapping(false); };
  const settle = (station: CgStation, tactile: boolean, programmatic = false) => {
    external.current = programmatic;
    stop();
    if (programmatic) show(station);
    const from = angleRef.current, delta = clockOf(station) - from;
    const duration = settleDuration(delta, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Ask in the release gesture, not a later RAF; actual motor delivery is optional.
    if (tactile) haptics.light();
    if (!duration || Math.abs(delta) < .001) { put(from + delta); show(station); external.current=false; return; }
    setSnapping(true); const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      put(from + delta * easeOut(t));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else { raf.current = 0; show(station); external.current=false; setSnapping(false); }
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    if (value === previousValue.current) return;
    previousValue.current = value;
    if (!gesture.current) settle(value, false, true);
  }, [value]);
  const finish = (e: PointerEvent<HTMLButtonElement>, cancel = false) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null; setHeld(false); clearHold();
    if (g.target.hasPointerCapture(g.id)) g.target.releasePointerCapture(g.id);
    if (heldLong.current) { heldLong.current = false; return; }
    if (!cancel && !g.moved) {
      haptics.light();
      /* Only a tap on the settled outside "back" returns to the whole G. */
      if (shownRef.current === "back" && Math.abs(angleRef.current - clockOf("back")) < .5) { callbacks.current.onBack?.(); return; }
      callbacks.current.onTap?.();
    }
    settle(nearest(angleRef.current), !cancel && g.moved);
  };
  const frame = frameOf(size.w, size.h, angle);
  const colour = ink(shown), word = lowerWord(shown);
  // Smooth interior clearance; no threshold-based page jumps as the camera rides.
  const a = Math.min(0, angle) * Math.PI / 180;
  const left = 16 + Math.max(0, -Math.sin(a)) * 98, right = 16 + Math.max(0, Math.sin(a)) * 98;
  const top = 16 + Math.max(0, Math.cos(a)) * (shown === "map" || shown === "back" ? 118 : shown === "wish" || shown === "give" ? 180 : 290), bottom = shown === "map" || shown === "back" ? 118 : 16 + Math.max(0, -Math.cos(a)) * 98;
  /* The lockup is centred on the stage and never sits under the bead: when the
     bead rides the upper band it drops just below the bead's ring. */
  const headTop = header && frame.bead.y < size.h * 0.45 && Math.abs(frame.bead.x - size.w / 2) < 150 ? Math.max(top, frame.bead.y + 46) : top;
  /* THE BEAD'S OWN CLEARANCE at the shown seat's rest pose (changes only at a
     station change, never mid-drag): if the bead still reaches into the
     interior, step that one side out — whichever keeps more usable area. */
  const box0 = { l: left, r: right, t: header ? headTop + HEADER_H : top, b: bottom };
  const restBead = frameOf(size.w, size.h, clockOf(shown)).bead;
  /* A single record may instead flow AROUND the bead (CSS float) so the whole
     hollow is usable; lists keep the plain rectangular clearance. */
  const flowed = flow ? beadFlow(size, restBead, box0) : null;
   const inner = header ? { l: 24, r: 24, t: 132, b: 110 } : flowed ? box0 : beadClear(size, restBead, box0);
  return <div ref={stage} className="absolute inset-0 overflow-hidden bg-background" data-cg-stage="" data-cg-clock={wrap(angle).toFixed(4)} data-cg-progress={angle.toFixed(4)} data-cg-snapping={snapping ? "1" : "0"} data-cg-held={held ? "1" : "0"} data-cg-sfit={frame.scale} data-cg-seat-ms={SNAP_MS} data-cg-stem-len={ARM_LENGTH} data-cg-track-w={TRACK_WIDTH} data-cg-kind="smooth-lower-loop" data-cg-camera-angle={angle.toFixed(4)}>
    {backdrop ? <>
      <svg width={0} height={0} className="absolute" aria-hidden="true"><clipPath id="cg-hollow" clipPathUnits="userSpaceOnUse"><path d={TRACK_PATH} transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} /></clipPath></svg>
      <div className="absolute inset-0 z-[1]" style={{ clipPath: "url(#cg-hollow)", WebkitClipPath: "url(#cg-hollow)", ...(backdropHidden ? { visibility: "hidden", pointerEvents: "none" } : {}) }} aria-hidden={backdropHidden || undefined} data-cg-backdrop="">{backdrop}</div>
    </> : null}
    <svg width={size.w} height={size.h} className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" data-cg-world="">
      <g transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} data-cg-loop="">
        <path d={TRACK_PATH} fill="none" stroke="var(--mode-communigy)" strokeWidth={TRACK_WIDTH} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" data-cg-track="" />
        {angle > 0 ? <path opacity={Math.min(1, angle / 8)} d={sPath(size.w, size.h)} fill="none" stroke="var(--mode-communigy)" strokeWidth={TRACK_WIDTH} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" data-cg-s-connector="" /> : null}
      </g>
      <line x1={frame.tip.x} y1={frame.tip.y} x2={frame.root.x} y2={frame.root.y} stroke={colour} strokeWidth={10} strokeLinecap="round" data-cg-stem-arm="" />
    </svg>
     {header ? <div className="pointer-events-none absolute z-[6] flex justify-start" style={{ left: 24, right: 108, top: 108, height: 24 }} data-cg-header="">{header}</div> : null}
    {children ? <div className="pointer-events-none absolute z-[5] overflow-hidden" style={{ left: inner.l, right: inner.r, top: inner.t, bottom: inner.b, ...(flowed ? { ["--bead-top" as string]: `${flowed.top}px`, ["--bead-w" as string]: `${flowed.w}px`, ["--bead-h" as string]: `${flowed.h}px` } : {}) }} data-cg-interior="" data-cg-bead-flow={flowed ? flowed.side : undefined}><div className="pointer-events-auto h-full w-full">{children}</div></div> : null}
    <Button variant="ghost" className="absolute z-30 h-[88px] w-[88px] rounded-full border-0 bg-transparent p-0 shadow-none transition-none hover:bg-transparent focus-visible:ring-0 [&_svg]:size-auto" style={{ left: frame.bead.x - 44, top: frame.bead.y - 44, touchAction: "none", cursor: held ? "grabbing" : "grab" }} role="slider" aria-label={shown === "back" ? "back — tap to return to the living g" : record ? (listening ? "recording — tap to stop" : "record mode — tap to listen, hold to return") : "communi-g mode — hold for voice"} aria-valuemin={-315} aria-valuemax={clockOf("back")} aria-valuenow={angle} aria-valuetext={lowerWord(shown)} data-cg-toggle="" data-cg-seat={shown} data-cg-settled={!held && !snapping ? "1" : "0"}
      onPointerDown={e => {
        if (gesture.current || !e.isPrimary || e.button !== 0) return;
        const rect = stage.current?.getBoundingClientRect(); if (!rect) return;
        e.preventDefault(); e.stopPropagation(); stop(); external.current=false;
        const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const radii = { x: Math.max(1, rect.width / 2 - 54), y: Math.max(1, rect.height / 2 - 54) };
        gesture.current = { id: e.pointerId, centre, radii, raw: inputAngle({ x: e.clientX, y: e.clientY }, centre, radii), down: { x: e.clientX, y: e.clientY }, moved: false, target: e.currentTarget };
        setHeld(true); e.currentTarget.setPointerCapture(e.pointerId);
        heldLong.current = false; clearHold();
        holdTimer.current = setTimeout(() => {
          const live = gesture.current; if (!live || live.moved) return;
          heldLong.current = true; haptics.medium?.(); callbacks.current.onHold?.();
        }, 450);
      }}
      onPointerMove={e => {
        const g = gesture.current; if (!g || g.id !== e.pointerId) return;
        const raw = inputAngle({ x: e.clientX, y: e.clientY }, g.centre, g.radii);
        if (raw === null) { g.raw = null; return; }
        if (g.raw !== null) {
          const delta = signedTurn(g.raw, raw);
          if (heldLong.current) return;
          if (Math.hypot(e.clientX - g.down.x, e.clientY - g.down.y) > 6) { g.moved = true; clearHold(); }
          if (delta !== 0) put(angleRef.current + delta, true);
        }
        g.raw = raw;
      }}
      onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)}
      onClick={e => { e.preventDefault(); }}
      onKeyDown={e => {
        const index = STATIONS.indexOf(shownRef.current);
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
          e.preventDefault(); const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
          const next = STATIONS[Math.max(0, Math.min(STATIONS.length - 1, index + dir))]; if (next) settle(next, true);
        } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (shownRef.current === "back") callbacks.current.onBack?.(); else callbacks.current.onTap?.(); }
        else if (e.key === "Escape") { e.preventDefault(); stage.current?.dispatchEvent(new CustomEvent("giver:community-return", { bubbles:true })); }
        else if (e.key === "r" || e.key === "R") { e.preventDefault(); callbacks.current.onHold?.(); }
      }}>
      <svg width={64} height={64} viewBox="-32 -32 64 64" aria-hidden="true" data-cg-bead-shape="circle-arm">
        <circle r={24.5} fill="var(--world-bg)" />
        <circle r={28.4} fill="none" stroke={colour} style={{ stroke: colour }} strokeWidth={7.2} data-cg-ring="" />
        {record ? <circle r={listening ? 9 : 11} fill={colour} data-cg-record="" opacity={listening ? 1 : .85} /> : <text textAnchor="middle" dominantBaseline="central" y={.4} fill={colour} data-cg-seat-label="" style={{ fontFamily: "var(--giver-font)", fontSize: word.length > 5 ? 9.5 : 11, fontWeight: 700, letterSpacing: 0 }}>{word}</text>}
      </svg>
    </Button>
  </div>;
}

/** Pure: interior insets that keep a 50px-radius bead out of the content box. */
export function beadClear(size: { w: number; h: number }, bead: Point, box: { l: number; r: number; t: number; b: number }, R = 50) {
  const hits = (q: typeof box) => bead.x + R > q.l && bead.x - R < size.w - q.r && bead.y + R > q.t && bead.y - R < size.h - q.b;
  if (!hits(box)) return box;
  const side = bead.x < size.w / 2 ? { ...box, l: Math.max(box.l, bead.x + R) } : { ...box, r: Math.max(box.r, size.w - (bead.x - R)) };
  const vert = bead.y > size.h / 2 ? { ...box, b: Math.max(box.b, size.h - (bead.y - R)) } : { ...box, t: Math.max(box.t, bead.y + R) };
  const area = (q: typeof box) => Math.max(0, size.w - q.l - q.r) * Math.max(0, size.h - q.t - q.b);
  return area(side) >= area(vert) ? side : vert;
}

/** Pure: where a bead resting at the bottom edge of the box intrudes, as a
 *  float (distance from the box top, width from that side, height). Null when
 *  the bead is clear, not at the bottom, or not against a side. */
export function beadFlow(size: { w: number; h: number }, bead: Point, box: { l: number; r: number; t: number; b: number }, R = 50) {
  const top = bead.y - R - box.t, boxH = size.h - box.t - box.b, boxW = size.w - box.l - box.r;
  if (top <= 0 || top >= boxH || bead.y < size.h / 2) return null;
  const leftW = bead.x + R - box.l, rightW = size.w - box.r - (bead.x - R);
  const side = leftW <= rightW ? "left" as const : "right" as const;
  const w = Math.max(0, Math.min(boxW, side === "left" ? leftW : rightW));
  if (w <= 0 || w > boxW * 0.6) return null;
  return { side, top: Math.round(top), w: Math.round(w), h: Math.round(boxH - top) };
}
