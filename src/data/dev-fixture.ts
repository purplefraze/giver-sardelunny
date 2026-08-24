import { draftsStore } from "@/data/drafts";
import { initializeFirstUse } from "@/data/first-use";
import { introSeenStore } from "@/data/intro-seen";
import { itemsStore } from "@/data/items";
import { lifecycleStore } from "@/data/lifecycle";
import { myProfileStore } from "@/data/my-profile";
import { tutorialSeenStore } from "@/data/tutorial-seen";

const CHOICE_KEY = "giver.dev-state-chosen.v1";

export function replayOnboarding() {
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "replay");
}

export function resetNewUser() {
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "new");
}

export function completeOnboarding() {
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  lifecycleStore.reset();
  initializeFirstUse(false);
  tutorialSeenStore.markSeen();
  window.localStorage.setItem(CHOICE_KEY, "complete");
}

/**
 * REMOVE THE OLD SEEDED "ME" ONCE, FOR GOOD.
 *
 * Any current-user record that came from the old development fixture is wiped
 * so the person starts from a genuinely blank profile they build themselves.
 * Sample community members and their activity are deliberately untouched.
 */
const PURGE_KEY = "giver.seeded-me-removed.v1";

export function removeLegacyAutomaticProfile() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(PURGE_KEY)) return;
  window.localStorage.setItem(PURGE_KEY, "done");
  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  lifecycleStore.reset();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  window.localStorage.removeItem(CHOICE_KEY);
}
