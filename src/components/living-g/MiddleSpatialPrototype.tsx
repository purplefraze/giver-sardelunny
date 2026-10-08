import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";
import { crossings, easeOut, inputAngle, settleDuration, signedTurn } from "@/components/community/perimeter-geometry";
import { EAR_CUT, LIVING_G_PATH, LIVING_G_TRANSFORM, LOOP_CENTRE, RIM_PATCH, arcPath, wedgePath } from "./g-path";
import { SEAT_TITLE, type Seat } from "./EarSelector";
import { MiddleLoopClose } from "./loop-close";
import { middleClamp, middleDegrees, middleFrame, middleGeometry, middleNearest, middleStations } from "./middle-spatial-geometry";

type Grip = { id: number; raw: number | null; centre: { x: number; y: number }; radii: { x: number; y: number }; target: HTMLButtonElement };
const DETENTS = Array.from({ length: 30 }, (_, i) => ({ angle: -270 + i * 11.25, value: i }));

/** Opt-in spatial study only. No stores, form submission, routing or lower-loop mutation. */
export function MiddleSpatialPrototype() {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [angle, setAngle] = useState(middleDegrees("wish"));
  const current = useRef(angle);
  const [seat, setSeat] = useState<Seat>("wish");
  const [held, setHeld] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [words, setWords] = useState<Partial<Record<Seat, string>>>({});
  const grip = useRef<Grip | null>(null);
  const raf = useRef(0);
  const id = useId().replaceAll(":", "");
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure(); const observer = new ResizeObserver(measure); observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0; setSnapping(false); };
  const put = (next: number, tactile = false) => {
    const bounded = middleClamp(next), before = current.current;
    for (const crossed of crossings(before, bounded, middleStations)) setSeat(crossed);
    if (tactile && crossings(before, bounded, DETENTS).length) haptics.selection();
    current.current = bounded; setAngle(bounded);
  };
  const settle = (next: Seat, tactile: boolean) => {
    stop(); const from = current.current, delta = middleDegrees(next) - from;
    const duration = settleDuration(delta, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (tactile) haptics.light();
    if (!duration || Math.abs(delta) < .001) { put(from + delta); setSeat(next); return; }
    setSnapping(true); const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration); put(from + delta * easeOut(t));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else { raf.current = 0; setSnapping(false); setSeat(next); }
    }; raf.current = requestAnimationFrame(step);
  };
  const finish = (e: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const g = grip.current; if (!g || g.id !== e.pointerId) return;
    grip.current = null; setHeld(false);
    if (g.target.hasPointerCapture(g.id)) g.target.releasePointerCapture(g.id);
    settle(middleNearest(current.current), !cancelled);
  };
  const frame = middleFrame(size.w, size.h, angle);
  const geometry = middleGeometry;
  // Constant 16px paint, erosion applied to the canonical outline in its own space.
  const maskStroke = Math.max(0, 53.5 - 16 / frame.scale) * 10;
  const title = SEAT_TITLE[seat];
  return <div ref={stage} className="middle-spatial absolute inset-0 overflow-hidden" data-middle-seat={seat} data-middle-angle={angle} data-middle-camera={angle} data-middle-held={held ? "1" : "0"} data-middle-snapping={snapping ? "1" : "0"}>
    <svg width={size.w} height={size.h} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <defs>
        <mask id={`${id}-thin`} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={16000} height={20000}><path d={LIVING_G_PATH} fill="var(--spatial-mask-on)" stroke="var(--spatial-mask-off)" strokeWidth={maskStroke} strokeLinejoin="round" /></mask>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x={-500} y={-500} width={1800} height={2200}><rect x={-500} y={-500} width={1800} height={2200} fill="var(--spatial-mask-on)"/><path d={wedgePath(LOOP_CENTRE.middle, EAR_CUT.a0, EAR_CUT.a1, EAR_CUT.r0, EAR_CUT.r1)} fill="var(--spatial-mask-off)" /></mask>
      </defs>
      <g transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} data-middle-art="">
        <g mask={`url(#${id}-cut)`}><path d={LIVING_G_PATH} transform={LIVING_G_TRANSFORM} mask={`url(#${id}-thin)`} fill="var(--world-g)" /></g>
        <path d={arcPath(LOOP_CENTRE.middle, RIM_PATCH.a0, RIM_PATCH.a1, RIM_PATCH.rMid)} fill="none" stroke="var(--world-g)" strokeWidth={16} vectorEffect="non-scaling-stroke" />
        <g className="middle-spatial-close"><MiddleLoopClose weight="middle" /></g>
        <circle cx={frame.pose.x} cy={frame.pose.y} r={geometry.RING_MID} fill="var(--world-bg)" />
        <g transform={`translate(${frame.pose.x} ${frame.pose.y}) rotate(${frame.pose.deg})`}>
          <rect x={geometry.STEM_FROM - geometry.TRACK_R} y={-geometry.STEM_HALF} width={geometry.STEM_TO - geometry.STEM_FROM} height={geometry.STEM_HALF * 2} rx={geometry.STEM_HALF * .5} fill="var(--world-g)" />
          <circle r={geometry.RING_MID} fill="none" stroke="var(--world-g)" strokeWidth={geometry.RING_W} />
        </g>
        <text x={frame.pose.x} y={frame.pose.y} textAnchor="middle" dominantBaseline="central" className="middle-spatial-title" fill="var(--world-g)">{title}</text>
      </g>
    </svg>
    <div className="absolute overflow-auto" style={frame.content} data-middle-content="">
      <div className="flex min-h-full flex-col gap-4">
        <h1 className="g-name break-words">{title}</h1>
        <textarea aria-label={`your ${title} words`} value={words[seat] ?? ""} onChange={e => setWords(previous => ({ ...previous, [seat]: e.target.value }))} placeholder={seat === "wish" ? "what do you wish for?" : "your words"} className="g-body min-h-20 w-full resize-none border-0 bg-transparent outline-none" />
      </div>
    </div>
    <Button variant="ghost" className="absolute rounded-full border-0 bg-transparent p-0 shadow-none transition-none hover:bg-transparent focus-visible:ring-2" style={{ left: frame.bead.x - frame.radius - 6, top: frame.bead.y - frame.radius - 6, width: (frame.radius + 6) * 2, height: (frame.radius + 6) * 2, touchAction: "none" }} role="slider" aria-label="middle loop seat" aria-valuemin={-270} aria-valuemax={60} aria-valuenow={angle} aria-valuetext={title} data-middle-grip=""
      onPointerDown={e => {
        if (grip.current || !e.isPrimary || e.button !== 0) return;
        const rect = stage.current?.getBoundingClientRect(); if (!rect) return;
        e.preventDefault(); stop();
        const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const radii = { x: Math.max(1, rect.width / 2 - frame.radius - 14), y: Math.max(1, rect.height / 2 - frame.radius - 14) };
        grip.current = { id: e.pointerId, raw: inputAngle({ x: e.clientX, y: e.clientY }, centre, radii), centre, radii, target: e.currentTarget };
        setHeld(true); e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => {
        const g = grip.current; if (!g || g.id !== e.pointerId) return;
        const raw = inputAngle({ x: e.clientX, y: e.clientY }, g.centre, g.radii);
        if (raw !== null && g.raw !== null) put(current.current + signedTurn(g.raw, raw), true);
        g.raw = raw;
      }} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)} onClick={e => e.preventDefault()}
      onKeyDown={e => {
        if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const index = middleStations.findIndex(s => s.value === seat);
        const next = e.key === "Home" ? middleStations[0] : e.key === "End" ? middleStations.at(-1) : middleStations[Math.max(0, Math.min(middleStations.length - 1, index + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1)))];
        if (next) settle(next.value, true);
      }} />
  </div>;
}