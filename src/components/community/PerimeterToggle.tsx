import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  SEAT_ANGLE,
  SEAT_TITLE,
  titleText,
  toggleGeometry,
  type Seat,
} from "@/components/living-g/EarSelector";
import { gPxPerUnit } from "@/components/living-g/GStage";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G LOWER-LOOP NAV (Frazer via Luna, 29 Sep 2026).
 *
 * One unified system. The red arc is the track — a full circle, cropped by
 * the phone frame so each seat only shows the arc where that seat sits. The
 * toggle rides the arc, always fully on-screen, seat-coloured ring with
 * opaque white centre and the seat name. Inside the loop is empty white
 * canvas (surface for later) — no title, map, or pins.
 *
 *   TRACK      Red (#E8322B). Stroke matched to Frazer's reference crops
 *              (~24–37 CSS px on a 390-wide phone; we use TRACK_STROKE).
 *   TOGGLE     Always visible; sits on the active seat of the arc.
 *   SEATS      6:00 communi-g · 7:30 fund · 9:00 borrow · 10:30 wish ·
 *              12:00 my g (exit) · 1:30 give · 3:00 lend · 4:30 trade.
 *   SNAP       Midpoint cross → magnet home in SNAP_MS. Drag both ways.
 *   EXIT       Lower-loop 12:00 → full living G (toggle at middle-loop 6:00).
 *   FRAME      No box border. Only the G outline (the red arc) clips the view.
 */
const SNAP_MS = 200;
/**
 * Loop radius as a share of the shorter side. Large enough that the frame
 * crops most of the circle and only the active seat's arc stays in view.
 */
const LOOP_OF_MIN = 0.92;
/**
 * Where the active seat (and toggle) sits on screen. Upper-middle keeps the
 * toggle fully visible with the arc reading like the reference crops.
 */
const HOME_Y_OF_H = 0.36;
/**
 * Track stroke in CSS px. Measured from Frazer's ref crops on a 390-wide
 * phone: solid-red arc ~24–37px (ref-1 ≈36.5, ref-3 ≈24, ref-2 ≈18–stronger
 * when anti-alias included). 32px sits in that band — substantial, not a
 * hairline, not the old ~66px picture-frame.
 */
const TRACK_STROKE = 32;
/** Padding so the toggle never kisses the screen edge (px). */
const TOGGLE_PAD = 10;
/** Hit radius for a seat tap on the arc (px). */
const HIT = 32;

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
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  onExit: () => void;
  /** @deprecated Lower-loop nav is an empty canvas; children are ignored. */
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

  const geo = useMemo(() => {
    const { w, h } = size;
    const R = Math.max(1, Math.min(w, h) * LOOP_OF_MIN);
    const k = gPxPerUnit(w || 390, h || 844);
    const tg = toggleGeometry("middle");
    const outerR = tg.EAR.outerR * k;
    const innerR = tg.EAR.innerR * k;
    const ringMid = tg.RING_MID * k;
    const ringW = tg.RING_W * k;
    const title = titleText(innerR);
    /* Home keeps the toggle fully on-screen with a little paper. */
    const homeX = w / 2;
    const homeY = Math.min(
      Math.max(outerR + TOGGLE_PAD, h * HOME_Y_OF_H),
      h - outerR - TOGGLE_PAD,
    );
    const trackW = TRACK_STROKE;
    return { R, homeX, homeY, trackW, outerR, innerR, ringMid, ringW, title };
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

  const { w, h } = size;
  const u = unit(pos);
  /* Circle slides under the home point so the active seat's arc is in frame. */
  const Cx = geo.homeX - geo.R * u.x;
  const Cy = geo.homeY - geo.R * u.y;
  const toggleX = geo.homeX;
  const toggleY = geo.homeY;
  const settled = !dragging && !snapping && Math.abs(turn(pos, clockOf(goal))) < 0.2;
  const here = nearest(pos);
  const shown: CgStation = dragging ? here : goal;
  const colour = colourOf(shown);

  const thetaForFinger = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    const x = clientX - r.left - Cx;
    const y = clientY - r.top - Cy;
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
      data-cg-r={geo.R.toFixed(1)}
      data-cg-track-w={geo.trackW.toFixed(2)}
      data-cg-home-x={geo.homeX.toFixed(1)}
      data-cg-home-y={geo.homeY.toFixed(1)}
    >
      {/* EMPTY WHITE CANVAS — surface for later. No words, map, or pins. */}

      {/* THE RED TRACK — full circle, cropped by the phone frame. */}
      {w ? (
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          width={w}
          height={h}
          aria-hidden="true"
          data-cg-world=""
        >
          <circle
            cx={Cx}
            cy={Cy}
            r={geo.R}
            fill="none"
            stroke={RED}
            strokeWidth={geo.trackW}
            strokeLinecap="round"
            opacity={0.96}
            data-cg-loop=""
            data-cg-track-w={geo.trackW.toFixed(2)}
            data-cg-cx={Cx.toFixed(1)}
            data-cg-cy={Cy.toFixed(1)}
          />
        </svg>
      ) : null}

      {/* Seat taps on the arc (screen space). */}
      {w
        ? STATIONS.map((s) => {
            const p = unit(clockOf(s));
            const x = Cx + geo.R * p.x;
            const y = Cy + geo.R * p.y;
            return (
              <button
                key={s}
                type="button"
                className="pointer-events-auto absolute left-0 top-0 z-10 rounded-full [-webkit-tap-highlight-color:transparent]"
                style={{
                  width: HIT * 2,
                  height: HIT * 2,
                  transform: `translate(${(x - HIT).toFixed(2)}px, ${(y - HIT).toFixed(2)}px)`,
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

      {/* TOGGLE — rides the arc at the active seat; always fully visible. */}
      {w ? (
        <div
          className="pointer-events-auto absolute left-0 top-0 z-30 flex items-center justify-center rounded-full outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
          style={{
            width: geo.outerR * 2,
            height: geo.outerR * 2,
            left: toggleX - geo.outerR,
            top: toggleY - geo.outerR,
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
          <svg
            width={geo.outerR * 2}
            height={geo.outerR * 2}
            viewBox={`${-geo.outerR} ${-geo.outerR} ${geo.outerR * 2} ${geo.outerR * 2}`}
            className="overflow-visible"
            aria-hidden="true"
          >
            {/* Opaque white centre */}
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
      ) : null}
    </div>
  );
}
