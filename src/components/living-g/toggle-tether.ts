import { SEAT_ANGLE, type Seat } from "./EarSelector";
import { togglePath } from "./toggle-path";
import { BEAD_SCREEN_RADIUS, visibleStroke } from "./screen-paint";

/**
 * THE TOGGLE NEVER LEAVES. Inside any seat (any depth of the G) the toggle is
 * still drawn: its arm and part of its ring reach in from the screen edge in
 * the seat's own direction, so the person always knows where they are.
 *
 * Pure screen geometry (px). The ring is pinned so its centre sits just
 * inside the edge — the arm and a good part of the circle are always in view,
 * at every width. The line is a fixed screen weight (visibleStroke), drawn
 * outside every scaled camera layer, so it is even at every zoom level.
 */
export const TETHER = {
  /** Ring radius on screen: the same bead the live toggle draws. */
  ringR: BEAD_SCREEN_RADIUS,
  /** How far the ring's centre sits INSIDE the edge, as a share of its radius. */
  inside: 0.2,
  /** The arm's length inward from the ring's inner edge, as a share of the radius. */
  arm: 1.1,
} as const;

export type Tether = {
  ring: { x: number; y: number; r: number };
  arm: { x1: number; y1: number; x2: number; y2: number };
  stroke: number;
};

/**
 * Where the toggle shows for `seat` in a box of `w`×`h` px whose zoomed
 * anchor sits at (ox, oy) px. Ray-cast from the anchor along the seat's own
 * outward normal to the box edge.
 */
export function tetherAt(seat: Seat, w: number, h: number, ox: number, oy: number): Tether {
  const pose = togglePath("middle").pose(SEAT_ANGLE[seat]);
  const len = Math.hypot(pose.nx, pose.ny) || 1;
  const dx = pose.nx / len;
  const dy = pose.ny / len;
  const r = TETHER.ringR;
  /* An anchor on (or past) an edge is pulled in far enough for the whole arm
     and the ring's centre to land on screen whichever way the seat faces. */
  const m = r * (1 + TETHER.arm + TETHER.inside) + 1;
  const cx = w > 2 * m ? Math.min(Math.max(ox, m), w - m) : w / 2;
  const cy = h > 2 * m ? Math.min(Math.max(oy, m), h - m) : h / 2;
  const tx = dx > 1e-6 ? (w - cx) / dx : dx < -1e-6 ? -cx / dx : Infinity;
  const ty = dy > 1e-6 ? (h - cy) / dy : dy < -1e-6 ? -cy / dy : Infinity;
  const t = Math.min(tx, ty);
  const reach = Math.max(t - r * TETHER.inside, r * (1 + TETHER.arm));
  const x = cx + dx * reach;
  const y = cy + dy * reach;
  return {
    ring: { x, y, r },
    arm: { x1: x - dx * r, y1: y - dy * r, x2: x - dx * r * (1 + TETHER.arm), y2: y - dy * r * (1 + TETHER.arm) },
    stroke: visibleStroke(w),
  };
}
