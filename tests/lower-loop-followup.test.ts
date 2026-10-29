import { expect, test } from "bun:test";
import { LOWER_STATIONS, clampLower, lowerAngle, lowerToken } from "../src/components/community/lower-stations";
import { TRACK_PATH } from "../src/components/community/perimeter-geometry";
import { itemMode } from "../src/data/communigy";
import { reviseFundFixture, DEMO_FUND_ID } from "../src/data/fund-fixture";
import type { Item } from "../src/data/items";

test("top overview to Give follows the counterclockwise wire without moving Trade", () => {
  // Communi-G nav: entered at the lower loop's 6:00 (Community); no map station, nothing at 12:00.
  expect(LOWER_STATIONS.map(s => s.value)).toEqual(["back", "wish", "borrow", "fund", "everything", "trade", "lend", "give"]);
  expect(lowerAngle("everything")).toBe(-180);
  expect(lowerAngle("trade")).toBe(-225);
  expect(lowerAngle("give")).toBe(-315);
});
test("missing top-to-Give arc is open and cannot wrap", () => {
  expect(clampLower(90)).toBe(60);
  expect(clampLower(-360)).toBe(-315);
  expect(TRACK_PATH.endsWith("Z")).toBe(false);
  expect((TRACK_PATH.match(/ C /g) ?? []).length).toBe(65);
});
test("Community is the communi-g token and category assemblies use current authoritative tokens", () => {
  expect(lowerToken("everything")).toBe("--mode-communigy");
  expect(lowerToken("give")).toBe("--mode-give");
  expect(lowerToken("fund")).toBe("--mode-fund");
});
test("prefix category comes from lend and Fund schema, not title", () => {
  expect(itemMode({type:"borrow",side:"lend",details:{}})).toBe("lend");
  expect(itemMode({type:"borrow",side:"borrow",details:{}})).toBe("borrow");
  expect(itemMode({type:"wish",details:{fundTarget:150000}})).toBe("fund");
  expect(itemMode({type:"wish",details:{}})).toBe("wish");
});
test("only unedited synthetic Fund becomes a cause, without changing target or real records", () => {
  const demo = {id:DEMO_FUND_ID,type:"wish",text:"a spare onewheel for the playa",details:{fundTarget:150000}} as Item;
  expect(reviseFundFixture(demo).text).toBe("help a grandmother afford dentures");
  expect(reviseFundFixture(demo).details?.fundTarget).toBe(150000);
  expect(reviseFundFixture({...demo,id:"cloud:real"})).toEqual({...demo,id:"cloud:real"});
  expect(reviseFundFixture({...demo,edited:true})).toEqual({...demo,edited:true});
});
import { frameOf } from "../src/components/community/perimeter-geometry";
test("past twelve the same toggle follows the upward S with transported attachment", () => {
  for (const [w, h] of [[320, 640], [390, 844], [430, 932]] as const) {
    const at0 = frameOf(w, h, 0), just = frameOf(w, h, 0.01);
    expect(Math.hypot(at0.bead.x - just.bead.x, at0.bead.y - just.bead.y)).toBeLessThan(1);
    let prev = at0.bead;
    for (let a = 1; a <= 60; a++) { const b = frameOf(w, h, a).bead; expect(Math.hypot(b.x - prev.x, b.y - prev.y)).toBeLessThan(25); prev = b; }
    const back = frameOf(w, h, 60);
    expect(back.normal.y).toBeGreaterThan(.9);
    expect(back.bead.y).toBeLessThan(h*.4);
    expect(back.bead.x + 44).toBeLessThanOrEqual(w);
  }
});
