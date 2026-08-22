import { describe, it, expect } from "vitest";
import { parseDateOnly, toDateOnly, normaliseDateOnly, formatDateOnly } from "@/lib/date-only";
import { ageFrom } from "@/data/account";
describe("dob", () => {
  it("keeps the exact day", () => {
    for (const d of ["1988-08-03","1988-08-02","2000-01-01","1999-12-31","1988-02-29"]) {
      expect(toDateOnly(parseDateOnly(d)!)).toBe(d);
      expect(normaliseDateOnly(d)).toBe(d);
    }
    expect(formatDateOnly("1988-08-03")).toBe("3 august 1988");
    expect(formatDateOnly("1988-08-02")).toBe("2 august 1988");
    expect(normaliseDateOnly("1988-08-03T00:00:00.000Z".replace("Z",""))).toBe("1988-08-03");
    expect(normaliseDateOnly("1988-02-30")).toBe("");
    expect(ageFrom("1988-08-03")).toBe(38);
  });
});
