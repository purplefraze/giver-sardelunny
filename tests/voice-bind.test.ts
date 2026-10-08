import { expect, test } from "bun:test";
import { bindUtterance } from "../src/intelligence/bind";
import { handoffOf } from "../src/intelligence/handoff";

test("'I'm getting rid of a fridge' reads as a give of a fridge", () => {
  const d = bindUtterance("I'm getting rid of a fridge");
  expect(d.action).toBe("give");
  expect(d.entities.item).toBe("fridge");
  const h = handoffOf(d);
  expect(h?.kind).toBe("give");
  expect(h?.seed.text).toBe("fridge");
});
