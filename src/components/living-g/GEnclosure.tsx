import { useEffect, useRef, useState } from "react";
import { GStage } from "./GStage";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX, G_ANCHORS, LIVING_G_FRAME, EAR_CUT, LOOP_CENTRE, RIM_PATCH, arcPath, wedgePath } from "./g-path";
import { haptics } from "@/lib/haptics";
import { type OutlinePose } from "./form-outline";
import { formKeyboardBounds } from "@/lib/form-keyboard";
import { formCamera } from "@/lib/form-camera";
import { GThinMask, G_STROKE } from "./g-weight";
import { MiddleLoopClose } from "./loop-close";

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

/** One contour/progress owner for opening, pinch, Escape and focusable return. */
export function VoiceEnclosure({ seat, children, onFold, onFoldStart }: { seat: string; children: React.ReactNode; onFold?: () => void; onFoldStart?: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const progress = useRef(0);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [geometry, setGeometry] = useState<{pose: OutlinePose; width: number; height: number} | null>(null);
  const raf = useRef(0);
  const foldRef = useRef(onFold); foldRef.current = onFold;
  const startRef = useRef(onFoldStart); startRef.current = onFoldStart;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint = (v: number) => { progress.current = v; setT(v); };
  const finish = (v: number) => { readyRef.current = v === 1; setReady(v === 1); if (v === 0) foldRef.current?.(); };
  const animate = (to: number, duration: number) => {
    cancelAnimationFrame(raf.current);
    readyRef.current = false; setReady(false);
    const from = progress.current, start = performance.now();
    const step = (now: number) => {
      const k = reduced() ? 1 : Math.min(1, (now-start)/Math.max(1,duration));
      paint(from+(to-from)*k*k*(3-2*k));
      if(k<1) raf.current=requestAnimationFrame(step); else finish(to);
    };
    raf.current=requestAnimationFrame(step);
  };
  useEffect(() => {
    const el=frame.current; if(!el)return;
    // Entry never carries an old text focus into the newly opened form.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.matches("input,textarea,[contenteditable=true]")) active.blur();
    el.focus({ preventScroll: true });
    // This is the actual live main artwork's screen transform, not GStage's
    // guessed pose or the path's baked Give ear. It remains mounted below us.
    const main=el.closest("main");
    const svg=Array.from(main?.querySelectorAll<SVGSVGElement>("svg[data-living-g]") ?? []).find(s=>!el.contains(s));
    const matrix=svg?.getScreenCTM();
    const box=el.getBoundingClientRect();
    const pose:OutlinePose=matrix ? {x:matrix.e-box.left,y:matrix.f-box.top,scale:matrix.a} : {x:0,y:0,scale:1};
    setGeometry({pose,width:box.width,height:box.height});
    // Freeze the layout box as well as the contour: Safari's keyboard can
    // resize dvh without resizing the layout viewport.
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    document.documentElement.dataset["giverForm"]="1";
    animate(1,760);
    const viewport = window.visualViewport;
    const update = () => {
      const bounds = formKeyboardBounds(box.height, viewport?.height ?? window.innerHeight, viewport?.offsetTop ?? 0, viewport?.scale ?? 1);
      el.dataset["keyboard"] = bounds.keyboard ? "1" : "0";
      el.style.setProperty("--gv-keyboard-top", `${bounds.top}px`);
      el.style.setProperty("--gv-keyboard-bottom", `${bounds.bottom}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return ()=>{cancelAnimationFrame(raf.current);viewport?.removeEventListener("resize",update);viewport?.removeEventListener("scroll",update);window.removeEventListener("resize",update);delete document.documentElement.dataset["giverForm"];};
    // Only mounting enters; mode edits do not restart the opening animation.
  }, []);
  useEffect(()=>{
    const el=frame.current;if(!el)return;
    let active=false,startDist=0,zoom=false;
    const distance=(e:TouchEvent)=>{const a=e.touches[0],b=e.touches[1];return a&&b?Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY):0;};
    const dismissKeyboard=()=>{const active=document.activeElement;if(active instanceof HTMLElement&&el.contains(active))active.blur();};
    const returnToG=()=>{dismissKeyboard();startRef.current?.();animate(0,360*progress.current);};
    const start=(e:TouchEvent)=>{
      if(e.touches.length!==2||active||!readyRef.current)return;
      if((e.target as Element)?.closest("input,textarea,select,button"))return;
      startDist=distance(e);if(startDist<30)return;
      active=true;zoom=false;
      dismissKeyboard();
    };
    const move=(e:TouchEvent)=>{
      if(!active||e.touches.length!==2)return;
      const delta=startDist-distance(e);
      // Outward/browser magnification is not commandeered by the form.
      if(delta < -8)zoom=true;
      if(zoom||delta<8)return;
      if(readyRef.current){startRef.current?.();cancelAnimationFrame(raf.current);readyRef.current=false;setReady(false);}
      e.preventDefault();paint(1-Math.max(0,Math.min(1,delta/(startDist*.55))));
    };
    const end=(e:TouchEvent)=>{if(!active||e.touches.length>=2)return;active=false;if(zoom||readyRef.current)return;animate(progress.current<.55?0:1,240);};
    const cancel=()=>{if(!active)return;active=false;animate(1,240);};
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();returnToG();}};
    const request=()=>returnToG();
    el.addEventListener("touchstart",start,{passive:true});el.addEventListener("touchmove",move,{passive:false});el.addEventListener("touchend",end);el.addEventListener("touchcancel",cancel);el.addEventListener("giver:fold",request);window.addEventListener("keydown",key);
    return()=>{el.removeEventListener("touchstart",start);el.removeEventListener("touchmove",move);el.removeEventListener("touchend",end);el.removeEventListener("touchcancel",cancel);el.removeEventListener("giver:fold",request);window.removeEventListener("keydown",key);};
  },[]);
  const camera=geometry?formCamera(t,geometry.pose,geometry.width,geometry.height):null;
  return <div ref={frame} tabIndex={-1} className="gv-frame gv-morph-frame outline-none" data-seat={seat} data-world={seat} data-voice-frame="" data-unfold-ready={ready?"1":"0"} data-fold={(1-t).toFixed(3)}>
    {geometry ? <svg className="gv-outline" width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true" data-g-unpretzel="">
      <defs>
        <GThinMask id="form-canonical-thin" weight="middle" />
        <mask id="form-canonical-earcut" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1600" height="2000">
          <rect x="-400" y="-400" width="1600" height="2000" fill="var(--spatial-mask-on)" />
          <path d={wedgePath(LOOP_CENTRE.middle,EAR_CUT.a0,EAR_CUT.a1,EAR_CUT.r0,EAR_CUT.r1)} fill="var(--spatial-mask-off)" />
        </mask>
      </defs>
      {camera?<g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`} data-form-camera="">
        <g mask="url(#form-canonical-earcut)"><g transform={LIVING_G_TRANSFORM} fill="var(--world-g)"><path d={LIVING_G_PATH} mask="url(#form-canonical-thin)" data-form-canonical="" /></g></g>
        <path d={arcPath(LOOP_CENTRE.middle,RIM_PATCH.a0,RIM_PATCH.a1,RIM_PATCH.rMid)} fill="none" stroke="var(--world-g)" strokeWidth={G_STROKE.middle} />
        <MiddleLoopClose weight="middle" />
      </g>:null}
    </svg> : null}
    <div className="gv-review-content" inert={!ready}>{children}</div>
  </div>;
}
