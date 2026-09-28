import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
 * COMMUNI-GY: THE RED PERIMETER STROKE IS THE TRACK (Frazer, 28 Sep 2026).
 *
 * The communi-gy page never moves. It is always upright, full size and fills
 * the screen: no rotation, no scale, no shadow, not even mid-drag. Only the
 * toggle travels, round the page's perimeter, and the page's content switches
 * mode when the toggle snaps to a seat.
 *
 *   TRACK      A thin red (#E8322B) stroke round the page, just inside the
 *              screen edge: a rounded rectangle whose corners follow the
 *              loop's feel. It is the visible path the toggle travels. The
 *              content sits in its own box inside the stroke (clipped to it),
 *              so the stroke can never cross the content. Its weight is a
 *              third of the toggle ring's stroke (3px at 390 wide), the same
 *              family as the ring.
 *   INSET      The toggle centres on the stroke and is the main G's ring at
 *              full size, so the stroke sits the ring's outer radius plus
 *              EDGE px in from each screen edge (plus that edge's safe area):
 *              the whole ring always stays on screen.
 *   SEATS      The wheel's seat angles (EarSelector SEAT_ANGLE, the one list):
 *              12:00 exit · 1:30 give · 3:00 lend · 4:30 trade ·
 *              6:00 everything (entry) · 7:30 fund · 9:00 borrow · 10:30 wish.
 *              Each seat is where the stroke's outward normal points at that
 *              clock angle: the edge midpoints for 12, 3, 6 and 9, the middle
 *              of each rounded corner for the diagonals. No markers are drawn.
 *   TOGGLE     The main G's toggle ring, exactly (toggleGeometry("middle") at
 *              the G's own px-per-unit: 78px across, 9px stroke at 390): a
 *              hollow circle in the CURRENT seat's colour with an opaque white
 *              hole (nothing shows through) and the seat's word inside
 *              (SEAT_TITLE, the main G's table and type: lowercase Helvetica
 *              Neue, 0.30 × the hole's radius, +0.08em, centred, upright).
 *              While held the colour and word follow the nearest seat; at
 *              12:00 that is "my g" in my g's blue, because letting go there
 *              goes back to the full G.
 *   DRAG       Hold and drag the toggle either way round, as far as you like.
 *              The finger's ray from the page centre meets the stroke where the
 *              toggle goes. Released, it snaps to the nearest seat along the
 *              stroke. Dragging past 12:00 without letting go does not exit;
 *              letting go at 12:00 does. Arrow keys step seat to seat, skipping
 *              12:00.
 *   TAP        Tapping the stroke within HIT_ALONG / 2 of a seat (measured
 *              along the stroke; the tap band runs from the screen edge to the
 *              content box, never over the content) goes to that seat. The
 *              12:00 spot exits. No tick marks 12:00.
 */
/** Paper between the toggle ring's outer edge and the screen edge (px, + safe area). */
const EDGE = 4;
/** The stroke's corner radius, as a share of the ring's outer radius. */
const CORNER_OF_RING = 2;
/** The stroke's weight as a share of the ring's stroke (3px of 9px at 390). */
const TRACK_OF_RING = 1 / 3;
/** Paper between the stroke's inner edge and the content box (px). */
const CONTENT_GAP = 10;
/** A seat's tap target, measured along the stroke (px). */
const HIT_ALONG = 44;
/** The ring's hole tucks this far (px) under the stroke's inner edge: no seam. */
const HOLE_TUCK = 0.5;
/** Travel (px along the stroke) over which the grab offset fades out. */
const GRAB_FADE = 60;
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

/** The toggle's colour and word at a station (12:00: my g, in my g's blue). */
const colourOf = (s: CgStation) => (s === "exit" ? MY_G_BLUE : CG_COLOUR[s]);
const wordOf = (s: CgStation) => SEAT_TITLE[STATION_SEAT[s]];

type Pt = { x: number; y: number };
type Seg =
  | { kind: "line"; a: Pt; b: Pt; len: number }
  | { kind: "arc"; c: Pt; r: number; a0: number; len: number };

const RAD = Math.PI / 180;

/**
 * THE TRACK: a rounded rectangle (left, top, right, bottom = the stroke's
 * centreline, corner radius rc), measured by arc length s clockwise from
 * top centre (12:00). Arcs sweep clockwise on screen from angle a0 (radians,
 * screen, 0 = +x, y down).
 */
function buildTrack(left: number, top: number, right: number, bottom: number, rc: number) {
  const mx = (left + right) / 2;
  const q = (Math.PI / 2) * rc;
  const line = (a: Pt, b: Pt): Seg => ({
    kind: "line",
    a,
    b,
    len: Math.hypot(b.x - a.x, b.y - a.y),
  });
  const arc = (c: Pt, a0: number): Seg => ({ kind: "arc", c, r: rc, a0, len: q });
  const segs: Seg[] = [
    line({ x: mx, y: top }, { x: right - rc, y: top }),
    arc({ x: right - rc, y: top + rc }, -Math.PI / 2),
    line({ x: right, y: top + rc }, { x: right, y: bottom - rc }),
    arc({ x: right - rc, y: bottom - rc }, 0),
    line({ x: right - rc, y: bottom }, { x: left + rc, y: bottom }),
    arc({ x: left + rc, y: bottom - rc }, Math.PI / 2),
    line({ x: left, y: bottom - rc }, { x: left, y: top + rc }),
    arc({ x: left + rc, y: top + rc }, Math.PI),
    line({ x: left + rc, y: top }, { x: mx, y: top }),
  ];
  const starts: number[] = [];
  let L = 0;
  for (const g of segs) {
    starts.push(L);
    L += g.len;
  }
  const wrapS = (s: number) => ((s % L) + L) % L;
  const pointAt = (s0: number): Pt => {
    const s = wrapS(s0);
    for (let i = segs.length - 1; i >= 0; i--) {
      if (s < starts[i]!) continue;
      const g = segs[i]!;
      const t = g.len ? (s - starts[i]!) / g.len : 0;
      if (g.kind === "line")
        return { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t };
      const a = g.a0 + (t * Math.PI) / 2;
      return { x: g.c.x + g.r * Math.cos(a), y: g.c.y + g.r * Math.sin(a) };
    }
    return { x: mx, y: top };
  };
  /** The arc length of the track point nearest p. */
  const project = (p: Pt): number => {
    let best = 0;
    let bestD = Infinity;
    segs.forEach((g, i) => {
      let t: number;
      let q2: Pt;
      if (g.kind === "line") {
        const dx = g.b.x - g.a.x;
        const dy = g.b.y - g.a.y;
        const l2 = dx * dx + dy * dy;
        t = l2 ? Math.max(0, Math.min(1, ((p.x - g.a.x) * dx + (p.y - g.a.y) * dy) / l2)) : 0;
        q2 = { x: g.a.x + dx * t, y: g.a.y + dy * t };
      } else {
        let a = Math.atan2(p.y - g.c.y, p.x - g.c.x) - g.a0;
        a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (a > Math.PI / 2) a = a > (5 * Math.PI) / 4 ? 0 : Math.PI / 2;
        t = a / (Math.PI / 2);
        q2 = { x: g.c.x + g.r * Math.cos(g.a0 + a), y: g.c.y + g.r * Math.sin(g.a0 + a) };
      }
      const d = Math.hypot(p.x - q2.x, p.y - q2.y);
      if (d < bestD) {
        bestD = d;
        best = starts[i]! + t * g.len;
      }
    });
    return best;
  };
  /**
   * Where the ray from the track's centre through p meets the track, as arc
   * length (the track is convex: exactly one crossing per direction).
   */
  const rayAt = (p: Pt): number => {
    const c = { x: mx, y: (top + bottom) / 2 };
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const n = Math.hypot(dx, dy) || 1;
    /* March out past the track, then project the far point back onto it:
       exact on the straight edges, and on a corner the nearest corner point
       along the same direction to within a hair. Bisect for exactness. */
    let lo = 0;
    let hi = Math.hypot(right - left, bottom - top);
    const inside = (r: number) => {
      const x = c.x + (dx / n) * r;
      const y = c.y + (dy / n) * r;
      const qx = Math.max(left + rc, Math.min(right - rc, x));
      const qy = Math.max(top + rc, Math.min(bottom - rc, y));
      return Math.hypot(x - qx, y - qy) <= rc;
    };
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid;
      else hi = mid;
    }
    return project({ x: c.x + (dx / n) * lo, y: c.y + (dy / n) * lo });
  };
  /** The track point whose outward normal points at clock angle deg. */
  const normalAt = (deg: number): number => {
    const d = ((deg % 360) + 360) % 360;
    const quarter = Math.floor(d / 90) % 4;
    const into = d - quarter * 90;
    /* 0 < into < 90 lies on corner `quarter`; 0 is the edge midpoint. */
    if (into === 0) {
      /* 12:00 is s = 0 (top centre); 3, 6 and 9 are the side / bottom midpoints. */
      const edge = [0, 2, 4, 6][quarter]!;
      return edge === 0 ? 0 : starts[edge]! + segs[edge]!.len / 2;
    }
    const arcIdx = [1, 3, 5, 7][quarter]!;
    return starts[arcIdx]! + (into / 90) * q;
  };
  return { L, segs, pointAt, project, rayAt, normalAt, wrapS, mx };
}

export function PerimeterToggle({
  value,
  onChange,
  onExit,
  children,
}: {
  value: CgMode;
  onChange: (next: CgMode) => void;
  /** 12:00 on the track: back to the full G. */
  onExit: () => void;
  /** The page's content: sits inside the stroke and never moves. */
  children: ReactNode;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const safeProbe = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, safe: { t: 0, r: 0, b: 0, l: 0 } });
  /** The toggle's arc length on the track (unbounded; wraps by L). */
  const [pos, setPos] = useState<number | null>(null);
  const posRef = useRef<number | null>(null);
  /** Held: the pointer, whether it has moved, the grab offset and where it began. */
  const drag = useRef<{
    id: number;
    moved: boolean;
    x: number;
    y: number;
    offset: number;
    from: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Where the toggle is heading when it is not being held. */
  const [goal, setGoal] = useState<CgStation>(value);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const cs = safeProbe.current ? getComputedStyle(safeProbe.current) : null;
      const n = (v: string | undefined) => parseFloat(v ?? "0") || 0;
      setSize({
        w: el.clientWidth,
        h: el.clientHeight,
        safe: {
          t: n(cs?.paddingTop),
          r: n(cs?.paddingRight),
          b: n(cs?.paddingBottom),
          l: n(cs?.paddingLeft),
        },
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* A mode chosen from outside (or committed here) is where the toggle goes. */
  useEffect(() => {
    setGoal(value);
  }, [value]);

  const geo = useMemo(() => {
    const { w, h, safe } = size;
    /* THE MAIN G'S RING, in px at this screen: the same toggle, exactly. */
    const k = gPxPerUnit(w, h);
    const tg = toggleGeometry("middle");
    const outerR = tg.EAR.outerR * k;
    const innerR = tg.EAR.innerR * k;
    const ringMid = tg.RING_MID * k;
    const ringW = tg.RING_W * k;
    const trackW = ringW * TRACK_OF_RING;
    const title = titleText(innerR);
    /* The stroke's centreline, the ring's outer radius + EDGE in from each edge. */
    const inset = {
      t: outerR + Math.max(EDGE, safe.t),
      r: outerR + Math.max(EDGE, safe.r),
      b: outerR + Math.max(EDGE, safe.b),
      l: outerR + Math.max(EDGE, safe.l),
    };
    const left = inset.l;
    const top = inset.t;
    const right = Math.max(left, w - inset.r);
    const bottom = Math.max(top, h - inset.b);
    const rc = Math.max(
      0,
      Math.min(outerR * CORNER_OF_RING, (right - left) / 2, (bottom - top) / 2),
    );
    const track = buildTrack(left, top, right, bottom, rc);
    /* The content box: CONTENT_GAP inside the stroke's inner edge. */
    const inner = trackW / 2 + CONTENT_GAP;
    /* How far a corner seat's ring reaches into the content box (+ EDGE):
       content that must never sit under a parked toggle clears this. */
    const cornerIn = rc * (1 - Math.SQRT1_2) - inner;
    const content = {
      left: left + inner,
      top: top + inner,
      right: w - right + inner,
      bottom: h - bottom + inner,
      radius: Math.max(0, rc - inner),
      clear: Math.max(0, cornerIn + outerR + EDGE),
    };
    const seatS = Object.fromEntries(
      STATIONS.map((s) => [s, track.normalAt(clockOf(s))]),
    ) as Record<CgStation, number>;
    return {
      k,
      outerR,
      innerR,
      ringMid,
      ringW,
      trackW,
      title,
      left,
      top,
      right,
      bottom,
      rc,
      track,
      content,
      seatS,
    };
  }, [size]);

  const { track, seatS } = geo;

  /* Park on the current seat as soon as the track is known (entry: 6:00). */
  useLayoutEffect(() => {
    if (!size.w || posRef.current !== null) return;
    posRef.current = seatS[value];
    setPos(seatS[value]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first measure only
  }, [size.w]);

  /* A resize keeps the toggle on its seat. */
  useEffect(() => {
    if (!size.w || posRef.current === null || drag.current) return;
    const st = nearest(posRef.current);
    posRef.current = seatS[st];
    setPos(seatS[st]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometry changes only
  }, [geo]);

  const put = (s: number) => {
    posRef.current = s;
    setPos(s);
  };

  /** Signed shortest travel along the track from a to b. */
  const along = (a: number, b: number) => {
    let d = track.wrapS(b - a);
    if (d > track.L / 2) d -= track.L;
    return d;
  };

  /** The seat nearest arc length s, measured along the stroke. */
  const nearest = (s: number): CgStation => {
    let best: CgStation = "everything";
    let bestD = Infinity;
    for (const st of STATIONS) {
      const d = Math.abs(along(s, seatS[st]));
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  };

  /* Slide to the goal, the short way round the stroke. The page stays still. */
  useEffect(() => {
    if (dragging || posRef.current === null || !size.w) return;
    const target = posRef.current + along(posRef.current, seatS[goal]);
    let raf = 0;
    const step = () => {
      const p = posRef.current!;
      const next = p + (target - p) * 0.2;
      if (Math.abs(target - next) < 0.3) {
        put(target);
        if (goal === "exit") onExit();
        return;
      }
      put(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onExit is a fresh closure each render
  }, [goal, dragging, geo]);

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

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const { w, h } = size;
  const s = pos ?? seatS[value] ?? 0;
  const knob = w ? track.pointAt(s) : { x: 0, y: 0 };
  const here = nearest(s);
  /* The toggle names the seat it is going to; while held, the nearest seat. */
  const shown: CgStation = dragging ? here : goal;
  const colour = colourOf(shown);
  /* Clock angle of the toggle (for tests and a11y): even between seats. */
  const clock = (() => {
    if (!w) return clockOf(value);
    for (let i = 0; i < STATIONS.length; i++) {
      const a = STATIONS[i]!;
      const b = STATIONS[(i + 1) % STATIONS.length]!;
      const span = track.wrapS(seatS[b] - seatS[a]) || track.L;
      const into = track.wrapS(s - seatS[a]);
      if (into <= span) return (clockOf(a) + (45 * into) / span) % 360;
    }
    return 0;
  })();
  const box = 2 * geo.outerR + 4;
  const half = box / 2;
  const trackPath = w
    ? `M ${track.mx} ${geo.top} H ${geo.right - geo.rc} A ${geo.rc} ${geo.rc} 0 0 1 ${geo.right} ${geo.top + geo.rc} V ${geo.bottom - geo.rc} A ${geo.rc} ${geo.rc} 0 0 1 ${geo.right - geo.rc} ${geo.bottom} H ${geo.left + geo.rc} A ${geo.rc} ${geo.rc} 0 0 1 ${geo.left} ${geo.bottom - geo.rc} V ${geo.top + geo.rc} A ${geo.rc} ${geo.rc} 0 0 1 ${geo.left + geo.rc} ${geo.top} Z`
    : "";
  /* The tap band: from the screen edge in to the content box, never over it. */
  const c = geo.content;
  const cr = c.radius;
  const cl = c.left;
  const ct = c.top;
  const crt = w - c.right;
  const cb = h - c.bottom;
  const bandPath = w
    ? `M 0 0 H ${w} V ${h} H 0 Z M ${cl + cr} ${ct} A ${cr} ${cr} 0 0 0 ${cl} ${ct + cr} V ${cb - cr} A ${cr} ${cr} 0 0 0 ${cl + cr} ${cb} H ${crt - cr} A ${cr} ${cr} 0 0 0 ${crt} ${cb - cr} V ${ct + cr} A ${cr} ${cr} 0 0 0 ${crt - cr} ${ct} Z`
    : "";

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "var(--world-bg)" }}
      data-cg-stage=""
    >
      <div
        ref={safeProbe}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
        }}
      />
      {/* THE PAGE: upright, full size, full screen, always. It never moves. */}
      <div className="absolute inset-0" style={{ background: "var(--world-bg)" }} data-cg-page="">
        {/* The content box, inside the stroke and clipped to it, so the
            stroke can never cross the content. Its own stacking layer (the
            map's panes included), so the stroke and toggle sit above it. */}
        <div
          className="absolute isolate overflow-hidden"
          style={{
            left: c.left,
            top: c.top,
            right: c.right,
            bottom: c.bottom,
            borderRadius: cr,
            ["--cg-clear" as string]: `${c.clear.toFixed(2)}px`,
          }}
          data-cg-content=""
        >
          {children}
        </div>

        {w ? (
          <svg
            className="pointer-events-none absolute left-0 top-0 z-30"
            width={w}
            height={h}
            aria-hidden="true"
            data-cg-perimeter=""
            data-cg-clock={clock.toFixed(1)}
            data-cg-s={track.wrapS(s).toFixed(2)}
          >
            {/* THE TRACK: one thin red stroke, the path the toggle travels. */}
            <path
              d={trackPath}
              fill="none"
              stroke={RED}
              strokeWidth={geo.trackW}
              data-cg-track=""
            />
            {/* THE SEATS' TAP BAND: outside the content box only. A tap within
                HIT_ALONG / 2 of a seat along the stroke goes to that seat. */}
            <path
              d={bandPath}
              fill="transparent"
              fillRule="evenodd"
              pointerEvents="fill"
              data-cg-band=""
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                const at = track.project(local(e));
                const st = nearest(at);
                if (Math.abs(along(at, seatS[st])) <= HIT_ALONG / 2) go(st);
              }}
            />
          </svg>
        ) : null}

        {/* THE TOGGLE: the main G's ring, centred on the stroke, in the seat's
            colour, its hole opaque white, the seat's word inside. */}
        {w ? (
          <div
            className="absolute left-0 top-0 z-40 rounded-full outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
            style={{
              width: box,
              height: box,
              transform: `translate(${(knob.x - half).toFixed(2)}px, ${(knob.y - half).toFixed(2)}px)`,
              willChange: "transform",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              outline: "none",
            }}
            role="slider"
            tabIndex={0}
            aria-label="communi-gy mode"
            aria-valuetext={shown === "exit" ? "back to the g" : shown}
            data-cg-toggle=""
            data-cg-seat={shown}
            data-x={knob.x.toFixed(2)}
            data-y={knob.y.toFixed(2)}
            onPointerDown={(e) => {
              e.stopPropagation();
              const f = track.rayAt(local(e));
              drag.current = {
                id: e.pointerId,
                moved: false,
                x: e.clientX,
                y: e.clientY,
                offset: along(f, posRef.current ?? s),
                from: f,
              };
              setDragging(true);
              (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
              d.moved = true;
              const f = track.rayAt(local(e));
              /* The grab offset fades as the finger travels, so the toggle
                 ends up exactly where the finger's ray meets the stroke. */
              const fade = Math.max(0, 1 - Math.abs(along(d.from, f)) / GRAB_FADE);
              const cur = posRef.current ?? s;
              put(cur + along(cur, f + d.offset * fade));
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              if (d?.id !== e.pointerId) return;
              drag.current = null;
              if (d.moved) go(nearest(posRef.current ?? s));
              setDragging(false);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
            }}
            onKeyDown={(e) => {
              /* Steps through the modes; 12:00 (the exit) is not a key stop. */
              const modes = STATIONS.filter((st) => st !== "exit");
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
            <svg width={box} height={box} className="pointer-events-none block" aria-hidden="true">
              {/* THE HOLE: opaque paper out to the stroke's inner edge. */}
              <circle
                cx={half}
                cy={half}
                r={geo.innerR + HOLE_TUCK}
                fill="var(--world-bg)"
                data-cg-hole=""
              />
              <circle
                cx={half}
                cy={half}
                r={geo.ringMid}
                fill="none"
                stroke={colour}
                strokeWidth={geo.ringW}
                data-cg-ring=""
              />
              <text
                x={half + geo.title.dx}
                y={half + geo.title.dy}
                textAnchor="middle"
                fill={colour}
                data-cg-title=""
                style={geo.title.style}
              >
                {wordOf(shown)}
              </text>
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
}
