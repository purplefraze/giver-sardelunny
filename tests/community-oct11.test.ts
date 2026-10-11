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
  for (const [w,h] of [[320,568],[390,640],[390,844],[430,932]]) for (const angle of [-315,-270,-225,-180,-135,-90,-45,0]) {
    const bands = communityBands(w ?? 0,h ?? 0,angle,{title:angle===0||angle===-180?92:132,action:32,right:angle>=-135&&angle<0});
    expect(bands.header.t).toBe(56);
    expect(bands.controls.t).toBeGreaterThanOrEqual(100);
    expect(bands.controls.t).toBeLessThanOrEqual(102);
    expect(bands.feed.t).toBeGreaterThanOrEqual(200);
    expect(bands.feed.t).toBeLessThanOrEqual(202);
  }
});
test("independent upper bands clear the wire and full grip throughout lower travel", () => {
  for (const [w,h] of [[320,568],[390,640],[390,844],[430,932]] as const) for (let angle=-315;angle<=30;angle+=6) {
    const {header,controls,feed}=communityBands(w,h,angle),f=frameOf(w,h,angle);
    const exclusion={l:Math.min(f.bead.x-48,f.root.x-14),r:Math.max(f.bead.x+48,f.root.x+14),t:Math.min(f.bead.y-48,f.root.y-14),b:Math.max(f.bead.y+48,f.root.y+14)};
    const {title,action}=communityBands(w,h,angle);
    for(const band of [title,action,controls,feed]) {
      expect(band.r>exclusion.l&&band.l<exclusion.r&&band.b>exclusion.t&&band.t<exclusion.b).toBe(false);
      for(const x of [band.l,band.r])for(const y of [band.t,band.b]) {
        let clearance=Infinity;
        for(let d=0;d<360;d+=2){const p=trackPose(d).point;clearance=Math.min(clearance,Math.hypot(x-p.x*f.scale-f.x,y-p.y*f.scale-f.y));}
        expect(clearance).toBeGreaterThan(18);
      }
    }
  }
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
test("responsive fit keeps the full grip on screen and actual longest heading at the reference",()=>{
  for(const [w,h]of [[320,568],[390,640],[390,844],[430,932]] as const){
    for(let a=-315;a<=60;a+=1){const f=frameOf(w,h,a);expect(f.bead.x-44).toBeGreaterThanOrEqual(0);expect(f.bead.x+44).toBeLessThanOrEqual(w);expect(f.bead.y-44).toBeGreaterThanOrEqual(0);expect(f.bead.y+44).toBeLessThanOrEqual(h);}
    for(const a of[-315,-270,-225,-180,-135,-90,-45])expect(communityBands(w,h,a,{title:154,action:32,right:a>=-135&&a<0}).header.t).toBe(56);
  }
});