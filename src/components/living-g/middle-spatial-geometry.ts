import { SEAT_ANGLE, FULL_SEATS, type Seat } from "./EarSelector";
import { toggleGeometry } from "./EarSelector";
import { togglePath } from "./toggle-path";

export const MIDDLE_MIN = -270;
export const MIDDLE_MAX = 60;
export const middleClamp = (angle: number) => Math.max(MIDDLE_MIN, Math.min(MIDDLE_MAX, angle));
export const middleDegrees = (seat: Seat) => SEAT_ANGLE[seat] * 180 / Math.PI;
export const middleNearest = (angle: number): Seat => FULL_SEATS.reduce<Seat>((best, seat) => Math.abs(middleDegrees(seat) - angle) < Math.abs(middleDegrees(best) - angle) ? seat : best, "wish");
export const middleStations = FULL_SEATS.map(value => ({ value, angle: middleDegrees(value) }));
export const middleGeometry = toggleGeometry("middle");

/** One bounded angle owns the camera, lens and canonical rigid assembly.
 * The wire keeps the existing physical gap; there is no circular shortcut. */
export function middleFrame(width: number, height: number, angle: number) {
  const a = angle * Math.PI / 180;
  const scale = Math.min(1, width / 390) * (.82 + .08 * Math.cos(a) ** 2);
  const radius = middleGeometry.EAR.outerR * scale;
  const margin = radius + 14;
  const bead = { x: width / 2 + Math.cos(a) * Math.max(0, width / 2 - margin), y: height / 2 + Math.sin(a) * Math.max(0, height / 2 - margin) };
  const pose = togglePath("middle").poseDeg(angle);
  const x = bead.x - pose.x * scale, y = bead.y - pose.y * scale;
  const side = Math.abs(Math.cos(a)) ** 8;
  const lower = Math.max(0, -Math.sin(a)), upper = Math.max(0, Math.sin(a));
  const content = {
    left: 24 + Math.max(0, -Math.cos(a)) * side * (width * .43),
    right: 24 + Math.max(0, Math.cos(a)) * side * (width * .43),
    top: 24 + lower * (radius * 2 + 110),
    bottom: 24 + upper * (radius * 2 + 110),
  };
  return { x, y, scale, bead, radius, pose, content };
}