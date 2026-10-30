import { useLayoutEffect, useRef, useState } from "react";
import type { Seat } from "./EarSelector";
import { anchorOrigin, type GAnchorKey } from "./g-depth";
import { tetherAt } from "./toggle-tether";

/** The toggle, kept in view inside every seat (toggle-tether.ts). */
export function ToggleTether({
  seat,
  anchor = "middle",
  centre,
  opacity = 1,
}: {
  seat: Seat;
  anchor?: GAnchorKey;
  /** The zoomed anchor's screen point as a share (0–1) of the box, when known exactly. */
  centre?: { x: number; y: number };
  opacity?: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const o = anchorOrigin(anchor);
  const fx = centre ? centre.x : o.x / 100;
  const fy = centre ? centre.y : o.y / 100;
  const t = box.w ? tetherAt(seat, box.w, box.h, fx * box.w, fy * box.h) : null;
  return (
    <svg
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 60, opacity }}
      aria-hidden="true"
      data-toggle-tether={seat}
    >
      {t ? (
        <g fill="none" stroke="var(--world-g)" strokeWidth={t.stroke} vectorEffect="non-scaling-stroke">
          <line data-tether-arm="" {...t.arm} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
          <circle data-tether-ring="" cx={t.ring.x} cy={t.ring.y} r={t.ring.r} fill="var(--world-bg)" vectorEffect="non-scaling-stroke" />
        </g>
      ) : null}
    </svg>
  );
}
