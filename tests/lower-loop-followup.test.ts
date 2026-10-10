import { expect, test } from "bun:test";
import { LOWER_STATIONS, clampLower, lowerAngle, lowerToken } from "../src/components/community/lower-stations";
import { TRACK_PATH } from "../src/components/community/perimeter-geometry";
import { itemMode } from "../src/data/communigy";
import { reviseFundFixture, DEMO_FUND_ID } from "../src/data/fund-fixture";
import type { Item } from "../src/data/items";

test("top map to Give follows the counterclockwise wire without moving Trade", () => {
  expect(LOWER_STATIONS.map(s => s.value).filter(s => s !== "everything")).toEqual(["map", "wish", "borrow", "fund", "trade", "lend", "give"]);
  expect(lowerAngle("map")).toBe(0);
  expect(lowerAngle("trade")).toBe(-225);
  expect(lowerAngle("give") - lowerAngle("map")).toBe(-315);
});
test("missing top-to-Give arc is open and cannot wrap", () => {
  expect(clampLower(90)).toBe(60);
  expect(clampLower(-360)).toBe(-315);
  expect(TRACK_PATH.endsWith("Z")).toBe(false);
  expect((TRACK_PATH.match(/ C /g) ?? []).length).toBe(63);
});
test("lower map is blue and category assemblies use current authoritative tokens", () => {
  expect(lowerToken("map")).toBe("--mode-giver");
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