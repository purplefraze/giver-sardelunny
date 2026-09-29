import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP — LOCKED MOCK GEOMETRY (Frazer via Luna, 29 Sep 2026).
 *
 * Matches `/workspace/mocks/communi-g-slivers/`. One open crescent/sliver per
 * seat (never a full red circle). Stroke is living-G weight in SCREEN px
 * (~14.9) — zoom never fattens it. Toggle is a ~52px hollow seat-coloured
 * ring with white centre + seat name. Diagonals are exact mirrors of Fund;
 * 6:00 mirrors 12:00; 3:00 mirrors 9:00 oval. Borrow/lend may clip the
 * toggle slightly so the oval sits further in.
 *
 * Spatial: midpoint snap ~200ms; drag both ways; 12:00 exits to the full G.
 */
const SNAP_MS = 200;
/** Living-G middle weight × gPxPerUnit at 390 — fixed screen px. */
const TRACK_STROKE = 28.5 * 0.522784; // ≈ 14.90
const TOGGLE_DIAM = 52;
const TOGGLE_OUTER_R = TOGGLE_DIAM / 2;
const TOGGLE_RING = 8;
const TOGGLE_STROKE_R = TOGGLE_OUTER_R - TOGGLE_RING / 2;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
/** Design canvas the mock numbers are authored against. */
const DW = 390;
const DH = 844;
const HIT = 36;

const RED = "#E8322B";

/** Locked seat colours for this branch (mocks). */
const SEAT_COLOUR: Record<string, string> = {
  everything: "#E8322B",
  fund: "#9E4B2C",
  borrow: "#B36BFF",
  wish: "#9D00FF",
  exit: "#1E7BFF",
  give: "#4BE01E",
  lend: "#B5D334",
  trade: "#FF8A1E",
};

export type CgStation = CgMode | "exit";

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

const clockOf = (s: CgStation) =>
  ((((SEAT_ANGLE[STATION_SEAT[s]] * 180) / Math.PI + 90) % 360) + 360) % 360;

const STATIONS = (Object.keys(STATION_SEAT) as CgStation[]).sort((x, y) => clockOf(x) - clockOf(y));

const wordOf = (s: CgStation) => SEAT_TITLE[STATION_SEAT[s]];
const colourOf = (s: CgStation) => SEAT_COLOUR[s] ?? RED;

type Size = { w: number; h: number };
type Geom = {
  kind: "circle" | "oval";
  cx: number;
  cy: number;
  r: number;
  rx: number;
  ry: number;
  deg0: number;
  deg1: number;
  toggleDeg: number;
};

const RAD = Math.PI / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};
const easeOut = (u: number) => 1 - (1 - u) ** 3;

const angPt = (g: Geom, deg: number) => {
  const a = deg * RAD;
  const rx = g.kind === "oval" ? g.rx : g.r;
  const ry = g.kind === "oval" ? g.ry : g.r;
  return { x: g.cx + rx * Math.sin(a), y: g.cy - ry * Math.cos(a) };
};

