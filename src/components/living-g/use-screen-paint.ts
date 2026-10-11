import { useLayoutEffect, useState, type RefObject } from "react";
import { visibleStroke } from "./screen-paint";

/** Observe actual SVG projection, including CSS camera travel, without moving it. */
export function useScreenPaint(ref: RefObject<SVGGraphicsElement | null>) {
  const [paint, setPaint] = useState({ width: 9, scale: .53, units: 9 / .53 });
  useLayoutEffect(() => {
    let raf = 0;
    const read = () => {
      const node = ref.current;
      const matrix = node?.getScreenCTM();
      const frame = node?.closest("[data-profile-loop], [data-cg-stage], .signin, main");
      const width = frame?.clientWidth || window.innerWidth;
      const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 0;
      if (scale > 0) {
        const stroke = visibleStroke(width);
        setPaint(old => Math.abs(old.scale - scale) < .0001 && old.width === stroke ? old : { width: stroke, scale, units: stroke / scale });
      }
      raf = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return paint;
}