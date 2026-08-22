import { useEffect, useRef, useState } from "react";
import { GStage } from "./GStage";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX, G_ANCHORS, LIVING_G_FRAME } from "./g-path";
import { buzz } from "@/lib/haptics";

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

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase((p) => (p === "in" ? "in" : "opening"));
      buzz(12);
      timer.current = setTimeout(() => setPhase("in"), OPEN_MS);
    } else {
      setPhase((p) => (p === "shut" ? "shut" : "closing"));
      timer.current = setTimeout(() => setPhase("shut"), CLOSE_MS);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open]);

  if (phase === "shut" && !open) return null;

  const unfurled = phase === "opening" ? open : phase === "in";
  const ms = open ? OPEN_MS : CLOSE_MS;
  const ease = open ? OPEN_EASE : CLOSE_EASE;

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
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `scale(${unfurled ? SCALE : 1})`,
          transformOrigin: `${ORIGIN_X}% ${ORIGIN_Y}%`,
          transition: `transform ${ms}ms ${ease}`,
          willChange: "transform",
        }}
      >
        {/* The breathing layer must be a full-size box: it carries a transform,
            so it becomes the containing block the stage measures itself in. */}
        <div
          className="absolute inset-0"
          style={{
            animation: unfurled ? "g-alive 7200ms ease-in-out infinite" : undefined,
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
        className="absolute overflow-hidden"
        style={{
          inset: "3.2% 5.4%",
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
