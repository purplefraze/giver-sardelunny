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
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G SPATIAL NAV (Frazer via Luna, 29 Sep 2026).
 *
 * One continuous map: the faded lower loop (and living G) sit behind the
 * phone rectangle. Every mode lives on that same loop. The rectangle rides
 * the lower loop's arc — you see it move around the G, not slide like a
 * carousel. It never tilts or shrinks (always upright, always full size).
 *
 *   TRACK      The lower loop as a thin red circle behind the page. A short
 *              red stroke marks where the page's edge meets the loop.
 *   CONTACT    At clock angle θ the page's perimeter point whose outward
 *              normal is θ sits on the loop. The page translates (no rotate,
 *              no scale) so that contact stays on the loop; at 6:00 it fills
 *              the screen.
 *   TOGGLE     Fixed at 12:00 on the top edge of the rectangle: the main G's
 *              ring in the seat colour, opaque white hole, seat word inside.
 *              The seat is wherever the rectangle sits on the track, not where
 *              the toggle sits on the page.
 *   SNAP       As soon as a drag crosses the midpoint between two seats, the
 *              rectangle magnets home along the remaining arc in SNAP_MS.
 *              Reverse before the midpoint and it snaps back the same way.
 *              No pause on a mid-transition frame. On snap, only the content
 *              and the text colour change; the red track, loop and living G
 *              behind stay put.
 *   TAP        Tapping a perimeter seat jumps along the curve with the same
 *              snap. 12:00 exits to the full living G (toggle at middle-loop
 *              6:00).
 *   ENTRY      6:00 everything. Drag both ways. Spell it communi-g.
 */
/** Magnet-home duration once a midpoint is crossed (ms). */
const SNAP_MS = 200;
/** Paper between the page edge and the contact perimeter (px). */
const INSET = 16;
/** How far the toggle's outer edge sits in from the top of the page (px). */
const TOGGLE_EDGE = 4;
/** Visible red track weight (px). */
const TRACK_W = 2;
/** Length of the contact stroke either side of the join, in degrees. */
const CONTACT_ARC = 18;
/** Faded living G behind the page. */
const G_FADE = 0.14;
/** Hit radius for a perimeter seat tap (px). */
const HIT = 28;

const RED = "var(--mode-communigy)";
const MY_G_BLUE = "var(--mode-giver)";

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

const colourOf = (s: CgStation) => (s === "exit" ? MY_G_BLUE : CG_COLOUR[s]);
const wordOf = (s: CgStation) => SEAT_TITLE[STATION_SEAT[s]];

type Pt = { x: number; y: number };
type Size = { w: number; h: number };

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
 * The point on the page's inset perimeter (a rounded-rect feel via
 * superellipse) whose outward normal points at clock angle `nu`.
 */
const SQUARENESS = 4;
function perimeterAt(nu: number, a: number, b: number): Pt {
  const n = unit(nu);
  const q = 1 / (SQUARENESS - 1);
  const X = Math.pow(a * Math.abs(n.x), q);
  const Y = Math.pow(b * Math.abs(n.y), q);
  const k = Math.pow(Math.pow(X, SQUARENESS) + Math.pow(Y, SQUARENESS), -1 / SQUARENESS);
  return { x: Math.sign(n.x || 1) * a * k * X, y: Math.sign(n.y || 1) * b * k * Y };
}

/** Ease-out cubic for the snap. */
const easeOut = (u: number) => 1 - (1 - u) ** 3;

