import type { CgMode } from "@/data/communigy";

/** Lower-only open wire; full Living G seats remain untouched. Clock angles
 * are unwrapped counterclockwise so top→Give can never cross the opening. */
/** "back" is the outside S-curve destination past the 12 o'clock map detent. */
export type CgStation = CgMode | "map" | "back";
export const BACK_ANGLE = 60;
export const LOWER_STATIONS: { value: CgStation; angle: number }[] = [
  { value: "back", angle: BACK_ANGLE },
  { value: "map", angle: 0 },
  { value: "wish", angle: -45 },
  { value: "borrow", angle: -90 },
  { value: "fund", angle: -135 },
  { value: "everything", angle: -180 },
  { value: "trade", angle: -225 },
  { value: "lend", angle: -270 },
  { value: "give", angle: -315 },
];
export const LOWER_MIN = -315;
/** Lower wire ends at 12; progress beyond it rides the S connector to "back". */
export const LOWER_WIRE_END = 0;
export const LOWER_MAX = BACK_ANGLE;
export const clampLower = (angle: number) => Math.max(LOWER_MIN, Math.min(LOWER_MAX, angle));
export const lowerAngle = (value: CgStation) => LOWER_STATIONS.find(s => s.value === value)?.angle ?? 0;
export const nearestLower = (angle: number): CgStation => LOWER_STATIONS.reduce((best, s) =>
  Math.abs(clampLower(angle) - s.angle) < Math.abs(clampLower(angle) - lowerAngle(best)) ? s.value : best, "map" as CgStation);
export const lowerToken = (value: CgStation) => `--mode-${value === "map" ? "giver" : value === "everything" || value === "back" ? "communigy" : value}`;
export const lowerWord = (value: CgStation) => value === "everything" ? "all" : value;