import { LOOP_CENTRE, LOOP_SAFE_RADIUS } from "@/components/living-g/g-path";
export type FormPose = { x: number; y: number; scale: number };
/** One scalar for both axes, even on the tallest phone. */
export function formCamera(t: number, start: FormPose, width: number, height: number): FormPose {
  const scale = Math.max(width / (LOOP_SAFE_RADIUS.middle * 1.7), height / (LOOP_SAFE_RADIUS.middle * 1.7));
  const end = { scale, x: width / 2 - LOOP_CENTRE.middle.x * scale, y: height / 2 - LOOP_CENTRE.middle.y * scale };
  return { scale: start.scale + (end.scale - start.scale) * t, x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}