/** Smooth fit of the canonical lower loop's measured stroke centre (not a circle).
 * The coefficients retain its broad base, narrower shoulders and optical offset.
 * SVG paint, arm normal, and camera all consume this same differentiable curve.
 * Full Living G artwork is untouched. */
export type Point = { x: number; y: number };
import { LOWER_MIN, LOWER_WIRE_END, BACK_ANGLE } from "./lower-stations";
import { visibleStroke, BEAD_SCREEN_RADIUS } from "../living-g/screen-paint";
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
/** Centreline measured from the locked canonical connection: lower shoulder
 * (270,608), right turn (~381,537), upper shoulder (300,475).
 * Translate only to join the smooth lower wire; no screen-space rail/tail.
 * Both cubic segments share the measured upward tangent at the right turn. */
export function sCurve(width: number, height: number) {
  const f0 = frameOf(width, height, 0), p0 = trackPose(0).point;
  const dy = p0.y - 608;
  const point = (x:number,y:number) => ({x,y:y+dy});
  return {p0, p1:{x:p0.x+79,y:p0.y+79*trackPose(0).tangent.y/trackPose(0).tangent.x}, p2:point(381,585), p3:point(381,537),
    p4:point(381,501), p5:point(343,478), p6:point(300,475), f0};
}
export function sPath(width: number, height: number) {
  const p=sCurve(width,height);
  return `M ${p.p0.x} ${p.p0.y} C ${p.p1.x} ${p.p1.y} ${p.p2.x} ${p.p2.y} ${p.p3.x} ${p.p3.y} C ${p.p4.x} ${p.p4.y} ${p.p5.x} ${p.p5.y} ${p.p6.x} ${p.p6.y}`;
}
function returnPose(width:number,height:number,u:number) {
  const p=sCurve(width,height), second=u>.55;
  const t=second?(u-.55)/.45:u/.55,v=1-t;
  const [a,b,c,d]=second?[p.p3,p.p4,p.p5,p.p6]:[p.p0,p.p1,p.p2,p.p3];
  const point={x:v*v*v*a.x+3*v*v*t*b.x+3*v*t*t*c.x+t*t*t*d.x,y:v*v*v*a.y+3*v*v*t*b.y+3*v*t*t*c.y+t*t*t*d.y};
  const tx=3*v*v*(b.x-a.x)+6*v*t*(c.x-b.x)+3*t*t*(d.x-c.x),ty=3*v*v*(b.y-a.y)+6*v*t*(c.y-b.y)+3*t*t*(d.y-c.y),speed=Math.hypot(tx,ty);
  return {point,normal:{x:ty/speed,y:-tx/speed},f0:p.f0};
}
export function frameOf(width: number, height: number, angle: number): { x: number; y: number; scale: number; bead: Point; root: Point; tip: Point; normal: Point } {
  if (angle > 0) {
    const u=Math.min(1,angle/BACK_ANGLE), pose=returnPose(width,height,u);
    const k=u*u*(3-2*u), scale=pose.f0.scale+(width/576-pose.f0.scale)*k;
    // The same progress pulls back the camera to reveal the upward S.
    const x=pose.f0.x+((width/2-330*scale)-pose.f0.x)*k;
    const y=pose.f0.y+((height*.38-530*scale)-pose.f0.y)*k;
    const point={x:x+pose.point.x*scale,y:y+pose.point.y*scale};
    const reach=TRACK_WIDTH/2+ARM_LENGTH+BEAD_RADIUS;
    const normal=pose.normal;
    const bead={x:point.x-normal.x*reach,y:point.y-normal.y*reach};
    const root={x:point.x-normal.x*visibleStroke(width)/2,y:point.y-normal.y*visibleStroke(width)/2};
    const tip={x:bead.x+normal.x*(BEAD_SCREEN_RADIUS-visibleStroke(width)/2),y:bead.y+normal.y*(BEAD_SCREEN_RADIUS-visibleStroke(width)/2)};
    return {x,y,scale,bead,root,tip,normal};
  }
  const pose = trackPose(angle);
  const a = angle * RAD;
  // Uniform responsive fit opens the upper hollow on tall frames. The lens
  // remains one bounded angle-driven function; artwork and stations do not move.
  const scale = scaleOf(angle) + responsiveFit(width,height);
  // Entire 88px local grip remains on screen; no after-the-fact bead clamping.
  const bead = { x: width / 2 + Math.sin(a) * (Math.max(0, width / 2 - 54) + 128 * Math.tanh(Math.max(0,390-width)/70) * Math.cos(a)**2), y: height / 2 - Math.cos(a) * Math.max(0, height / 2 - 54) };
  const reach = TRACK_WIDTH / 2 + ARM_LENGTH + BEAD_RADIUS;
  const point = { x: bead.x + pose.normal.x * reach, y: bead.y + pose.normal.y * reach };
  const x = point.x - pose.point.x * scale;
  const y = point.y - pose.point.y * scale;
  const root = { x: point.x - pose.normal.x * visibleStroke(width) / 2, y: point.y - pose.normal.y * visibleStroke(width) / 2 };
  const tip = { x: bead.x + pose.normal.x * (BEAD_SCREEN_RADIUS - visibleStroke(width) / 2), y: bead.y + pose.normal.y * (BEAD_SCREEN_RADIUS - visibleStroke(width) / 2) };
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
/** Smooth bounded viewport contribution shared by every station. */
export const responsiveFit = (width:number,height:number) => .75 * Math.tanh(Math.max(0,height-width*640/390)/345) + .6 * Math.tanh(Math.max(0,390-width)/70);
