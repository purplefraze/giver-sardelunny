import { useEffect, useRef, useState, type RefObject } from "react";

import { LIVING_G_BOX, LIVING_G_FRAME, LOOP_CENTRE } from "@/components/living-g/g-path";
import { EDGE_AIR } from "@/components/living-g/GStage";
import { toggleReach } from "@/components/living-g/g-weight";

/**
 * THE KEYBOARD RULE for the sign-in / email step.
 *
 * With the keyboard up the full-size G no longer fits above it, so the WHOLE
 * stage (the G, the circle, the toggle and the form inside the circle) is
 * scaled by ONE uniform factor on ONE wrapper — never the ring or the stem on
 * their own — until the G's full extent fits the visible area between the top
 * edge and the top of the keyboard, with EDGE_AIR (8px) above and below.
 *
 * WHAT MUST FIT is the same box GStage sizes the main G from (live toggle
 * geometry, g-weight.tsx): the toggle's reach through 12:00 (noon top,
 * y = 298 − 357.7) down to the artwork's bottom (y = 1133) — 1192.7 units —
 * so the toggle keeps its edge air even mid-drag.
 *
 * THE BASE POSE is read from an UNSCALED probe GStage (identical layout, never
 * transformed), so the numbers are exact and never read a half-finished
 * transition. The visible band comes from visualViewport (height + offsetTop):
 * every resize/scroll event recomputes on the next frame, and the wrapper's
 * transform is eased over ~250ms (keyboard timing), so the G shrinks and grows
 * WITH the keyboard as visualViewport reports it, not after.
 *
 * Two cadences: a browser that reports the keyboard in ONE jump (iOS Safari
 * usually does) gets the full 250ms ease-out, which is the keyboard's own
 * slide; a browser that STREAMS the height every frame (Android Chrome) is
 * already animating it for us, so each step only gets a one-frame (16ms) blend and
 * the G stays locked to the keyboard's edge instead of trailing behind it.
 */
export const KEYBOARD_EASE = "250ms cubic-bezier(0.25, 0.1, 0.25, 1)";
export const TRACK_EASE = "16ms linear";
/** Events closer together than this are a stream, not a jump. */
const STREAM_MS = 80;

/** The needed box, in viewBox units (same derivation as GStage). */
const NEEDED_TOP = LOOP_CENTRE.middle.y - toggleReach("middle");
const NEEDED_BOTTOM = LIVING_G_BOX.height;
const AIR = parseFloat(EDGE_AIR);

export type KeyboardFit = { s: number; tx: number; ty: number; ease: string };

const REST: KeyboardFit = { s: 1, tx: 0, ty: 0, ease: KEYBOARD_EASE };

export function useKeyboardFit(
  root: RefObject<HTMLElement | null>,
  probe: RefObject<HTMLElement | null>,
): KeyboardFit {
  const [fit, setFit] = useState<KeyboardFit>(REST);
  const last = useRef<KeyboardFit>(REST);

  useEffect(() => {
    let frame = 0;
    let lastEvent = -Infinity;
    let streaming = false;

    const apply = () => {
      frame = 0;
      const el = root.current;
      const pr = probe.current;
      if (!el || !pr) return;
      const r = el.getBoundingClientRect();
      const p = pr.getBoundingClientRect();
      if (r.height <= 0 || p.width <= 0) return;
      const vv = window.visualViewport;
      const vTop = vv ? vv.offsetTop : 0;
      const vH = vv ? vv.height : window.innerHeight;
      /* The visible band, in the root's own coordinates. */
      const top = Math.max(0, vTop - r.top);
      const bottom = Math.min(r.height, vTop + vH - r.top);

      const k = p.width / LIVING_G_FRAME.width;
      const y0 = p.top - r.top + (NEEDED_TOP - LIVING_G_FRAME.y) * k;
      const y1 = p.top - r.top + (NEEDED_BOTTOM - LIVING_G_FRAME.y) * k;
      const cx = p.left - r.left + (LOOP_CENTRE.middle.x - LIVING_G_FRAME.x) * k;

      const room = bottom - top - 2 * AIR;
      const h = y1 - y0;
      const s = room > 0 ? Math.min(1, room / h) : 1;
      let ty: number;
      if (s >= 1) {
        /* Fits as it stands: move only if the band demands it. */
        ty = 0;
        if (y0 + ty < top + AIR) ty = top + AIR - y0;
        if (y1 + ty > bottom - AIR) ty = bottom - AIR - y1;
      } else {
        /* Scaled: the extent fills the band exactly, 8px above and below. */
        ty = top + AIR - s * y0;
      }
      /* Scale about the G's own centre line: x stays centred. */
      const tx = cx * (1 - s);
      const next = { s, tx, ty, ease: streaming ? TRACK_EASE : KEYBOARD_EASE };
      const prev = last.current;
      if (
        Math.abs(prev.s - s) < 1e-4 &&
        Math.abs(prev.tx - tx) < 0.25 &&
        Math.abs(prev.ty - ty) < 0.25
      ) {
        return;
      }
      last.current = next;
      setFit(next);
    };

    const schedule = () => {
      const now = performance.now();
      streaming = now - lastEvent < STREAM_MS;
      lastEvent = now;
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (root.current) ro?.observe(root.current);
    if (probe.current) ro?.observe(probe.current);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      ro?.disconnect();
    };
  }, [root, probe]);

  return fit;
}
