/** Screen paint is independent of canonical camera/orbit geometry. */
export function visibleStroke(width: number) {
  if (width <= 390) return 8 + (Math.max(320, width) - 320) / 70;
  return Math.min(10, 9 + (width - 390) / 40);
}
export const paintInUnits = (width: number, scale: number) => visibleStroke(width) / Math.max(.001, scale);
export const BEAD_SCREEN_RADIUS = 39;