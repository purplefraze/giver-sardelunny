import { expect, test } from "bun:test";
import { visibleStroke, paintInUnits } from "../src/components/living-g/screen-paint";
test("authorised visible stroke checkpoints", () => {
  expect(visibleStroke(320)).toBe(8);
  expect(visibleStroke(390)).toBe(9);
  expect(visibleStroke(430)).toBe(10);
});
test("camera compensation preserves screen paint", () => {
  for (const scale of [.3,.53,1,2,3]) expect(paintInUnits(390,scale)*scale).toBeCloseTo(9,8);
});