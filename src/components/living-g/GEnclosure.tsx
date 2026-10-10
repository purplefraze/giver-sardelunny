import { useEffect, useRef, useState } from "react";
import { GStage } from "./GStage";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX, G_ANCHORS, LIVING_G_FRAME } from "./g-path";
import { haptics } from "@/lib/haptics";

/**
 * GOING INSIDE A LIVING G.
 *
 * Nothing here is a page. The SAME canonical artwork the user just touched
 * unfurls outward — the geometry is never redrawn, only scaled about the loop
 * that was pressed — until its curves grow past the viewport and the visible
 * remainder becomes the border of the screen. The content then appears INSIDE
 * that G. Backing out contracts the very same artwork to exactly the scale and
 * place it came from, so the user never leaves the canvas.
 */

/**
 * How far the artwork unfurls. Chosen so the middle loop's rim leaves the left
 * and right edges while its arcs stay visible top and bottom — the G frames the
 * screen instead of vanishing off it.
 */
const SCALE = 2.62;

const OPEN_MS = 760;
const CLOSE_MS = 520;
/** Breathing, not sliding: an organic ease with a whisper of overshoot. */
const OPEN_EASE = "cubic-bezier(0.16, 1.02, 0.24, 1)";
const CLOSE_EASE = "cubic-bezier(0.5, 0, 0.72, 0.32)";

/** The pressed loop stays exactly where it is; the G grows around it. */
const ORIGIN_X = ((G_ANCHORS.upperRing.x - LIVING_G_FRAME.x) / LIVING_G_FRAME.width) * 100;
const ORIGIN_Y = ((G_ANCHORS.upperRing.y - LIVING_G_FRAME.y) / LIVING_G_FRAME.height) * 100;

type Phase = "shut" | "opening" | "in" | "closing";

export function GEnclosure({
  open,
  world = "others",
  children,
}: {
  open: boolean;
  /** Whose G this is — the colour comes from the world token, never a literal. */
  world?: string;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("shut");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Nothing is felt on the very first mount — only on a real change of state. */
  const knew = useRef(false);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase((p) => (p === "in" ? "in" : "opening"));
      // FELT, NOT WATCHED. The unfurl and the fold each carry their own pulse,
      // fired in the same task as the tap that caused them so Android's user
      // activation still holds. Unsupported devices simply feel nothing.
      if (knew.current) haptics.enter();
      timer.current = setTimeout(() => setPhase("in"), OPEN_MS);
    } else {
      setPhase((p) => (p === "shut" ? "shut" : "closing"));
      if (knew.current) haptics.exit();
      timer.current = setTimeout(() => setPhase("shut"), CLOSE_MS);
    }
    knew.current = true;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open]);


  if (phase === "shut" && !open) return null;

  const unfurled = phase === "opening" ? open : phase === "in";
  const ms = open ? OPEN_MS : CLOSE_MS;
  const ease = open ? OPEN_EASE : CLOSE_EASE;
  /** Only promote the big artwork layer while it is actually moving. */
  const moving = phase === "opening" || phase === "closing";

  return (
    <div
      data-world={world}
      className="absolute inset-0 z-30 overflow-hidden"
      aria-hidden={!open}
      style={{
        background: "var(--world-bg)",
        // The paper only arrives once the G has begun to open, so the swallow
        // reads as the G growing rather than a panel appearing.
        opacity: unfurled ? 1 : 0,
        transition: `opacity ${Math.round(ms * 0.5)}ms ease-out`,
      }}
    >
      {/* THE SAME ARTWORK, SIMPLY LARGER. Geometry untouched. */}
      <div
        className="pointer-events-none absolute inset-0 motion-reduce:transition-none"
        style={{
          // translateZ keeps the unfurl on the compositor on Android, where a
          // plain scale of this much artwork repaints every frame.
          transform: `translateZ(0) scale(${unfurled ? SCALE : 1})`,
          transformOrigin: `${ORIGIN_X}% ${ORIGIN_Y}%`,
          transition: `transform ${ms}ms ${ease}`,
          willChange: moving ? "transform" : "auto",
          backfaceVisibility: "hidden",
        }}
      >
        {/* The breathing layer must be a full-size box: it carries a transform,
            so it becomes the containing block the stage measures itself in. */}
        <div
          className="absolute inset-0 motion-reduce:animate-none"
          style={{
            // Breathing only once the G has settled: an infinite animation
            // during the unfurl fights it for the same compositor layer.
            animation: phase === "in" ? "g-alive 7200ms ease-in-out infinite" : undefined,
            transformOrigin: `${ORIGIN_X}% ${ORIGIN_Y}%`,
          }}
        >

          <GStage>
            <svg viewBox={LIVING_G_VIEWBOX} className="h-full w-full overflow-visible">
              <g transform={LIVING_G_TRANSFORM} fill="var(--world-g)">
                <path d={LIVING_G_PATH} />
              </g>
            </svg>
          </GStage>
        </div>
      </div>

      {/* WHAT IS INSIDE THE G. Dynamic: it may change without ever leaving. */}
      <div
        className="absolute overflow-hidden motion-reduce:transition-none"
        style={{
          // The G's own arcs frame the content; the safe-area insets make sure a
          // notch or a gesture bar can never sit on top of it.
          top: "max(3.2%, env(safe-area-inset-top))",
          bottom: "max(3.2%, env(safe-area-inset-bottom))",
          left: "max(5.4%, env(safe-area-inset-left))",
          right: "max(5.4%, env(safe-area-inset-right))",
          borderRadius: "2.25rem",
          opacity: unfurled ? 1 : 0,
          transform: `scale(${unfurled ? 1 : 0.965})`,
          transition: `opacity ${Math.round(ms * 0.55)}ms ease-out ${
            open ? Math.round(ms * 0.42) : 0
          }ms, transform ${ms}ms ${ease}`,
          pointerEvents: phase === "in" ? "auto" : "none",
        }}
      >
        {children}
      </div>

    </div>
  );
}

