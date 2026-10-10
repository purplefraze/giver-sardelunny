import { expect, test } from "bun:test";
import { formCamera } from "../src/lib/form-camera";
import { LOOP_CENTRE } from "../src/components/living-g/g-path";
import { rimRadius } from "../src/components/living-g/g-weight";
test("opening starts at the exact captured pose", () => {
  expect(formCamera(0, {x:30,y:10,scale:.5},320,568)).toEqual({x:30,y:10,scale:.5});
});
test("narrow and tall forms use one uniform scale centred on canonical middle", () => {
  for(const [w,h] of [[320,568],[390,844],[430,932]]) {
    const p=formCamera(1,{x:0,y:0,scale:1},w,h);
    expect(p.x+LOOP_CENTRE.middle.x*p.scale).toBeCloseTo(w/2);
    expect(p.y+LOOP_CENTRE.middle.y*p.scale).toBeCloseTo(h/2);
    expect(p.y+(LOOP_CENTRE.middle.y-rimRadius("middle"))*p.scale).toBeCloseTo(12);
    expect(p.y+(LOOP_CENTRE.middle.y+rimRadius("middle"))*p.scale).toBeCloseTo(h-12);
  }
});