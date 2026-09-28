import { EAR_GEOMETRY, LOOP_CENTRE } from "./g-path";
import { strokeInset, TOGGLE, trackRadius, type GWeight } from "./g-weight";

/**
 * THE TOGGLE'S PATH — ONE CONTINUOUS CONVEYOR ROUND BOTH LOOPS.
 *
 * The toggle used to ride one circle (the middle loop's orbit), so its 6:00
 * seat parked in the WAIST between the loops and cut the S-curve away. The
 * 6:00 seat (map / search) now docks on the OUTER edge of the LOWER loop, at
 * its bottom, with the same 24.5-unit white gap and the same piece. To get
 * there the path leaves the upper orbit at the trade / fund seats, flares out
 * to both sides, runs straight down and follows the lower loop's own orbit
 * round the bottom:
 *
 *   top      the middle loop's orbit (rim + 24.5 gap + ring radius), from
 *            fund (7:30) over 12:00 to trade (4:25) — exactly the old circle,
 *            so every seat but map sits where it always did, stem on the rim
 *   flares   a cubic from each of those seats out to the side, leaving at a
 *            tilt away from the S (FLARE), the stem easing round with it
 *   sides    vertical at the old lend / borrow reach (x = 272 ± orbit), so
 *            the piece never reaches further out than it did at lend / borrow
 *            (the stage width is UNCHANGED — see WIDTH below)
 *   corners  a round fillet (FILLET) from each side onto the lower orbit
 *   bottom   the lower loop's orbit (its outer rim + 24.5 gap + ring radius)
 *            round 6:00, where the map seat docks
 *
 * The shape is STAR-SHAPED about the middle loop's centre (checked: the polar
 * angle rises monotonically all the way round), so every ray from that centre
 * meets it exactly once: the path is PARAMETRISED BY THE
 * SAME POLAR ANGLE the toggle always used (degrees or radians about
 * LOOP_CENTRE.middle, SVG sense). Seat angles, drag (finger angle about the
 * centre, short way round), snapping and the colour / emphasis blends all
 * keep working unchanged; only the POINT at an angle moves. Arc length is
 * also tabled, for anything that must travel at an even speed (the email
 * step's drift).
 *
 * WIDTH. A 24.5 gap all the way round the lower loop's widest point would
 * push the piece ~71 units further out on each side than lend / borrow
 * (860.7 units wide instead of 715.4), shrinking every G ~17%. The sides
 * therefore stay on the old width: in transit (never at a seat) the piece
 * passes OVER the lower loop's side stroke, lifted by the same paper
 * footprint it already used for crossings. It never crosses the waist or
 * the S: the side runs ≥ 30 units clear of the S-curve's outer edge.
 *
 * THE LOWER LOOP'S OUTER EDGE, measured off the canonical traced outline
 * (normal weight; point-in-fill along rays): left x 0.75 (y 839), right
 * x 538.5 (y 841), lowest y 1132.5 (x 268). The circle through those three:
 * centre (269.6, 862.6), radius 269.9. Round the bottom arc the real edge sits
 * 0–4.5 units INSIDE that circle, so the white gap is ≥ 24.5 everywhere on
 * it. At a lighter weight the edge moves in by strokeInset (257.4 at middle).
 */
export const LOWER_OUTER = { cx: 269.6, cy: 862.6, r: 269.9 } as const;

/** The corner fillet from each side onto the lower orbit (units). */
const FILLET = 90;

/**
 * Where the path leaves / rejoins the upper orbit (degrees about the middle
 * loop's centre). These are the TRADE (4:25) and FUND (7:30) seats: both keep
 * the exact old orbit position, so their stems still land on the middle loop's
 * rim with the 24.5 gap. Below them the path FLARES out to the sides.
 */
export const ORBIT_OUT_DEG = 42.5;
export const ORBIT_IN_DEG = 135;

/**
 * The flare from the orbit seat out to the side: a cubic that leaves the seat
 * tilted FLARE_TILT degrees clockwise of straight out (so it heads away from
 * the S and the polar angle keeps rising) and lands vertically on the side at
 * FLARE_DROP units below the seat.
 */
const FLARE = {
  right: { tilt: 38, lead: 70, drop: 150, land: 70 },
  left: { tilt: 38, lead: 70, drop: 200, land: 80 },
} as const;

type Pt = { x: number; y: number };
export type TrackPose = {
  /** The ring's centre. */
  x: number;
  y: number;
  /** Unit OUTWARD normal: from the G towards the ring. */
  nx: number;
  ny: number;
  /** The outward normal as an angle (degrees, SVG sense) — the piece's rotation. */
  deg: number;
};

type Sample = { phi: number; x: number; y: number; nx: number; ny: number; s: number };

