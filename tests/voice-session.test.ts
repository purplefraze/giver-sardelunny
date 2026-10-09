import { expect, test } from "bun:test";
import { hear, startSession } from "../src/intelligence/voice-session";

const say = (...lines: string[]) => lines.reduce(hear, startSession());

test("fridge conversation asks where, then when, then anything else — never twice", () => {
  let s = say("I'm giving away a fridge");
  expect(s.action).toBe("give");
  expect(s.fields.what).toBe("fridge");
  expect(s.prompt).toBe("where can someone collect it?");
  s = hear(s, "in Leith");
  expect(s.fields.where).toBe("leith");
  expect(s.prompt).toBe("when?");
  s = hear(s, "Tuesday");
  expect(s.fields.when).toBe("tuesday");
  expect(s.prompt).toBe("anything else you'd like to add?");
});

test("details already said are not asked again", () => {
  const s = say("I'm giving away a fridge tomorrow in Leith");
  expect(s.stage).toBe("review");
});

test("current location defers to the permission ask instead of inventing a place", () => {
  const s = say("I'm giving away a fridge", "my current location");
  expect(s.wantsLocation).toBe(true);
  expect(s.fields.where).toBe("");
});

test("finishing asks to review, and only yes enters review — nothing goes live", () => {
  let s = say("I'm giving away a fridge tomorrow in Leith", "no that's it");
  expect(s.prompt).toBe("ready to review your Give?");
  expect(s.stage).toBe("ready");
  s = hear(s, "yes");
  expect(s.stage).toBe("review");
  expect(hear(s, "share it").stage).toBe("review");
});

test("'just a photo' asks for the plus", () => {
  const s = say("I'm giving away a fridge", "just a photo");
  expect(s.wantsPhoto).toBe(true);
  expect(s.fields.what).toBe("fridge");
});
