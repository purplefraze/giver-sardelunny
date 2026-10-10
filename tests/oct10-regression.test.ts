import { expect, test } from "bun:test";
import { sectionChange, sectionWord } from "../src/components/community/CommunityFeed";
import { listingPin, itemMode } from "../src/data/communigy";
import { DEMO_LENDS } from "../src/data/items";
import { lowerHollow, MODE_WORD } from "../src/intelligence/VoiceLoops";
import { SEAT_TITLE } from "../src/components/living-g/EarSelector";
import { NOUN } from "../src/intelligence/voice-session";
import { lowerWord } from "../src/components/community/lower-stations";

test("changing section dismisses the open listing; reselecting the same one does not", () => {
  expect(sectionChange("fund", "borrow").dismiss).toBe(true);
  expect(sectionChange("borrow", "map").dismiss).toBe(true);
  expect(sectionChange("wish", "wish").dismiss).toBe(false);
});

test("real listings without a shared pin stay unlocated; demo listings get a sample pin", () => {
  const none = () => null;
  expect(listingPin({ id: "abc-real", distanceKm: 1 }, none)).toBeNull();
  expect(listingPin({ id: "seed-robin-wish-3", distanceKm: 1.5 }, none)).not.toBeNull();
  expect(listingPin({ id: "seed-robin-wish-3", distanceKm: 1.5, edited: true }, none)).toBeNull();
  const own = { lat: 1, lng: 2 };
  expect(listingPin({ id: "abc-real" }, () => own)).toEqual(own);
});

test("demo lends exist and read as lend", () => {
  expect(DEMO_LENDS.length).toBeGreaterThanOrEqual(3);
  expect(itemMode({ type: "borrow", side: "lend" })).toBe("lend");
});

test("every authored mode word is lowercase", () => {
  for (const w of [...Object.values(MODE_WORD), ...Object.values(SEAT_TITLE), ...Object.values(NOUN), lowerWord("back"), sectionWord("fund"), sectionWord("everything")])
    expect(w).toBe(w.toLowerCase());
  expect(MODE_WORD["map"]).toBe("communi-g");
});

test("the bottom hollow keeps the person's words after stop", () => {
  const listening = lowerHollow({ state: "listening", transcript: "a ladder", error: null }, true, "");
  expect(listening).toMatchObject({ status: "listening…", words: "a ladder", show: true });
  const stopped = lowerHollow({ state: "idle", transcript: "a ladder", error: null }, false, "");
  expect(stopped).toMatchObject({ words: "a ladder", show: true });
  const err = lowerHollow({ state: "error", transcript: "", error: "the microphone isn't allowed." }, false, "");
  expect(err.show).toBe(true);
  expect(err.status).toContain("microphone");
});
