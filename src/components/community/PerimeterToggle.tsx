import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SEAT_ANGLE, type Seat } from "@/components/living-g/EarSelector";
import { CG_COLOUR, type CgMode } from "@/data/communigy";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-GY: THE PAGE RIDES THE LOWER LOOP (Frazer, 28 Sep 2026).
 *
 * The communi-gy page is an opaque rectangle riding the circle of the G's
 * lower loop. The loop is only the path it travels: it is never drawn on or
 * through the page, and behind the page there is only white.
 *
 *   CONTACT    The toggle knob is the page's contact point with the loop. It
 *              sits on the page's inset perimeter (a superellipse, so every
 *              perimeter point has exactly one outward normal). At clock angle
 *              θ (0 = 12:00, clockwise) the loop's outward normal is u(θ); the
 *              page, turned by ψ, touches the loop where its own normal is
 *              θ − ψ. So the page's edge is always tangent to the loop at the
 *              knob, and the knob is always on the loop.
 *   SETTLED    At a station ψ = 0: the page is upright and exactly fills the
 *              screen (no transform at all). The knob is where the upright
 *              page meets the loop at that seat: bottom centre at 6:00, middle
 *              of the left side at 9:00, middle of the right side at 3:00, top
 *              centre at 12:00, and the matching corner for 1:30, 4:30, 7:30
 *              and 10:30.
 *   MOTION     While the knob travels (held, or sliding to a tapped station)
 *              the page leans with the loop's tangent in the direction of
 *              travel, up to PSI_MAX, shrinks very slightly and shifts towards
 *              the knob, so it visibly pans and turns round the loop. It is
 *              upright and full size again when it settles. Everything moves
 *              by CSS transform only (60fps); the page's content never
 *              re-renders while it travels.
 *   TRACK      The loop itself is invisible. While the page is leaning, a
 *              faint red arc of it may show in the white strip outside the
 *              page; it sits underneath the opaque page, so it can never cross
 *              the content, and it is removed entirely when the page settles.
 *   ALWAYS RED The loop and the knob stay red (#E8322B) in every mode; only
 *              the page's text takes the seat colour (the caller reads
 *              `value`).
 *   STATIONS   The wheel's seat angles (EarSelector SEAT_ANGLE, the one list):
 *              12:00 exit · 1:30 give · 3:00 lend · 4:30 trade ·
 *              6:00 everything (entry) · 7:30 fund · 9:00 borrow · 10:30 wish.
 *              12:00 is the way back to the full G (my g's seat is the exit
 *              here).
 *   TOGGLE     A hollow red ring. Holding and dragging it turns the page
 *              round the loop either way, as far as you like. The finger's
 *              angle about the screen centre sets θ, with the stations' dots
 *              as waypoints: finger on a dot means that station, halfway
 *              between two dots means halfway round the loop between them.
 *              Released, it settles on the nearest station. Arrow keys step
 *              station to station (12:00 is not a key stop).
 *   DOTS       One per station on the page's perimeter, where the page's
 *              normal points at that station's seat angle. At rest they sit at
 *              the four edge midpoints and the four corners; as the page
 *              turns they slide round the perimeter against it. The knob
 *              covers the current station's dot. Tapping a dot carries the
 *              page there; the 12:00 dot exits.
 */
const INSET = 16;
/** The perimeter's superellipse exponent: flat edges, rounded corners. */
const SQUARENESS = 4;
/** The page's greatest lean while travelling, in degrees. */
const PSI_MAX = 7;
/** Degrees of travel over which the lean builds up. */
const PSI_SPAN = 18;
/** How much the page shrinks at full lean (fraction of full size). */
const SHRINK = 0.05;
/** The track hint's greatest opacity, only ever outside the page. */
const TRACK_HINT = 0.45;
/** The page's edge against the white while it travels (static: no repaints). */
const PAGE_SHADOW = "0 0 0 1px rgba(0, 0, 0, 0.06), 0 10px 36px rgba(0, 0, 0, 0.14)";
const RING_R = 13;
const RING_W = 3.5;
const TRACK_W = 2;
const RED = "var(--mode-communigy)";

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

