import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { SEAT_ANGLE, type Seat } from "@/components/living-g/EarSelector";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-GY: THE RECTANGLE ON THE LOWER LOOP (Frazer, 28 Sep 2026).
 *
 * Inside communi-gy the camera is zoomed so far into the G's lower loop that
 * the whole loop is never on screen. The phone screen's perimeter is a
 * RECTANGLE sitting inside that loop, and it travels round it. Only the
 * loop's red edges near the rectangle are visible: the bottom edge at 6:00,
 * the left side from 7:30 to 10:30, the right side from 1:30 to 4:30, the
 * top edge at 12:00, and one corner of the loop while moving between them.
 * Those edges are the track.
 *
 *   GEOMETRY   The rectangle is the screen inset by INSET, half extents
 *              (a, b). The loop is the same rounded rectangle scaled by
 *              LOOP_SCALE about its own centre. At clock angle θ the
 *              rectangle touches the loop at P(θ): the point where the ray
 *              from the rectangle's centre at θ meets its perimeter. The loop
 *              point at θ is the same ray on the loop, so the rectangle's
 *              centre sits at L(θ) − P(θ) in loop space, and on the straight
 *              stretches the touching edge is flush with the loop. The
 *              rectangle is the screen, so the loop is what moves on screen.
 *   ALWAYS RED The loop, the toggle and the rectangle's track stay red
 *              (#E8322B) in every mode; only the text inside the rectangle
 *              takes the seat colour (the caller reads `value`).
 *   STATIONS   The wheel's seat angles (EarSelector SEAT_ANGLE, the one list):
 *              12:00 exit · 1:30 give · 3:00 lend · 4:30 trade ·
 *              6:00 everything (entry) · 7:30 fund · 9:00 borrow · 10:30 wish.
 *              12:00 is the way back to the full G (my g's seat is the exit
 *              here).
 *   TOGGLE     A hollow red ring where the rectangle meets the track (the
 *              bottom edge at 6:00). Holding and dragging it carries the whole
 *              rectangle round the loop either way; released, it settles on
 *              the nearest station. Arrow keys step station to station.
 *   DOTS       One per station on the rectangle's perimeter, placed by angle
 *              from its centre at 45° steps (so 9:00 and 3:00 sit exactly
 *              mid-side). Tapping a dot moves the rectangle there.
 */
const INSET = 16;
/** The rectangle's own corner radius (the phone's corners). */
const RADIUS = 30;
/** How many times larger than the rectangle the loop is: never all on screen. */
const LOOP_SCALE = 3;
const RING_R = 13;
const RING_W = 3.5;
const TRACK_W = 2.5;
const RED = "var(--mode-communigy)";

export type CgStation = CgMode | "exit";

/** Each station's seat on the wheel: the positions live in SEAT_ANGLE only. */
const STATION_SEAT: Record<CgStation, Seat> = {
  exit: "giver",
  give: "give",
  lend: "lend",
  trade: "trade",
  everything: "map",
  fund: "fund",
  borrow: "borrow",
  wish: "wish",
};

/** Clock degrees (0 = 12:00, clockwise) from SEAT_ANGLE's SVG radians. */
const clockOf = (s: CgStation) =>
  ((((SEAT_ANGLE[STATION_SEAT[s]] * 180) / Math.PI + 90) % 360) + 360) % 360;

const STATIONS = (Object.keys(STATION_SEAT) as CgStation[]).sort((x, y) => clockOf(x) - clockOf(y));

type Size = { w: number; h: number };
type Pt = { x: number; y: number };

/** Signed shortest turn from a to b, in degrees (−180, 180]. */
const turn = (a: number, b: number) => {
  let d = (((b - a) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
};

/**
 * Where the ray from the centre at clock angle `deg` meets a rounded
 * rectangle of half extents (hw, hh) and corner radius r (centre-relative).
 */
function rayHit(deg: number, hw: number, hh: number, r: number): Pt {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const t0 = Math.min(
    Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity,
    Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity,
  );
  const px = dx * t0;
  const py = dy * t0;
  if (Math.abs(px) <= hw - r || Math.abs(py) <= hh - r) return { x: px, y: py };
  /* In a corner: meet the corner's circle instead. */
  const cx = Math.sign(dx) * (hw - r);
  const cy = Math.sign(dy) * (hh - r);
  const dc = dx * cx + dy * cy;
  const t = dc + Math.sqrt(Math.max(0, dc * dc - (cx * cx + cy * cy) + r * r));
  return { x: dx * t, y: dy * t };
}

/** A rounded rectangle centred on the origin, as one closed path. */
function roundRect(hw: number, hh: number, r: number): string {
  return [
    `M${-hw + r} ${-hh}`,
    `H${hw - r}`,
    `A${r} ${r} 0 0 1 ${hw} ${-hh + r}`,
    `V${hh - r}`,
    `A${r} ${r} 0 0 1 ${hw - r} ${hh}`,
    `H${-hw + r}`,
    `A${r} ${r} 0 0 1 ${-hw} ${hh - r}`,
    `V${-hh + r}`,
    `A${r} ${r} 0 0 1 ${-hw + r} ${-hh}`,
    "Z",
  ].join(" ");
}

export function PerimeterToggle({
  value,
  onChange,
  onExit,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  /** 12:00 on the lower loop: back to the full G. */
  onExit: () => void;
}) {
  const box = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  /** The rectangle's clock angle on the loop (unbounded; wraps by 360). */
  const [pos, setPos] = useState(() => clockOf(value));
  const posRef = useRef(pos);
  const drag = useRef<{ id: number; moved: boolean; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Where the rectangle is heading when it is not being held. */
  const [goal, setGoal] = useState<CgStation>(value);

  useLayoutEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* A mode chosen from outside (or committed here) is where the rectangle goes. */
  useEffect(() => {
    setGoal(value);
  }, [value]);

  /* Settle on the goal, the short way round. */
  useEffect(() => {
    if (dragging) return;
    const target = posRef.current + turn(posRef.current, clockOf(goal));
    let raf = 0;
    const step = () => {
      const next = posRef.current + (target - posRef.current) * 0.2;
      if (Math.abs(target - next) < 0.05) {
        posRef.current = target;
        setPos(target);
        if (goal === "exit") onExit();
        return;
      }
      posRef.current = next;
      setPos(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onExit is a fresh closure each render
  }, [goal, dragging]);

  const geo = useMemo(() => {
    const a = Math.max(0, size.w / 2 - INSET);
    const b = Math.max(0, size.h / 2 - INSET);
    const r = Math.min(RADIUS, a, b);
    const la = a * LOOP_SCALE;
    const lb = b * LOOP_SCALE;
    /* Generous loop corners, but short enough that the rectangle's touching
       edge stays flush on every straight stretch (7:30–10:30, 1:30–4:30). */
    const lr = Math.min(la, lb) * 0.5;
    return {
      a,
      b,
      r,
      la,
      lb,
      lr,
      rect: roundRect(a, b, r),
      loop: roundRect(la, lb, lr),
      dots: STATIONS.map((s) => ({ s, p: rayHit(clockOf(s), a, b, r) })),
    };
  }, [size.w, size.h]);

  const nearest = (deg: number): CgStation => {
    let best: CgStation = "everything";
    let bestD = Infinity;
    for (const s of STATIONS) {
      const d = Math.abs(turn(deg, clockOf(s)));
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };

  const go = (s: CgStation) => {
    if (s === "exit") {
      haptics.light();
      setGoal("exit");
      return;
    }
    if (s !== value) {
      haptics.light();
      onChange(s);
    }
    setGoal(s);
  };

  /** The finger's clock angle about the rectangle's centre. */
  const fingerClock = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = e.clientX - r.left - size.w / 2;
    const y = e.clientY - r.top - size.h / 2;
    return (Math.atan2(x, -y) * 180) / Math.PI;
  };

  const cx = size.w / 2;
  const cy = size.h / 2;
  /* Where the rectangle touches the track, and where the loop therefore is. */
  const touch = rayHit(pos, geo.a, geo.b, geo.r);
  const onLoop = rayHit(pos, geo.la, geo.lb, geo.lr);
  const loopX = cx - (onLoop.x - touch.x);
  const loopY = cy - (onLoop.y - touch.y);
  const here = nearest(pos);

  return (
    <svg
      ref={box}
      className="pointer-events-none absolute inset-0 z-30"
      width={size.w}
      height={size.h}
      data-cg-perimeter=""
      data-cg-clock={(((pos % 360) + 360) % 360).toFixed(1)}
    >
      {size.w ? (
        <>
          {/* THE RECTANGLE: the phone's perimeter, a quiet hairline. */}
          <path
            d={geo.rect}
            transform={`translate(${cx} ${cy})`}
            fill="none"
            stroke="var(--world-ink)"
            strokeOpacity={0.14}
            strokeWidth={1}
            data-cg-rect=""
          />
          {/* THE LOWER LOOP, zoomed in and closed: only its edge near the
              rectangle is ever on screen. Always red. */}
          <path
            d={geo.loop}
            transform={`translate(${loopX} ${loopY})`}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_W}
            data-cg-loop=""
          />
          {/* THE STATIONS: one dot per seat at 45° steps round the rectangle. */}
          {geo.dots.map(({ s, p }) => {
            const under = Math.abs(turn(pos, clockOf(s))) < 9;
            return (
              <g key={s}>
                <circle
                  cx={cx + p.x}
                  cy={cy + p.y}
                  r={4.5}
                  fill={s === "exit" ? "var(--world-bg)" : CG_COLOUR[s]}
                  stroke={s === "exit" ? "var(--world-ink)" : "var(--world-bg)"}
                  strokeOpacity={s === "exit" ? 0.45 : 1}
                  strokeWidth={1.5}
                  opacity={under ? 0 : 0.9}
                  data-cg-dot={s}
                />
                <circle
                  cx={cx + p.x}
                  cy={cy + p.y}
                  r={22}
                  fill="transparent"
                  className="pointer-events-auto"
                  role="button"
                  aria-label={s === "exit" ? "back to the g" : s}
                  data-cg-dot-hit={s}
                  style={{ cursor: "pointer" }}
                  onClick={() => go(s)}
                />
              </g>
            );
          })}
          {/* THE TOGGLE: where the rectangle meets the track. Hollow; the red
              track runs straight through it. */}
          <g
            transform={`translate(${cx + touch.x} ${cy + touch.y})`}
            className="pointer-events-auto outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
            style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none", outline: "none" }}
            role="slider"
            tabIndex={0}
            aria-label="communi-gy mode"
            aria-valuetext={here === "exit" ? "back to the g" : here}
            data-cg-toggle=""
            onPointerDown={(e) => {
              e.stopPropagation();
              drag.current = { id: e.pointerId, moved: false, x: e.clientX, y: e.clientY };
              setDragging(true);
              (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
              d.moved = true;
              /* The finger's angle, unwrapped next to the rectangle's, so a
                 drag can go round and round either way. */
              const next = posRef.current + turn(posRef.current, fingerClock(e));
              posRef.current = next;
              setPos(next);
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              drag.current = null;
              if (d.moved) go(nearest(posRef.current));
              setDragging(false);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
            }}
            onKeyDown={(e) => {
              /* Steps through the modes; 12:00 (the exit) is not a key stop. */
              const modes = STATIONS.filter((s) => s !== "exit");
              const i = modes.indexOf(value);
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                go(modes[(i + 1) % modes.length]!);
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                go(modes[(i + modes.length - 1) % modes.length]!);
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
        </>
      ) : null}
    </svg>
  );
}
