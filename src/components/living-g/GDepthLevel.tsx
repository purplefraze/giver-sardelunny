import { useEffect, useRef, useState } from "react";
import { GStage } from "./GStage";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX } from "./g-path";
import { CAMERA, LENS, anchorLens, anchorOrigin, levelInset, type GAnchorKey } from "./g-depth";
import { haptics } from "@/lib/haptics";

/**
 * ONE DEPTH OF THE LIVING G.
 *
 * Nothing here is a page. The SAME canonical artwork the user just touched
 * unfurls outward — the geometry is never redrawn, only scaled about the loop
 * that was pressed — until its curves grow past the viewport and the visible
 * remainder becomes the border of the screen. The content then appears INSIDE
 * that G. Going back contracts the very same artwork to exactly the scale and
 * place it came from, so the user never leaves the canvas.
 *
 * When another depth opens on top, this one is pushed a little further away and
 * veiled by its own paper: the camera has moved past it, but it is still there,
 * waiting to be zoomed back out to.
 */

type Phase = "shut" | "opening" | "in" | "closing";

export function GDepthLevel({
  open,
  depth,
  above = 0,
  anchor = "middle",
  world = "others",
  retreat = 0,
  children,
}: {
  open: boolean;
  /** 1-based position in the depth hierarchy. */
  depth: number;
  /** How many depths are currently open above this one. */
  above?: number;
  anchor?: GAnchorKey;
  /** Whose G this is — the colour comes from the world token, never a literal. */
  world?: string;
  /** Live pinch progress (0..1) while the person is zooming back outward. */
  retreat?: number;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("shut");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Nothing is felt on the very first mount — only on a real change of state. */
  const knew = useRef(false);

  /* CONTEXT IS NEVER RESET: what was inside stays inside while the G folds. */
  const held = useRef<React.ReactNode>(null);
  if (open) held.current = children;
  const inside = open ? children : held.current;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase((p) => (p === "in" ? "in" : "opening"));
      // FELT, NOT WATCHED. The unfurl and the fold each carry their own pulse,
      // fired in the same task as the tap that caused them so Android's user
      // activation still holds. Unsupported devices simply feel nothing.
      if (knew.current) haptics.enter();
      timer.current = setTimeout(() => setPhase("in"), CAMERA.openMs);
    } else {
      setPhase((p) => (p === "shut" ? "shut" : "closing"));
      if (knew.current) haptics.exit();
      timer.current = setTimeout(() => setPhase("shut"), CAMERA.closeMs);
    }
    knew.current = true;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open]);

  if (phase === "shut" && !open) return null;

  const unfurled = phase === "opening" ? open : phase === "in";
  const ms = open ? CAMERA.openMs : CAMERA.closeMs;
  const ease = open ? CAMERA.openEase : CAMERA.closeEase;
  /** Only promote the big artwork layer while it is actually moving. */
  const moving = phase === "opening" || phase === "closing";
  const origin = anchorOrigin(anchor);
  const inset = levelInset(depth);

  /* THE CAMERA HAS MOVED PAST THIS DEPTH: further away, and slightly veiled. */
  const pushed = 1 + CAMERA.push * above;
  /* PINCHING OUTWARD PULLS THE WHOLE DEPTH BACK TOWARD ITS PARENT. */
  const pull = 1 - retreat;

  return (
    <div
      data-world={world}
      data-g-depth={depth}
      className="absolute inset-0 overflow-hidden"
      style={{
        zIndex: 30 + depth,
        background: "var(--world-bg)",
        // The paper only arrives once the G has begun to open, so the swallow
        // reads as the G growing rather than a panel appearing.
        opacity: unfurled ? 1 : 0,
        transform: `scale(${pushed * pull})`,
        transformOrigin: `${origin.x}% ${origin.y}%`,
        transition: `opacity ${Math.round(ms * 0.5)}ms ease-out, transform ${
          retreat > 0 ? 90 : ms
        }ms ${ease}`,
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={!open}
    >
      {/* THE SAME ARTWORK, SIMPLY LARGER. Geometry untouched. */}
      <div
        className="pointer-events-none absolute inset-0 motion-reduce:transition-none"
        style={{
          // translateZ keeps the unfurl on the compositor on Android, where a
          // plain scale of this much artwork repaints every frame.
          transform: `translateZ(0) scale(${unfurled ? CAMERA.unfurl : 1})`,
          transformOrigin: `${origin.x}% ${origin.y}%`,
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
            animation: phase === "in" && above === 0 ? "g-alive 7200ms ease-in-out infinite" : undefined,
            transformOrigin: `${origin.x}% ${origin.y}%`,
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

      {/*
        WHAT IS INSIDE THE G — seen THROUGH the loop that was touched.
        The aperture starts as that loop's own measured negative space and widens
        with the unfurl until it is past the corners, so the first thing the eye
        catches is a fragment of the person's profile inside the G. Contracting
        runs the identical movement backwards: the content recedes into the loop.
      */}
      <div
        className="absolute overflow-hidden motion-reduce:transition-none"
        style={{
          ...inset,
          borderRadius: "2.25rem",
          clipPath: `circle(${unfurled ? lens.end : lens.start}% at ${lens.x}% ${lens.y}%)`,
          opacity: unfurled ? 1 : 0,
          transform: `scale(${unfurled ? 1 : 0.965})`,
          transition: `clip-path ${ms}ms ${ease}, opacity ${Math.round(ms * 0.55)}ms ease-out ${
            open ? Math.round(ms * 0.2) : 0
          }ms, transform ${ms}ms ${ease}`,
          pointerEvents: phase === "in" && above === 0 ? "auto" : "none",
          // The depth is dragged and pinched, not page-zoomed; scrolling inside
          // is untouched.
          touchAction: "pan-y",
        }}
      >
        {/*
          THE CAMERA'S OWN TRAVEL. Deep in the lens the content sits a little
          further away and a little off-centre; it comes level as the aperture
          opens. Nothing is draggable — the movement belongs to the transition.
        */}
        <div
          className="h-full w-full motion-reduce:transition-none motion-reduce:transform-none"
          style={{
            transform: unfurled
              ? "translate3d(0, 0, 0) scale(1)"
              : `translate3d(${((50 - lens.x) / 50) * LENS.drift}%, ${
                  ((50 - lens.y) / 50) * LENS.drift
                }%, 0) scale(${1 + LENS.depth})`,
            transformOrigin: `${lens.x}% ${lens.y}%`,
            transition: `transform ${Math.round(ms * 1.08)}ms ${ease}`,
            willChange: moving ? "transform" : "auto",
          }}
        >
          {inside}
        </div>
      </div>

      {/*
        THE RIM OF THE LENS. The G's own colour catching the edge of the aperture
        while it travels, gone the moment the movement is over. No glow, no ring
        left behind — only the sense of looking through a thick, living contour.
      */}
      <div
        className="pointer-events-none absolute motion-reduce:hidden"
        style={{
          ...inset,
          borderRadius: "2.25rem",
          overflow: "hidden",
          opacity: moving ? LENS.rim : 0,
          transition: `opacity ${Math.round(ms * 0.45)}ms ease-out`,
        }}
        aria-hidden
      >
        <div
          className="absolute rounded-full"
          style={{
            left: `${lens.x}%`,
            top: `${lens.y}%`,
            width: `${(unfurled ? lens.end : lens.start) * 2}%`,
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 2px var(--world-g) inset",
            transition: `width ${ms}ms ${ease}`,
          }}
        />
      </div>


      {/*
        THE VEIL OF DEPTH. Its own paper, thinly, so a level the camera has moved
        past recedes without ever losing its G — never a black or white wash.
      */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "var(--world-bg)",
          opacity: above > 0 ? Math.min(CAMERA.veil * above, 0.62) : 0,
          transition: `opacity ${ms}ms ${ease}`,
        }}
      />
    </div>
  );
}
