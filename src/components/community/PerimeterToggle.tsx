import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP — ORGANISM NAV (Frazer locked, 29 Sep 2026).
 *
 * IN-COMMUNITY ONLY (enter Living G at 6:00). Full Living G / middle-loop
 * toggle is untouched — borrowed here as shape + plug/socket colour language.
 *
 * - Red open-crescent track always (#E8322B); never fattens with zoom.
 * - Hollow bead sits ON the red stroke (saves interior white); short arm
 *   points inward; press extends arm + shrinks loop slightly.
 * - While sliding: next seat's coloured hollow circle fades in ahead
 *   (plug preview, same idea as middle-loop seat hints).
 * - Toggle colour morphs with seat as you slide (middle-loop colour system).
 * - Release: run along the track in last-move direction → snap to next seat.
 * - 12:00 exits to the full Living G.
 */
const SNAP_MS = 200;
const G_PX = 0.522784;
const TRACK_STROKE = 28.5 * G_PX; // ≈ 14.90

/** Bead ~52px — living-G ear proportions, on the stroke. */
const TOGGLE_OUTER_R = 26;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.5;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
const STEM_W = 8;
/** Rest arm past the bead into the interior (must clear outerR to read). */
const STEM_REST = 10;
/** Extra arm length on press. */
const STEM_POP = 16;
const POP_MS = 160;
/** Loop shrink factor while pressed / sliding. */
const DRAG_SHRINK = 0.88;

const DW = 390;
const DH = 844;
const HIT = 40;

const RED = "#E8322B";

/**
 * Seat colours — branch map, aligned with middle-loop --mode-* where they match.
 * Track stays RED; only the toggle/arm/plug take these.
 */
const SEAT_COLOUR: Record<string, string> = {
  everything: "#E8322B", // 6:00 map / communi-g
  fund: "#9E4B2C",
  borrow: "#C77DD6", // --mode-borrow (middle-loop)
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
  cx: number;
  cy: number;
  r: number;
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

const angPt = (cx: number, cy: number, r: number, deg: number) => {
  const a = deg * RAD;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
};

const outward = (deg: number) => {
  const a = deg * RAD;
  return { x: Math.sin(a), y: -Math.cos(a) };
};

const arcPath = (g: Geom) => {
  const p0 = angPt(g.cx, g.cy, g.r, g.deg0);
  const p1 = angPt(g.cx, g.cy, g.r, g.deg1);
  const delta = wrap(g.deg1 - g.deg0);
  const large = delta > 180 ? 1 : 0;
  return `M${p0.x.toFixed(3)},${p0.y.toFixed(3)} A${g.r.toFixed(3)},${g.r.toFixed(3)} 0 ${large} 1 ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
};

/**
 * True-circle open crescents (organism geometry).
 * 9/3: large R, toggle may clip side; corner arcs keep circle integrity.
 * 12: rainbow top arc; toggle hangs inside.
 * 10:30: TL corner crescent only.
 */
const SIDE_R = 860;
const SIDE_X = -10; // stroke past edge — bead clips at 9/3
const DIAG_R = 520;
const WISH_STROKE = { x: 108, y: 116 }; // TL corner only
/** 6/12 smile — tighter R so L/R arcs rise; rest of loop off-screen. */
const SMILE_R = 220;
const SMILE_HALF = 75; // degrees each side of 6:00 / 12:00
const TOP_RIM_Y = 48; // peak of rainbow under status; bead hangs below
/** Stroke centreline so the outer edge kisses the bottom frame. */
const BOTTOM_KISS_Y = DH - TRACK_STROKE / 2;

const GEOM_DESIGN: Record<CgStation, Geom> = {
  borrow: {
    cx: SIDE_X + SIDE_R,
    cy: DH / 2,
    r: SIDE_R,
    deg0: 234.6,
    deg1: 305.4,
    toggleDeg: 270,
  },
  lend: {
    cx: DW - (SIDE_X + SIDE_R),
    cy: DH / 2,
    r: SIDE_R,
    deg0: 54.6,
    deg1: 125.4,
    toggleDeg: 90,
  },
  wish: {
    cx: 475.696,
    cy: 483.696,
    r: DIAG_R,
    deg0: 286.8,
    deg1: 345.5,
    toggleDeg: 315,
  },
  fund: {
    cx: 475.696,
    cy: DH - 483.696,
    r: DIAG_R,
    deg0: 194.5,
    deg1: 253.2,
    toggleDeg: 225,
  },
  give: {
    cx: DW - 475.696,
    cy: 483.696,
    r: DIAG_R,
    deg0: 14.5,
    deg1: 73.2,
    toggleDeg: 45,
  },
  trade: {
    cx: DW - 475.696,
    cy: DH - 483.696,
    r: DIAG_R,
    deg0: 106.8,
    deg1: 165.5,
    toggleDeg: 135,
  },
  /** 12:00 rainbow — peak under status; bead on stroke, arm hangs into interior. */
  exit: {
    cx: DW / 2,
    cy: TOP_RIM_Y + SMILE_R,
    r: SMILE_R,
    deg0: 360 - SMILE_HALF,
    deg1: SMILE_HALF,
    toggleDeg: 0,
  },
  /** 6:00 entry — bottom smile kissing the frame; red rises L/R of the bead. */
  everything: {
    cx: DW / 2,
    cy: BOTTOM_KISS_Y - SMILE_R,
    r: SMILE_R,
    deg0: 180 - SMILE_HALF,
    deg1: 180 + SMILE_HALF,
    toggleDeg: 180,
  },
};

const scaleGeom = (g: Geom, sx: number, sy: number): Geom => ({
  cx: g.cx * sx,
  cy: g.cy * sy,
  r: g.r * ((sx + sy) / 2),
  deg0: g.deg0,
  deg1: g.deg1,
  toggleDeg: g.toggleDeg,
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => wrap(a + turn(a, b) * t);

const lerpGeom = (a: Geom, b: Geom, t: number): Geom => ({
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
  r: lerp(a.r, b.r, t),
  deg0: lerpAngle(a.deg0, b.deg0, t),
  deg1: lerpAngle(a.deg1, b.deg1, t),
  toggleDeg: lerpAngle(a.toggleDeg, b.toggleDeg, t),
});

/** Hex blend for seat-colour morph while sliding. */
const lerpHex = (a: string, b: string, t: number) => {
  const parse = (h: string): [number, number, number] => {
    const s = h.replace("#", "");
    return [
      Number.parseInt(s.slice(0, 2), 16) || 0,
      Number.parseInt(s.slice(2, 4), 16) || 0,
      Number.parseInt(s.slice(4, 6), 16) || 0,
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
};

/**
 * Bead ON the stroke centreline. Arm points inward (toward loop centre).
 * Press grows arm + shrinks R.
 */
const organismParts = (g: Geom, pop: number) => {
  const R = g.r * (1 - (1 - DRAG_SHRINK) * pop);
  const beyond = STEM_REST + STEM_POP * pop; // length past bead outer edge
  const u = outward(g.toggleDeg);
  // Bead centre on the (shrunk) stroke
  const bead = { x: g.cx + R * u.x, y: g.cy + R * u.y };
  // Arm: from near bead (stroke side) inward past the ring into white
  const stemRoot = {
    x: bead.x - u.x * (TOGGLE_OUTER_R * 0.25),
    y: bead.y - u.y * (TOGGLE_OUTER_R * 0.25),
  };
  const stemTip = {
    x: bead.x - u.x * (TOGGLE_OUTER_R + beyond),
    y: bead.y - u.y * (TOGGLE_OUTER_R + beyond),
  };
  return { R, bead, stemRoot, stemTip, stemLen: beyond };
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
  const [pop, setPop] = useState(0);
  const popRef = useRef(0);
  const popRaf = useRef(0);
  const lastDir = useRef<1 | -1>(1);
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
    if (dHere < 2) return designAt(here);
    const toward = dPrev < dNext ? prev : next;
    const span = Math.abs(turn(cHere, clockOf(toward)));
    const traveled = Math.abs(turn(cHere, deg));
    const t = span < 1e-6 ? 0 : Math.min(1, traveled / span);
    return lerpGeom(designAt(here), designAt(toward), t);
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
  const towardSeat = neighbour(here, lastDir.current);
  const cHere = clockOf(here);
  const cToward = clockOf(towardSeat);
  const span = Math.abs(turn(cHere, cToward)) || 45;
  const traveled = Math.abs(turn(cHere, pos));
  const blend = dragging || pop > 0.2 ? Math.min(1, traveled / span) : 0;

  const shown: CgStation = dragging || pop > 0.5 ? here : goal;
  const colour =
    dragging || pop > 0.2
      ? lerpHex(colourOf(here), colourOf(towardSeat), blend * 0.85)
      : colourOf(shown);
  const word = wordOf(dragging || pop > 0.5 ? (blend > 0.55 ? towardSeat : here) : shown);

  const geom = w
    ? !dragging && !snapping
      ? designAt(nearest(pos))
      : restGeomAt(pos)
    : null;
  const live: Geom | null = geom
    ? {
        ...geom,
        toggleDeg: dragging || pop > 0.05 || snapping ? wrap(pos) : geom.toggleDeg,
      }
    : null;

  const parts = live ? organismParts(live, pop) : null;
  const pathD = live && parts ? arcPath({ ...live, r: parts.R }) : "";

  /** Plug preview: next seat circle fading in ahead (middle-loop hint language). */
  const plugs =
    w && (dragging || pop > 0.3)
      ? ([towardSeat, neighbour(here, (lastDir.current * -1) as 1 | -1)] as CgStation[])
          .filter((s, i, a) => a.indexOf(s) === i)
          .map((s) => {
            const g = designAt(s);
            const p = organismParts({ ...g, r: g.r * DRAG_SHRINK }, 1);
            const dist = Math.abs(turn(pos, clockOf(s)));
            const opacity =
              s === towardSeat
                ? Math.min(0.9, 0.25 + blend * 0.7)
                : Math.max(0, 0.35 - dist / 90);
            return { s, bead: p.bead, opacity, colour: colourOf(s) };
          })
          .filter((p) => p.opacity > 0.05 && p.s !== shown)
      : [];

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - live!.cx;
    const y = clientY - r.top - live!.cy;
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
      data-cg-r={parts ? parts.R.toFixed(1) : ""}
      data-cg-track-w={TRACK_STROKE.toFixed(2)}
      data-cg-toggle-d={TOGGLE_DIAM}
      data-cg-kind="circle"
      data-cg-organism="1"
    >
      {w && live && parts ? (
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
            data-cg-cx={live.cx.toFixed(1)}
            data-cg-cy={live.cy.toFixed(1)}
          />

          {/* Plug previews — next seat hollow circles fade in ahead. */}
          {plugs.map((p) => (
            <g key={p.s} opacity={p.opacity} data-cg-plug={p.s}>
              <circle
                cx={p.bead.x}
                cy={p.bead.y}
                r={TOGGLE_STROKE_R * sx}
                fill="none"
                stroke={p.colour}
                strokeWidth={TOGGLE_RING * sx}
              />
            </g>
          ))}

          {/* Arm — rest short; press extends inward. */}
          <line
            x1={parts.stemRoot.x}
            y1={parts.stemRoot.y}
            x2={parts.stemTip.x}
            y2={parts.stemTip.y}
            stroke={colour}
            strokeWidth={STEM_W * sx}
            strokeLinecap="round"
            data-cg-stem-arm=""
          />
        </svg>
      ) : null}

      {w
        ? STATIONS.map((s) => {
            const g = designAt(s);
            const pt = organismParts(g, 0).bead;
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

      {w && parts ? (
        <div
          className="pointer-events-auto absolute left-0 top-0 z-30 flex items-center justify-center rounded-full outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
          style={{
            width: TOGGLE_DIAM * sx,
            height: TOGGLE_DIAM * sy,
            left: parts.bead.x - TOGGLE_OUTER_R * sx,
            top: parts.bead.y - TOGGLE_OUTER_R * sy,
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
            lastDir.current = dir;
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
            if (d.moved) {
              // Release: continue in last-move direction to closest next seat.
              go(neighbour(d.start, lastDir.current));
            } else animatePop(0);
          }}
          onPointerCancel={() => {
            const d = drag.current;
            drag.current = null;
            setDragging(false);
            if (d?.moved) go(neighbour(d.start, lastDir.current));
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
            width={TOGGLE_DIAM * sx}
            height={TOGGLE_DIAM * sy}
            viewBox={`${-TOGGLE_OUTER_R} ${-TOGGLE_OUTER_R} ${TOGGLE_DIAM} ${TOGGLE_DIAM}`}
            aria-hidden="true"
          >
            <circle r={TOGGLE_INNER_R - 0.4} fill="var(--world-bg)" />
            <circle
              r={TOGGLE_STROKE_R}
              fill="none"
              stroke={colour}
              strokeWidth={TOGGLE_RING}
              data-cg-ring=""
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={0}
              fill={colour}
              style={{
                fontFamily: "var(--giver-font, system-ui)",
                fontSize: word.length > 8 ? 7.5 : word.length > 5 ? 9 : 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
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
