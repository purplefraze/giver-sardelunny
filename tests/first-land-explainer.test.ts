import { describe, expect, test } from "bun:test";
import { FIRST_LAND_EXPLAIN_MS, explainerFrames, explainerOver } from "@/components/first-land/FirstLand";

/* REDUCED MOTION FIRST LAND: two still frames at 22px, each held ~3s or until a tap.
   Frame 1: "a gift from" / "giver:" / "100 sparks". Frame 2: "50 to wish · 50 to give",
   or "50 to wish" / "50 to give" (no dot) only when one line will not fit. */
const colours = { ink: "#000", wish: "#9D00FF", give: "#4BE01E" };
const mono = (px: number) => (s: string) => s.length * px;
const text = (lines: { text: string }[][]) => lines.map((l) => l.map((r) => r.text).join(""));

describe("first land still explainer", () => {
  test("each frame holds about three seconds", () => {
    expect(FIRST_LAND_EXPLAIN_MS).toBe(3000);
  });

  test("frame 1 is always three lines, even in a roomy circle", () => {
    expect(text(explainerFrames(mono(5), 500, 20, 10, colours)[0])).toEqual(["a gift from", "giver:", "100 sparks"]);
    expect(text(explainerFrames(mono(11), 40, 20, 10, colours)[0])).toEqual(["a gift from", "giver:", "100 sparks"]);
  });

  test("frame 2 stays on one line when it fits", () => {
    expect(text(explainerFrames(mono(5), 200, 20, 10, colours)[1])).toEqual(["50 to wish · 50 to give"]);
  });

  test("frame 2 stacks without the dot when it does not", () => {
    expect(text(explainerFrames(mono(9), 70, 18, 10, colours)[1])).toEqual(["50 to wish", "50 to give"]);
  });

  test("wish is wish purple, give is give green, the hundred is ink", () => {
    const [f1, f2] = explainerFrames(mono(5), 200, 20, 10, colours);
    expect(f1.flat().every((r) => r.colour === colours.ink)).toBe(true);
    expect(f2.flat().find((r) => r.text === "50 to wish")?.colour).toBe(colours.wish);
    expect(f2.flat().find((r) => r.text === "50 to give")?.colour).toBe(colours.give);
  });

  test("over-measure reports how far the widest corner sits outside the circle", () => {
    expect(explainerOver([[{ text: "abcd", colour: "" }]], mono(10), 100, 20, 0)).toBeLessThan(0);
    expect(explainerOver([[{ text: "abcd", colour: "" }]], mono(10), 10, 20, 0)).toBeCloseTo(10, 5);
  });
});
