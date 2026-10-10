import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import { Button } from "@/components/ui/button";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";
import { ARM_LENGTH, SNAP_MS, TRACK_PATH, TRACK_WIDTH, armPath, crossings, easeOut, frameOf, inputAngle, settleDuration, signedTurn, wrap, type Point } from "./perimeter-geometry";

export type CgStation = CgMode | "exit";
const STATION_SEAT: Record<CgStation, Seat> = { exit: "giver", give: "give", lend: "lend", trade: "trade", everything: "map", fund: "fund", borrow: "borrow", wish: "wish" };
const clockOf = (s: CgStation) => wrap(SEAT_ANGLE[STATION_SEAT[s]] * 180 / Math.PI + 90);
const STATIONS = (Object.keys(STATION_SEAT) as CgStation[]).sort((a, b) => clockOf(a) - clockOf(b));
const LABELED = STATIONS.map(value => ({ value, angle: clockOf(value) }));
const DETENTS = Array.from({ length: 32 }, (_, i) => ({ angle: i * 11.25, value: i }));
const nearest = (angle: number) => STATIONS.reduce((a, b) => Math.abs(signedTurn(angle, clockOf(a))) <= Math.abs(signedTurn(angle, clockOf(b))) ? a : b, "everything");
const ink = (s: CgStation) => `var(--mode-${s === "exit" ? "giver" : s === "everything" ? "communigy" : s})`;
type Gesture = { id: number; centre: Point; radii: Point; raw: number | null; down: Point; moved: boolean; target: HTMLButtonElement };

/** ONE angle → one paint. Only release owns an animation; no camera timer.
 * A stable gesture-space ellipse is INPUT only, never a frozen camera/lens. */
/** Tap = onTap (never exits) · stationary hold = onHold (record mode toggle). */
export function PerimeterToggle({ value, onChange, onTap, onHold, record = false, listening = false, children }: { value: CgStation; onChange: (next: CgStation) => void; onTap?: () => void; onHold?: () => void; record?: boolean; listening?: boolean; children?: ReactNode }) {
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
  const callbacks = useRef({ onChange, onTap, onHold });
  callbacks.current = { onChange, onTap, onHold };
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
    // Content changes at real station crossings; 12:00 is "my g" (mine), never an exit.
    if (!external.current) { previousValue.current = station; callbacks.current.onChange(station); }
  };
  const put = (next: number, tactile = false) => {
    const before = angleRef.current;
    const events = crossings(before, next, LABELED);
    for (const station of events) show(station);
    if (tactile && crossings(before, next, DETENTS).length > 0) haptics.selection();
    angleRef.current = next; setAngle(next);
  };
  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0; setSnapping(false); };
  const settle = (station: CgStation, tactile: boolean, programmatic = false) => {
    external.current = programmatic;
    stop();
    const from = angleRef.current, delta = signedTurn(from, clockOf(station));
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
    if (!cancel && !g.moved) { haptics.light(); callbacks.current.onTap?.(); }
    settle(nearest(angleRef.current), !cancel && g.moved);
  };
  const frame = frameOf(size.w, size.h, angle);
  const colour = ink(shown), word = shown === "exit" ? "communi-g" : SEAT_TITLE[STATION_SEAT[shown]];
  // Smooth interior clearance; no threshold-based page jumps as the camera rides.
  const a = angle * Math.PI / 180;
  const left = 16 + Math.max(0, -Math.sin(a)) * 98, right = 16 + Math.max(0, Math.sin(a)) * 98;
  const top = 16 + Math.max(0, Math.cos(a)) * (shown === "exit" ? 90 : shown === "wish" || shown === "give" ? 180 : 290), bottom = 16 + Math.max(0, -Math.cos(a)) * 98;
  return <div ref={stage} className="absolute inset-0 overflow-hidden bg-background" data-cg-stage="" data-cg-clock={wrap(angle).toFixed(4)} data-cg-progress={angle.toFixed(4)} data-cg-snapping={snapping ? "1" : "0"} data-cg-held={held ? "1" : "0"} data-cg-sfit={frame.scale} data-cg-seat-ms={SNAP_MS} data-cg-stem-len={ARM_LENGTH} data-cg-track-w={TRACK_WIDTH} data-cg-kind="smooth-lower-loop" data-cg-camera-angle={angle.toFixed(4)}>
    <svg width={size.w} height={size.h} className="pointer-events-none absolute inset-0" aria-hidden="true" data-cg-world="">
      <g transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} data-cg-loop="">
        <path d={TRACK_PATH} fill="none" stroke="var(--mode-communigy)" strokeWidth={TRACK_WIDTH} vectorEffect="non-scaling-stroke" strokeLinejoin="round" data-cg-track="" />
      </g>
      <path d={armPath(frame.tip, frame.root, frame.normal)} fill={colour} data-cg-stem-arm="" />
    </svg>
    {children ? <div className="pointer-events-none absolute z-[5] overflow-hidden" style={{ left, right, top, bottom }} data-cg-interior=""><div className="pointer-events-auto h-full w-full">{children}</div></div> : null}
    <Button variant="ghost" className="absolute z-30 h-[88px] w-[88px] rounded-full border-0 bg-transparent p-0 shadow-none transition-none hover:bg-transparent focus-visible:ring-0 [&_svg]:size-auto" style={{ left: frame.bead.x - 44, top: frame.bead.y - 44, touchAction: "none", cursor: held ? "grabbing" : "grab" }} role="slider" aria-label={record ? (listening ? "recording — tap to stop" : "record mode — tap to listen, hold to return") : "communi-g mode — hold for voice"} aria-valuemin={0} aria-valuemax={360} aria-valuenow={wrap(angle)} aria-valuetext={shown === "exit" ? "communi-g" : shown} data-cg-toggle="" data-cg-seat={shown} data-cg-settled={!held && !snapping ? "1" : "0"}
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
          const next = STATIONS[(index + dir + STATIONS.length) % STATIONS.length]; if (next) settle(next, true);
        } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); callbacks.current.onTap?.(); }
        else if (e.key === "r" || e.key === "R") { e.preventDefault(); callbacks.current.onHold?.(); }
      }}>
      <svg width={64} height={64} viewBox="-32 -32 64 64" aria-hidden="true" data-cg-bead-shape="circle-arm">
        <circle r={24.5} fill="var(--world-bg)" />
        <circle r={28.4} fill="none" stroke={colour} strokeWidth={7.2} data-cg-ring="" />
        {record ? <circle r={listening ? 9 : 11} fill={colour} data-cg-record="" opacity={listening ? 1 : .85} /> : <text textAnchor="middle" dominantBaseline="central" y={.4} fill={colour} style={{ fontFamily: "var(--giver-font)", fontSize: word === "communi-g" ? 8.2 : word.length > 5 ? 9.5 : 11, fontWeight: 700, letterSpacing: 0 }}>{word}</text>}
      </svg>
    </Button>
  </div>;
}
