import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
 * Red track IS the locked lower loop of LIVING_G_PATH (+ LIVING_G_TRANSFORM).
 * ViewBox / clip on G_REGION_BANDS.bottom — bowl + right mouth (My G–Give) subject;
 * middle/top not. Not SVG A-arc. Not oval. Not CIRCLE_R. Mouth stays OPEN.
 *
 * Bead + inward stem ride REAL lower-loop rim: ray from LOOP_CENTRE.bottom onto
 * LOOP_RIM_RADIUS.bottom (placement only). Visible stroke stays the path.
 * Seats = existing Communi-G clocks; interpolate angle about bottom centre.
 *
 * Bentley: 200ms press gate, ~900ms/seat, selection() every seat, no flick,
 * tap-only 12 exit, TOGGLE_OUTER_R 32, filled ghosts, inward stem at 6 into white.
 * Entry dolly: filled/zoomed on 6:00 underside → settle readable bowl + opening.
 */
const SNAP_MS = 220;
const TRACK_HALF = G_STROKE.normal / 2; // viewBox units — outer rim is LOOP_RIM_RADIUS

/** Bead sized so "communi-g" fits in full. */
const TOGGLE_OUTER_R = 32;
const TOGGLE_DIAM = TOGGLE_OUTER_R * 2;
const TOGGLE_RING = 7.2;
const TOGGLE_INNER_R = TOGGLE_OUTER_R - TOGGLE_RING;
const TOGGLE_STROKE_R = TOGGLE_INNER_R + TOGGLE_RING / 2;
const STEM_W = 8;
/** Clear gap: arm leaves track, bead sits in white. */
const STEM_LEN = 22;
const POP_MS = 150;
const DRAG_SHRINK = 0.94;
/** Bead grows on press — same pop breath as loop shrink. */
const BEAD_GROW = 1.12;
const DOLLY_MS = 560;
/** Start zoomed on 6:00 underside, settle to readable letter. */
const DOLLY_START = 1.38;
/** Press beat before any travel. Tap / flick before beat stays put. */
const PRESS_MS = 200;
/** One seat (~45°) — hard cap ~900ms/seat. No ramp, no psycho run. */
const SEAT_SPAN_DEG = 45;
const SEAT_MS = 900;
const CRUISE_DEG_MS = SEAT_SPAN_DEG / SEAT_MS; // ≈ 0.05°/ms
/** Hard cap = cruise pace — never feed flick speed into roll. */
const CRUISE_MAX_DEG_MS = CRUISE_DEG_MS;

const DW = 390;
const DH = 844;
const HIT = 44;

const RED = "#E8322B";

const BAND = G_REGION_BANDS.bottom;
const C = LOOP_CENTRE.bottom;
const RIM = LOOP_RIM_RADIUS.bottom;

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

/** Map bottom-band viewBox → screen (xMid YMax meet — bowl sits on phone). */
const frameOf = (w: number, h: number): Frame => {
  const sFit = Math.min(w / BAND.width, h / BAND.height);
  const svgW = BAND.width * sFit;
  const svgH = BAND.height * sFit;
  return { sFit, svgX: (w - svgW) / 2, svgY: h - svgH, svgW, svgH };
};

const toScreen = (f: Frame, p: { x: number; y: number }) => ({
  x: f.svgX + (p.x - BAND.x) * f.sFit,
  y: f.svgY + (p.y - BAND.y) * f.sFit,
});

/**
 * Arm on INSIDE of track → bead into content (toward centre).
 * At 6:00: attach on inside of smile, bead ABOVE in white, arm UP.
 */
const organismParts = (deg: number, f: Frame, pop: number) => {
  const shrink = 1 - (1 - DRAG_SHRINK) * pop;
  const u = outward(deg);
  const rim = RIM * shrink;
  const half = TRACK_HALF * shrink;
  // Inner wall of the stroke — stem roots here (inside of the red path).
  const attachR = Math.max(12, rim - half);
  const attachVb = { x: C.x + attachR * u.x, y: C.y + attachR * u.y };
  const stemPx = STEM_LEN * (f.sFit || 1);
  const beadPx = TOGGLE_OUTER_R * (f.sFit || 1);
  // Bead further toward centre in viewBox units.
  const inwardVb = (stemPx + beadPx) / (f.sFit || 1);
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
  return { bead, stemRoot: attach, stemTip, attach, track, u };
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

  const frame = useMemo(() => frameOf(size.w || DW, size.h || DH), [size.w, size.h]);
  const centreScreen = useMemo(() => toScreen(frame, C), [frame]);

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

  /** Ghost = next seat's FILLED coloured bead ON the track — never a hollow ring. */
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
              opacity: s === towardSeat ? opacity : Math.max(0, 0.3 - dist / 100),
              colour: colourOf(s),
            };
          })
          .filter((p) => p.opacity > 0.08 && p.s !== shown)
      : [];

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - centreScreen.x;
    const y = clientY - r.top - centreScreen.y;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

  const dollyScale = lerp(DOLLY_START, 1, dolly);
  const originX = parts ? (parts.bead.x / (w || 1)) * 100 : 50;
  const originY = parts ? (parts.bead.y / (h || 1)) * 100 : 85;

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
      data-cg-r={RIM.toFixed(1)}
      data-cg-track-w={(G_STROKE.normal * px).toFixed(2)}
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
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-hidden"
            width={w}
            height={h}
            aria-hidden="true"
            data-cg-world=""
          >
            {/* Canonical lower loop — LIVING_G_PATH framed on bottom band. Mouth OPEN. */}
            <svg
              x={frame.svgX}
              y={frame.svgY}
              width={frame.svgW}
              height={frame.svgH}
              viewBox={vb}
              preserveAspectRatio="xMidYMax meet"
              overflow="hidden"
              data-cg-loop=""
              data-cg-track-w={(G_STROKE.normal * px).toFixed(2)}
              data-cg-cx={centreScreen.x.toFixed(1)}
              data-cg-cy={centreScreen.y.toFixed(1)}
            >
              <defs>
                <clipPath id="cg-bottom-band">
                  <rect x={BAND.x} y={BAND.y} width={BAND.width} height={BAND.height} />
                </clipPath>
              </defs>
              <g
                clipPath="url(#cg-bottom-band)"
                transform={`translate(${C.x} ${C.y}) scale(${loopScale}) translate(${-C.x} ${-C.y})`}
              >
                <g transform={LIVING_G_TRANSFORM} fill={RED}>
                  <path d={LIVING_G_PATH} />
                </g>
              </g>
            </svg>

            {plugs.map((p) => (
              <g key={p.s} opacity={p.opacity} data-cg-plug={p.s}>
                {/* Next seat's FILLED bead ON the track — no hollow rings. */}
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
        ) : null}

        {w
          ? STATIONS.map((s) => {
              const pt = organismParts(clockOf(s), frame, 0).bead;
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
