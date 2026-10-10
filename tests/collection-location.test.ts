import { expect, test } from "bun:test";
import { collectionLabelSchema, collectionLocationSchema, coarseCollectionPin, nearbyCollectionPin, validCollectionLocation } from "../src/lib/collection-location";
import { inferGiveType } from "../src/data/give-lexicon";
import { canGoLive, EMPTY_FIELDS } from "../src/intelligence/voice-flow";
import { buildPayload } from "../src/intelligence/share-coordinator";
import { pickedAnswerTime } from "../src/intelligence/answer-time";

test("Pluto and Mars are rejected rather than accepted as collection areas", () => {
  expect(collectionLabelSchema.safeParse("Pluto").success).toBe(false);
  expect(collectionLabelSchema.safeParse("Mars").success).toBe(false);
});
test("a typed label without a located area is not verified", () => {
  expect(validCollectionLocation(undefined, "made up area")).toBe(false);
  expect(collectionLocationSchema.safeParse({ label: "area", pin: { lat: 100, lng: 0 }, source: "place" }).success).toBe(false);
});
test("coarse device coordinates do not preserve a precise home coordinate", () => {
  expect(coarseCollectionPin({ lat: 43.653423, lng: -79.384182 })).toEqual({ lat: 43.65, lng: -79.38 });
});
test("dragging cannot turn a verified neighbourhood into an unrelated location", () => {
  expect(nearbyCollectionPin({ lat: 43.65, lng: -79.38 }, { lat: 43.651, lng: -79.379 })).toBe(true);
  expect(nearbyCollectionPin({ lat: 43.65, lng: -79.38 }, { lat: 44, lng: -79.38 })).toBe(false);
});
test("cooked turkey is food and requires a confirmed collection date", () => {
  expect(inferGiveType("cooked turkey")).toBe("food");
  const f = { ...EMPTY_FIELDS, what: "cooked turkey", kind: "food" as const, where: "near my current location", collectionLocation: { label: "near my current location", pin: { lat: 43.65, lng: -79.38 }, source: "device" as const } };
  expect(canGoLive("give", f)).toBe(false);
  const timing = pickedAnswerTime("2026-10-11", "18:00");
  if (!timing) throw new Error("date missing");
  expect(canGoLive("give", { ...f, timing })).toBe(true);
  expect(buildPayload("give", { ...f, timing }, () => ({ topic: "food", expiresAt: "2026-10-12" }))?.details).toMatchObject({ date: "2026-10-11", time: "18:00", where: "near my current location" });
});
test("impossible calendar collection dates are rejected", () => {
  expect(pickedAnswerTime("2026-02-30", "18:00")).toBeNull();
});