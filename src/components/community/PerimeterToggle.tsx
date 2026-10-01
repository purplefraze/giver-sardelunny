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
 * COMMUNI-G LOWER LOOP — CANONICAL LIVING_G_PATH (Frazer, 1 Oct 2026).
 *
 * Red track IS the locked lower loop of LIVING_G_PATH (+ LIVING_G_TRANSFORM),
 * drawn via GThinMask-pattern erosion — same path as LivingG. Not CIRCLE_R.
 * Mouth stays OPEN.
 *
 * ONE CLOCK (direct manipulation — finger = toggle):
 *   Pointer down → capture. Every move writes ONE angle immediately.
 *   Bead and camera frame are pure functions of that same angle in the same paint.
 *   No freeze, easeInOut, spring, catch-up, dolly or second camera timer.
 *   Colour + bead word hard-swap ONLY when bead centre crosses next labeled seat.
 *   Detent haptic on cross only — never magnet off finger.
 *   Pointer up ONLY eased: settle nearest labeled ≤ SNAP_MS (180) easeOut
 *   (no overshoot). Camera is sampled from that settling angle every frame.
 *   Tap 12 exits; tap elsewhere no travel.
 *
 * No off-track ghost blobs (no filled circle not on the stroke).
 * Toggle = circle bead + rectangular arm (STEM_LEN 12), ONE piece every seat.
 * Visible ~12px square neck; track-facing 90° end kisses painted INNER wall
 * (gap arm-end→red = 0, no bleed). Bead in white; tip buried in bead ring.
 * Stroke: LAND_STROKE_PX 17, geometricPrecision, open mouth, empty hole.
 */
/** Bead sized so "communi-g" fits in full. */
const TOGGLE_OUTER_R = 32;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.2;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
/** Rectangular arm width (screen px) — square-cut 90° ends. */
const STEM_W = 10;
/** Visible square neck from painted inner wall to bead outer edge (screen px). */
const STEM_LEN = 12;
/** First pointer move ≥ ARM_PX drives immediately (no travel-delay gate). */
const ARM_PX = 2;
/** Release settle to nearest labeled — ≤180ms easeOut only, no coast/overshoot. */
const SNAP_MS = 180;
/** One labeled seat (~45°). */
const SEAT_SPAN_DEG = 45;
/** 3 invisible detents between labeled seats → ~11.25° each (haptic only). */
const DETENT_SPAN_DEG = SEAT_SPAN_DEG / 4;

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
/** One camera scale at rest, under the finger, and through release. */
const FRAME_SFIT = 1.85;
/** Outer rim inset from the kissed screen edge (6 bottom / 12 top / give TR). */
const EDGE_INSET = 20;
/** No separate swoop clock — camera eases only with release settle (SNAP_MS). */

