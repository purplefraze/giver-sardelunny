import type { CgMode } from "@/data/communigy";

/** Lower-only open wire; full Living G seats remain untouched. Clock angles
 * are unwrapped counterclockwise so top→Give can never cross the opening. */
/** "back" is the outside S-curve destination past 12 o'clock (the loop's open end).
 * COMMUNI-G NAV (29 Oct 2026): the loop is entered at ITS 6:00, "everything",
 * labelled "Communi-G". The map is no longer a station (it is a list/map view
 * inside Communi-G) and nothing rests at the lower loop's 12:00. */
export type CgStation = CgMode | "back";
export const BACK_ANGLE = 60;
export const LOWER_STATIONS: { value: CgStation; angle: number }[] = [
  { value: "back", angle: BACK_ANGLE },
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
  Math.abs(clampLower(angle) - s.angle) < Math.abs(clampLower(angle) - lowerAngle(best)) ? s.value : best, "everything" as CgStation);
export const lowerToken = (value: CgStation) => `--mode-${value === "everything" || value === "back" ? "communigy" : value}`;
export const lowerWord = (value: CgStation) => value === "back" ? "my g" : value === "everything" ? "Communi-G" : value;