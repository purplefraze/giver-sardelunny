import { useEffect } from "react";

/**
 * ONE STABLE CANVAS HEIGHT, EVEN ON ANDROID CHROME.
 *
 * `100dvh` is re-evaluated while the address bar collapses, which on Android
 * re-lays-out the Living G mid-animation. The canvas therefore reads a single
 * CSS variable that we write from the real viewport height, updated on a frame
 * boundary only. `visualViewport` is preferred because it is the one measure
 * that already excludes the browser UI and the on-screen keyboard.
 */
export function useAppHeight() {
  useEffect(() => {
    const root = document.documentElement;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const vv = window.visualViewport;
      const h = Math.round(vv ? vv.height : window.innerHeight);
      if (h > 0) root.style.setProperty("--app-h", `${h}px`);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);
}
