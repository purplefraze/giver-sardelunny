import { draftsStore } from "@/data/drafts";
import { initializeFirstUse } from "@/data/first-use";
import { introSeenStore } from "@/data/intro-seen";
import { itemsStore } from "@/data/items";
import { lifecycleStore } from "@/data/lifecycle";
import { myProfileStore } from "@/data/my-profile";
import { tutorialSeenStore } from "@/data/tutorial-seen";

const CHOICE_KEY = "giver.dev-state-chosen.v1";

export function replayOnboarding() {
  if (!import.meta.env.DEV) return;
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "replay");
}

export function resetNewUser() {
  if (!import.meta.env.DEV) return;
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "new");
}

export function completeOnboarding() {
  if (!import.meta.env.DEV) return;
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  lifecycleStore.reset();
  initializeFirstUse(false);
  tutorialSeenStore.markSeen();
  window.localStorage.setItem(CHOICE_KEY, "complete");
}

/**
 * Remove the old automatic current-user fixture once. Sample community data is
 * deliberately retained. From now on a populated dev profile is opt-in only.
 */
export function removeLegacyAutomaticProfile() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (window.localStorage.getItem(CHOICE_KEY) !== "seeded") return;
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  lifecycleStore.reset();
  initializeFirstUse(true);
  tutorialSeenStore.reset();
  introSeenStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "first-use");
}