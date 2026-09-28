import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { SEAT_ANGLE, type Seat } from "@/components/living-g/EarSelector";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-GY: THE CURVED TRACK ON THE LOWER LOOP (Frazer, 28 Sep 2026).
 *
 * Inside communi-gy the camera is zoomed into the G's lower loop: a red
 * circle wider than the phone, so the whole loop is never on screen. The
 * track is that loop's own curve. The toggle knob slides along the arc, the
 * screen frame travels with the knob, and the stations sit on the same arc.
 *
 *   ARC        The lower loop is a circle of radius R. The knob at clock
 *              angle θ (0 = 12:00, clockwise) sits at C + R·(sin θ, −cos θ).
 *              Every station is on that circle at its seat angle, so the dots
 *              are evenly spaced along the curve, 45° (R·π/4) apart.
 *   ZOOM       R is as large as it can be while the knob's two neighbouring
 *              dots (θ ± 45°) still fit across the screen at 6:00 and 12:00,
 *              where the arc runs across the narrow width:
 *              R = (w/2 − INSET) / sin 45°. That keeps the circle wider than
 *              the screen (never all on screen) and the nearby dots in view.
 *   FRAME      The screen is the frame, so the loop is what moves: for each θ
 *              the arc from θ − 45° to θ + 45° (knob plus both neighbours) is
 *              fitted inside the screen, inset by INSET, and pushed as far as
 *              it goes towards the loop's outside (the direction of θ). At
 *              6:00 the knob is at the bottom centre, at 9:00 mid left, at
 *              3:00 mid right, at 12:00 top centre; in between it eases along
 *              an inner path. The knob's screen position is a smooth function
 *              of θ, and the circle's centre follows as C = knob − R·u(θ).
 *   ALWAYS RED The loop, the toggle and the track stay red (#E8322B) in every
 *              mode; only the text inside the frame takes the seat colour
 *              (the caller reads `value`).
 *   STATIONS   The wheel's seat angles (EarSelector SEAT_ANGLE, the one list):
 *              12:00 exit · 1:30 give · 3:00 lend · 4:30 trade ·
 *              6:00 everything (entry) · 7:30 fund · 9:00 borrow · 10:30 wish.
 *              12:00 is the way back to the full G (my g's seat is the exit
 *              here).
 *   TOGGLE     A hollow red ring on the arc; the red track runs through it.
 *              Holding and dragging it slides it round the curve either way,
 *              and the frame (the view) goes with it; released, it settles on
 *              the nearest station. The finger's angle about the screen
 *              centre picks the point on the knob's path at that same angle,
 *              so the knob stays on the finger's line. Arrow keys step
 *              station to station (12:00 is not a key stop).
 *   DOTS       One per station on the arc, panning with it. Tapping a dot
 *              slides the knob there; the 12:00 dot exits.
 */
const INSET = 16;
/** The frame's own corner radius (the phone's corners). */
const RADIUS = 30;
/** Half the arc kept on screen around the knob: its neighbouring stations. */
const REACH = 45;
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

const RAD = Math.PI / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;

/** Signed shortest turn from a to b, in degrees (−180, 180]. */
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};

/** The outward unit vector at clock angle `deg` (screen y points down). */
const unit = (deg: number): Pt => ({ x: Math.sin(deg * RAD), y: -Math.cos(deg * RAD) });

/**
 * Where the knob sits on screen at clock angle `deg`: the arc deg ± REACH
 * (knob and both neighbouring dots) fitted inside the inset screen, pushed
 * towards the loop's outside. Continuous in `deg`.
 */
