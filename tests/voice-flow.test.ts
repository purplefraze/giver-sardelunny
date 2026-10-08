import { expect, test } from "bun:test";
import { bindUtterance } from "../src/intelligence/bind";
import {
  EMPTY_FIELDS,
  canGoLive,
  fieldsFromDraft,
  mergeFollowUp,
  missingAsks,
  photoReminder,
  releaseOutcome,
  SEAT_OF_ACTION,
} from "../src/intelligence/voice-flow";

test("holding then releasing stops recording", () => {
  expect(releaseOutcome(0, 1200)).toBe("stop");
});

test("sliding right into the lock keeps recording after release", () => {
  expect(releaseOutcome(12, 1200)).toBe("keep");
});

test("'I'm getting rid of a fridge' fills a give for a fridge, a thing, nothing invented", () => {
  const d = bindUtterance("I'm getting rid of a fridge");
  const f = fieldsFromDraft(d, "I'm getting rid of a fridge");
  expect(SEAT_OF_ACTION[d.action!]).toBe("give");
  expect(f.what).toBe("fridge");
  expect(f.kind).toBe("a thing");
  expect(f.when).toBe("");
  expect(f.where).toBe("");
  expect(missingAsks("give", f)[0]?.ask).toBe("when can someone collect it?");
});

test("a follow-up answer merges without overwriting edits", () => {
  const f = { ...EMPTY_FIELDS, what: "small fridge", kind: "a thing" as const };
  const g = mergeFollowUp("give", f, "tomorrow evening in Leith");
  expect(g.what).toBe("small fridge");
  expect(g.when).toBe("tomorrow evening");
  expect(g.where).toBe("leith");
});

test("a give needs a place before it can go live", () => {
  expect(canGoLive("give", { ...EMPTY_FIELDS, what: "fridge", kind: "a thing" })).toBe(false);
  expect(canGoLive("give", { ...EMPTY_FIELDS, what: "fridge", kind: "a thing", where: "leith" })).toBe(true);
});

test("photo reminder for a tangible give, not for giving time", () => {
  expect(photoReminder("give", "a thing", false)).toBe(true);
  expect(photoReminder("give", "time", false)).toBe(false);
  expect(photoReminder("give", "a thing", true)).toBe(false);
});
