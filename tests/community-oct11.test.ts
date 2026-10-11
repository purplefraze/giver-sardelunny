import { expect, test } from "bun:test";
import { CG_FILTERS } from "../src/intelligence/community-filter";
import { lowerAngle, nearestLower } from "../src/components/community/lower-stations";
import { frameOf, trackPose } from "../src/components/community/perimeter-geometry";
import { FULL_G_PAINT_STROKE, G_STROKE } from "../src/components/living-g/g-weight";
import { NEIGHBOURHOOD_ZOOM, mapCameraKey } from "../src/components/community/map-view";
import { hollowBounds, communityBands, COMMUNITY_TOP } from "../src/components/community/hollow-layout";
test("categories follow physical wheel, without a map category", () => {
  expect(CG_FILTERS.map(f => f.value)).toEqual(["give","lend","trade","everything","fund","borrow","wish"]);
  expect(CG_FILTERS.map(f => lowerAngle(f.value === "mine" ? "map" : f.value))).toEqual([-315,-270,-225,-180,-135,-90,-45]);
});
test("all sections use one app-frame reference independent of lower list bounds", () => {
  expect(COMMUNITY_TOP).toBe(56);
  for (const angle of [-315,-270,-225,-180,-135,-90,-45]) {
    const bands = communityBands(390,640,angle);
    expect(bands.header.t).toBe(56);
    expect(bands.controls.t).toBe(100);
    expect(bands.feed.t).toBe(200);
  }
  expect(communityBands(390,640,0).header.t).toBe(102);
});
test("travel bounds clear curved wire and attached toggle", () => {
  for (const [w,h] of [[320,568],[390,640],[390,844],[430,932]] as const) for (let angle=-315; angle<=30; angle+=3) {
    const b=hollowBounds(w,h,angle,nearestLower(angle)), f=frameOf(w,h,angle);
    expect(b.r-b.l).toBeGreaterThan(130);
    expect(b.b-b.t).toBeGreaterThan(150);
    expect(b.r>f.bead.x-44 && b.l<f.bead.x+44 && b.b>f.bead.y-44 && b.t<f.bead.y+44).toBe(false);
    for (const x of [b.l,b.r]) for (const y of [b.t,b.b]) {
      let clearance=Infinity;
      for(let d=0;d<360;d+=2){const p=trackPose(d).point;clearance=Math.min(clearance,Math.hypot(x-p.x*f.scale-f.x,y-p.y*f.scale-f.y));}
      expect(clearance).toBeGreaterThan(18);
    }
  }
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