function knobAt(deg: number, R: number, w: number, h: number): Pt {
  const u = unit(deg);
  const has = (a: number) => Math.abs(turn(deg, a)) <= REACH;
  const s0 = Math.sin((deg - REACH) * RAD);
  const s1 = Math.sin((deg + REACH) * RAD);
  const c0 = Math.cos((deg - REACH) * RAD);
  const c1 = Math.cos((deg + REACH) * RAD);
  const sMax = has(90) ? 1 : Math.max(s0, s1);
  const sMin = has(270) ? -1 : Math.min(s0, s1);
  const cMax = has(0) ? 1 : Math.max(c0, c1);
  const cMin = has(180) ? -1 : Math.min(c0, c1);
  /* The arc's extent relative to the knob, and so where the knob may go. */
  const xLo = INSET - R * (sMin - u.x);
  const xHi = w - INSET - R * (sMax - u.x);
  const yLo = INSET - R * (-u.y - cMax);
  const yHi = h - INSET - R * (-u.y - cMin);
  return {
    x: xLo + ((xHi - xLo) * (1 + u.x)) / 2,
    y: yLo + ((yHi - yLo) * (1 + u.y)) / 2,
  };
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
  /** The knob's clock angle on the loop (unbounded; wraps by 360). */
  const [pos, setPos] = useState(() => clockOf(value));
  const posRef = useRef(pos);
  const drag = useRef<{ id: number; moved: boolean; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Where the knob is heading when it is not being held. */
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

  /* A mode chosen from outside (or committed here) is where the knob goes. */
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
    const { w, h } = size;
    const a = Math.max(0, w / 2 - INSET);
    const b = Math.max(0, h / 2 - INSET);
    const r = Math.min(RADIUS, a, b);
    /* The loop's radius: its two neighbouring dots just fit across the
       narrower way at 6:00 and 12:00 (and 3:00 and 9:00, on a wide screen). */
    const R = Math.max(0, Math.min(a, b) / Math.sin(REACH * RAD));
    /* The knob's path round the screen, sampled, with its angle about the
       screen centre (monotonic), so a finger's angle maps back to θ. */
    const STEP = 0.5;
    const table: { deg: number; at: number }[] = [];
    let last = 0;
    for (let deg = 0; deg <= 360; deg += STEP) {
      const k = knobAt(deg, R, w, h);
      let at = wrap((Math.atan2(k.x - w / 2, -(k.y - h / 2)) * 180) / Math.PI);
      if (deg === 0) at = 0;
      else if (deg === 360) at = 360;
      else if (at < last - 180) at += 360;
      last = at;
      table.push({ deg, at });
    }
    return { a, b, r, R, table, rect: roundRect(a, b, r) };
  }, [size]);

  /** Clock angle θ whose knob lies on the screen-centre ray at `at` degrees. */
  const clockForScreenAngle = (at: number) => {
    const t = geo.table;
    const x = wrap(at);
    let lo = 0;
    let hi = t.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (t[mid]!.at <= x) lo = mid;
      else hi = mid;
    }
    const p = t[lo]!;
    const q = t[hi]!;
    const f = q.at > p.at ? (x - p.at) / (q.at - p.at) : 0;
    return p.deg + (q.deg - p.deg) * Math.min(1, Math.max(0, f));
  };

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

  /** The finger's angle about the screen centre. */
  const fingerAngle = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = e.clientX - r.left - size.w / 2;
    const y = e.clientY - r.top - size.h / 2;
    return (Math.atan2(x, -y) * 180) / Math.PI;
  };

  /* The knob on screen, and so where the loop (and its centre) is. */
  const knob = knobAt(pos, geo.R, size.w, size.h);
  const u = unit(pos);
  const centre = { x: knob.x - geo.R * u.x, y: knob.y - geo.R * u.y };
  const cx = size.w / 2;
  const cy = size.h / 2;
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
          {/* THE FRAME: the phone's perimeter, a quiet hairline. It is the
              screen, so it stays put and the loop moves under it. */}
          <path
            d={geo.rect}
            transform={`translate(${cx} ${cy})`}
            fill="none"
            stroke="var(--world-ink)"
            strokeOpacity={0.14}
            strokeWidth={1}
            data-cg-rect=""
          />
          {/* THE LOWER LOOP, zoomed in and closed: a circle wider than the
              screen, panning as the knob slides. The track. Always red. */}
          <circle
            cx={centre.x}
            cy={centre.y}
            r={geo.R}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_W}
            data-cg-loop=""
          />
          {/* THE STATIONS: one dot per seat on the arc, 45° apart. */}
          {STATIONS.map((s) => {
            const p = unit(clockOf(s));
            const x = centre.x + geo.R * p.x;
            const y = centre.y + geo.R * p.y;
            const under = Math.abs(turn(pos, clockOf(s))) < 9;
            return (
              <g key={s}>
                <circle
                  cx={x}
                  cy={y}
                  r={4.5}
                  fill={s === "exit" ? "var(--world-bg)" : CG_COLOUR[s]}
                  stroke={s === "exit" ? "var(--world-ink)" : "var(--world-bg)"}
                  strokeOpacity={s === "exit" ? 0.45 : 1}
                  strokeWidth={1.5}
                  opacity={under ? 0 : 0.9}
                  data-cg-dot={s}
                />
                <circle
                  cx={x}
                  cy={y}
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
          {/* THE TOGGLE: the knob on the arc. Hollow; the red track runs
              through it. */}
          <g
            transform={`translate(${knob.x} ${knob.y})`}
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
              /* The point on the knob's path at the finger's angle, unwrapped
                 next to the knob's, so a drag can go round and round either
                 way. */
              const next =
                posRef.current + turn(posRef.current, clockForScreenAngle(fingerAngle(e)));
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
