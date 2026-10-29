import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CONVEYOR, seatAngle, seatBlend, seatColour } from "../src/components/onboarding/signin-emphasis";

/* THE G TAKES THE SEAT'S COLOUR: on sign-in the Living G's stroke is whichever
   seat the toggle is on (changing as it moves), blue only at my g (12:00), and
   the default start is give green (#4BE01E, 1:30). */
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/components/onboarding/SignInView.tsx", import.meta.url), "utf8");
const hex = (v: string) => css.match(new RegExp(`${v}:\\s*(#[0-9a-f]{6});`, "i"))?.[1]?.toLowerCase();
const resolve = (colour: string) => hex(colour.match(/var\((--[\w-]+)\)/)![1]!);
const signin = css.match(/\n\.signin\s*\{([^}]*)\}/)![1]!;

test("the sign-in G colour is the seat colour", () => {
  expect(signin).toMatch(/--world-g:\s*var\(--seat\);/);
});
test("G colour equals the seat colour at every seat, blue only at 12:00", () => {
  const giverAt = seatAngle("giver");
  expect(giverAt).toBe(-90);
  for (const { seat, at } of CONVEYOR) {
    const g = resolve(seatColour(seatBlend(at)));
    expect(seatBlend(at).nearest).toBe(seat);
    if (seat === "giver") expect(g).toBe("#1e7bff");
    else expect(g).not.toBe("#1e7bff");
  }
});
test("the default start is give green at 1:30", () => {
  expect(view).toMatch(/<ConveyorToggle[^>]*start="give"/);
  expect(Math.round(seatAngle("give"))).toBe(-45);
  expect(signin).toMatch(/--seat:\s*var\(--mode-give\);/);
  expect(hex("--mode-give")).toBe("#4be01e");
  expect(resolve(seatColour(seatBlend(seatAngle("give"))))).toBe("#4be01e");
});
