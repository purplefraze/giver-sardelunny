import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { tetherAt, TETHER } from "../src/components/living-g/toggle-tether";
import { visibleStroke } from "../src/components/living-g/screen-paint";

const SEATS = ["give", "wish", "trade", "borrow", "lend", "fund", "giver", "map"] as const;
const SIZES = [
  [320, 568],
  [375, 812],
  [390, 844],
  [430, 932],
  [1280, 800],
] as const;
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/* RULE 1: the toggle is always visible inside every seat. */
test("every seat keeps the toggle's arm and part of its ring on screen at every width", () => {
  for (const seat of SEATS) {
    for (const [w, h] of SIZES) {
      for (const [ox, oy] of [[w / 2, h / 2], [w / 2, 0], [w / 2, h]] as const) {
        const t = tetherAt(seat, w, h, ox, oy);
        const e = 1e-6;
        const inside = (x: number, y: number) => x >= -e && x <= w + e && y >= -e && y <= h + e;
        // The ring's centre is inside the screen, so a good part of the circle shows.
        expect(inside(t.ring.x, t.ring.y)).toBe(true);
        // The whole arm is on screen.
        expect(inside(t.arm.x1, t.arm.y1)).toBe(true);
        expect(inside(t.arm.x2, t.arm.y2)).toBe(true);
        expect(t.ring.r).toBe(TETHER.ringR);
      }
    }
  }
});

test("the toggle is drawn inside every seat form, My G and the map", () => {
  expect(src("src/components/living-g/GEnclosure.tsx")).toContain("<ToggleTether");
  const stack = src("src/components/living-g/GDepthStack.tsx");
  expect(stack).toContain("<ToggleTether");
  expect(src("src/routes/index.tsx")).toMatch(/<GDepthStack[\s\S]{0,80}seat=\{seat\}/);
});

/* RULE 2: even line thickness at every zoom. */
test("the toggle line is a fixed screen weight, non-scaling, outside the scaled camera", () => {
  for (const [w, h] of SIZES) expect(tetherAt("lend", w, h, w / 2, h / 2).stroke).toBe(visibleStroke(w));
  const tether = src("src/components/living-g/ToggleTether.tsx");
  expect((tether.match(/vectorEffect="non-scaling-stroke"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  // The overlay sits after (outside) the form's scaled camera group.
  const enc = src("src/components/living-g/GEnclosure.tsx");
  expect(enc.indexOf("<ToggleTether")).toBeGreaterThan(enc.lastIndexOf("</svg>"));
});

/* RULE 3: pinch out exits every seat; no back button, no small corner G. */
test("every seat has a pinch-out exit", () => {
  expect(src("src/components/living-g/GEnclosure.tsx")).toMatch(/FORM_PINCH_OUT\)\{[^}]*returnToG\(\)/);
  expect(src("src/components/profile/MyGRing.tsx")).toMatch(/spread\.current >= MYG_PINCH_OUT\)\) \{ onClose\(\)/);
  expect(src("src/components/community/CommunityFeed.tsx")).toMatch(/d \/ d0 >= CG_PINCH_OUT/);
  expect(src("src/components/living-g/GDepthStack.tsx")).toContain("PINCH.ratio");
  // The form never hands a two-finger spread to browser magnification.
  expect(src("src/styles.css")).toMatch(/\.gv-frame \{[^}]*touch-action:pan-x pan-y/);
});

test("no seat screen draws a back button or a small G in the corner", () => {
  const files = [
    "src/components/forms/UnifiedForm.tsx",
    "src/components/profile/CategoryForm.tsx",
    "src/components/give/GiveFlow.tsx",
    "src/components/give/WhenPicker.tsx",
    "src/components/give/LocationPicker.tsx",
    "src/components/give/CapScreen.tsx",
    "src/components/WorldIntro.tsx",
  ];
  for (const f of files) {
    const s = src(f);
    expect(s).not.toMatch(/<FormG\b/);
    expect(s).not.toMatch(/<GMark\b/);
    expect(s).not.toContain("gf-map-back");
  }
});
