import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/* SELF IS ALWAYS BLUE: on the sign-in screen the Living G's stroke is #1E7BFF at
   every toggle position; the seat colour may drive only the field and toggle. */
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/components/onboarding/SignInView.tsx", import.meta.url), "utf8");
const toggle = readFileSync(new URL("../src/components/onboarding/ConveyorToggle.tsx", import.meta.url), "utf8");
const block = (sel: string) => css.match(new RegExp(`(^|\\n)${sel.replace(/[.[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[2] ?? "";

test("my g's blue is #1E7BFF", () => {
  expect(css).toMatch(/--mode-giver:\s*#1e7bff;/i);
});
test("sign-in G stroke is pinned to blue, never the seat", () => {
  expect(block(".signin")).toMatch(/--world-g:\s*var\(--mode-giver\);/);
  expect(block(".signin")).not.toMatch(/--world-g:\s*var\(--seat\)/);
  for (const seat of ["give", "wish", "trade", "fund", "borrow", "lend", "giver", "map"]) {
    const rule = block(`.signin[data-signin-seat="${seat}"]`);
    expect(rule).toContain("--seat");
    expect(rule).not.toContain("--world-g");
  }
  expect(css).not.toMatch(/\.signin[^{]*\{[^}]*--world-g:\s*var\(--seat\)/);
});
test("the conveyor only sets --seat, never the G colour", () => {
  expect(toggle).not.toMatch(/put\(\s*"--world-g"/);
  expect(toggle).toContain('put("--seat"');
  expect(toggle).not.toContain("var(--world-g)");
  expect(view).toMatch(/data-signin-ring[\s\S]{0,0}|stroke="var\(--world-g\)"/);
});
