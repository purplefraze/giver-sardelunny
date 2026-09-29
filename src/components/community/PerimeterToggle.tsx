import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import { EAR_GEOMETRY } from "@/components/living-g/g-path";
import { G_STROKE, TOGGLE } from "@/components/living-g/g-weight";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP — LOCKED MOCK GEOMETRY (Frazer via Luna, 29 Sep 2026).
 *
 * IN-COMMUNITY ONLY. This toggle exists only after the user enters communi-g
 * via the living G's 6:00 seat. On the full living G (all three loops) the
 * lower loop has NO toggle — it is just a loop. Pop/drag + crescents apply
 * here alone, never on the full-G view.
 *
 * Matches `/workspace/mocks/communi-g-slivers/`. One open crescent/sliver per
 * seat (never a full red circle). Stroke is living-G weight in SCREEN px
 * (~14.9) — zoom never fattens it. Toggle bead is IDENTICAL to the full-G
 * middle-loop ear (TOGGLE.middle): hollow seat-coloured ring, white centre,
 * seat name. Same pop gesture (loop shrinks, stem arm extends). Diagonals
 * are exact mirrors of Fund;
 * 6:00/12:00 minimal edge kiss (short arms). Borrow/lend full-height oval;
 * toggle may clip slightly so the oval sits further in.
 *
 * Spatial: midpoint snap ~200ms. On touch the toggle POPS — a stem arm
 * jets out to a slightly-shrunk middle-loop ring; drag follows that
 * curvature. On release it snaps home to the seat rest crescent.
 * 12:00 exits to the full living G (toggle returns to middle-loop 6:00).
 */
const SNAP_MS = 200;
/** Same G-unit → screen scale the living G uses at 390px. */
const G_PX = 0.522784;
/** Living-G middle weight — fixed screen px (zoom never fattens). */
const TRACK_STROKE = G_STROKE.middle * G_PX; // ≈ 14.90
/**
 * Bead shape REFERENCE = full-G middle-loop toggle (TOGGLE.middle) —
 * same hollow ring proportions + gap-length stem on pop. Living G itself
 * is untouched; this is communi-g only.
 */
const EAR = TOGGLE.middle;
const TOGGLE_OUTER_R = EAR.outerR * G_PX; // ≈ 39.0
const TOGGLE_INNER_R = EAR.innerR * G_PX; // ≈ 30.0
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2; // ≈ 78
const TOGGLE_RING = TOGGLE_OUTER_R - TOGGLE_INNER_R; // ≈ 9.0
const TOGGLE_STROKE_R = (TOGGLE_INNER_R + TOGGLE_OUTER_R) / 2;
/** Stem length = living-G ear gap; stem width = ear stemWidth. */
const STEM_LEN = EAR_GEOMETRY.gap * G_PX; // ≈ 12.8
const STEM_W = EAR.stemWidth * G_PX; // ≈ 10.5
/** Design canvas the mock numbers are authored against. */
const DW = 390;
const DH = 844;
const HIT = 40;
/** Pop morph duration (ms) — shared gesture feel with EarSelector. */
const POP_MS = 160;
/** Drag ring radius as a share of min(screen) — shrunk loop for drag. */
const DRAG_R_OF_MIN = 0.30;

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
const FUND_CX = 680.396;
const FUND_CY = 163.604;
const FUND_R = 900;
/** True 45° (225°) with equal inset so arms match; toggle on stroke midline. */
const FUND_TDEG = 225;
const FUND_DEG0 = 194;
const FUND_DEG1 = 256;

