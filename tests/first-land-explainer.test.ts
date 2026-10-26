import { describe, expect, test } from "bun:test";
import { FIRST_LAND_EXPLAIN_MS, explainerLines } from "@/components/first-land/FirstLand";

/* REDUCED MOTION FIRST LAND: one still frame, "here’s 100 sparks" over
   "50 to wish · 50 to give", held ~3s or until a tap. */
const colours = { ink: "#000", wish: "#9D00FF", give: "#4BE01E" };
const mono = (px: number) => (s: string) => s.length * px;
const text = (lines: { text: string }[][]) => lines.map((l) => l.map((r) => r.text).join(""));

describe("first land still explainer", () => {
  test("holds about three seconds", () => {
    expect(FIRST_LAND_EXPLAIN_MS).toBe(3000);
  });

  test("a roomy circle gets the two plain lines", () => {
    expect(text(explainerLines(mono(5), 200, 20, 10, colours))).toEqual([
      "here’s 100 sparks",
      "50 to wish · 50 to give",
    ]);
  });

  test("a tight circle breaks, never drops a word", () => {
    const lines = explainerLines(mono(9), 70, 18, 10, colours);
    expect(lines.length).toBeGreaterThan(2);
    expect(text(lines).join(" ").replace(/\s+/g, " ")).toBe("here’s 100 sparks 50 to wish · 50 to give");
  });

  test("wish is wish purple, give is give green, the hundred is ink", () => {
    const runs = explainerLines(mono(5), 200, 20, 10, colours).flat();
    expect(runs.find((r) => r.text === "50 to wish")?.colour).toBe(colours.wish);
    expect(runs.find((r) => r.text === "50 to give")?.colour).toBe(colours.give);
    expect(runs[0]?.colour).toBe(colours.ink);
  });
});
