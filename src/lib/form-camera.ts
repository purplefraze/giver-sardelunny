import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { rimRadius } from "@/components/living-g/g-weight";
export type FormPose = { x: number; y: number; scale: number };
/** One scalar for both axes, even on the tallest phone. */
export function formCamera(t: number, start: FormPose, width: number, height: number): FormPose {
  // Side arcs may leave a narrow screen, but the top/bottom rim stays visible.
  const scale = Math.max(0.1, (height - 24) / (2 * rimRadius("middle")));
  const end = { scale, x: width / 2 - LOOP_CENTRE.middle.x * scale, y: height / 2 - LOOP_CENTRE.middle.y * scale };
  return { scale: start.scale + (end.scale - start.scale) * t, x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}