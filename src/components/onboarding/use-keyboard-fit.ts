import { useLayoutEffect, type RefObject } from "react";
import { signInCanvasSize } from "@/lib/signin-canvas";

/** Local sizing only: neither GStage nor other forms inherit this keyboard policy. */
export function useSignInCanvas(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const initial = el.getBoundingClientRect();
    let canvas = { width: initial.width, height: initial.height };
    const parent = el.parentElement;
    const apply = () => {
      const vv = window.visualViewport;
      if (vv && Math.abs(vv.scale - 1) > .01) return;
      const width = parent?.clientWidth ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      canvas = signInCanvasSize(canvas, { width, height });
      el.style.width = `${canvas.width}px`;
      el.style.height = `${canvas.height}px`;
      el.style.minHeight = `${canvas.height}px`;
      // GStage's height limit must read the SAME stable local canvas.
      el.style.setProperty("--app-h", `${canvas.height}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("pageshow", apply);
    window.visualViewport?.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("pageshow", apply);
      window.visualViewport?.removeEventListener("resize", apply);
    };
  }, [root]);
}
