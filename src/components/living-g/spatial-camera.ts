import { anchorOrigin, type GAnchorKey } from "./g-depth";

export type CameraPose = { x: number; y: number; scale: number };
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * ease(t);
export const SPATIAL_CAMERA_MS = 880;

/** A single continuous lens: retreat, orient/pan, approach. No opacity track. */
export function spatialCameraPose(from: GAnchorKey | null, to: GAnchorKey | null, progress: number): CameraPose {
  const t = Math.max(0, Math.min(1, progress));
  const a = from ? anchorOrigin(from) : { x: 50, y: 50 };
  const b = to ? anchorOrigin(to) : { x: 50, y: 50 };
  const start = from ? 2.62 : 1, end = to ? 2.62 : 1;
  const scale = t < .3 ? mix(start, 1, t / .3) : t < .65 ? 1 : mix(1, end, (t - .65) / .35);
  const pan = Math.max(0, Math.min(1, (t - .25) / .45));
  return { x: mix(a.x, b.x, pan), y: mix(a.y, b.y, pan), scale };
}