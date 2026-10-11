import { expect, test } from "bun:test";
import { CG_FILTERS } from "../src/intelligence/community-filter";
import { lowerAngle } from "../src/components/community/lower-stations";
import { FULL_G_PAINT_STROKE, G_STROKE } from "../src/components/living-g/g-weight";
import { NEIGHBOURHOOD_ZOOM, mapCameraKey } from "../src/components/community/map-view";
import { hollowBounds } from "../src/components/community/hollow-layout";
test("categories follow physical wheel, without a map category", () => {
  expect(CG_FILTERS.map(f => f.value)).toEqual(["give","lend","trade","everything","fund","borrow","wish"]);
  expect(CG_FILTERS.map(f => lowerAngle(f.value === "mine" ? "map" : f.value))).toEqual([-315,-270,-225,-180,-135,-90,-45]);
});
test("uniform paint preserves established camera measurements", () => {
  expect(FULL_G_PAINT_STROKE).toBe(17);
  expect(G_STROKE.middle).toBe(28.5);
});
test("neighbourhood camera uses centre independently of search radius", () => {
  expect(NEIGHBOURHOOD_ZOOM).toBe(15);
  expect(mapCameraKey({lat:43.6,lng:-79.5})).toBe("43.6:-79.5");
  expect(mapCameraKey(null)).toBe("unknown");
});
test("all phone seats have usable bounded interior", () => {
  for (const [w,h] of [[320,568],[390,640],[390,844],[430,932]]) for (const seat of ["give","lend","trade","everything","fund","borrow","wish","map"] as const) {
    const b = hollowBounds(w ?? 0,h ?? 0,lowerAngle(seat),seat);
    expect(b.r-b.l).toBeGreaterThan(160);
    expect(b.b-b.t).toBeGreaterThan(190);
  }
});