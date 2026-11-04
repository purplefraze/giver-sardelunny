import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { anchorOrigin } from "@/components/living-g/g-depth";
import { seatCentre } from "@/components/living-g/EarSelector";
import { LIVING_G_FRAME } from "@/components/living-g/g-path";

describe("oct30 item 1: my g zooms into the toggle at 12:00", () => {
  it("anchorOrigin accepts an exact point", () => {
    const c = seatCentre("giver");
    const o = anchorOrigin(c);
    expect(o.x).toBeCloseTo(((c.x - LIVING_G_FRAME.x) / LIVING_G_FRAME.width) * 100, 6);
    expect(o.y).toBeCloseTo(((c.y - LIVING_G_FRAME.y) / LIVING_G_FRAME.height) * 100, 6);
    expect(o).not.toEqual(anchorOrigin("top"));
  });
  it("keys still resolve to their rings", () => {
    expect(anchorOrigin("top").x).toBeGreaterThan(70);
  });
  it("the my-g slot uses the point and holds its artwork until mounted", () => {
    const src = readFileSync("src/routes/index.tsx", "utf8");
    expect(src).toMatch(/id: "my-g",[\s\S]{0,200}focus: MY_G_FOCUS,[\s\S]{0,40}holdArtwork: !myGReady/);
    expect(src).toMatch(/onReady=\{\(\) => setMyGReady\(true\)\}/);
  });
});

describe("oct30 item 5: profile bio", () => {
  const ring = readFileSync("src/components/profile/MyGRing.tsx", "utf8");
  it("the '@you' stand-in is shown as a blank field with a fixed @", () => {
    expect(ring).toMatch(/u === "you" \? "" : u/);
    expect(ring).toMatch(/placeholder="yourname"/);
  });
  it("the birthday uses BirthdayInput, not a native date picker", () => {
    expect(ring).toMatch(/<BirthdayInput /);
    expect(ring).not.toMatch(/type="date"/);
  });
  it("'@you' remains the internal default", () => {
    expect(readFileSync("src/data/my-profile.ts", "utf8")).toMatch(/username: "@you"/);
  });
});