export type TogglePath = {
  /** The pose at a polar angle about the middle loop's centre (DEGREES, any turn). */
  poseDeg: (deg: number) => TrackPose;
  /** The same, in RADIANS. */
  pose: (rad: number) => TrackPose;
  /** Arc length from 12:00 (clockwise) at a polar angle (degrees, any turn; 0..length). */
  arcAt: (deg: number) => number;
  /** The polar angle (degrees, in [-90, 270)) at an arc length (any, wraps). */
  degAt: (s: number) => number;
  length: number;
  /** The ring's lowest outer edge (the map dock at 6:00), viewBox y. */
  bottom: number;
  /** The path itself (the ring-centre line) as SVG path data — debug / stills. */
  d: string;
};

const C1 = LOOP_CENTRE.middle;
const norm = (d: number) => ((((d + 90) % 360) + 360) % 360) - 90;

function build(weight: GWeight): TogglePath {
  const r1 = trackRadius(weight);
  const outerR = TOGGLE[weight].outerR;
  const C2: Pt = { x: LOWER_OUTER.cx, y: LOWER_OUTER.cy };
  const R2 = LOWER_OUTER.r - strokeInset(weight) + EAR_GEOMETRY.gap + outerR;
  const xR = C1.x + r1;
  const xL = C1.x - r1;

  /* Fillet centres: tangent to the side (inside) and internally to the lower orbit. */
  const fillet = (side: 1 | -1) => {
    const wall = side > 0 ? xR : xL;
    const fx = wall - side * FILLET;
    const dx = fx - C2.x;
    const fy = C2.y + Math.sqrt(Math.max(0, (R2 - FILLET) ** 2 - dx * dx));
    /* Where the fillet meets the lower orbit (angle about C2 and about F). */
    const a = Math.atan2(fy - C2.y, fx - C2.x);
    return { fx, fy, a, wall };
  };
  const fr = fillet(1);
  const fl = fillet(-1);

  /* Sample the closed path clockwise from 12:00, ~2 units apart. */
  const pts: { x: number; y: number; nx: number; ny: number }[] = [];
  const arc = (c: Pt, r: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / 2));
    for (let i = 0; i < n; i += 1) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push({
        x: c.x + r * Math.cos(a),
        y: c.y + r * Math.sin(a),
        nx: Math.cos(a),
        ny: Math.sin(a),
      });
    }
  };
  const line = (a: Pt, b: Pt, nx: number, ny: number) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let i = 0; i < n; i += 1) {
      pts.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n, nx, ny });
    }
  };
  /*
   * A cubic p0→p3 (clockwise travel). The piece's normal is the curve's own
   * outward normal, eased from `n0` at the start / to `n3` at the end so the
   * stem turns smoothly off the orbit seat instead of snapping.
   */
  const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n0: Pt | null, n3: Pt | null) => {
    const at = (t: number) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      };
    };
    let len = 0;
    let prev = p0;
    for (let i = 1; i <= 40; i += 1) {
      const q = at(i / 40);
      len += Math.hypot(q.x - prev.x, q.y - prev.y);
      prev = q;
    }
    const n = Math.max(4, Math.ceil(len / 2));
    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      const q = at(t);
      const q2 = at(Math.min(1, t + 1e-4));
      const q1 = at(Math.max(0, t - 1e-4));
      const tl = Math.hypot(q2.x - q1.x, q2.y - q1.y) || 1;
      let nx = (q2.y - q1.y) / tl;
      let ny = -(q2.x - q1.x) / tl;
      const ease = (k: number) => k * k * (3 - 2 * k);
      if (n0 && t < 0.6) {
        const k = ease(t / 0.6);
        nx = n0.x + (nx - n0.x) * k;
        ny = n0.y + (ny - n0.y) * k;
      }
      if (n3 && t > 0.4) {
        const k = ease((1 - t) / 0.6);
        nx = n3.x + (nx - n3.x) * k;
        ny = n3.y + (ny - n3.y) * k;
      }
      const l = Math.hypot(nx, ny) || 1;
      pts.push({ x: q.x, y: q.y, nx: nx / l, ny: ny / l });
    }
  };
  const rad = (d: number) => (d * Math.PI) / 180;
  const half = Math.PI / 2;
  const onOrbit = (deg: number): Pt => ({
    x: C1.x + r1 * Math.cos(rad(deg)),
    y: C1.y + r1 * Math.sin(rad(deg)),
  });
  const radial = (deg: number): Pt => ({ x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) });

  /* top: 12:00 → the trade seat on the upper orbit */
  arc(C1, r1, -half, rad(ORBIT_OUT_DEG));
  /* right flare: trade seat → the right side */
  {
    const f = FLARE.right;
    const p0 = onOrbit(ORBIT_OUT_DEG);
    const dir = radial(ORBIT_OUT_DEG + f.tilt);
    const p3 = { x: xR, y: p0.y + f.drop };
    cubic(
      p0,
      { x: p0.x + dir.x * f.lead, y: p0.y + dir.y * f.lead },
      { x: p3.x, y: p3.y - f.land },
      p3,
      radial(ORBIT_OUT_DEG),
      { x: 1, y: 0 },
    );
    line(p3, { x: xR, y: fr.fy }, 1, 0);
  }
  /* right fillet: from pointing +x round to the lower-orbit contact */
  arc({ x: fr.fx, y: fr.fy }, FILLET, 0, fr.a);
  /* bottom: the lower orbit from the right contact round 6:00 to the left contact */
  arc(C2, R2, fr.a, fl.a);
  /* left fillet: from the lower-orbit contact round to pointing -x */
  arc({ x: fl.fx, y: fl.fy }, FILLET, fl.a, Math.PI);
  /* left side up, then the left flare in to the fund seat */
  {
    const f = FLARE.left;
    const p3 = onOrbit(ORBIT_IN_DEG);
    /* arriving travel direction = mirror of leaving: tilted anticlockwise of straight in */
    const out = radial(ORBIT_IN_DEG - f.tilt);
    const p0 = { x: xL, y: p3.y + f.drop };
    line({ x: xL, y: fl.fy }, p0, -1, 0);
    cubic(
      p0,
      { x: p0.x, y: p0.y - f.land },
      { x: p3.x + out.x * f.lead, y: p3.y + out.y * f.lead },
      p3,
      { x: -1, y: 0 },
      radial(ORBIT_IN_DEG),
    );
  }
  /* top: the fund seat → 12:00 */
  arc(C1, r1, rad(ORBIT_IN_DEG), Math.PI + half);

  /* Polar angle about C1, unwrapped to rise monotonically from -90. */
  const samples: Sample[] = [];
  let s = 0;
  let prevPhi = -90;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i]!;
    let phi = (Math.atan2(p.y - C1.y, p.x - C1.x) * 180) / Math.PI;
    while (phi < prevPhi - 180) phi += 360;
    if (i === 0) phi = -90;
    if (i > 0) s += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y);
    samples.push({ phi, x: p.x, y: p.y, nx: p.nx, ny: p.ny, s });
    prevPhi = phi;
  }
  const first = samples[0]!;
  const length = s + Math.hypot(first.x - pts[pts.length - 1]!.x, first.y - pts[pts.length - 1]!.y);
  samples.push({ ...first, phi: 270, s: length });

  /* Binary search by a key that rises along the samples. */
  const find = (key: "phi" | "s", v: number) => {
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]![key] <= v) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const span = b[key] - a[key];
    return { a, b, t: span > 0 ? (v - a[key]) / span : 0 };
  };

  const poseDeg = (deg: number): TrackPose => {
    const phi = norm(deg);
    const { a, b, t } = find("phi", phi);
    /* The ray from C1 at phi, intersected with the chord a–b (exact on lines). */
    const ux = Math.cos((phi * Math.PI) / 180);
    const uy = Math.sin((phi * Math.PI) / 180);
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = ux * ey - uy * ex;
    let x = a.x + ex * t;
    let y = a.y + ey * t;
    if (Math.abs(den) > 1e-9) {
      const k = ((a.x - C1.x) * ey - (a.y - C1.y) * ex) / den;
      x = C1.x + ux * k;
      y = C1.y + uy * k;
    }
    let nx = a.nx + (b.nx - a.nx) * t;
    let ny = a.ny + (b.ny - a.ny) * t;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    return { x, y, nx, ny, deg: (Math.atan2(ny, nx) * 180) / Math.PI };
  };

  const arcAt = (deg: number) => {
    const { a, b, t } = find("phi", norm(deg));
    return a.s + (b.s - a.s) * t;
  };
  const degAt = (sv: number) => {
    const w = ((sv % length) + length) % length;
    const { a, b, t } = find("s", w);
    return a.phi + (b.phi - a.phi) * t;
  };

  const d = `M${samples.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")} Z`;

  return {
    poseDeg,
    pose: (rad: number) => poseDeg((rad * 180) / Math.PI),
    arcAt,
    degAt,
    length,
    bottom: C2.y + R2 + outerR,
    d,
  };
}

const cache = new Map<GWeight, TogglePath>();
/** The toggle's path at a stroke weight (memoised; pure). */
export function togglePath(weight: GWeight = "normal"): TogglePath {
  let p = cache.get(weight);
  if (!p) {
    p = build(weight);
    cache.set(weight, p);
  }
  return p;
}

/**
 * The G's full resting extent now reaches the map dock's ring at 6:00, below
 * the lower loop: its lowest edge in viewBox units (middle: 1293.7).
 */
export const dockBottom = (weight: GWeight = "normal") => togglePath(weight).bottom;
