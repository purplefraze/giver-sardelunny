import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Seat } from "./EarSelector";
import { LIVING_G_FRAME, LOOP_CENTRE } from "./g-path";
import { loopCopyFor } from "@/data/loop-copy";
import { loopInk } from "@/lib/loop-ink";

/**
 * THE LOOP LABEL — ONE component, ONE token set, for all seven states
 * (give, lend, trade, fund, borrow, wish, my g). There are no per-seat
 * overrides anywhere: the seat changes only the WORDS (loop-copy.ts) and the
 * COLOUR, and the colour comes from one formula (loopInk: the seat's
 * --mode-* colour, darkened by OKLCH lightness only to 3:1 on white).
 */
export const LOOP_LABEL = {
  fontFamily: "var(--giver-font)",
  /** Regular. 500 was tried and read heavier than the brief; 400 holds up. */
  weight: 400,
  /** One CSS-pixel size at every screen width (converted to SVG units). */
  sizePx: 16,
  lineHeight: 1,
  /** One line, always: SVG text never wraps, and nothing here splits it. */
  maxLines: 1,
  tracking: "0.02em",
  /** Where each label sits: the true centre of its own loop. */
  anchor: { top: LOOP_CENTRE.middle, bottom: LOOP_CENTRE.bottom },
  fadeMs: 180,
  easing: "ease",
} as const;

/** SVG units per CSS pixel for the G this label lives in (layout box, no transforms). */
function useUnitsPerPx(ref: React.RefObject<SVGGElement | null>) {
  /* Default: the 390px phone (the G's stage is 758 units across the screen). */
  const [upp, setUpp] = useState(758 / 390);
  useLayoutEffect(() => {
    const svg = ref.current?.ownerSVGElement;
    if (!svg) return;
    const measure = () => {
      const w = svg.clientWidth || svg.getBoundingClientRect().width;
      if (w > 0) setUpp(LIVING_G_FRAME.width / w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [ref]);
  return upp;
}

/** The seat's app-wide colour, read from the one source (:root --mode-*). */
function seatHex(seat: Seat): string | null {
  if (typeof window === "undefined") return null;
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--mode-${seat}`).trim();
  return /^#[0-9a-f]{3,8}$/i.test(v) ? v : null;
}

type Shown = { key: number; seat: Seat; leaving: boolean };

/**
 * Both loops' labels for the current seat. On a seat change the old pair
 * fades out while the new pair fades in (opacity only, LOOP_LABEL.fadeMs);
 * under reduced motion the swap is instant (the global reduced-motion rule
 * collapses the animation). Purely visual: pointer events pass through to the
 * loops' existing tap targets.
 */
export function LoopLabels({ seat }: { seat: Seat }) {
  const root = useRef<SVGGElement | null>(null);
  const upp = useUnitsPerPx(root);
  const next = useRef(1);
  const [shown, setShown] = useState<Shown[]>([{ key: 0, seat, leaving: false }]);

  useEffect(() => {
    setShown((prev) => {
      const current = prev.find((s) => !s.leaving);
      if (current?.seat === seat) return prev;
      return [
        ...prev.filter((s) => !s.leaving).map((s) => ({ ...s, leaving: true })),
        { key: next.current++, seat, leaving: false },
      ];
    });
    const t = window.setTimeout(
      () => setShown((prev) => prev.filter((s) => !s.leaving)),
      LOOP_LABEL.fadeMs + 40,
    );
    return () => window.clearTimeout(t);
  }, [seat]);

  const size = LOOP_LABEL.sizePx * upp;
  const style: React.CSSProperties = {
    fontFamily: LOOP_LABEL.fontFamily,
    fontWeight: LOOP_LABEL.weight,
    fontSize: size,
    lineHeight: LOOP_LABEL.lineHeight,
    letterSpacing: LOOP_LABEL.tracking,
    textTransform: "lowercase",
    whiteSpace: "pre",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  };

  return (
    <g ref={root} pointerEvents="none" aria-hidden="true">
      {shown.map(({ key, seat: s, leaving }) => {
        const copy = loopCopyFor(s);
        const hex = seatHex(s);
        const fill = hex ? loopInk(hex) : "var(--world-text)";
        return (
          <g
            key={key}
            className="loop-label"
            data-leaving={leaving || undefined}
            style={{
              animation: `${leaving ? "loop-label-out" : "loop-label-in"} ${LOOP_LABEL.fadeMs}ms ${LOOP_LABEL.easing} both`,
            }}
          >
            {(["top", "bottom"] as const).map((loop) => (
              <text
                key={loop}
                data-loop={loop}
                x={LOOP_LABEL.anchor[loop].x}
                y={LOOP_LABEL.anchor[loop].y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={fill}
                style={style}
              >
                {(loop === "top" ? copy.middle : copy.bottom).toLowerCase()}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}
