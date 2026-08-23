import { useCallback, useEffect, useRef, useState } from "react";
import { GDepthLevel } from "./GDepthLevel";
import { PINCH, isEditingTarget, type GDepthSlot } from "./g-depth";
import { haptics } from "@/lib/haptics";

/**
 * THE PERSISTENT LIVING G ENVIRONMENT.
 *
 * The G root is always underneath. Every destination handed to this stack is a
 * DEPTH of that same G: the camera moves inward toward the region that was
 * touched, the artwork unfurls into the frame around the new content, and the
 * previous depth stays exactly where it was, one step further away.
 *
 * Going back — by the back control, or by pinching outward — runs the identical
 * movement in reverse, so the person always knows where they came from.
 */

export function GDepthStack({
  slots,
  onPop,
  gestures = true,
}: {
  /** Destinations in canonical depth order — deeper ones later in the list. */
  slots: GDepthSlot[];
  /** Leave the deepest open destination (identical to its own back control). */
  onPop: (id: string) => void;
  gestures?: boolean;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  /** Live pinch progress on the deepest depth (0..1). */
  const [retreat, setRetreat] = useState(0);

  const openIds = slots.filter((s) => s.open).map((s) => s.id);
  const deepest = openIds.length ? openIds[openIds.length - 1]! : null;

  const pop = useRef<(() => void) | null>(null);
  pop.current = deepest ? () => onPop(deepest) : null;

  const leave = useCallback(() => {
    const run = pop.current;
    if (!run) return;
    haptics.exit();
    setRetreat(0);
    run();
  }, []);

  /* A DEPTH SETTLES BACK the moment it is no longer the deepest one. */
  useEffect(() => {
    setRetreat(0);
  }, [deepest]);

  useEffect(() => {
    const el = root.current;
    if (!el || !gestures) return;

    /* TWO FINGERS SPREADING = ZOOMING BACK OUT. One finger is always a scroll. */
    const points = new Map<number, { x: number; y: number }>();
    let start = 0;
    let fired = false;

    const spread = () => {
      const [a, b] = [...points.values()];
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || isEditingTarget(e.target)) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 2) {
        start = spread();
        fired = false;
      }
    };

    const move = (e: PointerEvent) => {
      if (!points.has(e.pointerId)) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size !== 2 || !start || fired || !pop.current) return;
      const ratio = spread() / start;
      if (ratio <= 1) {
        setRetreat(0);
        return;
      }
      const progress = Math.min((ratio - 1) / (PINCH.ratio - 1), 1);
      setRetreat(progress * PINCH.retreat);
      if (ratio >= PINCH.ratio) {
        fired = true;
        leave();
      }
    };

    const up = (e: PointerEvent) => {
      points.delete(e.pointerId);
      if (points.size < 2) {
        start = 0;
        setRetreat(0);
      }
    };

    /* TRACKPAD PINCH ON DESKTOP arrives as a ctrl-wheel; ordinary scrolling and
       ordinary wheel events are never touched. */
    let travelled = 0;
    let restore: ReturnType<typeof setTimeout> | null = null;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !pop.current || isEditingTarget(e.target)) return;
      e.preventDefault();
      // deltaY < 0 is a pinch outward (zoom out of this depth).
      travelled += -e.deltaY;
      if (travelled <= 0) {
        travelled = 0;
        setRetreat(0);
        return;
      }
      setRetreat(Math.min(travelled / 90, 1) * PINCH.retreat);
      if (restore) clearTimeout(restore);
      restore = setTimeout(() => {
        travelled = 0;
        setRetreat(0);
      }, 220);
      if (travelled > 90) {
        travelled = 0;
        leave();
      }
    };

    el.addEventListener("pointerdown", down, { passive: true });
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerup", up, { passive: true });
    el.addEventListener("pointercancel", up, { passive: true });
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      if (restore) clearTimeout(restore);
    };
  }, [gestures, leave]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {slots.map((slot) => {
        const index = openIds.indexOf(slot.id);
        /* Closed depths keep the depth they had, so the fold back is exact. */
        const depth = index >= 0 ? index + 1 : openIds.length + 1;
        const above = index >= 0 ? openIds.length - 1 - index : 0;
        return (
          <div key={slot.id} className={slot.open ? "pointer-events-auto" : "pointer-events-none"}>
            <GDepthLevel
              open={slot.open}
              depth={depth}
              above={above}
              {...(slot.anchor ? { anchor: slot.anchor } : {})}
              {...(slot.world ? { world: slot.world } : {})}
              retreat={index >= 0 && above === 0 ? retreat : 0}
            >
              {slot.children}
            </GDepthLevel>
          </div>
        );
      })}
    </div>
  );
}
