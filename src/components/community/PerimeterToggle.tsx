import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP — ARM-ANCHORED + AUTO-RUN (Frazer, 29 Sep 2026).
 *
 * Middle-loop / living-g / g-path.ts untouched.
 *
 * Toggle = middle-loop MIRRORED INWARD:
 *   arm roots on INSIDE of red track → bead floats into content.
 *   At 6:00 arm comes UP off the track into white — never a nub outside.
 *
 * Auto-run: hold keeps rolling PAST seats (no per-seat snap). Thumb initiates;
 * track runs. Ride or let go. On let-go: snap nearest in travel direction.
 * 12:00 / my-g: TAP ONLY exits to Living G — drag/cruise may park at 12 and stay.
 *
 * Ghost = next seat's coloured bead ON the track. Dolly-in on entry.
 * Track #E8322B. Press: subtle shrink + middle-loop peek (ceiling).
 */
const SNAP_MS = 220;
const G_PX = 0.522784;
const TRACK_STROKE = 28.5 * G_PX; // ≈ 14.90

/** Bead sized so "communi-g" fits in full. */
const TOGGLE_OUTER_R = 28;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.2;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
const STEM_W = 8;
/** Clear gap: arm leaves track, bead sits in white. */
const STEM_LEN = 22;
const POP_MS = 150;
const DRAG_SHRINK = 0.94;
const DOLLY_MS = 560;
const DOLLY_START = 0.84;
const CRUISE_DEG_MS = 0.14;
const CRUISE_MAX_DEG_MS = 0.32;

const DW = 390;
const DH = 844;
const HIT = 44;

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
 * True-circle crops — R chosen so 6/12 climb into the corners (not a flat bowl);
 * 9/3 bow inward toward the bead; diagonals stay one corner.
 */
const SIDE_R = 500;
const SIDE_BEAD_X = -32;
const DIAG_R = 500;
/** Climb into L/R: near-semicircle of a true circle. */
const SMILE_R = 270;
const SMILE_HALF = 102;
const TOP_RIM_Y = 48;
const BOTTOM_KISS_Y = DH - TRACK_STROKE / 2;

const sideCx = (left: boolean) => (left ? SIDE_R + SIDE_BEAD_X : DW - (SIDE_R + SIDE_BEAD_X));

