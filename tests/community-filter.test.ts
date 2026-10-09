import { expect, test } from "bun:test";
import { communityFilterOf } from "../src/intelligence/community-filter";
import { hear, startSession } from "../src/intelligence/voice-session";

test.each([
  ["show community borrows", "borrow"],
  ["show community gives", "give"],
  ["community wishes", "wish"],
  ["show me the community", "everything"],
  ["show my posts in the community", "mine"],
])("%s → %s", (said, v) => expect(communityFilterOf(said)).toBe(v));

test("inside communi-g a plain filter phrase works", () => {
  expect(communityFilterOf("show lends", true)).toBe("lend");
  expect(communityFilterOf("show all", true)).toBe("everything");
});

test("creation words are never a filter", () => {
  expect(communityFilterOf("I'm giving away a fridge")).toBeNull();
  expect(communityFilterOf("I'm giving away a fridge", true)).toBeNull();
});

test("voice session hands community filters over without drafting", () => {
  const s = hear(startSession(), "show community borrows");
  expect(s.community).toBe("borrow");
  expect(s.action).toBeNull();
});
