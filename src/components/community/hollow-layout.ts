import { frameOf, trackPose, TRACK_WIDTH } from "./perimeter-geometry";
import type { CgStation } from "./lower-stations";

/** Closed measured loop for containment only; the navigation wire stays open. */
export const HOLLOW_PATH = Array.from({ length: 361 }, (_, i) => {
  const p = trackPose(-i).point;
  return `${i ? "L" : "M"} ${p.x.toFixed(6)} ${p.y.toFixed(6)}`;
}).join(" ") + " Z";

export const COMMUNITY_TOP = 56;
export const COMMUNITY_HEADER_HEIGHT = 36;
export const COMMUNITY_CONTROLS_HEIGHT = 92;
type Bounds = { l: number; r: number; t: number; b: number };
const CURVE = Array.from({ length: 361 }, (_, i) => trackPose(i).point);

/** Each band is measured independently: a lower arc cannot displace a heading. */
export function hollowBand(w: number, h: number, angle: number, start: number, height: number, minimum = 180): Bounds {
  const f = frameOf(w, h, angle);
  const points = CURVE.map(p => ({ x: p.x * f.scale + f.x, y: p.y * f.scale + f.y }));
  const inset = TRACK_WIDTH / 2 + 14;
  const rows = new Map<number, { l: number; r: number }>();
  const atY = (y: number) => {
    const cached = rows.get(y);
    if (cached) return cached;
    const xs: { x: number; clearance: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], q = points[i];
      if (p && q && (p.y > y) !== (q.y > y)) xs.push({ x: p.x + (q.x - p.x) * (y - p.y) / (q.y - p.y), clearance: inset * Math.hypot(q.x-p.x,q.y-p.y) / Math.abs(q.y-p.y) });
    }
    xs.sort((a,b) => a.x-b.x);
    const left = xs[0], right = xs[xs.length-1];
    const row = xs.length >= 2 && left && right ? { l: Math.max(18, left.x + left.clearance), r: Math.min(w - 18, right.x - right.clearance) } : { l: w / 2, r: w / 2 };
    rows.set(y, row);
    return row;
  };
  // Exclude the whole grip and connecting arm, not only their paint layer.
  const exclusion = { l: Math.min(f.bead.x - 48, f.root.x - 14), r: Math.max(f.bead.x + 48, f.root.x + 14), t: Math.min(f.bead.y - 48, f.root.y - 14), b: Math.max(f.bead.y + 48, f.root.y + 14) };
  const measure = (t: number, b: number) => {
    let l = 18, r = w - 18;
    for (let y = t; y <= b; y += 2) { const edges = atY(y); l = Math.max(l, edges.l); r = Math.min(r, edges.r); }
    const edges = atY(b); l = Math.max(l, edges.l); r = Math.min(r, edges.r);
    if (exclusion.b > t && exclusion.t < b && exclusion.r > l && exclusion.l < r) {
      if (r - exclusion.r > exclusion.l - l) l = Math.max(l, exclusion.r);
      else r = Math.min(r, exclusion.l);
    }
    return { l, r, t, b };
  };
  let t = start;
  let band = measure(t, t + height);
  while (band.r - band.l < minimum && t + height < h - 88) { t += 2; band = measure(t, t + height); }
  return band;
}

export function communityBands(w: number, h: number, angle: number) {
  // Full contextual heading plus its adjacent map action at the existing 17px.
  const header = hollowBand(w, h, angle, COMMUNITY_TOP, COMMUNITY_HEADER_HEIGHT, 214);
  const controls = hollowBand(w, h, angle, header.b + 8, COMMUNITY_CONTROLS_HEIGHT);
  const feed = hollowBounds(w, h, angle, "everything", controls.b + 8);
  return { header, controls, feed };
}

/** A lower list remains rectangular, without imposing its rectangle on upper bands. */
export function hollowBounds(w: number, h: number, angle: number, seat: CgStation, start = COMMUNITY_TOP) {
  void seat;
  // Grow down from the first usable strip; stop before the lower curve/grip.
  const first = hollowBand(w, h, angle, start, 32, 162);
  let best = first;
  let low = 8, high = Math.floor((h - 88 - first.t) / 4);
  while (low <= high) {
    const step = Math.floor((low + high) / 2), height = step * 4;
    const band = hollowBand(w, h, angle, first.t, height, 0);
    if (band.r - band.l >= 162) { best = band; low = step + 1; }
    else high = step - 1;
  }
  return best;
}