/**
 * ONE colour source: styles.css --mode-* tokens (same map CG_COLOUR / LoopLabel
 * read). Hex resolved at call time — hard-swap only, no travel lerp.
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

/** Min fill radius along clock-ray (viewBox). First ink from centre — full-path INNER wall. 0 = none. */
const rayMinInk = (deg: number): number => {
  const u = outward(deg);
  let lo = 0;
  let hi = 0;
  let found = false;
  for (let r = 40; r <= RIM_FULL + 80; r += 10) {
    if (isInkVb({ x: C.x + r * u.x, y: C.y + r * u.y })) {
      hi = r;
      found = true;
      break;
    }
    lo = r;
  }
  if (!found) return 0;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (isInkVb({ x: C.x + mid * u.x, y: C.y + mid * u.y })) hi = mid;
    else lo = mid;
  }
  return hi;
};
const rayMinCache = new Map<number, number>();
const rayMinInkCached = (deg: number) => {
  const k = Math.round(wrap(deg) * 2) / 2;
  let v = rayMinCache.get(k);
  if (v == null) {
    v = rayMinInk(k);
    rayMinCache.set(k, v);
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
 * ONE frame from ONE angle. The live lower-loop point stays kissed to the
 * matching screen edge while the phone-sized viewport rides the arc.
 */
const frameOf = (w: number, h: number, deg: number): Frame => {
  const sFit = FRAME_SFIT;
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
 * Rectangular arm path in screen space: square ends (90° cut), centreline tip→root.
 * Root = track-facing flush face on painted inner wall; tip buried in bead ring.
 */
const armPath = (
  tip: { x: number; y: number },
  root: { x: number; y: number },
  w: number,
): string => {
  const dx = root.x - tip.x;
  const dy = root.y - tip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const hw = w / 2;
  const x0 = tip.x + px * hw;
  const y0 = tip.y + py * hw;
  const x1 = tip.x - px * hw;
  const y1 = tip.y - py * hw;
  const x2 = root.x - px * hw;
  const y2 = root.y - py * hw;
  const x3 = root.x + px * hw;
  const y3 = root.y + py * hw;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
};

/**
 * Circle bead + rectangular arm, ONE piece. Arm along +u toward track.
 * Track-facing end = square cut flush on painted INNER wall (attachR).
 * STEM_LEN 12 + STEM_W: visible square neck; square end on INNER wall.
 * Mouth seats: ride NEAREST ink so bead never floats.
 */
const organismParts = (deg: number, f: Frame) => {
  const sFit = f.sFit || 1;
  const pin = pinInkVb(deg, sFit);
  const dx = pin.x - C.x;
  const dy = pin.y - C.y;
  const pinR = Math.hypot(dx, dy) || rimAt(sFit);
  const u = { x: dx / pinR, y: dy / pinR };
  /**
   * Attach = PAINTED (eroded) INNER wall of the real path along this ray.
   * Full-path inner = rayMinInk; erosion pushes that edge outward by erodeInset.
   * Mouth / empty ray: fall back to nearest-ink pin inset by painted width.
   * Camera pin stays (d29a04b) — bead may sit in the overflow sliver past pin.
   */
  const hitMin = rayMinInkCached(deg);
  const hitMax = rayMaxInkCached(deg);
  const erode = erodeInsetVb(sFit);
  const paintedW = sourceWeightVb(sFit);
  let attachR: number;
  if (hitMin >= 40 && hitMax > hitMin + paintedW * 0.5) {
    // Path-accurate painted INNER (full inner + erode).
    attachR = hitMin + erode;
  } else {
    // Empty paper (mouth): nearest outer pin − painted width.
    attachR = Math.max(12, pinR - paintedW);
  }
  const attachVb = { x: C.x + attachR * u.x, y: C.y + attachR * u.y };
  // Screen-fixed stem + bead radius → viewBox inward from attach.
  const inwardVb = (STEM_LEN + TOGGLE_OUTER_R) / sFit;
  const beadR = Math.max(6, attachR - inwardVb);
  const beadVb = { x: C.x + beadR * u.x, y: C.y + beadR * u.y };
  const attach = toScreen(f, attachVb);
  const bead = toScreen(f, beadVb);
  // Tuck root ~1px into stroke — kill air hairline, no visible red bleed.
  const tuck = 1;
  const stemRoot = { x: attach.x + u.x * tuck, y: attach.y + u.y * tuck };
  // Tip buried in the ring stroke so arm + circle read as one piece.
  const stemTip = {
    x: bead.x + u.x * (TOGGLE_INNER_R * 0.4),
    y: bead.y + u.y * (TOGGLE_INNER_R * 0.4),
  };
  const erodedOuterR = hitMax > hitMin ? hitMax - erode : rimAt(sFit);
  const track = toScreen(f, { x: C.x + erodedOuterR * u.x, y: C.y + erodedOuterR * u.y });
  const onStroke = hitMax >= rimAt(sFit) * 0.55 || isInkVb(attachVb);
  return { bead, stemRoot, stemTip, attach, track, u, onStroke };
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
  const lastDir = useRef<1 | -1>(1);
  const settleRaf = useRef(0);
  /** Last detent / labeled seat that already fired this hold (finger-follow). */
  const followDetentRef = useRef(0);
  const followLabeledRef = useRef<CgStation>("everything");
  /** Hard-swap seat shown while dragging (colour + word). */
  const [dragSeat, setDragSeat] = useState<CgStation>(value);
  const drag = useRef<{
    id: number;
    /** True after first move ≥ ARM_PX — finger drives bead. Tap stays put. */
    armed: boolean;
    start: CgStation;
    x: number;
    y: number;
    t: number;
    downAt: number;
    angle: number;
  } | null>(null);

  const goRef = useRef<(s: CgStation, opts?: { quiet?: boolean }) => void>(() => {});
  const nearestRef = useRef<(d: number) => CgStation>(() => "everything");
  const neighbourRef = useRef<(s: CgStation, dir: 1 | -1) => CgStation>((s) => s);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

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

  useEffect(
    () => () => {
      cancelAnimationFrame(settleRaf.current);
    },
    [],
  );

  useEffect(() => {
    // External mode changes (not exit — exit is tap-only).
    if (value !== "exit" as never) {
      setGoal(value);
      if (!drag.current) {
        followLabeledRef.current = value;
        setDragSeat(value);
      }
    }
  }, [value]);

  /** Bead and camera consume the exact same angle in the same render. */
  const liveAngle = wrap(pos);
  const frame = useMemo(
    () => frameOf(size.w || DW, size.h || DH, liveAngle),
    [size.w, size.h, liveAngle],
  );
  const centreScreen = useMemo(() => toScreen(frame, C), [frame]);
  /** White hole = working page in open paper; the seat word lives in the bead. */
  const hole = useMemo(() => {
    const w = size.w || DW;
    const h = size.h || DH;
    const inset = 12;
    const u = outward(liveAngle);
    const motionBand = 72;
    const band = motionBand;
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
  }, [size.w, size.h, liveAngle]);

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

  /** Labeled seats + 3 invisible detents between each pair (~11.25°). No visible ticks. */
  const detentAngles = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < STATIONS.length; i++) {
      const a = clockOf(STATIONS[i]!);
      const b = clockOf(STATIONS[(i + 1) % STATIONS.length]!);
      const span = wrap(b - a) || 360;
      out.push(a);
      for (let k = 1; k <= 3; k++) out.push(wrap(a + (span * k) / 4));
    }
    return out;
  }, []);

  const nearestDetent = (deg: number): number => {
    let best = detentAngles[0] ?? 0;
    let bestD = Infinity;
    for (const a of detentAngles) {
      const d = Math.abs(turn(deg, a));
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
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
    drag.current = null;
    setDragging(false);
    cancelAnimationFrame(settleRaf.current);
    onExitRef.current();
  };

  goRef.current = go;
  nearestRef.current = nearest;
  neighbourRef.current = neighbour;

  /**
   * Direct finger-follow: bead angle = finger angle about the live loop centre (1:1).
   * No magnet / cruise / spring. Detent haptic on cross only.
   * Colour + word hard-swap ONLY when bead centre crosses next labeled seat.
   */
  const followFinger = (fingerDeg: number) => {
    const next = wrap(fingerDeg);

    const dirTurn = turn(posRef.current, next);
    if (Math.abs(dirTurn) >= 0.4) lastDir.current = dirTurn >= 0 ? 1 : -1;

    // Detent cross → selection tick (haptic only — never pulls bead).
    const dTarget = nearestDetent(next);
    const dBefore = turn(posRef.current, dTarget);
    const dAfter = turn(next, dTarget);
    const dCrossed =
      Math.abs(turn(followDetentRef.current, dTarget)) > 0.5 &&
      (Math.abs(dAfter) <= 1.2 ||
        (lastDir.current > 0 && dBefore > 0 && dAfter <= 0) ||
        (lastDir.current < 0 && dBefore < 0 && dAfter >= 0));
    if (dCrossed) {
      haptics.selection();
      followDetentRef.current = dTarget;
    }

    // Hard-swap colour/word when bead centre crosses next labeled seat clock.
    const curLabeled = followLabeledRef.current;
    const nextLabeled = neighbourRef.current(curLabeled, lastDir.current);
    const seatDeg = clockOf(nextLabeled);
    const sBefore = turn(posRef.current, seatDeg);
    const sAfter = turn(next, seatDeg);
    const seatCrossed =
      nextLabeled !== curLabeled &&
      (Math.abs(sAfter) <= 1.2 ||
        (lastDir.current > 0 && sBefore > 0 && sAfter <= 0) ||
        (lastDir.current < 0 && sBefore < 0 && sAfter >= 0));
    if (seatCrossed) {
      if (!dCrossed) haptics.selection();
      goRef.current(nextLabeled, { quiet: true });
      followLabeledRef.current = nextLabeled;
      setDragSeat(nextLabeled);
    }

    put(next);
  };

  /**
   * ONE settle clock on release / seat change. Only angle is animated; frameOf
   * samples it in the same paint. No second camera movement. Never calls onExit.
   */
  useEffect(() => {
    if (dragging || !size.w) return;
    cancelAnimationFrame(settleRaf.current);
    const toDeg = clockOf(goal);
    const fromPos = posRef.current;
    const delta = turn(fromPos, toDeg);

    if (Math.abs(delta) < 0.05) {
      put(toDeg);
      snappingRef.current = false;
      setSnapping(false);
      return;
    }

    const dur = Math.max(80, Math.min(SNAP_MS, (Math.abs(delta) / SEAT_SPAN_DEG) * SNAP_MS));
    const t0 = performance.now();
    snappingRef.current = true;
    setSnapping(true);

    const step = (now: number) => {
      const u = easeOut(Math.min(1, (now - t0) / dur));
      const next = fromPos + delta * u;
      followFinger(next);
      if (u >= 1) {
        put(toDeg);
        followLabeledRef.current = goal;
        setDragSeat(goal);
        snappingRef.current = false;
        setSnapping(false);
        return;
      }
      settleRaf.current = requestAnimationFrame(step);
    };
    settleRaf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(settleRaf.current);
      snappingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, dragging, size.w]);

  const { w, h } = size;
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2;
  /** Colour + word: last settled labeled seat until bead centre crosses next → hard swap. */
  const shown: CgStation = dragSeat;
  const colour = colourOf(shown);
  const word = wordOf(shown);

  const liveDeg = dragging || snapping ? wrap(pos) : clockOf(nearest(pos));
  const parts = w ? organismParts(liveDeg, frame) : null;
  /**
   * Keep bead mostly on-canvas but ALLOW overflow sliver so stemRoot can kiss
   * the true painted INNER wall (may sit past the kissed camera edge).
   * Do NOT pull back to camInner — that parked the bead on empty paper at 9:00
   * while real red lived in the clipped overflow (white gap).
   */
  if (parts && w) {
    // Allow bead centre into the edge sliver so contact reaches real paint.
    const margin = 10;
    const bx = Math.min(w - margin, Math.max(margin, parts.bead.x));
    const by = Math.min(h - margin, Math.max(margin, parts.bead.y));
    if (bx !== parts.bead.x || by !== parts.bead.y) {
      const dx = bx - parts.bead.x;
      const dy = by - parts.bead.y;
      parts.bead = { x: bx, y: by };
      parts.attach = { x: parts.attach.x + dx, y: parts.attach.y + dy };
      parts.stemRoot = { x: parts.stemRoot.x + dx, y: parts.stemRoot.y + dy };
      parts.stemTip = { x: parts.stemTip.x + dx, y: parts.stemTip.y + dy };
    }
  }
  /** Scale locked at 1 — no second animated value fights the shared angle. */
  const beadScale = 1;
  const loopScale = 1;

  /** No ghost plugs — filled circles off-stroke were waterbed artefacts. */
  const plugs: {
    s: CgStation;
    bead: { x: number; y: number };
    stemRoot: { x: number; y: number };
    stemTip: { x: number; y: number };
    onStroke: boolean;
    opacity: number;
    colour: string;
  }[] = [];

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const c = centreScreen;
    const x = clientX - r.left - c.x;
    const y = clientY - r.top - c.y;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

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
      data-cg-bead-s={beadScale.toFixed(3)}
      data-cg-r={rimAt(px).toFixed(1)}
      data-cg-track-w={LAND_STROKE_PX.toFixed(2)}
      data-cg-sfit={px.toFixed(3)}
      data-cg-weight="eroded"
      data-cg-camera="angle"
      data-cg-stroke-px={LAND_STROKE_PX}
      data-cg-seat-ms={SNAP_MS}
      data-cg-snap-ms={SNAP_MS}
      data-cg-stem-len={STEM_LEN}
      data-cg-detent={DETENT_SPAN_DEG}
      data-cg-toggle-d={TOGGLE_DIAM}
      data-cg-kind="living-g-path"
      data-cg-organism="1"
      data-cg-arm="inward-rect"
      data-cg-cruise="0"
      data-cg-frozen="0"
    >
      <div className="absolute inset-0">
        {w && parts ? (
          <>
            {/* Track — real scale; stage overflow clips. No landClipRect cheat. */}
            <svg
              className="pointer-events-none absolute left-0 top-0 overflow-hidden"
              width={w}
              height={h}
              aria-hidden="true"
              shapeRendering="geometricPrecision"
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
                data-cg-camera="angle"
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
                      shapeRendering="geometricPrecision"
                    />
                  </mask>
                </defs>
                <g
                  transform={`translate(${C.x} ${C.y}) scale(${loopScale}) translate(${-C.x} ${-C.y})`}
                >
                  <g transform={LIVING_G_TRANSFORM} fill={RED}>
                    <path
                      d={LIVING_G_PATH}
                      mask={`url(#${thinId})`}
                      shapeRendering="geometricPrecision"
                    />
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
                  <path
                    d={armPath(p.stemTip, p.stemRoot, STEM_W)}
                    fill={p.colour}
                    data-cg-ghost-arm=""
                  />
                  <circle
                    cx={p.bead.x}
                    cy={p.bead.y}
                    r={TOGGLE_OUTER_R}
                    fill={p.colour}
                    data-cg-ghost-fill=""
                  />
                </g>
              ))}
              <path
                d={armPath(parts.stemTip, parts.stemRoot, STEM_W)}
                fill={colour}
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
               const pt = organismParts(clockOf(s), frame).bead;
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
                    if (dragging) return;
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
              willChange: dragging || snapping ? "transform" : "auto",
            }}
            role="slider"
            tabIndex={0}
            aria-label="communi-g mode"
            aria-valuetext={shown === "exit" ? "my g" : shown}
            data-cg-toggle=""
            data-cg-seat={shown}
            data-cg-settled={settled ? "1" : "0"}
            data-cg-bead-s={beadScale.toFixed(3)}
            data-cg-pressed={dragging ? "1" : "0"}
            onPointerDown={(e) => {
              if (snappingRef.current) return;
              e.stopPropagation();
              // Cancel in-flight settle — finger takes over NOW.
              cancelAnimationFrame(settleRaf.current);
              snappingRef.current = false;
              setSnapping(false);
              const rect = stage.current!.getBoundingClientRect();
              const now = performance.now();
              const cx = centreScreen.x;
              const cy = centreScreen.y;
              const angle = wrap(
                (Math.atan2(e.clientX - rect.left - cx, -(e.clientY - rect.top - cy)) * 180) / Math.PI,
              );
              const start = nearest(posRef.current);
              drag.current = {
                id: e.pointerId,
                armed: false,
                start,
                x: e.clientX,
                y: e.clientY,
                t: now,
                downAt: now,
                angle,
              };
              followDetentRef.current = nearestDetent(posRef.current);
              followLabeledRef.current = start;
              setDragSeat(start);
              setDragging(true);
              haptics.light();
              (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId || snappingRef.current) return;
              const finger = thetaForFinger(e.clientX, e.clientY);
              const delta = turn(d.angle, finger);
              const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
              // First move ≥ ARM_PX drives immediately — no travel-delay gate.
              if (!d.armed) {
                if (moved >= ARM_PX || Math.abs(delta) >= 1) {
                  d.armed = true;
                  lastDir.current = delta >= 0 ? 1 : -1;
                  d.x = e.clientX;
                  d.y = e.clientY;
                  d.t = performance.now();
                  d.angle = finger;
                  followFinger(finger);
                }
                return;
              }
              // Armed: bead = finger about frozen centre. Never freeze while thumb moves.
              d.x = e.clientX;
              d.y = e.clientY;
              d.t = performance.now();
              d.angle = finger;
              followFinger(finger);
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              const wasArmed = d.armed;
              drag.current = null;
              setDragging(false);
              if (wasArmed) {
                // Settle nearest LABELED ≤ SNAP_MS easeOut — one clock with camera.
                go(nearest(posRef.current), { quiet: true });
              } else if (nearest(posRef.current) === "exit" || goal === "exit") {
                // Tap 12 exits; settle effect skipped after exitByTap clears freeze.
                exitByTap();
              }
               // else: tap elsewhere — dragging→false leaves the angle at its seat.
            }}
            onPointerCancel={() => {
              const d = drag.current;
              const wasArmed = !!d?.armed;
              drag.current = null;
              setDragging(false);
              if (wasArmed) go(nearest(posRef.current), { quiet: true });
            }}
            onLostPointerCapture={() => {
              const d = drag.current;
              if (!d) return;
              const wasArmed = d.armed;
              drag.current = null;
              setDragging(false);
              if (wasArmed) go(nearest(posRef.current), { quiet: true });
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
              data-cg-bead-shape="circle-arm"
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