/** Arc path (clock degrees, sweep CW / SVG sweep-flag 1). */
const arcPath = (g: Geom) => {
  const p0 = angPt(g, g.deg0);
  const p1 = angPt(g, g.deg1);
  const rx = g.kind === "oval" ? g.rx : g.r;
  const ry = g.kind === "oval" ? g.ry : g.r;
  let delta = wrap(g.deg1 - g.deg0);
  const large = delta > 180 ? 1 : 0;
  return `M${p0.x.toFixed(3)},${p0.y.toFixed(3)} A${rx.toFixed(3)},${ry.toFixed(3)} 0 ${large} 1 ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
};

/**
 * Mock-authored geometries at 390×844 (from communi-g-slivers render scripts).
 * Diagonals: Fund crescent R=900 into BL; Wish/Give/Trade are exact mirrors.
 * Cardinals: My G / Communi-g R=270; Borrow/Lend hard-flattened oval.
 */
const FUND_CX = 753.210;
const FUND_CY = 257.905;
const FUND_R = 900;

const GEOM_DESIGN: Record<CgStation, Geom> = {
  fund: {
    kind: "circle",
    cx: FUND_CX,
    cy: FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 200,
    deg1: 262,
    toggleDeg: 232,
  },
  wish: {
    kind: "circle",
    cx: FUND_CX,
    cy: DH - FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 278,
    deg1: 340,
    toggleDeg: 308,
  },
  give: {
    kind: "circle",
    cx: DW - FUND_CX,
    cy: DH - FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 20,
    deg1: 82,
    toggleDeg: 52,
  },
  trade: {
    kind: "circle",
    cx: DW - FUND_CX,
    cy: FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 98,
    deg1: 160,
    toggleDeg: 128,
  },
  exit: {
    kind: "circle",
    cx: 195,
    cy: 315,
    r: 270,
    rx: 270,
    ry: 270,
    deg0: 290,
    deg1: 70,
    toggleDeg: 0,
  },
  everything: {
    kind: "circle",
    cx: 195,
    cy: DH - 315,
    r: 270,
    rx: 270,
    ry: 270,
    deg0: 110,
    deg1: 250,
    toggleDeg: 180,
  },
  borrow: {
    kind: "oval",
    cx: 246,
    cy: 422,
    r: 220,
    rx: 220,
    ry: 720,
    deg0: 260.083,
    deg1: 279.917,
    toggleDeg: 270,
  },
  lend: {
    kind: "oval",
    cx: DW - 246,
    cy: 422,
    r: 220,
    rx: 220,
    ry: 720,
    deg0: 80.083,
    deg1: 99.917,
    toggleDeg: 90,
  },
};

const scaleGeom = (g: Geom, sx: number, sy: number): Geom => ({
  ...g,
  cx: g.cx * sx,
  cy: g.cy * sy,
  r: g.r * ((sx + sy) / 2),
  rx: g.rx * sx,
  ry: g.ry * sy,
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => wrap(a + turn(a, b) * t);

const lerpGeom = (a: Geom, b: Geom, t: number): Geom => {
  const kind = t < 0.5 ? a.kind : b.kind;
  return {
    kind,
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    r: lerp(a.r, b.r, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    deg0: lerpAngle(a.deg0, b.deg0, t),
    deg1: lerpAngle(a.deg1, b.deg1, t),
    toggleDeg: lerpAngle(a.toggleDeg, b.toggleDeg, t),
  };
};

export function PerimeterToggle({
  value,
  onChange,
  onExit,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  onExit: () => void;
  children?: React.ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [pos, setPos] = useState(() => clockOf(value));
  const posRef = useRef(pos);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const snappingRef = useRef(false);
  const [goal, setGoal] = useState<CgStation>(value);
  const drag = useRef<{
    id: number;
    moved: boolean;
    start: CgStation;
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setGoal(value);
  }, [value]);

  const sx = size.w ? size.w / DW : 1;
  const sy = size.h ? size.h / DH : 1;

  const designAt = (s: CgStation) => scaleGeom(GEOM_DESIGN[s], sx, sy);

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

  const neighbour = (s: CgStation, dir: 1 | -1): CgStation => {
    const i = STATIONS.indexOf(s);
    return STATIONS[(i + dir + STATIONS.length) % STATIONS.length]!;
  };

  /** Geometry at abstract clock angle — lerp between neighbouring seats. */
  const geomAt = (deg: number): Geom => {
    const here = nearest(deg);
    const i = STATIONS.indexOf(here);
    const prev = STATIONS[(i - 1 + STATIONS.length) % STATIONS.length]!;
    const next = STATIONS[(i + 1) % STATIONS.length]!;
    const cHere = clockOf(here);
    const dPrev = Math.abs(turn(deg, clockOf(prev)));
    const dNext = Math.abs(turn(deg, clockOf(next)));
    const dHere = Math.abs(turn(deg, cHere));
    // Blend toward the closer neighbour when past the seat.
    if (dHere < 0.05) return designAt(here);
    const toward = dPrev < dNext ? prev : next;
    const span = Math.abs(turn(cHere, clockOf(toward)));
    const traveled = Math.abs(turn(cHere, deg));
    const t = span < 1e-6 ? 0 : Math.min(1, traveled / span);
    return lerpGeom(designAt(here), designAt(toward), t);
  };

  const put = (next: number) => {
    posRef.current = next;
    setPos(next);
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

  useEffect(() => {
    if (dragging || !size.w) return;
    const from = posRef.current;
    const delta = turn(from, clockOf(goal));
    if (Math.abs(delta) < 0.05) {
      put(clockOf(goal));
      if (goal === "exit") onExit();
      return;
    }
    const steps = Math.max(1, Math.round(Math.abs(delta) / 45));
    const dur = Math.min(SNAP_MS * steps, 560);
    const t0 = performance.now();
    snappingRef.current = true;
    setSnapping(true);
    let raf = 0;
    const step = (now: number) => {
      const u = easeOut(Math.min(1, (now - t0) / dur));
      put(from + delta * u);
      if (u >= 1) {
        put(clockOf(goal));
        snappingRef.current = false;
        setSnapping(false);
        if (goal === "exit") onExit();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      snappingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, dragging, size.w]);

  const { w, h } = size;
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2;
  const here = nearest(pos);
  const shown: CgStation = dragging ? here : goal;
  const colour = colourOf(shown);
  const word = wordOf(shown);
  const geom = geomAt(pos);
  const toggle = angPt(geom, geom.toggleDeg);
  const pathD = w ? arcPath(geom) : "";

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - geom.cx;
    const y = clientY - r.top - geom.cy;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)", border: "none", boxShadow: "none", outline: "none" }}
      data-cg-stage=""
      data-cg-clock={wrap(pos).toFixed(1)}
      data-cg-snapping={snapping ? "1" : "0"}
      data-cg-r={(geom.kind === "oval" ? geom.rx : geom.r).toFixed(1)}
      data-cg-ry={geom.ry.toFixed(1)}
      data-cg-track-w={TRACK_STROKE.toFixed(2)}
      data-cg-toggle-d={TOGGLE_DIAM}
      data-cg-kind={geom.kind}
    >
      {w ? (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={w}
          height={h}
          aria-hidden="true"
          data-cg-world=""
        >
          <path
            d={pathD}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_STROKE}
            strokeLinecap="butt"
            data-cg-loop=""
            data-cg-track-w={TRACK_STROKE.toFixed(2)}
            data-cg-cx={geom.cx.toFixed(1)}
            data-cg-cy={geom.cy.toFixed(1)}
          />
        </svg>
      ) : null}

      {/* Seat hits near each settled toggle position. */}
      {w
        ? STATIONS.map((s) => {
            const g = designAt(s);
            const p = angPt(g, g.toggleDeg);
            return (
              <button
                key={s}
                type="button"
                className="pointer-events-auto absolute left-0 top-0 z-10 rounded-full [-webkit-tap-highlight-color:transparent]"
                style={{
                  width: HIT * 2,
                  height: HIT * 2,
                  transform: `translate(${(p.x - HIT).toFixed(2)}px, ${(p.y - HIT).toFixed(2)}px)`,
                  background: "transparent",
                  border: "none",
                }}
                aria-label={s === "exit" ? "back to the g" : s}
                data-cg-loop-hit={s}
                data-cg-dot-hit={s}
                onClick={() => {
                  if (snappingRef.current) return;
                  go(s);
                }}
              />
            );
          })
        : null}

      {w ? (
        <div
          className="pointer-events-auto absolute left-0 top-0 z-30 flex items-center justify-center rounded-full outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
          style={{
            width: TOGGLE_DIAM,
            height: TOGGLE_DIAM,
            left: toggle.x - TOGGLE_OUTER_R,
            top: toggle.y - TOGGLE_OUTER_R,
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
            border: "none",
            boxShadow: "none",
          }}
          role="slider"
          tabIndex={0}
          aria-label="communi-g mode"
          aria-valuetext={shown === "exit" ? "back to the g" : shown}
          data-cg-toggle=""
          data-cg-seat={shown}
          data-cg-settled={settled ? "1" : "0"}
          onPointerDown={(e) => {
            if (snappingRef.current) return;
            e.stopPropagation();
            drag.current = {
              id: e.pointerId,
              moved: false,
              start: nearest(posRef.current),
              x: e.clientX,
              y: e.clientY,
            };
            setDragging(true);
            (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d?.id !== e.pointerId || snappingRef.current) return;
            if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
            d.moved = true;
            const next = posRef.current + turn(posRef.current, thetaForFinger(e.clientX, e.clientY));
            const dir: 1 | -1 = turn(clockOf(d.start), next) >= 0 ? 1 : -1;
            const toward = neighbour(d.start, dir);
            const mid = clockOf(d.start) + turn(clockOf(d.start), clockOf(toward)) / 2;
            if (Math.abs(turn(clockOf(d.start), next)) >= Math.abs(turn(clockOf(d.start), mid))) {
              drag.current = null;
              setDragging(false);
              go(toward);
              return;
            }
            put(next);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (d?.id !== e.pointerId) return;
            drag.current = null;
            if (d.moved) go(d.start);
            setDragging(false);
          }}
          onPointerCancel={() => {
            const d = drag.current;
            drag.current = null;
            if (d?.moved) go(d.start);
            setDragging(false);
          }}
          onKeyDown={(e) => {
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
          <svg width={TOGGLE_DIAM} height={TOGGLE_DIAM} viewBox={`${-TOGGLE_OUTER_R} ${-TOGGLE_OUTER_R} ${TOGGLE_DIAM} ${TOGGLE_DIAM}`} aria-hidden="true">
            <circle r={TOGGLE_INNER_R} fill="var(--world-bg)" />
            <circle r={TOGGLE_STROKE_R} fill="none" stroke={colour} strokeWidth={TOGGLE_RING} data-cg-ring="" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={0}
              fill={colour}
              style={{
                fontFamily: "var(--giver-font, system-ui)",
                fontSize: word.length > 8 ? 7.5 : word.length > 5 ? 9 : 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "lowercase",
              }}
            >
              {word}
            </text>
          </svg>
        </div>
      ) : null}
    </div>
  );
}
