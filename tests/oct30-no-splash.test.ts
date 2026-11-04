import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
/* ITEM 8 (frazer, Oct 30: "remove the black splash"): no wordmark opening after sign-in. */
test("item 8: onboarding no longer renders the LaunchScreen opening after sign-in", () => {
  const src = readFileSync(new URL("../src/components/Onboarding.tsx", import.meta.url), "utf8");
  expect(src).not.toMatch(/<LaunchScreen/);
  expect(src).toMatch(/fromLaunch: false/);
});
test("item 8: the owed opening (magic link / dev skip) is cleared without playing", () => {
  const src = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
  expect(src).not.toMatch(/setOpening\(true\)/);
});
