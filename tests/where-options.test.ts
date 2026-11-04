import { describe, expect, test } from "bun:test";
import { whereFromHit, whereQueryProblem } from "../src/lib/where-options";

describe("where options", () => {
  test("an intersection needs two streets", () => {
    expect(whereQueryProblem("intersection", "the moon")).not.toBeNull();
    expect(whereQueryProblem("intersection", "queen st & spadina ave")).toBeNull();
  });
  test("a hit off earth (no country) is never a where", () => {
    expect(whereFromHit("neighbourhood", { lat: "1", lon: "1", address: { neighbourhood: "mare tranquillitatis" } })).toBeNull();
  });
  test("a street hit gives street and city, coarse pin", () => {
    const p = whereFromHit("street", { lat: "43.6577", lon: "-79.4005", address: { road: "College Street", city: "Toronto", country: "Canada", house_number: "12" } });
    expect(p?.label).toBe("college street, toronto");
    expect(p?.label).not.toContain("12");
  });
  test("a neighbourhood hit without a neighbourhood is rejected", () => {
    expect(whereFromHit("neighbourhood", { lat: "43", lon: "-79", address: { city: "Toronto", country: "Canada" } })).toBeNull();
  });
  test("intersection label is the two streets", () => {
    expect(whereFromHit("intersection", { lat: "43", lon: "-79", address: { road: "Queen Street West", city: "Toronto", country: "Canada" } }, "Queen St & Spadina Ave, Toronto")?.label).toBe("queen st & spadina ave, toronto");
  });
});
