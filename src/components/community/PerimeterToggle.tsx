import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SEAT_ANGLE, SEAT_TITLE, type Seat } from "@/components/living-g/EarSelector";
import {
  G_REGION_BANDS,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";
import { G_STROKE } from "@/components/living-g/g-weight";
import type { CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER LOOP — CANONICAL LIVING_G_PATH (Frazer, 30 Sep 2026).
 *
 * Red track IS the locked lower loop of LIVING_G_PATH (+ LIVING_G_TRANSFORM),
 * drawn via GThinMask-pattern erosion — same path as LivingG. Not CIRCLE_R.
 * Mouth stays OPEN.
 *
 * ONE CAMERA, scale-around-pin (not two-shot cut, not recenter):
 *   REST   (zoom=0) — settled: sFit ~1.85, LIVE seat ink pinned to screen
 *           edge (EDGE_INSET). Overflow = continuous sliver; far side off-canvas.
 *   MOTION (zoom=1) — finger down / cruise: sFit ~1.32–1.42, scale DOWN around
 *           the SAME edge pin — loop shrinks toward press, ±1 neighbor seats.
 *           Never lerp look-at toward centre. Pin rides with camDeg (local wall).
 *   zoom lerps 0↔1 over SWOOP_MS (visible swoop). Never camT flip / clip swap.
 *
 * Stroke decoupled from camera: painted on-screen width ~LAND_STROKE_PX at both
 * ends via extra-erode (source_weight_vb ≈ LAND_STROKE_PX / sFit).
 *
 * Bentley: PRESS_MS 200, SEAT_MS 550, selection() every seat, no flick,
 * tap-only 12 exit, TOGGLE_OUTER_R 32, filled ghosts on-stroke, inward stem.
 */
const SNAP_MS = 220;
/** Bead sized so "communi-g" fits in full. */
const TOGGLE_OUTER_R = 32;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.2;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
const STEM_W = 8;
/** Clear gap: arm leaves track, bead sits in white — screen px (camera-independent). */
const STEM_LEN = 22;
const POP_MS = 150;
const DRAG_SHRINK = 0.94;
/** Bead grows on press — same pop breath as loop shrink. */
const BEAD_GROW = 1.12;
const DOLLY_MS = 560;
/** Start slightly tighter on entry, settle to rest crop. */
const DOLLY_START = 1.18;
/** Press beat before any travel. Tap / flick before beat stays put. */
const PRESS_MS = 200;
/** One seat (~45°) — 550ms/seat. */
const SEAT_SPAN_DEG = 45;
const SEAT_MS = 550;
const CRUISE_DEG_MS = SEAT_SPAN_DEG / SEAT_MS; // ≈ 0.082°/ms
/** Hard cap = cruise pace — never feed flick speed into roll. */
const CRUISE_MAX_DEG_MS = CRUISE_DEG_MS;

const DW = 390;
const DH = 844;
const HIT = 44;

const RED = "#E8322B";

const BAND = G_REGION_BANDS.bottom;
const C = LOOP_CENTRE.bottom;
/** Full (normal-weight) outer rim — pin/erode derive inward from this. */
const RIM_FULL = LOOP_RIM_RADIUS.bottom;
/** On-screen painted stroke width — both rest and motion. */
const LAND_STROKE_PX = 17;
/** REST camera: zoomed-in edge-sliver. */
const REST_SFIT = 1.85;
/** MOTION camera: scale-out around pin — enough for ±1 neighbour, far side off. */
const MOTION_SFIT = 1.40;
/** Outer rim inset from the kissed screen edge (6 bottom / 12 top / give TR). */
const EDGE_INSET = 20;
/** Visible one-camera swoop (press/cruise ↔ rest). Not a pop. */
const SWOOP_MS = 480;

/**
 * ONE colour source: styles.css --mode-* tokens (same map CG_COLOUR / LoopLabel
 * read). Hex resolved at call time for lerpHex — no second hard-coded table.
 */
const MODE_TOKEN: Record<string, string> = {
  everything: "--mode-communigy",
  fund: "--mode-fund",
  borrow: "--mode-borrow",
  wish: "--mode-wish",
  exit: "--mode-giver",
  give: "--mode-give",
  lend: "--mode-lend",
  trade: "--mode-trade",
};

const modeHex = (token: string): string => {
  if (typeof document === "undefined") return RED;
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return /^#[0-9a-fA-F]{3,8}$/i.test(v) ? v : RED;
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
const colourOf = (s: CgStation) => modeHex(MODE_TOKEN[s] ?? "--mode-communigy");

type Size = { w: number; h: number };

const RAD = Math.PI / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};
const easeOut = (u: number) => 1 - (1 - u) ** 3;
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
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

/** Clock deg → unit outward from LOOP_CENTRE.bottom (0 = 12:00, CW). */
const outward = (deg: number) => {
  const a = deg * RAD;
  return { x: Math.sin(a), y: -Math.cos(a) };
};

type Frame = {
  sFit: number;
  svgX: number;
  svgY: number;
  svgW: number;
  svgH: number;
};

/** ViewBox stroke width that paints LAND_STROKE_PX on screen at this sFit. */
const sourceWeightVb = (sFit: number) => LAND_STROKE_PX / Math.max(0.05, sFit);
/** Per-side erode from normal outline → source weight. */
const erodeInsetVb = (sFit: number) => (G_STROKE.normal - sourceWeightVb(sFit)) / 2;
/** Outer rim of the eroded stroke at this camera. */
const rimAt = (sFit: number) => RIM_FULL - erodeInsetVb(sFit);
const halfAt = (sFit: number) => sourceWeightVb(sFit) / 2;
/** Potrace-space mask stroke (GThinMask pattern): 2 × per-side × 10. */
const maskStrokePotrace = (sFit: number) => erodeInsetVb(sFit) * 2 * 10;

/** Lazy LIVING_G_PATH probe (potrace space) for mouth / on-stroke tests. */
let inkPathEl: SVGPathElement | null = null;
const ensureInkPath = (): SVGPathElement | null => {
  if (inkPathEl) return inkPathEl;
  if (typeof document === "undefined") return null;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  // Potrace space must be in viewBox or isPointInFill is unreliable.
  svg.setAttribute("viewBox", "0 0 6000 12000");
  svg.setAttribute("width", "60");
  svg.setAttribute("height", "120");
  svg.style.cssText = "position:absolute;left:-99999px;top:-99999px;opacity:0;pointer-events:none";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", LIVING_G_PATH);
  path.setAttribute("fill", "#000");
  svg.appendChild(path);
  document.body.appendChild(svg);
  inkPathEl = path;
  return path;
};
/** viewBox → potrace (inverse of LIVING_G_TRANSFORM). */
const toPotrace = (p: { x: number; y: number }) => ({ x: p.x * 10, y: (1133 - p.y) * 10 });
const isInkVb = (p: { x: number; y: number }): boolean => {
  const el = ensureInkPath();
  if (!el) return true;
  const pt = toPotrace(p);
  try {
    return el.isPointInFill(new DOMPoint(pt.x, pt.y));
  } catch {
    return true;
  }
};

/** Max fill radius along clock-ray (viewBox). 0 = empty paper (mouth). */
const rayMaxInk = (deg: number): number => {
  const u = outward(deg);
  let any = false;
  let seed = 0;
  for (let r = 90; r <= RIM_FULL + 30; r += 12) {
    if (isInkVb({ x: C.x + r * u.x, y: C.y + r * u.y })) {
      any = true;
      seed = r;
    }
  }
  if (!any) return 0;
  let lo = seed;
  let hi = Math.max(seed + 8, RIM_FULL + 40);
  // Expand hi until outside fill (or cap).
  while (hi < RIM_FULL + 80 && isInkVb({ x: C.x + hi * u.x, y: C.y + hi * u.y })) hi += 12;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (isInkVb({ x: C.x + mid * u.x, y: C.y + mid * u.y })) lo = mid;
    else hi = mid;
  }
  return lo;
};

const rayMaxCache = new Map<number, number>();
const rayMaxInkCached = (deg: number) => {
  const k = Math.round(wrap(deg) * 2) / 2;
  let v = rayMaxCache.get(k);
  if (v == null) {
    v = rayMaxInk(k);
    rayMaxCache.set(k, v);
  }
  return v;
};

/**
 * Pin point on LIVING ink for this clock seat.
 * Mouth seats (give ~1:30): clock-ray may miss — pin NEAREST painted outer point
 * so mouth shows as G feature and bead stays on-canvas. Never floating bead.
 */
const pinInkVb = (deg: number, sFit: number): { x: number; y: number } => {
  const u = outward(deg);
  const rim = rimAt(sFit);
  const hit = rayMaxInkCached(deg);
  if (hit >= rim * 0.55) {
    // Ray lands in stroke — pin outer painted edge (clamped near eroded rim).
    const r = Math.min(hit, rim + 1);
    return { x: C.x + r * u.x, y: C.y + r * u.y };
  }
  // Empty paper (mouth / gap): nearest painted outer sample.
  const ideal = { x: C.x + rim * u.x, y: C.y + rim * u.y };
  let best = ideal;
  let bestD = Infinity;
  for (let a = 0; a < 360; a += 2) {
    const r = rayMaxInkCached(a);
    if (r < 100) continue;
    const uu = outward(a);
    const p = { x: C.x + r * uu.x, y: C.y + r * uu.y };
    const d = (p.x - ideal.x) ** 2 + (p.y - ideal.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
};

/**
 * ONE frame: zoom 0 = rest sliver, 1 = motion (±1 neighbour).
 * Look-at = LIVE seat pin FIXED on rest screen edge (edgeX/edgeY).
 * Press only SCALES around that pin — never lerp look-at toward centre.
 * Pin rides with camDeg so the wall you are on stays (give→TR, 6→bottom…).
 */
const frameOf = (w: number, h: number, deg: number, zoom: number): Frame => {
  const z = Math.min(1, Math.max(0, zoom));
  const sFit = lerp(REST_SFIT, MOTION_SFIT, z);
  const u = outward(deg);
  const pin = pinInkVb(deg, sFit);
  // Always pin LIVE outer ink to kissed edge — scale around this screen point only.
  const edgeX = w / 2 + u.x * (w / 2 - EDGE_INSET);
  const edgeY = h / 2 + u.y * (h / 2 - EDGE_INSET);
  const svgX = edgeX - (pin.x - BAND.x) * sFit;
  const svgY = edgeY - (pin.y - BAND.y) * sFit;
  return { sFit, svgX, svgY, svgW: BAND.width * sFit, svgH: BAND.height * sFit };
};

const toScreen = (f: Frame, p: { x: number; y: number }) => ({
  x: f.svgX + (p.x - BAND.x) * f.sFit,
  y: f.svgY + (p.y - BAND.y) * f.sFit,
});

/**
 * Arm on INSIDE of track → bead into content (toward centre).
 * At 6:00: attach on inside of smile, bead ABOVE in white, arm UP.
 * Mouth seats: ride NEAREST ink (not empty paper) so bead never floats.
 * Stem/bead lengths are screen-px — divide by sFit for viewBox.
 */
const organismParts = (deg: number, f: Frame, pop: number) => {
  const shrink = 1 - (1 - DRAG_SHRINK) * pop;
  const sFit = f.sFit || 1;
  const half = halfAt(sFit) * shrink;
  const pin = pinInkVb(deg, sFit);
  const dx = pin.x - C.x;
  const dy = pin.y - C.y;
  const pinR = Math.hypot(dx, dy) || rimAt(sFit);
  const u = { x: dx / pinR, y: dy / pinR };
  const rim = pinR * shrink;
  // Inner wall of the stroke — stem roots here (inside of the red path).
  const attachR = Math.max(12, rim - half);
  const attachVb = { x: C.x + attachR * u.x, y: C.y + attachR * u.y };
  // Screen-fixed stem + bead → viewBox inward.
  const inwardVb = (STEM_LEN + TOGGLE_OUTER_R) / sFit;
  const beadR = Math.max(6, attachR - inwardVb);
  const beadVb = { x: C.x + beadR * u.x, y: C.y + beadR * u.y };
  const attach = toScreen(f, attachVb);
  const bead = toScreen(f, beadVb);
  // Tip buried in the ring stroke toward the track (middle-loop language).
  const stemTip = {
    x: bead.x + u.x * (TOGGLE_INNER_R * 0.4),
    y: bead.y + u.y * (TOGGLE_INNER_R * 0.4),
  };
  const track = toScreen(f, { x: C.x + rim * u.x, y: C.y + rim * u.y });
  const onStroke = rayMaxInkCached(deg) >= rimAt(sFit) * 0.55 || isInkVb(attachVb);
  return { bead, stemRoot: attach, stemTip, attach, track, u, onStroke };
};

export function PerimeterToggle({
  value,
  onChange,
  onExit,
  children,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  onExit: () => void;
  children?: ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const thinId = `cg-thin-${useId().replace(/:/g, "")}`;
  const [size, setSize] = useState<Size>({ w: DW, h: DH }); /* design size → red smile on first paint */
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
  /** One-camera swoop 0=rest … 1=motion (eased, never flipped). */
  const [zoom, setZoom] = useState(0);
  const zoomRef = useRef(0);
  const zoomRaf = useRef(0);
  const holdTimer = useRef(0);
  /** First seat this hold — brief land once; later seats tick without magnet-stop. */
  const firstClickRef = useRef(false);
  const holdOriginRef = useRef<CgStation>("everything");
  const drag = useRef<{
    id: number;
    /** True after PRESS_MS — travel may start. Tap before armed stays put. */
    armed: boolean;
    start: CgStation;
    x: number;
    y: number;
    t: number;
    /** Pointerdown time — gate uses this (never overwritten by moves). */
    downAt: number;
    angle: number;
  } | null>(null);

  const goRef = useRef<(s: CgStation, opts?: { quiet?: boolean }) => void>(() => {});
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
    /** Ignore width OR height ≤ 1. Keep DW×DH until both real. Never set size to 0
     *  (geom null when w=0 blanks the red smile forever on published preview). */
    const measure = () => {
      const mw = el.clientWidth;
      const mh = el.clientHeight;
      if (mw <= 1 || mh <= 1) return;
      setSize({ w: mw, h: mh });
    };
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
      cancelAnimationFrame(zoomRaf.current);
    },
    [],
  );

  /** Shot/debug only: freeze press breath (grown bead + shrunk loop) without cruise. */
  useEffect(() => {
    const w = window as Window & { __cgForcePress?: (on: boolean) => void };
    w.__cgForcePress = (on) => {
      cancelAnimationFrame(popRaf.current);
      popRef.current = on ? 1 : 0;
      setPop(on ? 1 : 0);
    };
    return () => {
      delete w.__cgForcePress;
    };
  }, []);

  useEffect(() => {
    // External mode changes (not exit — exit is tap-only).
    if (value !== "exit" as never) setGoal(value);
  }, [value]);

  /** Live clock — follows bead while dragging/cruising/snapping. */
  const camDeg = wrap(pos);
  /** Motion target while finger drives; rest on release. Zoom eases — never flips. */
  const zoomTarget = dragging || cruising || pop > 0.15 ? 1 : 0;
  useEffect(() => {
    cancelAnimationFrame(zoomRaf.current);
    const from = zoomRef.current;
    const to = zoomTarget;
    if (Math.abs(to - from) < 0.001) {
      zoomRef.current = to;
      setZoom(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const u = easeInOut(Math.min(1, (now - t0) / SWOOP_MS));
      const v = from + (to - from) * u;
      zoomRef.current = v;
      setZoom(v);
      if (u < 1) zoomRaf.current = requestAnimationFrame(step);
    };
    zoomRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(zoomRaf.current);
  }, [zoomTarget]);

  /** One camera: rest↔motion via eased zoom. No landClipRect / camT cut. */
  const frame = useMemo(
    () => frameOf(size.w || DW, size.h || DH, camDeg, zoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.w, size.h, camDeg, zoom],
  );
  const centreScreen = useMemo(() => toScreen(frame, C), [frame]);
  const inMotion = zoom > 0.55;
  /**
   * White hole = working page (CG_WORD) in open paper — not on the edge sliver.
   * Sliver depth eases with zoom (rest: deeper edge band; motion: tighter).
   */
  const hole = useMemo(() => {
    const w = size.w || DW;
    const h = size.h || DH;
    const inset = 12;
    const u = outward(camDeg);
    const diag = Math.abs(u.x) >= 0.35 && Math.abs(u.y) >= 0.35;
    const restBand = diag ? 150 : 92;
    const motionBand = 72;
    const band = lerp(restBand, motionBand, zoom);
    let left = inset;
    let top = inset;
    let right = w - inset;
    let bottom = h - inset;
    if (u.y > 0.35) bottom = Math.min(bottom, h - band);
    if (u.y < -0.35) top = Math.max(top, band);
    if (u.x > 0.35) right = Math.min(right, w - band);
    if (u.x < -0.35) left = Math.max(left, band);
    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [size.w, size.h, camDeg, zoom]);

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
  const go = (s: CgStation, opts?: { quiet?: boolean }) => {
    const quiet = !!opts?.quiet;
    if (s !== "exit" && s !== value) {
      if (!quiet) haptics.light();
      onChange(s);
    } else if (s === "exit") {
      if (!quiet) haptics.light();
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
   * Hold cruise (only after PRESS_MS gate): clock-tick selection() on every
   * seat-clock cross; go() settles word/colour. First seat may land briefly;
   * no magnet-stop after first. No tick before gate / on quiet finger-up snap.
   * Continuous roll at ~SEAT_MS/seat while finger is down.
   */
  const startCruise = (dir: 1 | -1) => {
    cancelAnimationFrame(cruiseRaf.current);
    lastDir.current = dir;
    firstClickRef.current = false;
    holdOriginRef.current = drag.current?.start ?? nearestRef.current(posRef.current);
    /** Last seat already ticked this hold — next cross is its neighbour. */
    let lastTicked: CgStation = holdOriginRef.current;
    cruiseVel.current = dir * CRUISE_DEG_MS;
    cruisingRef.current = true;
    setCruising(true);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, Math.max(0, now - last));
      last = now;
      // Finger gone: no coast — vel already zeroed on up; snap nearest only.
      if (!drag.current) {
        stopCruise();
        goRef.current(nearestRef.current(posRef.current), { quiet: true });
        return;
      }
      // Fixed Bentley pace — hard cap, no flick speed, no psycho ramp.
      cruiseVel.current = lastDir.current * Math.min(CRUISE_MAX_DEG_MS, CRUISE_DEG_MS);
      const next = posRef.current + cruiseVel.current * dt;

      // Every seat-clock cross while cruising: selection tick + go settle.
      const target = neighbourRef.current(lastTicked, lastDir.current);
      const tDeg = clockOf(target);
      const before = turn(posRef.current, tDeg);
      const after = turn(next, tDeg);
      const crossed =
        Math.abs(after) <= 1.5 ||
        (lastDir.current > 0 && before > 0 && after <= 0) ||
        (lastDir.current < 0 && before < 0 && after >= 0);
      if (crossed) {
        haptics.selection();
        goRef.current(target, { quiet: true }); // word/colour settle; selection was the tick
        lastTicked = target;
        if (!firstClickRef.current) {
          put(tDeg);
          firstClickRef.current = true;
          // Keep rolling past — no magnet-stop on following seats.
          put(tDeg + cruiseVel.current * Math.min(dt, 8));
          cruiseRaf.current = requestAnimationFrame(step);
          return;
        }
        // After first: no magnet — fall through and continue at next.
      }

      put(next);
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

  const liveDeg = dragging || cruising || pop > 0.05 || snapping ? wrap(pos) : clockOf(nearest(pos));
  const parts = w ? organismParts(liveDeg, frame, pop) : null;
  /** Same pop / POP_MS / easeOut as loop shrink — one breath both ways. */
  const beadScale = 1 + (BEAD_GROW - 1) * pop;
  const loopScale = 1 - (1 - DRAG_SHRINK) * pop;

  /** Ghost = next seat's FILLED coloured bead ON the stroke — never a hollow ring.
   *  Hide if off-canvas OR off-path (e.g. green on lend / brown on borrow). */
  const plugs =
    w && (dragging || cruising || pop > 0.25)
      ? [towardSeat]
          .map((s) => {
            const p = organismParts(clockOf(s), frame, 0);
            const dist = Math.abs(turn(pos, clockOf(s)));
            const opacity = Math.min(0.95, 0.35 + blend * 0.65);
            return {
              s,
              track: p.track,
              onStroke: p.onStroke,
              opacity: s === towardSeat ? opacity : Math.max(0, 0.3 - dist / 100),
              colour: colourOf(s),
            };
          })
          .filter((p) => {
            if (p.opacity <= 0.08 || p.s === shown) return false;
            if (!p.onStroke) return false;
            const m = 8;
            return p.track.x >= -m && p.track.x <= w + m && p.track.y >= -m && p.track.y <= h + m;
          })
      : [];

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - centreScreen.x;
    const y = clientY - r.top - centreScreen.y;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

  const dollyScale = lerp(DOLLY_START, 1, dolly);
  const originX = parts ? (parts.bead.x / (w || 1)) * 100 : 50;
  const originY = parts ? (parts.bead.y / (h || 1)) * 100 : 50;

  const titleSize = word === "communi-g" ? 8.2 : word.length > 5 ? 9.5 : 11;
  const vb = `${BAND.x} ${BAND.y} ${BAND.width} ${BAND.height}`;
  const px = frame.sFit || 1;

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)", border: "none", boxShadow: "none", outline: "none" }}
      data-cg-stage=""
      data-cg-clock={wrap(pos).toFixed(1)}
      data-cg-snapping={snapping ? "1" : "0"}
      data-cg-pop={pop.toFixed(2)}
      data-cg-bead-s={beadScale.toFixed(3)}
      data-cg-r={rimAt(px).toFixed(1)}
      data-cg-track-w={LAND_STROKE_PX.toFixed(2)}
      data-cg-sfit={px.toFixed(3)}
      data-cg-zoom={zoom.toFixed(3)}
      data-cg-weight="eroded"
      data-cg-camera={inMotion ? "cruise" : "land"}
      data-cg-stroke-px={LAND_STROKE_PX}
      data-cg-seat-ms={SEAT_MS}
      data-cg-toggle-d={TOGGLE_DIAM}
      data-cg-kind="living-g-path"
      data-cg-organism="1"
      data-cg-dolly={dolly.toFixed(2)}
      data-cg-arm="inward"
      data-cg-cruise={cruising ? "1" : "0"}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${dollyScale})`,
          transformOrigin: `${originX}% ${originY}%`,
          willChange: dolly < 1 ? "transform" : "auto",
        }}
      >
        {w && parts ? (
          <>
            {/* Track — real scale; stage overflow clips. No landClipRect cheat. */}
            <svg
              className="pointer-events-none absolute left-0 top-0 overflow-hidden"
              width={w}
              height={h}
              aria-hidden="true"
              data-cg-world=""
              data-cg-track-band=""
            >
              <svg
                x={frame.svgX}
                y={frame.svgY}
                width={frame.svgW}
                height={frame.svgH}
                viewBox={vb}
                preserveAspectRatio="xMidYMid meet"
                overflow="hidden"
                data-cg-loop=""
                data-cg-track-w={LAND_STROKE_PX.toFixed(2)}
                data-cg-weight="eroded"
                data-cg-camera={inMotion ? "cruise" : "land"}
                data-cg-cx={centreScreen.x.toFixed(1)}
                data-cg-cy={centreScreen.y.toFixed(1)}
              >
                <defs>
                  {/* GThinMask pattern: luminance erode — source_weight_vb ≈ LAND_STROKE_PX / sFit */}
                  <mask id={thinId} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={16000} height={20000}>
                    <path
                      d={LIVING_G_PATH}
                      fill="#fff"
                      stroke="#000"
                      strokeWidth={maskStrokePotrace(px)}
                      strokeLinejoin="round"
                    />
                  </mask>
                </defs>
                <g
                  transform={`translate(${C.x} ${C.y}) scale(${loopScale}) translate(${-C.x} ${-C.y})`}
                >
                  <g transform={LIVING_G_TRANSFORM} fill={RED}>
                    <path d={LIVING_G_PATH} mask={`url(#${thinId})`} />
                  </g>
                </g>
              </svg>
            </svg>

            <svg
              className="pointer-events-none absolute left-0 top-0 overflow-visible"
              width={w}
              height={h}
              aria-hidden="true"
              data-cg-chrome=""
            >
              {plugs.map((p) => (
                <g key={p.s} opacity={p.opacity} data-cg-plug={p.s}>
                  <circle cx={p.track.x} cy={p.track.y} r={TOGGLE_STROKE_R} fill={p.colour} data-cg-ghost-fill="" />
                </g>
              ))}
              <line
                x1={parts.stemRoot.x}
                y1={parts.stemRoot.y}
                x2={parts.stemTip.x}
                y2={parts.stemTip.y}
                stroke={colour}
                strokeWidth={STEM_W}
                strokeLinecap="round"
                data-cg-stem-arm=""
              />
            </svg>
          </>
        ) : null}

        {/* White hole = the page. Absolute, inset from the stroke. */}
        {w && children ? (
          <div
            className="pointer-events-none absolute z-[5] overflow-hidden"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
            }}
            data-cg-interior=""
            data-cg-interior-w={hole.width.toFixed(1)}
            data-cg-interior-h={hole.height.toFixed(1)}
          >
            <div className="pointer-events-auto h-full w-full">{children}</div>
          </div>
        ) : null}

        {w
          ? STATIONS.map((s) => {
              const pt = organismParts(clockOf(s), frame, 0).bead;
              return (
                <button
                  key={s}
                  type="button"
                  className="pointer-events-auto absolute left-0 top-0 z-20 rounded-full [-webkit-tap-highlight-color:transparent]"
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
              width: TOGGLE_DIAM,
              height: TOGGLE_DIAM,
              transform: `translate(${(parts.bead.x - TOGGLE_OUTER_R).toFixed(2)}px, ${(parts.bead.y - TOGGLE_OUTER_R).toFixed(2)}px) scale(${beadScale.toFixed(4)})`,
              transformOrigin: "center center",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              border: "none",
              boxShadow: "none",
              overflow: "visible",
              willChange: dragging || cruising || snapping || pop > 0.02 ? "transform" : "auto",
            }}
            role="slider"
            tabIndex={0}
            aria-label="communi-g mode"
            aria-valuetext={shown === "exit" ? "my g" : shown}
            data-cg-toggle=""
            data-cg-seat={shown}
            data-cg-settled={settled ? "1" : "0"}
            data-cg-bead-s={beadScale.toFixed(3)}
            data-cg-pressed={pop > 0.5 ? "1" : "0"}
            onPointerDown={(e) => {
              if (snappingRef.current) return;
              e.stopPropagation();
              clearTimeout(holdTimer.current);
              stopCruise();
              const rect = stage.current!.getBoundingClientRect();
              const now = performance.now();
              const angle = wrap(
                (Math.atan2(e.clientX - rect.left - centreScreen.x, -(e.clientY - rect.top - centreScreen.y)) * 180) /
                  Math.PI,
              );
              drag.current = {
                id: e.pointerId,
                armed: false,
                start: nearest(posRef.current),
                x: e.clientX,
                y: e.clientY,
                t: now,
                downAt: now,
                angle,
              };
              setDragging(true);
              animatePop(1);
              haptics.light();
              (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
              // GATE: bead does not move for PRESS_MS. No travel / inertia / angle change.
              holdTimer.current = window.setTimeout(() => {
                const cur = drag.current;
                if (!cur || cur.id !== e.pointerId) return;
                // Elapsed check wins over timer races (device flick / jank).
                if (performance.now() - cur.downAt < PRESS_MS) return;
                cur.armed = true;
                startCruise(lastDir.current);
              }, PRESS_MS);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId || snappingRef.current) return;
              const finger = thetaForFinger(e.clientX, e.clientY);
              const delta = turn(d.angle, finger);
              // Ignore micro-jitter; real nudge updates hold direction only.
              // Before armed: never move bead, never clear press timer, never start travel.
              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 6 || Math.abs(delta) >= 2) {
                const dir: 1 | -1 = delta >= 0 ? 1 : -1;
                lastDir.current = dir;
                d.x = e.clientX;
                d.y = e.clientY;
                d.t = performance.now();
                d.angle = finger;
                // After armed: flip cruise dir only — never raise speed from flick.
                if (d.armed && cruisingRef.current) {
                  cruiseVel.current = dir * Math.min(CRUISE_MAX_DEG_MS, CRUISE_DEG_MS);
                }
              }
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              clearTimeout(holdTimer.current);
              const elapsed = performance.now() - d.downAt;
              // Elapsed gate wins — armed flag alone can race a near-zero flick.
              const wasHold = d.armed && elapsed >= PRESS_MS;
              drag.current = null;
              setDragging(false);
              // KILL FLICK/COAST: finger-up velocity = 0. No leftover speed into cruise.
              stopCruise();
              animatePop(0);
              if (wasHold) {
                // Short snap nearest seat only — no coast past seats, no run-on.
                go(nearest(posRef.current), { quiet: true });
              } else {
                // TAP / flick before gate — stay on current seat.
                if (nearest(posRef.current) === "exit" || goal === "exit") {
                  exitByTap();
                }
              }
            }}
            onPointerCancel={() => {
              const d = drag.current;
              clearTimeout(holdTimer.current);
              const elapsed = d ? performance.now() - d.downAt : 0;
              const wasHold = !!d?.armed && elapsed >= PRESS_MS;
              drag.current = null;
              setDragging(false);
              stopCruise();
              animatePop(0);
              if (wasHold) go(nearest(posRef.current), { quiet: true });
            }}
            onLostPointerCapture={() => {
              // Capture lost without up (device quirk) — same as cancel: no coast.
              const d = drag.current;
              if (!d) return;
              clearTimeout(holdTimer.current);
              const elapsed = performance.now() - d.downAt;
              const wasHold = d.armed && elapsed >= PRESS_MS;
              drag.current = null;
              setDragging(false);
              stopCruise();
              animatePop(0);
              if (wasHold) go(nearest(posRef.current), { quiet: true });
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
