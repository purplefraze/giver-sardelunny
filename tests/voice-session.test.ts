import { expect, test } from "bun:test";
import { hear, startSession } from "../src/intelligence/voice-session";

const say = (...lines: string[]) => lines.reduce(hear, startSession());

test("fridge conversation asks where, then when, then stops at review — no 'anything else' loop", () => {
  let s = say("I'm giving away a fridge");
  expect(s.action).toBe("give");
  expect(s.fields.what).toBe("fridge");
  expect(s.prompt).toBe("where can someone collect it?");
  s = hear(s, "in Leith");
  expect(s.fields.where).toBe("leith");
  expect(s.prompt).toBe("when?");
  s = hear(s, "Tuesday");
  expect(s.fields.when).toBe("tuesday");
  expect(s.stage).toBe("review");
  expect(s.prompt).not.toMatch(/anything else/);
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

test("enough info opens review; spoken 'share it' never goes live", () => {
  const s = say("I'm giving away a fridge tomorrow in Leith", "no that's it");
  expect(s.stage).toBe("review");
  expect(hear(s, "share it").stage).toBe("review");
  expect(hear(s, "post it now").stage).toBe("review");
});

test("extra words in review join the draft without restarting questions", () => {
  const s = say("I'm giving away a fridge tomorrow in Leith", "it's in good condition");
  expect(s.stage).toBe("review");
  expect(s.fields.where).toBe("leith");
});

test("a service give stops once subject, area and availability are known", () => {
  const s = say("I can teach guitar lessons", "in leith", "weekday evenings");
  expect(s.action).toBe("give");
  expect(s.stage).toBe("review");
});

test("'just a photo' asks for the plus", () => {
  const s = say("I'm giving away a fridge", "just a photo");
  expect(s.wantsPhoto).toBe(true);
  expect(s.fields.what).toBe("fridge");
});
