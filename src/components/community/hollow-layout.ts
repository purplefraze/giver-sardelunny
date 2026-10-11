import { frameOf, trackPose, TRACK_WIDTH } from "./perimeter-geometry";
import type { CgStation } from "./lower-stations";

/** Closed measured loop for containment only; the navigation wire stays open. */
export const HOLLOW_PATH = Array.from({ length: 361 }, (_, i) => {
  const p = trackPose(-i).point;
  return `${i ? "L" : "M"} ${p.x.toFixed(6)} ${p.y.toFixed(6)}`;
}).join(" ") + " Z";

export function hollowBounds(w: number, h: number, angle: number, seat: CgStation) {
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
  let t = seat === "trade" || seat === "everything" ? 56 : 96;
  let b = h - 88;
  const minimum = Math.min(w - 36, 220);
  while (t < b && atY(t).r - atY(t).l < minimum) t += 4;
  while (b > t && atY(b).r - atY(b).l < minimum) b -= 4;
  let l = 18, r = w - 18;
  for (let y = t; y <= b; y += 4) { const edges = atY(y); l = Math.max(l, edges.l); r = Math.min(r, edges.r); }
  // Exclude the whole grip and connecting arm, not only their paint layer.
  const exclusion = { l: Math.min(f.bead.x - 48, f.root.x - 14), r: Math.max(f.bead.x + 48, f.root.x + 14), t: Math.min(f.bead.y - 48, f.root.y - 14), b: Math.max(f.bead.y + 48, f.root.y + 14) };
  const base = { l, r, t, b };
  const hits = exclusion.r > l && exclusion.l < r && exclusion.b > t && exclusion.t < b;
  if (!hits) return base;
  const candidates = [ { ...base, l: Math.max(l, exclusion.r) }, { ...base, r: Math.min(r, exclusion.l) }, { ...base, t: Math.max(t, exclusion.b) }, { ...base, b: Math.min(b, exclusion.t) } ];
  return candidates.reduce((best, q) => Math.max(0, q.r-q.l)*Math.max(0,q.b-q.t) > Math.max(0,best.r-best.l)*Math.max(0,best.b-best.t) ? q : best, candidates[0] ?? base);
}