const GEOM_DESIGN: Record<CgStation, Geom> = {
  borrow: {
    cx: sideCx(true),
    cy: DH / 2,
    r: SIDE_R,
    arcs: [
      { deg0: 210, deg1: 255 },
      { deg0: 285, deg1: 330 },
    ],
    toggleDeg: 270,
  },
  lend: {
    cx: sideCx(false),
    cy: DH / 2,
    r: SIDE_R,
    arcs: [
      { deg0: 30, deg1: 75 },
      { deg0: 105, deg1: 150 },
    ],
    toggleDeg: 90,
  },
  wish: {
    cx: 470,
    cy: 470,
    r: DIAG_R,
    arcs: [{ deg0: 288, deg1: 348 }],
    toggleDeg: 315,
  },
  fund: {
    cx: 470,
    cy: DH - 470,
    r: DIAG_R,
    arcs: [{ deg0: 192, deg1: 252 }],
    toggleDeg: 225,
  },
  give: {
    cx: DW - 470,
    cy: 470,
    r: DIAG_R,
    arcs: [{ deg0: 12, deg1: 72 }],
    toggleDeg: 45,
  },
  trade: {
    cx: DW - 470,
    cy: DH - 470,
    r: DIAG_R,
    arcs: [{ deg0: 108, deg1: 168 }],
    toggleDeg: 135,
  },
  exit: {
    cx: DW / 2,
    cy: TOP_RIM_Y + SMILE_R,
    r: SMILE_R,
    arcs: [{ deg0: 360 - SMILE_HALF, deg1: SMILE_HALF }],
    toggleDeg: 0,
  },
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
  const arcsSrc = t < 0.5 ? a.arcs : b.arcs;
  const arcsDst = t < 0.5 ? b.arcs : a.arcs;
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const arcs =
    arcsSrc.length === arcsDst.length
      ? arcsSrc.map((s, i) => ({
          deg0: lerpAngle(s.deg0, arcsDst[i]!.deg0, u),
          deg1: lerpAngle(s.deg1, arcsDst[i]!.deg1, u),
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
  return `#${[lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t)]
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")}`;
};

/**
 * Arm on INSIDE of track → bead into content (toward centre).
 * At 6:00: attach low on track, bead ABOVE in white, arm UP.
 */
const organismParts = (g: Geom, pop: number) => {
  const R = g.r * (1 - (1 - DRAG_SHRINK) * pop);
  const u = outward(g.toggleDeg);
  const attachR = Math.max(12, R - TRACK_STROKE / 2);
  const attach = { x: g.cx + attachR * u.x, y: g.cy + attachR * u.y };
  const beadR = Math.max(6, attachR - STEM_LEN - TOGGLE_OUTER_R);
  const bead = { x: g.cx + beadR * u.x, y: g.cy + beadR * u.y };
  const stemTip = {
    x: bead.x + u.x * (TOGGLE_INNER_R * 0.4),
    y: bead.y + u.y * (TOGGLE_INNER_R * 0.4),
  };
  // Ghost sits ON the stroke centreline (track), not in content.
  const track = { x: g.cx + R * u.x, y: g.cy + R * u.y };
  return { R, bead, stemRoot: attach, stemTip, stemLen: STEM_LEN, attach, track };
};

const peekPath = (sx: number, sy: number) => {
  const cx = (DW / 2) * sx;
  const cy = 200 * sy;
  const r = 360 * ((sx + sy) / 2);
  return oneArc(cx, cy, r, 320, 40);
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
  const cruiseVel = useRef(0);
  const cruisingRef = useRef(false);
  const holdTimer = useRef(0);
  const drag = useRef<{
    id: number;
    moved: boolean;
    start: CgStation;
    x: number;
    y: number;
    t: number;
    angle: number;
  } | null>(null);

  const goRef = useRef<(s: CgStation) => void>(() => {});
  const nearestRef = useRef<(d: number) => CgStation>(() => "everything");
  const neighbourRef = useRef<(s: CgStation, dir: 1 | -1) => CgStation>((s) => s);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

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

  useEffect(
    () => () => {
      clearTimeout(holdTimer.current);
      cancelAnimationFrame(cruiseRaf.current);
    },
    [],
  );

  useEffect(() => {
    // External mode changes (not exit — exit is tap-only).
    if (value !== "exit" as never) setGoal(value);
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

  /** Nearest parkable seat in travel direction (may be exit — park only). */
  const nearestInDir = (deg: number, dir: 1 | -1): CgStation => {
    let best: CgStation = nearest(deg);
    let bestD = Infinity;
    for (const s of STATIONS) {
      const d = turn(deg, clockOf(s));
      if (dir > 0 && d < -1) continue;
      if (dir < 0 && d > 1) continue;
      const ad = Math.abs(d);
      if (ad < bestD) {
        bestD = ad;
        best = s;
      }
    }
    // If nothing ahead, fall back to absolute nearest.
    if (bestD === Infinity) return nearest(deg);
    return best;
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

  /**
   * Park at a seat. Exit is parkable — does NOT leave Communi-G.
   * Leaving is only via exitByTap().
   */
  const go = (s: CgStation) => {
    if (s !== "exit" && s !== value) {
      haptics.light();
      onChange(s);
    } else if (s === "exit") {
      haptics.light();
    }
    setGoal(s);
  };

  /** Explicit tap on my-g bead — the ONLY way out to Living G. */
  const exitByTap = () => {
    haptics.light();
    stopCruise();
    drag.current = null;
    setDragging(false);
    onExitRef.current();
  };

  goRef.current = go;
  nearestRef.current = nearest;
  neighbourRef.current = neighbour;

  /**
   * Auto-run: rolls PAST seats while held. No mid-seat snap-stop.
   * On finger-up: coast then snap nearest in travel direction (exit parks only).
   */
  const startCruise = (dir: 1 | -1, speed: number) => {
    cancelAnimationFrame(cruiseRaf.current);
    lastDir.current = dir;
    const mag = Math.min(CRUISE_MAX_DEG_MS, Math.max(CRUISE_DEG_MS, Math.abs(speed)));
    cruiseVel.current = dir * mag;
    cruisingRef.current = true;
    setCruising(true);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, Math.max(0, now - last));
      last = now;
      // Let-go: snap nearest in travel direction (follow track via go snap). No long coast past seats.
      if (!drag.current) {
        stopCruise();
        goRef.current(nearestInDir(posRef.current, lastDir.current));
        return;
      }
      if (Math.abs(cruiseVel.current) < CRUISE_DEG_MS * 0.5) {
        cruiseVel.current = lastDir.current * CRUISE_DEG_MS;
      }
      // Hold: keep rolling PAST seats — no per-seat snap-stop.
      put(posRef.current + cruiseVel.current * dt);
      cruiseRaf.current = requestAnimationFrame(step);
    };
    cruiseRaf.current = requestAnimationFrame(step);
  };

  // Snap animation to goal — never calls onExit (tap-only).
  useEffect(() => {
    if (dragging || cruisingRef.current || !size.w) return;
    const from = posRef.current;
    const delta = turn(from, clockOf(goal));
    if (Math.abs(delta) < 0.05) {
      put(clockOf(goal));
      animatePop(0);
      return;
    }
    const steps = Math.max(1, Math.round(Math.abs(delta) / 45));
    const dur = Math.min(SNAP_MS * steps, 580);
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

  /** Ghost = next seat's coloured bead ON the track (stroke), not mid-content. */
  const plugs =
    w && (dragging || cruising || pop > 0.25)
      ? [towardSeat]
          .map((s) => {
            const g = designAt(s);
            const p = organismParts(g, 0);
            const dist = Math.abs(turn(pos, clockOf(s)));
            const opacity = Math.min(0.95, 0.35 + blend * 0.65);
            return { s, track: p.track, opacity: s === towardSeat ? opacity : Math.max(0, 0.3 - dist / 100), colour: colourOf(s) };
          })
          .filter((p) => p.opacity > 0.08 && p.s !== shown)
      : [];

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - live!.cx;
    const y = clientY - r.top - live!.cy;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

  const dollyScale = lerp(DOLLY_START, 1, dolly);
  const originX = parts ? (parts.bead.x / (w || 1)) * 100 : 50;
  const originY = parts ? (parts.bead.y / (h || 1)) * 100 : 50;

  const titleSize = word === "communi-g" ? 8.2 : word.length > 5 ? 9.5 : 11;

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
      {w && pop > 0.04 ? (
        <svg className="pointer-events-none absolute left-0 top-0 z-[5]" width={w} height={h} aria-hidden="true" data-cg-peek="">
          <path
            d={peekPath(sx, sy)}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_STROKE * 0.85}
            strokeLinecap="butt"
            opacity={Math.min(0.5, pop * 0.5)}
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
          <svg className="pointer-events-none absolute left-0 top-0" width={w} height={h} aria-hidden="true" data-cg-world="">
            <path
              d={pathD}
              fill="none"
              stroke={RED}
              strokeWidth={TRACK_STROKE}
              strokeLinecap="round"
              data-cg-loop=""
              data-cg-track-w={TRACK_STROKE.toFixed(2)}
              data-cg-cx={live.cx.toFixed(1)}
              data-cg-cy={live.cy.toFixed(1)}
            />

            {plugs.map((p) => (
              <g key={p.s} opacity={p.opacity} data-cg-plug={p.s}>
                {/* Coloured bead ON the track — solid ring language of middle-loop seat hint. */}
                <circle
                  cx={p.track.x}
                  cy={p.track.y}
                  r={TOGGLE_STROKE_R * sx}
                  fill="none"
                  stroke={p.colour}
                  strokeWidth={TOGGLE_RING * sx}
                />
                <circle cx={p.track.x} cy={p.track.y} r={(TOGGLE_INNER_R - 0.5) * sx} fill="var(--world-bg)" />
              </g>
            ))}

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
                  aria-label={s === "exit" ? "my g — leave communi-g" : s}
                  data-cg-loop-hit={s}
                  data-cg-dot-hit={s}
                  onClick={() => {
                    if (dragging || cruisingRef.current) return;
                    if (s === "exit") {
                      // Tap my-g bead: leave only when already at/near 12. Otherwise park there.
                      const atExit =
                        Math.abs(turn(posRef.current, clockOf("exit"))) < 35 ||
                        nearest(posRef.current) === "exit" ||
                        goal === "exit";
                      if (atExit) exitByTap();
                      else go("exit");
                      return;
                    }
                    if (snappingRef.current) return;
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
              overflow: "visible",
            }}
            role="slider"
            tabIndex={0}
            aria-label="communi-g mode"
            aria-valuetext={shown === "exit" ? "my g" : shown}
            data-cg-toggle=""
            data-cg-seat={shown}
            data-cg-settled={settled ? "1" : "0"}
            onPointerDown={(e) => {
              if (snappingRef.current) return;
              e.stopPropagation();
              clearTimeout(holdTimer.current);
              stopCruise();
              const rect = stage.current!.getBoundingClientRect();
              const angle = live
                ? wrap(
                    (Math.atan2(e.clientX - rect.left - live.cx, -(e.clientY - rect.top - live.cy)) * 180) /
                      Math.PI,
                  )
                : posRef.current;
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
              holdTimer.current = window.setTimeout(() => {
                if (!drag.current || drag.current.moved) return;
                startCruise(lastDir.current, CRUISE_DEG_MS);
              }, 120);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId || snappingRef.current) return;
              if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
              clearTimeout(holdTimer.current);
              const now = performance.now();
              const finger = thetaForFinger(e.clientX, e.clientY);
              const delta = turn(d.angle, finger);
              const dt = Math.max(8, now - d.t);
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
              const moved = d.moved;
              drag.current = null;
              setDragging(false);
              if (moved || cruisingRef.current) {
                if (!cruisingRef.current) {
                  go(nearestInDir(posRef.current, lastDir.current));
                  animatePop(0);
                }
              } else {
                stopCruise();
                animatePop(0);
                // Tap on the my-g bead while parked at 12 — the only leave gesture.
                if (nearest(posRef.current) === "exit" || goal === "exit") {
                  exitByTap();
                }
              }
            }}
            onPointerCancel={() => {
              const d = drag.current;
              clearTimeout(holdTimer.current);
              const moved = !!d?.moved;
              drag.current = null;
              setDragging(false);
              if (moved || cruisingRef.current) {
                if (!cruisingRef.current) go(nearestInDir(posRef.current, lastDir.current));
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
              style={{ overflow: "visible" }}
            >
              <circle r={TOGGLE_INNER_R - 0.3} fill="var(--world-bg)" />
              <circle r={TOGGLE_STROKE_R} fill="none" stroke={colour} strokeWidth={TOGGLE_RING} data-cg-ring="" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                y={0.4}
                fill={colour}
                style={{
                  fontFamily: "var(--giver-font, system-ui)",
                  fontSize: titleSize,
                  fontWeight: 700,
                  letterSpacing: word === "communi-g" ? "-0.03em" : "0.02em",
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
