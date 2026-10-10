/** Smooth fit of the canonical lower loop's measured stroke centre (not a circle).
 * The coefficients retain its broad base, narrower shoulders and optical offset.
 * SVG paint, arm normal, and camera all consume this same differentiable curve.
 * Full Living G artwork is untouched. */
export type Point = { x: number; y: number };
import { LOWER_MIN, LOWER_WIRE_END, BACK_ANGLE } from "./lower-stations";
const RAD = Math.PI / 180;
const COEFFICIENTS = [248.6643094065, -6.1074666129, .6760043650, 7.2934463149, -.4864824929, -.5014184058, -.1502362108, .4579759233, -.0198162384];
export const TRACK_WIDTH = 17;
// A restrained spatial lens: contract toward the ends, expand along the sides.
// No velocity, held flag, clock, or independently animated zoom enters this map.
export const FRAME_MIN_SCALE = 1.45;
export const FRAME_MAX_SCALE = 1.85;
export function scaleOf(angle: number) {
  return FRAME_MIN_SCALE + (FRAME_MAX_SCALE - FRAME_MIN_SCALE) * Math.sin(angle * RAD) ** 2;
}
export const BEAD_RADIUS = 32;
export const ARM_LENGTH = 12;
export const SNAP_MS = 180;
export const wrap = (angle: number) => ((angle % 360) + 360) % 360;
export const signedTurn = (from: number, to: number) => wrap(to - from + 180) - 180;
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export function trackPose(angle: number) {
  const a = angle * RAD;
  let radius = COEFFICIENTS[0] ?? 0;
  let derivative = 0;
  for (let k = 1; k <= 4; k++) {
    const cosine = COEFFICIENTS[k * 2 - 1] ?? 0;
    const sine = COEFFICIENTS[k * 2] ?? 0;
    radius += cosine * Math.cos(k * a) + sine * Math.sin(k * a);
    derivative += k * (-cosine * Math.sin(k * a) + sine * Math.cos(k * a));
  }
  const point = { x: 270 + radius * Math.sin(a), y: 840 - radius * Math.cos(a) };
  const tangent = { x: derivative * Math.sin(a) + radius * Math.cos(a), y: -derivative * Math.cos(a) + radius * Math.sin(a) };
  const speed = Math.hypot(tangent.x, tangent.y);
  return { point, tangent, normal: { x: tangent.y / speed, y: -tangent.x / speed } };
}
/** Cubic Hermite segments share exact endpoint derivatives: no polygon corners,
 * ray quantisation, mask seams, or separate attachment approximation. */
/** A short continuation past the Give attachment, ending in a round cap like
 * the canonical artwork's blunt terminals — the toggle never sits on the tip. */
export const TRACK_TAIL = 10;
export const TRACK_PATH = (() => {
  const start = trackPose(LOWER_WIRE_END).point;
  let path = `M ${start.x} ${start.y}`;
  for (let a = LOWER_WIRE_END; a > LOWER_MIN - TRACK_TAIL; a -= 5) {
    const p = trackPose(a), q = trackPose(a - 5), dt = -5 * RAD / 3;
    path += ` C ${p.point.x + p.tangent.x * dt} ${p.point.y + p.tangent.y * dt} ${q.point.x - q.tangent.x * dt} ${q.point.y - q.tangent.y * dt} ${q.point.x} ${q.point.y}`;
  }
  return path;
})();
/** THE S CONNECTOR, in loop space: leaves the 12 o'clock end with the wire's
 * own tangent (C1, no corner), rises and swings out to the right edge where it
 * runs vertical, so the toggle settles horizontal at ~3 o'clock. It is a fitted
 * connector anchored to the measured wire end, not a trace of the artwork. */
