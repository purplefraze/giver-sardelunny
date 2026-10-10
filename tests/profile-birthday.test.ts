import { expect, test } from "bun:test";
import { profileBirthdaySchema } from "../src/lib/profile-birthday";
const schema = profileBirthdaySchema(new Date(2026, 9, 10));
test("unknown birthday stays blank", () => { expect(schema.parse("")).toBe(""); });
test("18th birthday is eligible today", () => { expect(schema.parse("2008-10-10")).toBe("2008-10-10"); });
test("one day short of 18 is ineligible", () => { expect(schema.safeParse("2008-10-11").success).toBe(false); });
test("under-18 birthday is rejected", () => { expect(schema.safeParse("2010-05-20").success).toBe(false); });
test("invalid dates cannot roll into another month", () => {
  expect(schema.safeParse("2000-02-30").success).toBe(false);
  expect(schema.safeParse("2001-02-29").success).toBe(false);
});
test("leap-day birthday retains exact chosen date", () => { expect(schema.parse("2000-02-29")).toBe("2000-02-29"); });
test("future and non-calendar input are rejected", () => {
  expect(schema.safeParse("2027-01-01").success).toBe(false);
  expect(schema.safeParse("10/10/2000").success).toBe(false);
});
