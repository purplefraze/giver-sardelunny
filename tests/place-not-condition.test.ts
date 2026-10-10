import { describe, expect, test } from "bun:test";
import { hear, sessionForSeat } from "@/intelligence/voice-session";
import { placeOf } from "@/intelligence/voice-flow";

describe("a condition is never read as a place", () => {
  test("'in good condition' fills condition, the real place fills where", () => {
    const s = hear(sessionForSeat("give"), "a kids bike in good condition, pick up in the west end this saturday morning");
    expect(s.fields.where).toBe("the west end");
    expect(s.fields.condition).toBe("good condition");
  });
  test("a condition alone leaves where empty", () => {
    expect(placeOf("a sofa in great shape")).toBe("");
    expect(placeOf("a lamp in working order")).toBe("");
  });
  test("times are still not places", () => {
    expect(placeOf("collect on saturday")).toBe("");
  });
});
