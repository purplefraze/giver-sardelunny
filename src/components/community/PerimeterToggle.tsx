import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP — ARM-ANCHORED + AUTO-RUN (Frazer, 29 Sep 2026).
 *
 * IN-COMMUNITY ONLY (enter Living G at 6:00). Middle-loop / living-g untouched.
 *
 * Toggle = middle-loop piece MIRRORED INWARD:
 *   - Arm anchors on the INSIDE of the red track.
 *   - Bead/circle sits further into content (toward loop centre).
 *   - At 6:00 arm comes UP off the track into white — never a nub outside.
 *
 * Auto-run: thumb initiates (press/drag); bead then cruises the track on its
 * own (track runs for the thumb). Thumb may ride or let go. Release snaps
 * nearest seat in travel direction. Drag stays primary; auto-run assists.
 *
 * Red = true-circle crop: 6/12 full arcs; 9/3 inward-curving corner pieces;
 * diagonals one corner. Dolly-in on entry. Press: subtle shrink + middle-loop peek.
 * Track #E8322B; bead/arm seat-coloured. 12:00 exits to full G.
 */
const SNAP_MS = 200;
const G_PX = 0.522784;
const TRACK_STROKE = 28.5 * G_PX; // ≈ 14.90

/** Bead ~52px — living-G ear proportions. */
const TOGGLE_OUTER_R = 26;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.5;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
const STEM_W = 8;
/** Visible stem from track inner wall to bead outer edge (rest). */
const STEM_LEN = 14;
const POP_MS = 160;
/** Press: subtle shrink — enough to hop next seat, not a dramatic zoom-out. */
const DRAG_SHRINK = 0.94;
const DOLLY_MS = 520;
/** Entry starts slightly pulled back so the circle reads round. */
const DOLLY_START = 0.86;
/** Auto-run cruise (deg/ms) once the thumb has initiated travel. */
const CRUISE_DEG_MS = 0.12;
const CRUISE_MAX_DEG_MS = 0.28;

const DW = 390;
const DH = 844;
const HIT = 40;

const RED = "#E8322B";

