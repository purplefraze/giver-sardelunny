import {expect,test} from "bun:test";
import {sCurve,frameOf,trackPose} from "../src/components/community/perimeter-geometry";
import {lowerAngle} from "../src/components/community/lower-stations";
import {canonicalRimRadius,canonicalConnectorCentre} from "../src/components/living-g/canonical-rim";
test("only authorised overview and map stations swap",()=>{
  expect(["everything","map","wish","borrow","fund","trade","lend","give"].map(s=>lowerAngle(s as Parameters<typeof lowerAngle>[0]))).toEqual([0,-180,-45,-90,-135,-225,-270,-315]);
});
test("return follows measured canonical right turn and upper shoulder, no downward tail",()=>{
  const p=sCurve(390,844),dy=trackPose(0).point.y-608;
  expect(p.p3).toEqual({x:canonicalConnectorCentre(537).x,y:537+dy});
  expect(p.p6).toEqual({x:300,y:475+dy});
  for(const [w,h]of [[320,568],[390,640],[390,844],[430,932]]) for(let a=0;a<=60;a+=.5){
    const f=frameOf(w??0,h??0,a),next=frameOf(w??0,h??0,a+.001);
    expect(Math.hypot(f.bead.x-next.bead.x,f.bead.y-next.bead.y)).toBeLessThan(.1);
    expect(Math.hypot(f.normal.x,f.normal.y)).toBeCloseTo(1,6);
  }
});
test("redrawn middle loop is a true circle: rim radius is constant 169.75",()=>{
  for(const d of [-65,-20,0,90,180]) expect(canonicalRimRadius(d)).toBe(169.75);
});