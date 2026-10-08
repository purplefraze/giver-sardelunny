import { expect, test } from "bun:test";
import { middleClamp, middleDegrees, middleFrame, middleGeometry } from "../src/components/living-g/middle-spatial-geometry";
test("all eight live clocks remain exactly in place", () => {
  for (const [seat, degrees] of Object.entries({ giver: -90, give: -45, lend: 0, trade: 45, map: -270, fund: -225, borrow: -180, wish: -135 })) {
    expect(middleDegrees(seat as Parameters<typeof middleDegrees>[0])).toBeCloseTo(degrees, 8);
  }
});
test("wire never shortcuts across the S-curve gap", () => {
  expect(middleClamp(-271)).toBe(-270); expect(middleClamp(61)).toBe(60);
});
test("entire canonical toggle stays visible and keeps its relative proportions", () => {
  for (const height of [844, 932]) for (let angle = -270; angle <= 60; angle++) {
    const f = middleFrame(390, height, angle);
    expect(f.radius / f.scale).toBeCloseTo(middleGeometry.EAR.outerR, 8);
    expect(f.bead.x - f.radius - 6).toBeGreaterThanOrEqual(0);
    expect(f.bead.x + f.radius + 6).toBeLessThanOrEqual(390);
    expect(f.bead.y - f.radius - 6).toBeGreaterThanOrEqual(0);
    expect(f.bead.y + f.radius + 6).toBeLessThanOrEqual(height);
  }
});