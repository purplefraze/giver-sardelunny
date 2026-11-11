import { describe, expect, it } from "vitest";
import { EMPTY_GIVE, GIVE_TYPES, back, choose, current, editFromReview, screenCode, setAnswer, share, skip, start, submit, valueOf } from "@/intelligence/give-journey";

const run = (type: any) => {
  let s = start(choose(EMPTY_GIVE, type));
  while (s.screen === "question") s = current(s)!.optional ? skip(s) : submit(setAnswer(s, "x"));
  return s;
};

describe("give journey (figma 131:2)", () => {
  it("has exactly the seven branches", () => {
    expect(GIVE_TYPES.map((t) => t.label)).toEqual(["item", "food", "skill or lesson", "time or help", "space or resource", "experience or invitation", "other"]);
  });
  it("never asks about ingredients", () => {
    expect(GIVE_TYPES.flatMap((t) => t.steps).some((x) => /ingredient/i.test(x.question))).toBe(false);
  });
  it("item uses the source wording in order", () => {
    expect(GIVE_TYPES[0].steps.map((x) => x.question)).toEqual([
      "what would you like to give?", "what type of ladder is it, and how tall?", "what condition is it in?",
      "anything else someone should know?", "where can it be collected?", "when is it available?", "would you like to add a photo?",
    ]);
  });
  it("Q becomes S only after submit, and every branch reaches review then ready", () => {
    for (const t of GIVE_TYPES) {
      let s = start(choose(EMPTY_GIVE, t.type));
      expect(screenCode(s)).toBe(`${t.steps[0].code}-Q`);
      const r = run(t.type);
      expect(r.screen).toBe("review");
      expect(share(r).screen).toBe("ready");
    }
  });
  it("required steps cannot be skipped or submitted blank", () => {
    const s = start(choose(EMPTY_GIVE, "food"));
    expect(submit(s)).toBe(s);
    expect(skip(s)).toBe(s);
  });
  it("back keeps answers and edit-from-review returns to review", () => {
    let s = submit(setAnswer(start(choose(EMPTY_GIVE, "skill")), "guitar"));
    s = back(s)!;
    expect(valueOf(s, "what")).toBe("guitar");
    const r = run("skill");
    const e = submit(setAnswer(editFromReview(r, "who"), "kids"));
    expect(e.screen).toBe("review");
    expect(valueOf(e, "who")).toBe("kids");
  });
});
