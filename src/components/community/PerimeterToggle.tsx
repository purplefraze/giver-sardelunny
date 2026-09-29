import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  SEAT_ANGLE,
  SEAT_TITLE,
  titleText,
  toggleGeometry,
  type Seat,
} from "@/components/living-g/EarSelector";
import { gPxPerUnit } from "@/components/living-g/GStage";
import {
  LIVING_G_BOX,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";
import { G_STROKE } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G SPATIAL NAV — WINDOW ON THE LOWER LOOP (Frazer via Luna, 29 Sep 2026).
 *
 * One continuous map. The faded living G and a substantial red lower-loop
 * trace sit behind. The phone rectangle is a WINDOW that slides around the
 * loop's circumference — always upright, always the same orientation, lower
 * on the screen (Wish-like). It takes most of the screen. At each seat some
 * corners fall outside the red circle and are left cut (white + red trace
 * show through; never filled).
 *
 *   ZOOM       Lower loop dominates; little of the middle loop shows above.
 *   TRACE      Lower-loop stroke matches the living G, but at middle weight
 *              × scale so it reads as the G's line — not a chunky frame.
 *              No box border on the phone window; straight edges meet white.
 *   WINDOW     Axis-aligned rectangle, most of the screen, biased down.
 *              Translates toward the seat angle so the far corners clip:
 *              6:00 BL+BR · 3:00 TR+BR · 12:00 TR+TL · 1:30 TR · etc.
 *   TOGGLE     Travels with the rectangle (top of the window).
 *   SNAP       Midpoint cross → magnet home in SNAP_MS. Reverse before the
 *              midpoint snaps back. Content + text colour change only.
 *   TAP / EXIT Perimeter seats jump along the curve; 12:00 exits to the full
 *              living G (toggle at middle-loop 6:00).
 */
/** Magnet-home duration once a midpoint is crossed (ms). */
const SNAP_MS = 200;
/** Paper around the window (px) — rectangle takes most of the screen. */
const PAGE_MARGIN_X = 24;
const PAGE_MARGIN_BOTTOM = 14;
/**
 * Top of the window (px from the stage top). Leaves a strip of the zoomed
 * lower loop above; the window sits lower on the screen (Wish-like).
 */
const PAGE_TOP = 72;
/** How far the window slides toward the seat (px). STAND-IN, tuned for the clips. */
const SLIDE = 28;
/**
 * Loop radius as a share of the shorter screen side. Zoomed in so the lower
 * loop dominates and the middle loop mostly sits above the viewport.
 */
const LOOP_OF_MIN = 0.78;
/**
 * Vertical place of the loop centre as a share of stage height. Lower = more
 * of the middle loop pushed off the top.
 */
const LOOP_CY_OF_H = 0.40;
/** Hit radius for a seat tap (px). */
const HIT = 28;
/** Paper under the toggle before the title (px). */
const TOGGLE_EDGE = 6;
/** Faded living G behind the window. */
const G_FADE = 0.18;

const RED = "var(--mode-communigy)";
const MY_G_BLUE = "var(--mode-giver)";

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

const colourOf = (s: CgStation) => (s === "exit" ? MY_G_BLUE : CG_COLOUR[s]);
const wordOf = (s: CgStation) => SEAT_TITLE[STATION_SEAT[s]];

type Size = { w: number; h: number };
type Pt = { x: number; y: number };

const RAD = Math.PI / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;
const turn = (a: number, b: number) => {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return d;
};
const unit = (deg: number): Pt => ({ x: Math.sin(deg * RAD), y: -Math.cos(deg * RAD) });
const easeOut = (u: number) => 1 - (1 - u) ** 3;

export function PerimeterToggle({
  value,
  onChange,
  onExit,
  children,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  onExit: () => void;
  children: ReactNode;
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

  const geo = useMemo(() => {
    const { w, h } = size;
    const pageW = Math.max(0, w - 2 * PAGE_MARGIN_X);
    const pageH = Math.max(0, h - PAGE_TOP - PAGE_MARGIN_BOTTOM);
    /* Zoomed lower loop: dominates the view. */
    const R = Math.max(1, Math.min(w, h) * LOOP_OF_MIN);
    const Cx = w / 2;
    const Cy = h * LOOP_CY_OF_H;
    /* Scale the living G to this zoom. Trace uses MIDDLE weight so the
     * line stays G-consistent without reading as a picture frame (~66px
     * at normal was too chunky when zoomed in). */
    const gScale = R / LOOP_RIM_RADIUS.bottom;
    const trackW = G_STROKE.middle * gScale;
    const k = gPxPerUnit(w || 390, h || 844);
    const tg = toggleGeometry("middle");
    const outerR = tg.EAR.outerR * k;
    const innerR = tg.EAR.innerR * k;
    const ringMid = tg.RING_MID * k;
    const ringW = tg.RING_W * k;
    const title = titleText(innerR);
    const gW = LIVING_G_BOX.width * gScale;
    const gH = LIVING_G_BOX.height * gScale;
    const gX = Cx - LOOP_CENTRE.bottom.x * gScale;
    const gY = Cy - LOOP_CENTRE.bottom.y * gScale;
    return {
      pageW,
      pageH,
      R,
      Cx,
      Cy,
      trackW,
      gScale,
      outerR,
      innerR,
      ringMid,
      ringW,
      title,
      gW,
      gH,
      gX,
      gY,
    };
  }, [size]);

  const put = (next: number) => {
    posRef.current = next;
    setPos(next);
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

  const neighbour = (s: CgStation, dir: 1 | -1): CgStation => {
    const i = STATIONS.indexOf(s);
    return STATIONS[(i + dir + STATIONS.length) % STATIONS.length]!;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onExit is a fresh closure each render
  }, [goal, dragging, size.w]);

  /** Finger angle about the loop centre → loop angle θ. */
  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - geo.Cx;
    const y = clientY - r.top - geo.Cy;
    return wrap((Math.atan2(x, -y) * 180) / Math.PI);
  };

  const { w, h } = size;
  const u = unit(pos);
  /* Window slides toward the seat; orientation never changes. */
  /* Slide toward the seat. Clamp X so title/tabs never leave the screen;
   * allow a little Y overhang (stage clips it) so 6:00 can sit lower. */
  const pageLeft = Math.max(0, Math.min(w - geo.pageW, PAGE_MARGIN_X + SLIDE * u.x));
  const pageTop = Math.max(0, PAGE_TOP + SLIDE * u.y);
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2;
  const here = nearest(pos);
  const shown: CgStation = dragging ? here : goal;
  const colour = colourOf(shown);
  /* Toggle travels with the window — top centre of the rectangle. */
  const toggleX = pageLeft + geo.pageW / 2;
  const toggleY = pageTop + TOGGLE_EDGE + geo.outerR;
  const clearTop = TOGGLE_EDGE + geo.outerR * 2 + 10;
  /* Clip the window to the lower-loop circle (stage space → page-local). */
  const clipX = geo.Cx - pageLeft;
  const clipY = geo.Cy - pageTop;
  const clipPath = w ? `circle(${geo.R.toFixed(2)}px at ${clipX.toFixed(2)}px ${clipY.toFixed(2)}px)` : undefined;

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)" }}
      data-cg-stage=""
      data-cg-clock={wrap(pos).toFixed(1)}
      data-cg-snapping={snapping ? "1" : "0"}
      data-cg-r={geo.R.toFixed(1)}
      data-cg-track-w={geo.trackW.toFixed(2)}
      data-cg-slide={SLIDE}
    >
      {/* THE LIVING G + LOWER LOOP TRACE — fixed, behind the window. */}
      {w ? (
        <div className="absolute left-0 top-0" style={{ width: w, height: h }} data-cg-world="">
          <svg
            width={geo.gW}
            height={geo.gH}
            viewBox={`0 0 ${LIVING_G_BOX.width} ${LIVING_G_BOX.height}`}
            className="pointer-events-none absolute overflow-visible"
            style={{ left: geo.gX, top: geo.gY, opacity: G_FADE }}
            data-cg-g=""
          >
            <g transform={LIVING_G_TRANSFORM} fill={RED}>
              <path d={LIVING_G_PATH} />
            </g>
            <MiddleLoopClose weight="normal" fill={RED} />
          </svg>
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={w}
            height={h}
            aria-hidden="true"
          >
            <circle
              cx={geo.Cx}
              cy={geo.Cy}
              r={geo.R}
              fill="none"
              stroke={RED}
              strokeWidth={geo.trackW}
              opacity={0.92}
              data-cg-loop=""
              data-cg-track-w={geo.trackW.toFixed(2)}
            />
          </svg>
          {/* Seat hits on the fixed loop (screen space). */}
          {STATIONS.map((s) => {
            const p = unit(clockOf(s));
            const x = geo.Cx + geo.R * p.x;
            const y = geo.Cy + geo.R * p.y;
            return (
              <button
                key={`loop-${s}`}
                type="button"
                className="pointer-events-auto absolute left-0 top-0 z-10 rounded-full [-webkit-tap-highlight-color:transparent]"
                style={{
                  width: HIT * 2,
                  height: HIT * 2,
                  transform: `translate(${(x - HIT).toFixed(2)}px, ${(y - HIT).toFixed(2)}px)`,
                  background: "transparent",
                }}
                aria-label={s === "exit" ? "back to the g" : s}
                data-cg-loop-hit={s}
                onClick={() => {
                  if (snappingRef.current) return;
                  go(s);
                }}
              />
            );
          })}
        </div>
      ) : null}

      {/* THE WINDOW: upright, most of the screen, clipped by the red circle. */}
      {w ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: pageLeft,
            top: pageTop,
            width: geo.pageW,
            height: geo.pageH,
            background: "var(--world-bg)",
            /* No framed border — straight edges meet white; only the G's
             * own outline shows where the circle clips a corner. */
            border: "none",
            outline: "none",
            boxShadow: "none",
            clipPath,
            WebkitClipPath: clipPath,
            willChange: "left, top, clip-path",
            ["--cg-clear" as string]: `${clearTop}px`,
          }}
          data-cg-page=""
          data-cg-tx={(pageLeft - PAGE_MARGIN_X).toFixed(1)}
          data-cg-ty={(pageTop - PAGE_TOP).toFixed(1)}
          data-cg-settled={settled ? "1" : "0"}
        >
          <div className="absolute inset-0 isolate">{children}</div>

          {/* Toggle travels with the window. */}
          <div
            className="pointer-events-auto absolute left-0 top-0 z-30 flex items-center justify-center rounded-full outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
            style={{
              width: geo.outerR * 2,
              height: geo.outerR * 2,
              left: geo.pageW / 2 - geo.outerR,
              top: TOGGLE_EDGE,
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
            role="slider"
            tabIndex={0}
            aria-label="communi-g mode"
            aria-valuetext={shown === "exit" ? "back to the g" : shown}
            data-cg-toggle=""
            data-cg-seat={shown}
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
            <svg
              width={geo.outerR * 2}
              height={geo.outerR * 2}
              viewBox={`${-geo.outerR} ${-geo.outerR} ${geo.outerR * 2} ${geo.outerR * 2}`}
              className="overflow-visible"
              aria-hidden="true"
            >
              <circle r={geo.outerR} fill="var(--world-bg)" />
              <circle
                r={geo.ringMid}
                fill="none"
                stroke={colour}
                strokeWidth={geo.ringW}
                data-cg-ring=""
              />
              <text x={geo.title.dx} y={geo.title.dy} textAnchor="middle" fill={colour} style={geo.title.style}>
                {wordOf(shown)}
              </text>
            </svg>
          </div>

          {/* Page-local perimeter seat hits (inside the window). */}
          {STATIONS.map((s) => {
            const p = unit(clockOf(s));
            /* Hits sit on the window's edge facing that seat. */
            const x = geo.pageW / 2 + p.x * (geo.pageW / 2 - 8);
            const y = geo.pageH / 2 + p.y * (geo.pageH / 2 - 8);
            return (
              <button
                key={`page-${s}`}
                type="button"
                className="pointer-events-auto absolute left-0 top-0 z-20 rounded-full [-webkit-tap-highlight-color:transparent]"
                style={{
                  width: HIT * 2,
                  height: HIT * 2,
                  transform: `translate(${(x - HIT).toFixed(2)}px, ${(y - HIT).toFixed(2)}px)`,
                  background: "transparent",
                }}
                aria-label={s === "exit" ? "back to the g" : s}
                data-cg-dot-hit={s}
                data-x={(pageLeft + x).toFixed(1)}
                data-y={(pageTop + y).toFixed(1)}
                onClick={() => {
                  if (snappingRef.current) return;
                  go(s);
                }}
              />
            );
          })}
        </div>
      ) : null}

      {/* Screen-space toggle hit mirror for tests that read bounding boxes. */}
      {w ? (
        <div
          className="pointer-events-none absolute"
          aria-hidden="true"
          data-cg-toggle-screen=""
          style={{ left: toggleX, top: toggleY, width: 0, height: 0 }}
        />
      ) : null}
    </div>
  );
}
