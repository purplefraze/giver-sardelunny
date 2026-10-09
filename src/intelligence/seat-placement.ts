/**
 * SEAT-DEPENDENT TEXT PLACEMENT (Oct 9). Content sits opposite-ish to the
 * control so it reads away from the thumb:
 *   12 centred·lower · 1:30 left·lower-left · 3 left·mid · 4:30 left·upper-left
 *   6 centred·higher · 7:30 right·upper-right · 9 right·mid · 10:30 right·lower-right
 * Only CSS text-align changes — English stays left-to-right, never reversed.
 * Pure: every loop (main, My G, communi-g) reads this one table.
 */
import type { CSSProperties } from "react";

export type SeatAlign = "left" | "center" | "right";
export type SeatPlacement = {
  align: SeatAlign;
  /** Where the content block sits: x/y in -1..1 of the safe area (0 = centre). */
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
};

const TABLE: Record<number, SeatPlacement> = {
  0: { align: "center", x: 0, y: 1 },
  45: { align: "left", x: -1, y: 1 },
  90: { align: "left", x: -1, y: 0 },
  135: { align: "left", x: -1, y: -1 },
  180: { align: "center", x: 0, y: -1 },
  225: { align: "right", x: 1, y: -1 },
  270: { align: "right", x: 1, y: 0 },
  315: { align: "right", x: 1, y: 1 },
};

/** Clock degrees (0 = 12:00, clockwise) → placement of the nearest seat. */
export function seatPlacement(clockDeg: number): SeatPlacement {
  const d = ((Math.round(clockDeg / 45) * 45) % 360 + 360) % 360;
  return TABLE[d]!;
}

/** Flex/padding classes for a block inside a safe area. */
export function placementStyle(p: SeatPlacement): CSSProperties {
  return {
    textAlign: p.align,
    display: "flex",
    flexDirection: "column",
    alignItems: p.x < 0 ? "flex-start" : p.x > 0 ? "flex-end" : "center",
    justifyContent: p.y < 0 ? "flex-start" : p.y > 0 ? "flex-end" : "center",
  };
}
