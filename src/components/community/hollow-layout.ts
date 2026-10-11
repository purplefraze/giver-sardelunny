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

/** Each band is measured independently: a lower arc cannot displace a heading. */
export function hollowBand(w: number, h: number, angle: number, start: number, height: number, minimum = 180): Bounds {
  const f = frameOf(w, h, angle);
  const points = Array.from({ length: 361 }, (_, i) => {
    const p = trackPose(i).point;
    return { x: p.x * f.scale + f.x, y: p.y * f.scale + f.y };
  });
  const inset = TRACK_WIDTH / 2 + 14;
  const atY = (y: number) => {
    const xs: { x: number; clearance: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], q = points[i];
      if (p && q && (p.y > y) !== (q.y > y)) xs.push({ x: p.x + (q.x - p.x) * (y - p.y) / (q.y - p.y), clearance: inset * Math.hypot(q.x-p.x,q.y-p.y) / Math.abs(q.y-p.y) });
    }
    xs.sort((a,b) => a.x-b.x);
    const left = xs[0], right = xs[xs.length-1];
    return xs.length >= 2 && left && right ? { l: Math.max(18, left.x + left.clearance), r: Math.min(w - 18, right.x - right.clearance) } : { l: w / 2, r: w / 2 };
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
  const header = hollowBand(w, h, angle, COMMUNITY_TOP, COMMUNITY_HEADER_HEIGHT);
  const controls = hollowBand(w, h, angle, header.b + 8, COMMUNITY_CONTROLS_HEIGHT);
  const feed = hollowBounds(w, h, angle, "everything", controls.b + 8);
  return { header, controls, feed };
}

/** A lower list remains rectangular, without imposing its rectangle on upper bands. */
export function hollowBounds(w: number, h: number, angle: number, seat: CgStation, start = COMMUNITY_TOP) {
  void seat;
  let height = h - 88 - start;
  let band = hollowBand(w, h, angle, start, height, 162);
  while (band.r - band.l < 162 && height > 150) { height -= 4; band = hollowBand(w, h, angle, start, height, 162); }
  return band;
}