type Size = { w: number; h: number };
type Pt = { x: number; y: number };

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

/** Rotate a vector clockwise (on screen) by `deg`. */
const rot = (p: Pt, deg: number): Pt => {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

/**
 * The point on the page's inset perimeter (a superellipse of half extents
 * a, b, centred on the origin) whose outward normal points at clock angle
 * `nu`. Exactly one point per angle; continuous.
 */
function perimeterAt(nu: number, a: number, b: number): Pt {
  const n = unit(nu);
  const q = 1 / (SQUARENESS - 1);
  const X = Math.pow(a * Math.abs(n.x), q);
  const Y = Math.pow(b * Math.abs(n.y), q);
  const k = Math.pow(Math.pow(X, SQUARENESS) + Math.pow(Y, SQUARENESS), -1 / SQUARENESS);
  return { x: Math.sign(n.x) * a * k * X, y: Math.sign(n.y) * b * k * Y };
}

/** The lean for `travel` degrees of travel (signed: clockwise leans clockwise). */
const lean = (travel: number) => PSI_MAX * Math.tanh(travel / PSI_SPAN);
/** The travel that gives lean `psi` (inverse of `lean`). */
const travelFor = (psi: number) => {
  const f = Math.max(-0.999, Math.min(0.999, psi / PSI_MAX));
  return PSI_SPAN * Math.atanh(f);
};

/**
 * The page's placement for knob angle θ and lean ψ: page point L (relative to
 * the page centre) lands on screen at centre + shift + scale·rot(ψ)·L.
 */
function placement(theta: number, psi: number, a: number, b: number) {
  const scale = 1 - (SHRINK * Math.min(PSI_MAX, Math.abs(psi))) / PSI_MAX;
  /* Shrink towards where an upright page would meet the loop at θ, so the
     page keeps pressing on its side of the loop and pans round with it. */
  const home = perimeterAt(theta, a, b);
  const shift = { x: (1 - scale) * home.x, y: (1 - scale) * home.y };
  /* The contact: where the turned page's normal meets the loop's, θ. */
  const contact = perimeterAt(theta - psi, a, b);
  const c = rot(contact, psi);
  const knob = { x: shift.x + scale * c.x, y: shift.y + scale * c.y };
  return { scale, shift, contact, knob };
}

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
  /** The page: rides the loop as one opaque rectangle. */
  children: ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  /** The knob's clock angle on the loop (unbounded; wraps by 360). */
  const [pos, setPos] = useState(() => clockOf(value));
  const posRef = useRef(pos);
  /** The page's lean, in degrees (0 = upright). */
  const [psi, setPsi] = useState(0);
  const psiRef = useRef(0);
  /** Held: the pointer, whether it has moved, and the angle the lean is measured from. */
  const drag = useRef<{ id: number; moved: boolean; x: number; y: number; from: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  /** Where the knob is heading when it is not being held. */
  const [goal, setGoal] = useState<CgStation>(value);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* A mode chosen from outside (or committed here) is where the knob goes. */
  useEffect(() => {
    setGoal(value);
  }, [value]);

  const put = (nextPos: number, nextPsi: number) => {
    posRef.current = nextPos;
    psiRef.current = nextPsi;
    setPos(nextPos);
    setPsi(nextPsi);
  };

  /* Settle on the goal, the short way round, leaning into the travel and
     coming upright as it arrives. */
  useEffect(() => {
    if (dragging) return;
    const target = posRef.current + turn(posRef.current, clockOf(goal));
    let raf = 0;
    const step = () => {
      const p = posRef.current;
      const nextPos = p + (target - p) * 0.2;
      const want = lean(target - nextPos);
      const nextPsi = psiRef.current + (want - psiRef.current) * 0.22;
      if (Math.abs(target - nextPos) < 0.05 && Math.abs(nextPsi) < 0.02) {
        put(target, 0);
        if (goal === "exit") onExit();
        return;
      }
      put(nextPos, nextPsi);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onExit is a fresh closure each render
  }, [goal, dragging]);

  const geo = useMemo(() => {
    const { w, h } = size;
    const a = Math.max(0, w / 2 - INSET);
    const b = Math.max(0, h / 2 - INSET);
    /* The loop's radius: the lower loop at the zoom where the knob's two
       neighbouring stations span the screen's width. */
    const R = Math.max(0, Math.min(a, b) / Math.sin(45 * RAD));
    /* Each station's dot at rest, as a screen angle about the centre. */
    const marks = STATIONS.map((st) => {
      const p = perimeterAt(clockOf(st), a, b);
      return { deg: clockOf(st), at: wrap((Math.atan2(p.x, -p.y) * 180) / Math.PI) };
    });
    return { a, b, R, marks };
  }, [size]);

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

  /** The finger's angle about the screen centre. */
  const fingerAngle = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    const x = e.clientX - r.left - size.w / 2;
    const y = e.clientY - r.top - size.h / 2;
    return (Math.atan2(x, -y) * 180) / Math.PI;
  };

  /**
   * The loop angle θ for a finger at screen angle `at` (about the screen
   * centre): each station's dot, at rest, is a waypoint, and between two
   * waypoints the finger's angle maps evenly onto the 45° of loop between
   * them. So the finger on a dot means that station, halfway between two dots
   * means halfway round the loop between them, and letting go settles on the
   * dot the finger is nearest. The knob, the page's contact with the loop,
   * follows from θ.
   */
  const thetaForFinger = (at: number) => {
    const marks = geo.marks;
    const x = wrap(at);
    for (let i = 0; i < marks.length; i++) {
      const m0 = marks[i]!;
      const m1 = marks[(i + 1) % marks.length]!;
      const span = wrap(m1.at - m0.at) || 360;
      const into = wrap(x - m0.at);
      if (into <= span) return m0.deg + (45 * into) / span;
    }
    return x;
  };

  const { w, h } = size;
  const cx = w / 2;
  const cy = h / 2;
  const place = placement(pos, psi, geo.a, geo.b);
  const settled = psi === 0 && !dragging;
  const here = nearest(pos);
  /* The knob in page coordinates (the page's own frame, upright). */
  const knobLocal = { x: cx + place.contact.x, y: cy + place.contact.y };
  /* The (invisible) loop on screen: through the knob, normal u(θ). */
  const u = unit(pos);
  const loopCentre = {
    x: cx + place.knob.x - geo.R * u.x,
    y: cy + place.knob.y - geo.R * u.y,
  };
  const pageTransform = settled
    ? "none"
    : `translate(${place.shift.x.toFixed(2)}px, ${place.shift.y.toFixed(2)}px) rotate(${psi.toFixed(3)}deg) scale(${place.scale.toFixed(4)})`;

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)" }}
      data-cg-stage=""
    >
      {/* THE LOOP: the path the page rides, never drawn on the page. Only
          while the page leans can a faint arc show in the white outside it;
          it lies underneath the opaque page. Moved by transform only. */}
      {w && !settled ? (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={2 * geo.R + 2 * TRACK_W}
          height={2 * geo.R + 2 * TRACK_W}
          aria-hidden="true"
          data-cg-track=""
          style={{
            transform: `translate(${(loopCentre.x - geo.R - TRACK_W).toFixed(2)}px, ${(loopCentre.y - geo.R - TRACK_W).toFixed(2)}px)`,
            opacity: (TRACK_HINT * Math.min(PSI_MAX, Math.abs(psi))) / PSI_MAX,
            willChange: "transform, opacity",
          }}
        >
          <circle
            cx={geo.R + TRACK_W}
            cy={geo.R + TRACK_W}
            r={geo.R}
            fill="none"
            stroke={RED}
            strokeWidth={TRACK_W}
            data-cg-loop=""
          />
        </svg>
      ) : null}

      {/* THE PAGE: one opaque rectangle, full size and upright at rest. While
          it travels, a quiet shadow shows its edge against the white. */}
      <div
        className="absolute inset-0"
        style={{
          background: "var(--world-bg)",
          transform: pageTransform,
          transformOrigin: "50% 50%",
          willChange: "transform",
          boxShadow: settled ? "none" : PAGE_SHADOW,
        }}
        data-cg-page=""
        data-cg-tilt={psi.toFixed(3)}
      >
        {/* The content is its own stacking layer (the map's panes included),
            so the knob and dots always sit above it. */}
        <div className="absolute inset-0 isolate">{children}</div>

        {w ? (
          <div
            className="pointer-events-none absolute inset-0 z-30"
            data-cg-perimeter=""
            data-cg-clock={wrap(pos).toFixed(1)}
          >
            {/* THE STATIONS: one dot per seat on the page's perimeter, where
                the page's normal points at that seat. */}
            {STATIONS.map((s) => {
              const p = perimeterAt(clockOf(s) - psi, geo.a, geo.b);
              const x = cx + p.x;
              const y = cy + p.y;
              const under = Math.abs(turn(pos, clockOf(s))) < 9;
              return (
                <button
                  key={s}
                  type="button"
                  className="pointer-events-auto absolute left-0 top-0 flex items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]"
                  style={{
                    width: 44,
                    height: 44,
                    transform: `translate(${(x - 22).toFixed(2)}px, ${(y - 22).toFixed(2)}px)`,
                    willChange: settled ? "auto" : "transform",
                  }}
                  aria-label={s === "exit" ? "back to the g" : s}
                  data-cg-dot-hit={s}
                  data-x={x.toFixed(1)}
                  data-y={y.toFixed(1)}
                  onClick={() => go(s)}
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: 9,
                      height: 9,
                      boxSizing: "content-box",
                      background: s === "exit" ? "var(--world-bg)" : CG_COLOUR[s],
                      border:
                        s === "exit"
                          ? "1.5px solid color-mix(in oklab, var(--world-ink) 45%, transparent)"
                          : "1.5px solid var(--world-bg)",
                      opacity: under ? 0 : 0.9,
                    }}
                    data-cg-dot={s}
                  />
                </button>
              );
            })}
            {/* THE TOGGLE: the page's contact with the loop. A hollow red
                ring; its hole is page-white, nothing shows through. */}
            <div
              className="pointer-events-auto absolute left-0 top-0 flex items-center justify-center rounded-full outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              style={{
                width: 48,
                height: 48,
                transform: `translate(${(knobLocal.x - 24).toFixed(2)}px, ${(knobLocal.y - 24).toFixed(2)}px)`,
                willChange: settled ? "auto" : "transform",
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none",
                outline: "none",
              }}
              role="slider"
              tabIndex={0}
              aria-label="communi-gy mode"
              aria-valuetext={here === "exit" ? "back to the g" : here}
              data-cg-toggle=""
              onPointerDown={(e) => {
                e.stopPropagation();
                drag.current = {
                  id: e.pointerId,
                  moved: false,
                  x: e.clientX,
                  y: e.clientY,
                  /* Measured so the lean carries on from where it is. */
                  from: posRef.current - travelFor(psiRef.current),
                };
                setDragging(true);
                (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (d?.id !== e.pointerId) return;
                if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
                d.moved = true;
                const next = posRef.current + turn(posRef.current, thetaForFinger(fingerAngle(e)));
                put(next, lean(next - d.from));
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                if (d?.id !== e.pointerId) return;
                drag.current = null;
                if (d.moved) go(nearest(posRef.current));
                setDragging(false);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setDragging(false);
              }}
              onKeyDown={(e) => {
                /* Steps through the modes; 12:00 (the exit) is not a key stop. */
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
              <span
                className="block rounded-full"
                style={{
                  width: 2 * RING_R,
                  height: 2 * RING_R,
                  boxSizing: "border-box",
                  border: `${RING_W}px solid ${RED}`,
                  background: "var(--world-bg)",
                }}
                data-cg-ring=""
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