const GEOM_DESIGN: Record<CgStation, Geom> = {
  fund: {
    kind: "circle",
    cx: FUND_CX,
    cy: FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: FUND_DEG0,
    deg1: FUND_DEG1,
    toggleDeg: FUND_TDEG,
  },
  wish: {
    kind: "circle",
    cx: FUND_CX,
    cy: DH - FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 284.000,
    deg1: 346.000,
    toggleDeg: 315.000,
  },
  give: {
    kind: "circle",
    cx: DW - FUND_CX,
    cy: DH - FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 14.000,
    deg1: 76.000,
    toggleDeg: 45.000,
  },
  trade: {
    kind: "circle",
    cx: DW - FUND_CX,
    cy: FUND_CY,
    r: FUND_R,
    rx: FUND_R,
    ry: FUND_R,
    deg0: 104.000,
    deg1: 166.000,
    toggleDeg: 135.000,
  },
  exit: {
    kind: "circle",
    cx: 195,
    cy: 926.000,
    r: 900,
    rx: 900,
    ry: 900,
    deg0: 346.000,
    deg1: 14.000,
    toggleDeg: 0,
  },
  everything: {
    kind: "circle",
    cx: 195,
    cy: -82.000,
    r: 900,
    rx: 900,
    ry: 900,
    deg0: 166.000,
    deg1: 194.000,
    toggleDeg: 180,
  },
  borrow: {
    kind: "oval",
    cx: 246,
    cy: 422,
    r: 220,
    rx: 220,
    ry: 720,
    deg0: 234.1,
    deg1: 305.9,
    toggleDeg: 270,
  },
  lend: {
    kind: "oval",
    cx: DW - 246,
    cy: 422,
    r: 220,
    rx: 220,
    ry: 720,
    deg0: 54.100,
    deg1: 125.900,
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
  /** 0 = rest crescent; 1 = popped middle-loop drag ring + stem. */
  const [pop, setPop] = useState(0);
  const popRef = useRef(0);
  const popRaf = useRef(0);
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

  const restGeomAt = (deg: number): Geom => {
    const here = nearest(deg);
    const i = STATIONS.indexOf(here);
    const prev = STATIONS[(i - 1 + STATIONS.length) % STATIONS.length]!;
    const next = STATIONS[(i + 1) % STATIONS.length]!;
    const cHere = clockOf(here);
    const dPrev = Math.abs(turn(deg, clockOf(prev)));
    const dNext = Math.abs(turn(deg, clockOf(next)));
    const dHere = Math.abs(turn(deg, cHere));
    if (dHere < 0.05) return designAt(here);
    const toward = dPrev < dNext ? prev : next;
    const span = Math.abs(turn(cHere, clockOf(toward)));
    const traveled = Math.abs(turn(cHere, deg));
    const t = span < 1e-6 ? 0 : Math.min(1, traveled / span);
    return lerpGeom(designAt(here), designAt(toward), t);
  };

  /** Middle-loop drag ring: centred, slightly shrunk, full circle. */
  const dragGeom = (deg: number): Geom => {
    const { w, h } = size;
    const R = Math.max(1, Math.min(w, h) * DRAG_R_OF_MIN);
    return {
      kind: "circle",
      cx: w / 2,
      cy: h / 2,
      r: R,
      rx: R,
      ry: R,
      deg0: 0,
      deg1: 359.9,
      toggleDeg: wrap(deg),
    };
  };

  const animatePop = (to: number) => {
    cancelAnimationFrame(popRaf.current);
    const from = popRef.current;
    if (Math.abs(to - from) < 0.01) {
      popRef.current = to;
      setPop(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const u = easeOut(Math.min(1, (now - t0) / POP_MS));
      const v = from + (to - from) * u;
      popRef.current = v;
      setPop(v);
      if (u < 1) popRaf.current = requestAnimationFrame(step);
    };
    popRaf.current = requestAnimationFrame(step);
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
      animatePop(0);
      if (goal === "exit") onExit();
      return;
    }
    const steps = Math.max(1, Math.round(Math.abs(delta) / 45));
    const dur = Math.min(SNAP_MS * steps, 560);
    const t0 = performance.now();
    snappingRef.current = true;
    setSnapping(true);
    animatePop(0);
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
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2 && pop < 0.05;
  const here = nearest(pos);
  const shown: CgStation = dragging || pop > 0.5 ? here : goal;
  const colour = colourOf(shown);
  const word = wordOf(shown);

  const rest = w ? restGeomAt(pos) : null;
  const dragG = w ? dragGeom(pos) : null;
  const geom = rest && dragG ? lerpGeom(rest, dragG, pop) : rest;
  const stem = STEM_LEN * pop;

  let toggle = { x: 0, y: 0 };
  let rim = { x: 0, y: 0 };
  if (geom) {
    const a = geom.toggleDeg * RAD;
    const rx = geom.kind === "oval" ? geom.rx : geom.r;
    const ry = geom.kind === "oval" ? geom.ry : geom.r;
    rim = { x: geom.cx + rx * Math.sin(a), y: geom.cy - ry * Math.cos(a) };
    toggle = {
      x: geom.cx + (rx + stem) * Math.sin(a),
      y: geom.cy - (ry + stem) * Math.cos(a),
    };
  }

  const pathD =
    w && geom
      ? pop > 0.5
        ? `M${(geom.cx + geom.r).toFixed(3)},${geom.cy.toFixed(3)} A${geom.r.toFixed(3)},${geom.r.toFixed(3)} 0 1 1 ${(geom.cx - geom.r).toFixed(3)},${geom.cy.toFixed(3)} A${geom.r.toFixed(3)},${geom.r.toFixed(3)} 0 1 1 ${(geom.cx + geom.r).toFixed(3)},${geom.cy.toFixed(3)}`
        : arcPath(geom)
      : "";

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const cx = pop > 0.4 && dragG ? dragG.cx : geom!.cx;
    const cy = pop > 0.4 && dragG ? dragG.cy : geom!.cy;
    const x = clientX - r.left - cx;
    const y = clientY - r.top - cy;
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
      data-cg-pop={pop.toFixed(2)}
      data-cg-r={geom ? (geom.kind === "oval" ? geom.rx : geom.r).toFixed(1) : ""}
      data-cg-ry={geom ? geom.ry.toFixed(1) : ""}
      data-cg-track-w={TRACK_STROKE.toFixed(2)}
      data-cg-toggle-d={TOGGLE_DIAM}
      data-cg-kind={geom?.kind ?? ""}
      data-cg-stem={stem.toFixed(1)}
    >
      {w && geom ? (
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
          {stem > 0.5 ? (
            <line
              x1={rim.x}
              y1={rim.y}
              x2={toggle.x}
              y2={toggle.y}
              stroke={RED}
              strokeWidth={STEM_W}
              strokeLinecap="round"
              data-cg-stem-arm=""
            />
          ) : null}
        </svg>
      ) : null}

      {w
        ? STATIONS.map((s) => {
            const g = designAt(s);
            const pt = angPt(g, g.toggleDeg);
            return (
              <button
                key={s}
                type="button"
                className="pointer-events-auto absolute left-0 top-0 z-10 rounded-full [-webkit-tap-highlight-color:transparent]"
                style={{
                  width: HIT * 2,
                  height: HIT * 2,
                  transform: `translate(${(pt.x - HIT).toFixed(2)}px, ${(pt.y - HIT).toFixed(2)}px)`,
                  background: "transparent",
                  border: "none",
                }}
                aria-label={s === "exit" ? "back to the g" : s}
                data-cg-loop-hit={s}
                data-cg-dot-hit={s}
                onClick={() => {
                  if (snappingRef.current || dragging) return;
                  go(s);
                }}
              />
            );
          })
        : null}

      {w && geom ? (
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
            animatePop(1);
            haptics.light();
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
            setDragging(false);
            if (d.moved) go(d.start);
            else animatePop(0);
          }}
          onPointerCancel={() => {
            const d = drag.current;
            drag.current = null;
            setDragging(false);
            if (d?.moved) go(d.start);
            else animatePop(0);
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
          <svg
            width={TOGGLE_DIAM}
            height={TOGGLE_DIAM}
            viewBox={`${-TOGGLE_OUTER_R} ${-TOGGLE_OUTER_R} ${TOGGLE_DIAM} ${TOGGLE_DIAM}`}
            aria-hidden="true"
          >
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
