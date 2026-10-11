import { useId, useRef } from "react";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX } from "./g-path";
import { GThinMask } from "./g-weight";
import { MiddleLoopClose } from "./loop-close";
import { useScreenPaint } from "./use-screen-paint";

/** Canonical filled silhouette with projection-compensated screen paint. */
export function CanonicalPaint({colour="var(--world-g)"}:{colour?:string}) {
  const ref=useRef<SVGSVGElement|null>(null);
  const paint=useScreenPaint(ref);
  const id=useId().replace(/:/g,"");
  return <svg ref={ref} viewBox={LIVING_G_VIEWBOX} className="h-full w-full overflow-visible" data-canonical-paint="" data-visible-stroke={paint.width}>
    <defs><GThinMask id={`${id}-paint`} weight="middle" paintWidth={paint.units} /></defs>
    <g transform={LIVING_G_TRANSFORM} fill={colour}><path d={LIVING_G_PATH} mask={`url(#${id}-paint)`} /></g>
    <MiddleLoopClose weight="middle" strokeWidth={paint.width} fill={colour} />
  </svg>;
}