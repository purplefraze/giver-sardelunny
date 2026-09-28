import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-GY'S PERIMETER TOGGLE — the minimal version.
 *
 * Inside communi-gy the frame LOCKS TO RED: a thin red border runs round the
 * whole view (the bottom loop, opened). A toggle ring — the G's piece, scaled
 * down, riding ON the border the way the G's ring rides its orbit — travels
 * that border and browses the modes, one station each, clockwise from 12:00 in the
 * wheel's spectrum order (everything · give · lend · trade · fund · borrow ·
 * wish). The border and the ring stay red; only the interior text switches to
 * the mode colour (the caller reads `value`).
 *
 * Same rules as the G's toggle:
 *   ALWAYS HOLLOW    the ring's inside is negative space at every station,
 *                    parked or moving (the border runs straight through it).
 *                    It is never filled.
 *   DRAG             the finger carries it round the border (projected onto
 *                    the perimeter, the short way round); released, it snaps
 *                    to the nearest station.
 *   TAP              a station's dot (or its 44px target) selects it.
 *   KEYS             arrow keys step station to station.
 */
const INSET = 10;
const RADIUS = 30;
const RING_R = 13;
const RING_W = 3.5;
const BORDER_W = 2.5;
const RED = "var(--mode-communigy)";

type Size = { w: number; h: number };

/** A rounded rectangle as one closed path, starting at top centre, clockwise. */
function perimeterPath({ w, h }: Size): string {
  const x0 = INSET;
  const y0 = INSET;
  const x1 = w - INSET;
  const y1 = h - INSET;
  const r = RADIUS;
  const cx = w / 2;
  return [
    `M${cx} ${y0}`,
    `H${x1 - r}`,
    `A${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
    `V${y1 - r}`,
    `A${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
    `H${x0 + r}`,
    `A${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
    `V${y0 + r}`,
    `A${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
    "Z",
  ].join(" ");
}

export function PerimeterToggle({
  modes,
  value,
  onChange,
}: {
  modes: CgMode[];
  value: CgMode;
  onChange: (next: CgMode) => void;
}) {
  const box = useRef<SVGSVGElement | null>(null);
  const pathEl = useRef<SVGPathElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [len, setLen] = useState(0);
  /** Position along the perimeter (px of arc, unbounded — wraps by len). */
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const drag = useRef<{ id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pathEl.current && size.w) setLen(pathEl.current.getTotalLength());
  }, [size]);

  const station = (m: CgMode) => (len * modes.indexOf(m)) / modes.length;
  const wrap = (s: number) => ((s % len) + len) % len;
  /** The short way from a to b along the loop. */
  const shortDelta = (a: number, b: number) => {
    let d = wrap(b) - wrap(a);
    if (d > len / 2) d -= len;
    if (d < -len / 2) d += len;
    return d;
  };

  /* Settle on the chosen station (animated, the short way round). */
  useEffect(() => {
    if (!len || drag.current) return;
    const target = posRef.current + shortDelta(posRef.current, station(value));
    let raf = 0;
    const step = () => {
      const next = posRef.current + (target - posRef.current) * 0.22;
      if (Math.abs(target - next) < 0.4) {
        posRef.current = target;
        setPos(target);
        return;
      }
      posRef.current = next;
      setPos(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- station() reads len/modes
  }, [value, len, dragging]);

  const pointAt = (s: number) => {
    const p = pathEl.current;
    if (!p || !len) return { x: 0, y: 0, nx: 0, ny: -1 };
    const a = p.getPointAtLength(wrap(s));
    const b = p.getPointAtLength(wrap(s + 1));
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    /* Clockwise path: the inward normal is the tangent turned right. */
    return { x: a.x, y: a.y, nx: -ty / tl, ny: tx / tl };
  };

  const nearestS = (x: number, y: number) => {
    let best = 0;
    let bestD = Infinity;
    const n = 240;
    for (let i = 0; i < n; i += 1) {
      const s = (len * i) / n;
      const p = pathEl.current!.getPointAtLength(s);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };
  const nearestMode = (s: number) => {
    let best = modes[0]!;
    let bestD = Infinity;
    for (const m of modes) {
      const d = Math.abs(shortDelta(s, station(m)));
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  };
  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const here = pointAt(pos);
  const ang = (Math.atan2(here.ny, here.nx) * 180) / Math.PI;

  return (
    <svg
      ref={box}
      className="pointer-events-none absolute inset-0 z-30"
      width={size.w}
      height={size.h}
      aria-hidden={false}
      data-cg-perimeter=""
    >
      {size.w ? (
        <>
          <path
            ref={pathEl}
            d={perimeterPath(size)}
            fill="none"
            stroke={RED}
            strokeWidth={BORDER_W}
            data-cg-border=""
          />
          {/* Station hints: small dots in each mode's colour, on the border. */}
          {len
            ? modes.map((m) => {
                const p = pointAt(station(m));
                return (
                  <g key={m}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={4.5}
                      fill={CG_COLOUR[m]}
                      stroke="var(--world-bg)"
                      strokeWidth={1.5}
                      opacity={m === value ? 0 : 0.9}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={22}
                      fill="transparent"
                      className="pointer-events-auto"
                      role="button"
                      aria-label={m}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        haptics.selection();
                        onChange(m);
                      }}
                    />
                  </g>
                );
              })
            : null}
          {/* THE PIECE: the ring, centred on the border line. Always hollow:
              the red border runs straight through it and joins it on the
              circumference. */}
          {len ? (
            <g
              transform={`translate(${here.x} ${here.y}) rotate(${ang})`}
              className="pointer-events-auto"
              style={{ cursor: "grab", touchAction: "none" }}
              role="slider"
              tabIndex={0}
              aria-label="communi-gy mode"
              aria-valuetext={value}
              onPointerDown={(e) => {
                e.stopPropagation();
                drag.current = { id: e.pointerId };
                setDragging(true);
                (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current?.id !== e.pointerId) return;
                const q = local(e);
                const s = nearestS(q.x, q.y);
                const next = posRef.current + shortDelta(posRef.current, s);
                posRef.current = next;
                setPos(next);
              }}
              onPointerUp={(e) => {
                if (drag.current?.id !== e.pointerId) return;
                drag.current = null;
                const m = nearestMode(posRef.current);
                if (m !== value) {
                  haptics.light();
                  onChange(m);
                }
                setDragging(false);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setDragging(false);
              }}
              onKeyDown={(e) => {
                const i = modes.indexOf(value);
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  onChange(modes[(i + 1) % modes.length]!);
                }
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  onChange(modes[(i + modes.length - 1) % modes.length]!);
                }
              }}
            >
              <circle
                cx={0}
                cy={0}
                r={RING_R - RING_W / 2}
                fill="none"
                stroke={RED}
                strokeWidth={RING_W}
              />
              <circle cx={0} cy={0} r={24} fill="transparent" />
            </g>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
