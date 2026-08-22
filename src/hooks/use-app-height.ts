import { useEffect } from "react";

/**
 * ONE STABLE CANVAS SIZE, ON BOTH IPHONE AND ANDROID.
 *
 * `100dvh` is re-evaluated while the address bar collapses, which re-lays-out
 * the Living G mid-animation. The canvas therefore reads CSS variables that we
 * write from the real viewport, updated on a frame boundary only.
 *
 * `visualViewport` is preferred because it is the one measure that already
 * excludes browser UI — but it ALSO shrinks when the on-screen keyboard opens.
 * A keyboard must never resize the artwork, so a large sudden shrink while a
 * field is focused is ignored and the last stable height is kept. Orientation
 * changes are real, so any change while nothing is focused is accepted.
 */
export function useAppHeight() {
  useEffect(() => {
    const root = document.documentElement;

    let frame = 0;
    let stable = 0;

    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const apply = () => {
      frame = 0;
      const vv = window.visualViewport;
      const h = Math.round(vv ? vv.height : window.innerHeight);
      const w = Math.round(vv ? vv.width : window.innerWidth);
      if (h <= 0) return;

      // A keyboard-sized shrink is not a new canvas: keep the last stable one.
      const keyboard = stable > 0 && h < stable - 120 && typing();
      if (!keyboard) stable = h;

      root.style.setProperty("--app-h", `${stable}px`);
      if (w > 0) root.style.setProperty("--app-w", `${w}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    // iOS moves the visual viewport (rather than resizing it) when the keyboard
    // or the URL bar animates; re-measure so the canvas never drifts.
    window.visualViewport?.addEventListener("scroll", schedule);
    // Coming back from a background tab on iOS can restore a stale height.
    window.addEventListener("pageshow", schedule);
    document.addEventListener("focusout", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, []);
}