export function PerimeterToggle({
  value,
  onChange,
  onExit,
  children,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  /** 12:00 on the lower loop: back to the full G. */
  onExit: () => void;
  /** The page: rides the loop as one opaque upright rectangle. */
  children: ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  /** The rectangle's clock angle on the loop (unbounded). */
  const [pos, setPos] = useState(() => clockOf(value));
  const posRef = useRef(pos);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const snappingRef = useRef(false);
  /** Where the rectangle is heading when it is not being held. */
  const [goal, setGoal] = useState<CgStation>(value);
  /** The seat the current drag started from (for midpoint + snap-back). */
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
    const a = Math.max(0, w / 2 - INSET);
    const b = Math.max(0, h / 2 - INSET);
    /* Loop radius: two neighbouring seats (45°) span the page's shorter half. */
    const R = Math.max(1, Math.min(a, b) / Math.sin(45 * RAD));
    /* At 6:00 the page fills the screen: loop centre sits above the page centre. */
    const Cx = w / 2;
    const Cy = h / 2 - R + b;
    const k = gPxPerUnit(w || 390, h || 844);
    const tg = toggleGeometry("middle");
    const outerR = tg.EAR.outerR * k;
    const innerR = tg.EAR.innerR * k;
    const ringMid = tg.RING_MID * k;
    const ringW = tg.RING_W * k;
    const title = titleText(innerR);
    /* Toggle fixed at 12:00 on the page's top edge. */
    const toggle = { x: w / 2, y: Math.max(TOGGLE_EDGE, 0) + outerR };
    /* The living G scaled so its lower-loop outer rim matches R. */
    const gScale = (2 * R) / (2 * LOOP_RIM_RADIUS.bottom);
    const gW = LIVING_G_BOX.width * gScale;
    const gH = LIVING_G_BOX.height * gScale;
    const gX = Cx - LOOP_CENTRE.bottom.x * gScale;
    const gY = Cy - LOOP_CENTRE.bottom.y * gScale;
    return { a, b, R, Cx, Cy, outerR, innerR, ringMid, ringW, title, toggle, gScale, gW, gH, gX, gY };
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

  /** Neighbour of `s` in the signed direction `dir` (+1 clockwise). */
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

  /* Snap along the arc to the goal in SNAP_MS (one step) — longer jumps keep
     the same speed, capped so a half-lap never crawls. */
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

  /** Finger angle about the screen centre → loop angle θ (waypoints at seats). */
  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - size.w / 2;
    const y = clientY - r.top - size.h / 2;
    const at = wrap((Math.atan2(x, -y) * 180) / Math.PI);
    /* Map the finger's screen angle through the rested contact angles. */
    const marks = STATIONS.map((st) => {
      const p = perimeterAt(clockOf(st), geo.a, geo.b);
      return { deg: clockOf(st), at: wrap((Math.atan2(p.x, -p.y) * 180) / Math.PI) };
    });
    for (let i = 0; i < marks.length; i++) {
      const m0 = marks[i]!;
      const m1 = marks[(i + 1) % marks.length]!;
      const span = wrap(m1.at - m0.at) || 360;
      const into = wrap(at - m0.at);
      if (into <= span) return m0.deg + (45 * into) / span;
    }
    return at;
  };

  const { w, h } = size;
  const cx = w / 2;
  const cy = h / 2;
  const contact = perimeterAt(pos, geo.a, geo.b);
  /* Page centre in world = loop point − contact; translation from the filled
     6:00 pose (page centre = screen centre). */
  const loopPt = { x: geo.Cx + geo.R * unit(pos).x, y: geo.Cy + geo.R * unit(pos).y };
  const pageCentre = { x: loopPt.x - contact.x, y: loopPt.y - contact.y };
  const tx = pageCentre.x - cx;
  const ty = pageCentre.y - cy;
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2;
  const here = nearest(pos);
  const shown: CgStation = dragging ? here : goal;
  const colour = colourOf(shown);

  /* Content clears the toggle at the top; the contact stroke needs a little
     air at whatever edge is meeting the loop. */
  const clearTop = geo.toggle.y + geo.outerR + 8;

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)" }}
      data-cg-stage=""
      data-cg-clock={wrap(pos).toFixed(1)}
      data-cg-snapping={snapping ? "1" : "0"}
    >
      {/* THE LIVING G + LOWER LOOP, fixed in world space behind the page. */}
      {w ? (
        <div
          className="absolute left-0 top-0"
          aria-hidden="true"
          data-cg-world=""
          style={{ width: w, height: h }}
        >
          <svg
            width={geo.gW}
            height={geo.gH}
            viewBox={`0 0 ${LIVING_G_BOX.width} ${LIVING_G_BOX.height}`}
            className="pointer-events-none absolute overflow-visible"
            style={{
              left: geo.gX,
              top: geo.gY,
              opacity: G_FADE,
            }}
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
              strokeWidth={TRACK_W}
              opacity={0.55}
              data-cg-loop=""
              data-cg-r={geo.R.toFixed(1)}
            />
          </svg>
          {/* Seat hits on the fixed loop (screen space), so a side seat stays
              tappable even when the page has ridden away from it. */}
          {STATIONS.map((s) => {
            const u = unit(clockOf(s));
            const x = geo.Cx + geo.R * u.x;
            const y = geo.Cy + geo.R * u.y;
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

      {/* THE PAGE: opaque, upright, full size — translates along the arc. */}
      <div
        className="absolute inset-0"
        style={{
          background: "var(--world-bg)",
          transform: settled && Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5
            ? "none"
            : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
          willChange: "transform",
          ["--cg-clear" as string]: `${clearTop}px`,
        }}
        data-cg-page=""
        data-cg-tx={tx.toFixed(1)}
        data-cg-ty={ty.toFixed(1)}
      >
        <div className="absolute inset-0 isolate">{children}</div>

        {w ? (
          <div className="pointer-events-none absolute inset-0 z-30" data-cg-perimeter="">
            {/* Contact stroke: the short red arc where the page meets the loop. */}
            <svg
              className="absolute left-0 top-0 overflow-visible"
              width={w}
              height={h}
              aria-hidden="true"
            >
              {(() => {
                const pts: string[] = [];
                for (let d = -CONTACT_ARC; d <= CONTACT_ARC; d += 2) {
                  const p = perimeterAt(pos + d, geo.a, geo.b);
                  pts.push(`${(cx + p.x).toFixed(2)},${(cy + p.y).toFixed(2)}`);
                }
                return (
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={RED}
                    strokeWidth={TRACK_W}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-cg-contact=""
                  />
                );
              })()}
            </svg>

            {/* Perimeter seat hits (invisible). */}
            {STATIONS.map((s) => {
              const p = perimeterAt(clockOf(s), geo.a, geo.b);
              const x = cx + p.x;
              const y = cy + p.y;
              return (
                <button
                  key={s}
                  type="button"
                  className="pointer-events-auto absolute left-0 top-0 rounded-full [-webkit-tap-highlight-color:transparent]"
                  style={{
                    width: HIT * 2,
                    height: HIT * 2,
                    transform: `translate(${(x - HIT).toFixed(2)}px, ${(y - HIT).toFixed(2)}px)`,
                    background: "transparent",
                  }}
                  aria-label={s === "exit" ? "back to the g" : s}
                  data-cg-dot-hit={s}
                  data-x={x.toFixed(1)}
                  data-y={y.toFixed(1)}
                  onClick={() => {
                    if (snappingRef.current) return;
                    go(s);
                  }}
                />
              );
            })}

            {/* THE TOGGLE: fixed at 12:00 on the top edge of the rectangle. */}
            <div
              className="pointer-events-auto absolute left-0 top-0 flex items-center justify-center rounded-full outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
              style={{
                width: geo.outerR * 2,
                height: geo.outerR * 2,
                transform: `translate(${(geo.toggle.x - geo.outerR).toFixed(2)}px, ${(geo.toggle.y - geo.outerR).toFixed(2)}px)`,
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
                /* Crossed the midpoint toward the neighbour: magnet home. */
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
                if (d.moved) go(d.start); /* reverse before midpoint → snap back */
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
                <text
                  x={geo.title.dx}
                  y={geo.title.dy}
                  textAnchor="middle"
                  fill={colour}
                  style={geo.title.style}
                >
                  {wordOf(shown)}
                </text>
              </svg>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
