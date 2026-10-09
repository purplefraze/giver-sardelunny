import { expect, test } from "bun:test";
import { PROFILE_AREAS, activityTenseOf, profileAreaOf } from "../src/intelligence/profile-areas";
import { hear, startSession } from "../src/intelligence/voice-session";

test("eight seats clockwise from 12 with back at 6", () => {
  expect(PROFILE_AREAS.map((a) => `${a.id}@${a.at}`)).toEqual([
    "bio@0", "photo@45", "reputation@90", "chats@135", "myg@180", "sparks@225", "activity@270", "settings@315",
  ]);
});

test.each([
  ["update my profile", "bio"],
  ["change my bio", "bio"],
  ["change my photo", "photo"],
  ["show my chats", "chats"],
  ["check my Sparks", "sparks"],
  ["show my past gives", "activity"],
  ["open settings", "settings"],
  ["show my reputation", "reputation"],
])("%s → %s", (said, area) => {
  expect(profileAreaOf(said)).toBe(area);
});

test("creation words are not profile navigation", () => {
  expect(profileAreaOf("I'm giving away a fridge")).toBeNull();
});

test("past vs current activity", () => {
  expect(activityTenseOf("show my past gives")).toBe("past");
  expect(activityTenseOf("show my gives")).toBe("current");
});

test("voice session hands profile intents to the area and drafts nothing", () => {
  const s = hear(startSession(), "check my sparks");
  expect(s.profile).toBe("sparks");
  expect(s.action).toBeNull();
});
