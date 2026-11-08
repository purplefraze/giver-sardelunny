import { describe, expect, test } from "bun:test";
import {
  EMPTY_WISH, WISH_TYPES, answer, back, canContinue, chooseType, currentStep, loadWishDraft, next, saveWishDraft, visibleSteps,
  type WishJourneyState,
} from "../src/intelligence/wish-journey";

const walk = (s: WishJourneyState, values: string[]) => values.reduce((acc, v) => next(answer(acc, v)), s);

describe("wish journey engine (Figma phase 1)", () => {
  test("seven types defined; only item and food active", () => {
    expect(WISH_TYPES.map((t) => t.type)).toEqual(["item", "food", "skill", "time", "space", "experience", "other"]);
    expect(WISH_TYPES.filter((t) => t.active).map((t) => t.type)).toEqual(["item", "food"]);
  });

  test("item progresses through the six Figma questions in order", () => {
    let s = next(chooseType(EMPTY_WISH, "item"));
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) { seen.push(currentStep(s)!.question); s = next(answer(s, `a${i}`)); }
    expect(seen).toEqual([
      "what item are you wishing for?", "what size would work?", "what condition would you accept?",
      "how could you receive it?", "where could you receive it?", "when would it help to have it?",
    ]);
    expect(s.done).toBe(true);
  });

  test("food has seven questions starting with food and dietary needs", () => {
    const s = next(chooseType(EMPTY_WISH, "food"));
    expect(visibleSteps(s).map((x) => x.id)).toEqual(["what", "kind", "dietary", "people", "receive", "where", "when"]);
    expect(walk(s, ["a", "b", "c", "d", "e", "f", "g"]).done).toBe(true);
  });

  test("continue blocked on empty answer and on inactive types", () => {
    const s = next(chooseType(EMPTY_WISH, "item"));
    expect(canContinue(s)).toBe(false);
    expect(next(s)).toBe(s);
    expect(canContinue(chooseType(EMPTY_WISH, "skill"))).toBe(false);
  });

  test("back retains typed answers and exits from entry", () => {
    let s = walk(next(chooseType(EMPTY_WISH, "item")), ["bike", "medium"]);
    expect(currentStep(s)!.id).toBe("condition");
    s = back(s)!;
    expect(currentStep(s)!.id).toBe("size");
    expect(s.answers.item).toEqual({ what: "bike", size: "medium" });
    s = back(back(s)!)!;
    expect(s.step).toBe(-1);
    expect(back(s)).toBeNull();
  });

  test("switching type keeps each type's answers separately", () => {
    let s = walk(next(chooseType(EMPTY_WISH, "item")), ["bike"]);
    s = chooseType({ ...s, step: -1 }, "food");
    s = walk(next(s), ["soup"]);
    expect(s.answers.item?.what).toBe("bike");
    expect(s.answers.food?.what).toBe("soup");
  });

  test("online skill skips the in-person location step", () => {
    const s = { ...chooseType(EMPTY_WISH, "skill"), answers: { skill: { format: "online" } } };
    expect(visibleSteps(s).some((x) => x.id === "where")).toBe(false);
  });

  test("draft persists locally and recovers from corrupt storage", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s = walk(next(chooseType(EMPTY_WISH, "food")), ["soup"]);
    saveWishDraft(store, s);
    expect(loadWishDraft(store)).toEqual(s);
    mem.set("giver:wish-journey:v1", "{bad");
    expect(loadWishDraft(store)).toEqual(EMPTY_WISH);
  });
});
