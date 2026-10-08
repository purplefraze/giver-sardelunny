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

import { routeVoice } from "../src/intelligence/voice-router";

test("'I'm looking for a fridge' searches offers, with a wish as the alternative", () => {
  const r = routeVoice("I'm looking for a fridge");
  expect(r.intent).toBe("search");
  if (r.intent !== "search") return;
  expect(r.search.term).toBe("fridge");
  expect(r.search.fallback.action).toBe("wish");
});

test("'show me ladders nearby' searches everything for ladder, nearest first", () => {
  const r = routeVoice("show me ladders nearby");
  expect(r.intent).toBe("search");
  if (r.intent !== "search") return;
  expect(r.search.term).toBe("ladder");
  expect(r.search.types).toEqual([]);
  expect(r.search.nearby).toBe(true);
});

test("'I want to borrow a ladder' searches lends first, borrow request as alternative", () => {
  const r = routeVoice("I want to borrow a ladder");
  expect(r.intent).toBe("search");
  if (r.intent !== "search") return;
  expect(r.search.side).toBe("lend");
  expect(r.search.fallback.action).toBe("borrow");
});

test("'I'm giving away a fridge' drafts a give", () => {
  const r = routeVoice("I'm giving away a fridge");
  expect(r.intent).toBe("give");
});
