/** Smooth fit of the canonical lower loop's measured stroke centre (not a circle).
 * The coefficients retain its broad base, narrower shoulders and optical offset.
 * SVG paint, arm normal, and camera all consume this same differentiable curve.
 * Full Living G artwork is untouched. */
export type Point = { x: number; y: number };
const RAD = Math.PI / 180;
const COEFFICIENTS = [248.6643094065, -6.1074666129, .6760043650, 7.2934463149, -.4864824929, -.5014184058, -.1502362108, .4579759233, -.0198162384];
export const TRACK_WIDTH = 17;
export const FRAME_SCALE = 1.85;
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
export const TRACK_PATH = (() => {
  const start = trackPose(0).point;
  let path = `M ${start.x} ${start.y}`;
  for (let a = 0; a < 360; a += 5) {
    const p = trackPose(a), q = trackPose(a + 5), dt = 5 * RAD / 3;
    path += ` C ${p.point.x + p.tangent.x * dt} ${p.point.y + p.tangent.y * dt} ${q.point.x - q.tangent.x * dt} ${q.point.y - q.tangent.y * dt} ${q.point.x} ${q.point.y}`;
  }
  return `${path} Z`;
})();
export function frameOf(width: number, height: number, angle: number) {
  const pose = trackPose(angle);
  const a = angle * RAD;
  // Entire 88px local grip remains on screen; no after-the-fact bead clamping.
  const bead = { x: width / 2 + Math.sin(a) * Math.max(0, width / 2 - 54), y: height / 2 - Math.cos(a) * Math.max(0, height / 2 - 54) };
  const reach = TRACK_WIDTH / 2 + ARM_LENGTH + BEAD_RADIUS;
  const point = { x: bead.x + pose.normal.x * reach, y: bead.y + pose.normal.y * reach };
  const x = point.x - pose.point.x * FRAME_SCALE;
  const y = point.y - pose.point.y * FRAME_SCALE;
  const root = { x: point.x - pose.normal.x * (TRACK_WIDTH / 2 - .6), y: point.y - pose.normal.y * (TRACK_WIDTH / 2 - .6) };
  const tip = { x: bead.x + pose.normal.x * 24, y: bead.y + pose.normal.y * 24 };
  return { x, y, scale: FRAME_SCALE, bead, root, tip, normal: pose.normal };
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
/** Stable INPUT centre, never the camera's moving centre; retain grab offset by
 * integrating signed raw-angle deltas rather than assigning the raw angle. */
export function inputAngle(point: Point, centre: Point): number | null {
  const x = point.x - centre.x, y = point.y - centre.y;
  if (Math.hypot(x, y) < 16) return null;
  return Math.atan2(x, -y) / RAD;
}
export const settleDuration = (delta: number, reduced: boolean) => reduced ? 0 : Math.min(SNAP_MS, Math.max(60, Math.abs(delta) * 4));
