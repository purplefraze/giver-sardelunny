import { useLayoutEffect, useState } from "react";

/**
 * THE G'S UNITS ↔ THE SCREEN'S PIXELS, for anything drawn inside the Living
 * G's own <svg> that must be sized in CSS px (22px type, a 4px spark) or reach
 * the screen's edges (sparks falling from the top of the screen).
 *
 * `upp` = G units per CSS pixel. `edges` = the screen's top / bottom / left /
 * right expressed in G units. Re-measured on resize. Read-only: nothing here
 * moves or resizes the G.
 */
export type SvgUnits = {
  upp: number;
  edges: { top: number; bottom: number; left: number; right: number };
};

const FALLBACK: SvgUnits = {
  /* The 390px phone: the stage is 778 units across ≈ 407px. */
  upp: 778 / 407,
  edges: { top: -270, bottom: 1340, left: -100, right: 644 },
};

export function useSvgUnits(ref: React.RefObject<SVGGraphicsElement | null>): SvgUnits {
  const [units, setUnits] = useState<SvgUnits>(FALLBACK);
  useLayoutEffect(() => {
    const el = ref.current;
    const svg = el?.ownerSVGElement;
    if (!el || !svg) return;
    const measure = () => {
      const m = el.getScreenCTM();
      if (!m || !m.a || !m.d) return;
      /* No rotation or skew on the stage: x' = a·x + e, y' = d·y + f. */
      const toX = (px: number) => (px - m.e) / m.a;
      const toY = (py: number) => (py - m.f) / m.d;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setUnits({
        upp: 1 / m.a,
        edges: { top: toY(0), bottom: toY(h), left: toX(0), right: toX(w) },
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return units;
}