/** The canonical filled G visibly unthreads into the review's rounded rim;
 * a two-finger inward pinch drives the same morph backwards (repretzel). */
export function VoiceEnclosure({ seat, children, onFold }: { seat: string; children: React.ReactNode; onFold?: () => void }) {
  const source = useRef<SVGPathElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [morphed, setMorphed] = useState<string | null>(null);
  /* 1 = form open, 0 = full G. Drives both the outline and the content. */
  const [t, setT] = useState(0);
  const [ready, setReady] = useState(false);
  const morphRef = useRef<((t: number) => string) | null>(null);
  const foldRef = useRef(onFold);
  foldRef.current = onFold;

  /** Built from the CURRENT viewport, so rotation/resizes stay correct. */
  const build = async () => {
    const { interpolate } = await import("flubber");
    const matrix = source.current?.getScreenCTM();
    if (!matrix) return null;
    const inverse = matrix.inverse();
    const w = window.innerWidth, h = window.innerHeight;
    const rounded = (inset:number, radius:number, reverse=false) => {
      const corners = [{x:w-inset-radius,y:inset+radius,start:-90},{x:w-inset-radius,y:h-inset-radius,start:0},{x:inset+radius,y:h-inset-radius,start:90},{x:inset+radius,y:inset+radius,start:180}];
      const ring = corners.flatMap(c => Array.from({length:10},(_,i) => {const a=(c.start+i*90/9)*Math.PI/180;return {x:c.x+radius*Math.cos(a),y:c.y+radius*Math.sin(a)};}));
      return reverse ? ring.reverse() : ring;
    };
    const local = [...rounded(0,30),...rounded(10,20,true)].map(p => new DOMPoint(p.x,p.y).matrixTransform(inverse));
    const outer=local.slice(0,40), inner=local.slice(40);
    const target = `M${outer.map(p=>`${p.x},${p.y}`).join("L")}Z M${inner.map(p=>`${p.x},${p.y}`).join("L")}Z`;
    return interpolate(LIVING_G_PATH, target, {maxSegmentLength:80});
  };

  useEffect(() => {
    let dead = false, raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setT(1); setReady(true); return; }
    void build().then((morph) => {
      if (!morph || dead) return;
      morphRef.current = morph;
      const start = performance.now();
      const step = (now:number) => { if(dead) return; const k=Math.min(1,(now-start)/1150); const e=k*k*(3-2*k); setT(e); setMorphed(morph(e)); if(k<1) raf=requestAnimationFrame(step); else setReady(true); };
      raf=requestAnimationFrame(step);
    });
    const resize = () => { morphRef.current = null; };
    window.addEventListener("resize", resize);
    return () => { dead=true; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  /* PINCH TO FOLD — two fingers only; one finger scrolls/types as normal. */
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let startDist = 0, p = 0, active = false, raf = 0;
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dist = (e: TouchEvent) => { const [a, b] = [e.touches[0]!, e.touches[1]!]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
    const paint = (k: number) => { setT(1 - k); const m = morphRef.current; if (m) setMorphed(m(1 - k)); };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2 || active) return;
      active = true; startDist = dist(e) || 1; p = 0;
      cancelAnimationFrame(raf);
      /* Leaving begins: mic off now, no auto-restart, draft kept. */
      foldRef.current && (globalThis as { __giverStopMic?: () => void }).__giverStopMic?.();
      setReady(false);
      if (!morphRef.current) void build().then((m) => { if (m) morphRef.current = m; });
    };
    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length < 2) return;
      e.preventDefault();
      p = Math.max(0, Math.min(1, (startDist - dist(e)) / (startDist * 0.55)));
      if (!reduced()) paint(p);
    };
    const settle = (to: 0 | 1) => {
      const from = p, t0 = performance.now(), ms = reduced() ? 0 : 220 * Math.abs(to - from) + 60;
      const step = (now: number) => {
        const k = ms ? Math.min(1, (now - t0) / ms) : 1;
        p = from + (to - from) * (1 - (1 - k) ** 3);
        if (!reduced()) paint(p);
        if (k < 1) raf = requestAnimationFrame(step);
        else if (to === 1) foldRef.current?.();
        else { setT(1); setReady(true); }
      };
      raf = requestAnimationFrame(step);
    };
    const onEnd = (e: TouchEvent) => {
      if (!active || e.touches.length >= 2) return;
      active = false;
      settle(p > 0.45 ? 1 : 0);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); el.removeEventListener("touchcancel", onEnd); };
  }, []);

  return <div ref={frame} className="gv-frame gv-morph-frame" data-seat={seat} data-voice-frame="" data-unfold-ready={ready ? "1":"0"} data-fold={(1 - t).toFixed(2)}>
    <div className="absolute inset-0 pointer-events-none" data-g-unpretzel="" style={{ visibility: ready ? "hidden" : "visible" }}><GStage><svg viewBox={LIVING_G_VIEWBOX} className="h-full w-full overflow-visible"><path ref={source} d={morphed ?? LIVING_G_PATH} transform={LIVING_G_TRANSFORM} fill="var(--world-g)" /></svg></GStage></div>
    <div className="gv-review-content" style={ready ? undefined : { opacity: Math.max(0, (t - 0.6) / 0.4) }}>{children}</div>
  </div>;
}