export function sCurve(width: number, height: number) {
  const f0 = frameOf(width, height, 0);
  const p0 = trackPose(0);
  const reach = TRACK_WIDTH / 2 + ARM_LENGTH + BEAD_RADIUS;
  const endScreen = { x: width - 50 - reach, y: height * 0.5 };
  const p3 = { x: (endScreen.x - f0.x) / f0.scale, y: (endScreen.y - f0.y) / f0.scale };
  const t0 = { x: p0.tangent.x / Math.hypot(p0.tangent.x, p0.tangent.y), y: p0.tangent.y / Math.hypot(p0.tangent.x, p0.tangent.y) };
  const span = Math.hypot(p3.x - p0.point.x, p3.y - p0.point.y);
  const p1 = { x: p0.point.x + t0.x * span * 0.55, y: p0.point.y + t0.y * span * 0.55 };
  const p2 = { x: p3.x, y: p3.y - span * 0.55 };
  return { p0: p0.point, p1, p2, p3, f0 };
}
export function sPath(width: number, height: number) {
  const { p0, p1, p2, p3 } = sCurve(width, height);
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y} l 0 ${TRACK_TAIL * 1.4}`;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
export function frameOf(width: number, height: number, angle: number): { x: number; y: number; scale: number; bead: Point; root: Point; tip: Point; normal: Point } {
  if (angle > 0) {
    /* Past twelve: camera holds the 12 o'clock frame; the same toggle rides
       the S and swings from inside to outside through its forward tangent. */
    const { p0, p1, p2, p3, f0 } = sCurve(width, height);
    const u = Math.min(1, angle / BACK_ANGLE), v = 1 - u;
    const lp = { x: v*v*v*p0.x + 3*v*v*u*p1.x + 3*v*u*u*p2.x + u*u*u*p3.x, y: v*v*v*p0.y + 3*v*v*u*p1.y + 3*v*u*u*p2.y + u*u*u*p3.y };
    let tx = 3*v*v*(p1.x-p0.x) + 6*v*u*(p2.x-p1.x) + 3*u*u*(p3.x-p2.x), ty = 3*v*v*(p1.y-p0.y) + 6*v*u*(p2.y-p1.y) + 3*u*u*(p3.y-p2.y);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const n = { x: ty, y: -tx };
    const phi = Math.PI * smooth(Math.max(0, Math.min(1, (u - 0.25) / 0.6)));
    const d0 = { x: -n.x, y: -n.y };
    /* rotate by -phi: passes through the forward tangent at phi = 90°. */
    const d = { x: d0.x * Math.cos(phi) + d0.y * Math.sin(phi), y: -d0.x * Math.sin(phi) + d0.y * Math.cos(phi) };
    const reach = TRACK_WIDTH / 2 + ARM_LENGTH + BEAD_RADIUS;
    const point = { x: f0.x + lp.x * f0.scale, y: f0.y + lp.y * f0.scale };
    const bead = { x: point.x + d.x * reach, y: point.y + d.y * reach };
    const normal = { x: -d.x, y: -d.y };
    const root = { x: point.x - normal.x * (TRACK_WIDTH / 2 - .6), y: point.y - normal.y * (TRACK_WIDTH / 2 - .6) };
    const tip = { x: bead.x + normal.x * 24, y: bead.y + normal.y * 24 };
    return { x: f0.x, y: f0.y, scale: f0.scale, bead, root, tip, normal };
  }
  const pose = trackPose(angle);
  const a = angle * RAD;
  const scale = scaleOf(angle);
  // Entire 88px local grip remains on screen; no after-the-fact bead clamping.
  const bead = { x: width / 2 + Math.sin(a) * Math.max(0, width / 2 - 54), y: height / 2 - Math.cos(a) * Math.max(0, height / 2 - 54) };
  const reach = TRACK_WIDTH / 2 + ARM_LENGTH + BEAD_RADIUS;
  const point = { x: bead.x + pose.normal.x * reach, y: bead.y + pose.normal.y * reach };
  const x = point.x - pose.point.x * scale;
  const y = point.y - pose.point.y * scale;
  const root = { x: point.x - pose.normal.x * (TRACK_WIDTH / 2 - .6), y: point.y - pose.normal.y * (TRACK_WIDTH / 2 - .6) };
  const tip = { x: bead.x + pose.normal.x * 24, y: bead.y + pose.normal.y * 24 };
  return { x, y, scale, bead, root, tip, normal: pose.normal };
}
export function armPath(tip: Point, root: Point, normal: Point) {
  const x = -normal.y * 5, y = normal.x * 5;
  return `M ${tip.x + x} ${tip.y + y} L ${tip.x - x} ${tip.y - y} L ${root.x - x} ${root.y - y} L ${root.x + x} ${root.y + y} Z`;
}
/** Unwrapped crossings, ordered in travel direction, including skipped stations. */
export function crossings<T>(from: number, to: number, stations: readonly { angle: number; value: T }[]): T[] {
  if (from === to) return [];
  const events: { at: number; value: T }[] = [];
  for (const station of stations) {
    const first = Math.floor((Math.min(from, to) - station.angle) / 360) - 1;
    const last = Math.ceil((Math.max(from, to) - station.angle) / 360) + 1;
    for (let k = first; k <= last; k++) {
      const at = station.angle + k * 360;
      if (to > from ? at > from && at <= to : at < from && at >= to) events.push({ at, value: station.value });
    }
  }
  return events.sort((a, b) => to > from ? a.at - b.at : b.at - a.at).map(e => e.value);
}
/** Stable INPUT ellipse, never the camera's moving centre or scale. Normalizing
 * its axes removes tall-phone atan2 gain changes. Signed deltas retain the grab
 * offset without a first-touch jump; identical coordinates always give zero. */
export function inputAngle(point: Point, centre: Point, radii: Point = { x: 1, y: 1 }): number | null {
  const x = point.x - centre.x, y = point.y - centre.y;
  if (Math.hypot(x, y) < 16) return null;
  return Math.atan2(x / Math.max(1, radii.x), -y / Math.max(1, radii.y)) / RAD;
}
export const settleDuration = (delta: number, reduced: boolean) => reduced ? 0 : Math.min(SNAP_MS, Math.max(60, Math.abs(delta) * 4));
