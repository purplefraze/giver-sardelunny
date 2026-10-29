import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/* THE FULL WORDMARK: sign-in always shows the whole word "giver" inside the
   upper ring, at every seat and width. No partial "ıver" overlay beside the
   G (it read as "iver" and ran to the phone's edge). */
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/components/onboarding/SignInView.tsx", import.meta.url), "utf8");
const rule = (sel: string) => css.match(new RegExp(`\\n\\${sel}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

test("no partial 'ıver' wordmark is rendered", () => {
  expect(view).not.toContain("<GiveWordmark");
  expect(view).not.toMatch(/>\s*ver\s*</);
  expect(view).not.toContain("signin-give-mark");
  expect(css).not.toContain(".signin-give-mark");
});

test("the full 'giver' wordmark never fades out", () => {
  expect(view).toMatch(/className="signin-mark"[^>]*>\s*giver\s*</);
  const mark = rule(".signin-mark");
  expect(mark).not.toBe("");
  expect(mark).not.toContain("opacity");
  expect(mark).not.toContain("--give-mark");
  expect(rule(".signin-tag")).not.toContain("--give-mark");
});