const SEAT_COLOUR: Record<string, string> = {
  everything: "#E8322B",
  fund: "#9E4B2C",
  borrow: "#C77DD6",
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
type ArcSpan = { deg0: number; deg1: number };
type Geom = {
  cx: number;
  cy: number;
  r: number;
  /** Visible crop(s) of the true circle. */
  arcs: ArcSpan[];
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
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

const angPt = (cx: number, cy: number, r: number, deg: number) => {
  const a = deg * RAD;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
};

const outward = (deg: number) => {
  const a = deg * RAD;
  return { x: Math.sin(a), y: -Math.cos(a) };
};

const oneArc = (cx: number, cy: number, r: number, deg0: number, deg1: number) => {
  const p0 = angPt(cx, cy, r, deg0);
  const p1 = angPt(cx, cy, r, deg1);
  const delta = wrap(deg1 - deg0);
  const large = delta > 180 ? 1 : 0;
  return `M${p0.x.toFixed(3)},${p0.y.toFixed(3)} A${r.toFixed(3)},${r.toFixed(3)} 0 ${large} 1 ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
};

const arcsPath = (g: Geom, r: number) => g.arcs.map((a) => oneArc(g.cx, g.cy, r, a.deg0, a.deg1)).join(" ");

/**
 * True-circle crops.
 * 6/12: larger-R gentler arcs that climb into the corners (reads as a circle).
 * 9/3: smaller-R corner pieces that bow inward toward the bead (not edge-straight).
 * Diagonals: one corner.
 */
const SIDE_R = 560;
/** Bead floats near/past the edge; attachment implied. */
const SIDE_BEAD_X = -28;
const DIAG_R = 520;
/** 6/12 — bigger R vs screen, wider span so red climbs toward corners. */
const SMILE_R = 400;
const SMILE_HALF = 88;
const TOP_RIM_Y = 52;
const BOTTOM_KISS_Y = DH - TRACK_STROKE / 2;

const sideCx = (left: boolean) => (left ? SIDE_R + SIDE_BEAD_X : DW - (SIDE_R + SIDE_BEAD_X));

const GEOM_DESIGN: Record<CgStation, Geom> = {
  /** 9:00 — inward-bowing TL+BL corners; gap at bead (270°). */
  borrow: {
    cx: sideCx(true),
    cy: DH / 2,
    r: SIDE_R,
    arcs: [
      { deg0: 218, deg1: 258 }, // BL — curves in toward bead
      { deg0: 282, deg1: 322 }, // TL
    ],
    toggleDeg: 270,
  },
  /** 3:00 — inward-bowing TR+BR corners; gap at bead (90°). */
  lend: {
    cx: sideCx(false),
    cy: DH / 2,
    r: SIDE_R,
    arcs: [
      { deg0: 38, deg1: 78 }, // TR
      { deg0: 102, deg1: 142 }, // BR
    ],
    toggleDeg: 90,
  },
  wish: {
    cx: 475.696,
    cy: 483.696,
    r: DIAG_R,
    arcs: [{ deg0: 286.8, deg1: 345.5 }],
    toggleDeg: 315,
  },
  fund: {
    cx: 475.696,
    cy: DH - 483.696,
    r: DIAG_R,
    arcs: [{ deg0: 194.5, deg1: 253.2 }],
    toggleDeg: 225,
  },
  give: {
    cx: DW - 475.696,
    cy: 483.696,
    r: DIAG_R,
    arcs: [{ deg0: 14.5, deg1: 73.2 }],
    toggleDeg: 45,
  },
  trade: {
    cx: DW - 475.696,
    cy: DH - 483.696,
    r: DIAG_R,
    arcs: [{ deg0: 106.8, deg1: 165.5 }],
    toggleDeg: 135,
  },
  /** 12:00 rainbow — full top arc; arm hangs bead into content. */
  exit: {
    cx: DW / 2,
    cy: TOP_RIM_Y + SMILE_R,
    r: SMILE_R,
    arcs: [{ deg0: 360 - SMILE_HALF, deg1: SMILE_HALF }],
    toggleDeg: 0,
  },
  /** 6:00 entry — bottom smile; arms L/R; white open above. */
  everything: {
    cx: DW / 2,
    cy: BOTTOM_KISS_Y - SMILE_R,
    r: SMILE_R,
    arcs: [{ deg0: 180 - SMILE_HALF, deg1: 180 + SMILE_HALF }],
    toggleDeg: 180,
  },
};

const scaleGeom = (g: Geom, sx: number, sy: number): Geom => ({
  cx: g.cx * sx,
  cy: g.cy * sy,
  r: g.r * ((sx + sy) / 2),
  arcs: g.arcs.map((a) => ({ deg0: a.deg0, deg1: a.deg1 })),
  toggleDeg: g.toggleDeg,
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => wrap(a + turn(a, b) * t);

const lerpGeom = (a: Geom, b: Geom, t: number): Geom => {
  // Prefer the destination's arc topology (corner count) past halfway.
  const arcsSrc = t < 0.5 ? a.arcs : b.arcs;
  const arcsDst = t < 0.5 ? b.arcs : a.arcs;
  const arcs =
    arcsSrc.length === arcsDst.length
      ? arcsSrc.map((s, i) => ({
          deg0: lerpAngle(s.deg0, arcsDst[i]!.deg0, t < 0.5 ? t * 2 : (t - 0.5) * 2),
          deg1: lerpAngle(s.deg1, arcsDst[i]!.deg1, t < 0.5 ? t * 2 : (t - 0.5) * 2),
        }))
      : (t < 0.5 ? a.arcs : b.arcs).map((s) => ({ ...s }));
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    r: lerp(a.r, b.r, t),
    arcs,
    toggleDeg: lerpAngle(a.toggleDeg, b.toggleDeg, t),
  };
};

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
 * Middle-loop mirrored inward:
 *   arm root on INSIDE wall of red track → stem runs inward → bead in content.
 * Press only shrinks R (few %); stem length stays put.
 */
const organismParts = (g: Geom, pop: number) => {
  const R = g.r * (1 - (1 - DRAG_SHRINK) * pop);
  const u = outward(g.toggleDeg);
  // Inner wall of the (shrunk) stroke — arm anchors here.
  const attachR = Math.max(8, R - TRACK_STROKE / 2);
  const attach = { x: g.cx + attachR * u.x, y: g.cy + attachR * u.y };
  // Bead further into content (toward centre). Stem fills the gap.
  const beadR = Math.max(4, attachR - STEM_LEN - TOGGLE_OUTER_R);
  const bead = { x: g.cx + beadR * u.x, y: g.cy + beadR * u.y };
  // Tip buried in the ring stroke (middle-loop language).
  const stemTip = {
    x: bead.x + u.x * (TOGGLE_INNER_R * 0.35),
    y: bead.y + u.y * (TOGGLE_INNER_R * 0.35),
  };
  return { R, bead, stemRoot: attach, stemTip, stemLen: STEM_LEN, attach };
};

/** Hint of the middle loop peeking above Communi-G while pressed (ceiling). */
const peekPath = (w: number, h: number, sx: number, sy: number) => {
  // Design-space arc across the top — reads as middle-loop rim crop, not full G.
  const cx = (DW / 2) * sx;
  const cy = 210 * sy;
  const r = 340 * ((sx + sy) / 2);
  return oneArc(cx, cy, r, 322, 38);
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
  const [dolly, setDolly] = useState(0);
  const [cruising, setCruising] = useState(false);
  const cruiseRaf = useRef(0);
  const cruiseVel = useRef(0); // signed deg/ms
  const drag = useRef<{
    id: number;
    moved: boolean;
    start: CgStation;
    x: number;
    y: number;
    t: number;
    angle: number;
  } | null>(null);

  const cruisingRef = useRef(false);
  const holdTimer = useRef(0);
  const goRef = useRef<(s: CgStation) => void>(() => {});
  const nearestRef = useRef<(d: number) => CgStation>(() => "everything");
  const neighbourRef = useRef<(s: CgStation, dir: 1 | -1) => CgStation>((s) => s);

  const stopCruise = () => {
    cancelAnimationFrame(cruiseRaf.current);
    cruiseRaf.current = 0;
    cruiseVel.current = 0;
    cruisingRef.current = false;
    setCruising(false);
  };

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Dolly-in on mount: pulled back → settled crop.
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const u = easeInOut(Math.min(1, (now - t0) / DOLLY_MS));
      setDolly(u);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => {
    clearTimeout(holdTimer.current);
    cancelAnimationFrame(cruiseRaf.current);
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
  goRef.current = go;
  nearestRef.current = nearest;
  neighbourRef.current = neighbour;

  const startCruise = (dir: 1 | -1, speed: number) => {
    cancelAnimationFrame(cruiseRaf.current);
    lastDir.current = dir;
    const mag = Math.min(CRUISE_MAX_DEG_MS, Math.max(CRUISE_DEG_MS, Math.abs(speed)));
    cruiseVel.current = dir * mag;
    cruisingRef.current = true;
    setCruising(true);
    const origin = drag.current?.start ?? nearestRef.current(posRef.current);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, Math.max(0, now - last));
      last = now;
      // Finger still down with no velocity: keep a gentle assist cruise.
      if (drag.current && Math.abs(cruiseVel.current) < CRUISE_DEG_MS * 0.5) {
        cruiseVel.current = lastDir.current * CRUISE_DEG_MS;
      }
      // Finger up: coast with friction, then snap.
      if (!drag.current) {
        cruiseVel.current *= 0.975;
      }
      if (!drag.current && Math.abs(cruiseVel.current) < 0.02) {
        stopCruise();
        goRef.current(neighbourRef.current(nearestRef.current(posRef.current), lastDir.current));
        return;
      }
      const next = posRef.current + cruiseVel.current * dt;
      const fromSeat = drag.current?.start ?? origin;
      const dirNow = lastDir.current;
      const toward = neighbourRef.current(fromSeat, dirNow);
      const mid = clockOf(fromSeat) + turn(clockOf(fromSeat), clockOf(toward)) / 2;
      if (Math.abs(turn(clockOf(fromSeat), next)) >= Math.abs(turn(clockOf(fromSeat), mid)) - 0.01) {
        stopCruise();
        drag.current = null;
        setDragging(false);
        goRef.current(toward);
        return;
      }
      put(next);
      cruiseRaf.current = requestAnimationFrame(step);
    };
    cruiseRaf.current = requestAnimationFrame(step);
  };


  useEffect(() => {
    if (dragging || cruisingRef.current || !size.w) return;
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
  }, [goal, dragging, cruising, size.w]);

  const { w, h } = size;
  const settled = !dragging && !snapping && !cruising && Math.abs(turn(pos, clockOf(goal))) < 0.2 && pop < 0.05;
  const here = nearest(pos);
  const towardSeat = neighbour(here, lastDir.current);
  const cHere = clockOf(here);
  const cToward = clockOf(towardSeat);
  const span = Math.abs(turn(cHere, cToward)) || 45;
  const traveled = Math.abs(turn(cHere, pos));
  const blend = dragging || cruising || pop > 0.2 ? Math.min(1, traveled / span) : 0;

  const shown: CgStation = dragging || cruising || pop > 0.5 ? here : goal;
  const colour =
    dragging || cruising || pop > 0.2
      ? lerpHex(colourOf(here), colourOf(towardSeat), blend * 0.85)
      : colourOf(shown);
  const word = wordOf(dragging || cruising || pop > 0.5 ? (blend > 0.55 ? towardSeat : here) : shown);

  const geom = w
    ? !dragging && !snapping && !cruising
      ? designAt(nearest(pos))
      : restGeomAt(pos)
    : null;
  const live: Geom | null = geom
    ? {
        ...geom,
        toggleDeg: dragging || cruising || pop > 0.05 || snapping ? wrap(pos) : geom.toggleDeg,
      }
    : null;

  const parts = live ? organismParts(live, pop) : null;
  const pathD = live && parts ? arcsPath(live, parts.R) : "";

  /** Ghost next-seat bead ahead while sliding (middle-loop hint language). */
  const plugs =
    w && (dragging || cruising || pop > 0.3)
      ? ([towardSeat, neighbour(here, (lastDir.current * -1) as 1 | -1)] as CgStation[])
          .filter((s, i, a) => a.indexOf(s) === i)
          .map((s) => {
            const g = designAt(s);
            const p = organismParts({ ...g, r: g.r * DRAG_SHRINK }, 1);
            const dist = Math.abs(turn(pos, clockOf(s)));
            const opacity =
              s === towardSeat ? Math.min(0.9, 0.25 + blend * 0.7) : Math.max(0, 0.35 - dist / 90);
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

  const dollyScale = lerp(DOLLY_START, 1, dolly);
  // Origin near the active toggle so the crop eases in around the bead.
  const originX = parts ? (parts.bead.x / (w || 1)) * 100 : 50;
  const originY = parts ? (parts.bead.y / (h || 1)) * 100 : 50;

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
      data-cg-dolly={dolly.toFixed(2)}
      data-cg-arm="inward"
      data-cg-cruise={cruising ? "1" : "0"}
    >
      {/* Middle-loop peek — only while pressed; sits above the Communi-G crop. */}
      {w && pop > 0.04 ? (
        <svg
          className="pointer-events-none absolute left-0 top-0 z-[5]"
          width={w}
          height={h}
          aria-hidden="true"
          data-cg-peek=""
        >
          <path
            d={peekPath(w, h, sx, sy)}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_STROKE * 0.9}
            strokeLinecap="butt"
            opacity={Math.min(0.55, pop * 0.55)}
          />
        </svg>
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${dollyScale})`,
          transformOrigin: `${originX}% ${originY}%`,
          willChange: dolly < 1 ? "transform" : "auto",
        }}
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

            {/* Arm — root on track inside wall, tip into bead (content). */}
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
              clearTimeout(holdTimer.current);
              stopCruise();
              const angle = live ? wrap((Math.atan2(
                e.clientX - stage.current!.getBoundingClientRect().left - live.cx,
                -(e.clientY - stage.current!.getBoundingClientRect().top - live.cy),
              ) * 180) / Math.PI) : posRef.current;
              drag.current = {
                id: e.pointerId,
                moved: false,
                start: nearest(posRef.current),
                x: e.clientX,
                y: e.clientY,
                t: performance.now(),
                angle,
              };
              setDragging(true);
              animatePop(1);
              haptics.light();
              (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
              // Press alone initiates a gentle auto-run in the last travel direction.
              holdTimer.current = window.setTimeout(() => {
                if (!drag.current || drag.current.moved) return;
                startCruise(lastDir.current, CRUISE_DEG_MS);
              }, 140);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId || snappingRef.current) return;
              const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
              if (!d.moved && dist < 6) return;
              clearTimeout(holdTimer.current);
              const now = performance.now();
              const finger = thetaForFinger(e.clientX, e.clientY);
              const delta = turn(d.angle, finger);
              const dt = Math.max(8, now - d.t);
              // Thumb steers; track runs — velocity from finger sweep, bead auto-cruises.
              const speed = Math.min(CRUISE_MAX_DEG_MS, Math.abs(delta) / dt + CRUISE_DEG_MS);
              const dir: 1 | -1 = delta >= 0 ? 1 : -1;
              lastDir.current = dir;
              d.moved = true;
              d.x = e.clientX;
              d.y = e.clientY;
              d.t = now;
              d.angle = finger;
              if (!cruisingRef.current) startCruise(dir, speed);
              else cruiseVel.current = dir * speed;
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              clearTimeout(holdTimer.current);
              drag.current = null;
              setDragging(false);
              if (d.moved || cruisingRef.current) {
                // Let auto-run coast briefly; snap nearest in travel direction.
                if (!cruisingRef.current) {
                  go(neighbour(d.start, lastDir.current));
                  animatePop(0);
                }
                // else: cruise step handles snap on friction end / seat catch
              } else {
                stopCruise();
                animatePop(0);
              }
            }}
            onPointerCancel={() => {
              const d = drag.current;
              clearTimeout(holdTimer.current);
              const moved = !!d?.moved;
              const start = d?.start;
              drag.current = null;
              setDragging(false);
              if (moved || cruisingRef.current) {
                if (!cruisingRef.current && start) go(neighbour(start, lastDir.current));
              } else stopCruise();
              animatePop(0);
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
    </div>
  );
}
