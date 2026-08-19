import mePhoto from "@/assets/me.jpg";
import { introSeenStore } from "@/data/intro-seen";
import { itemsStore, ME_ID, tradeText, type Item } from "@/data/items";
import { lifecycleStore } from "@/data/lifecycle";
import { myProfileStore } from "@/data/my-profile";
import { tutorialSeenStore } from "@/data/tutorial-seen";

const CHOICE_KEY = "giver.dev-state-chosen.v1";

const item = (
  id: string,
  type: Item["type"],
  text: string,
  extra: Partial<Item> = {},
): Item => ({
  id,
  ownerId: ME_ID,
  type,
  text,
  status: "active",
  priority: 0,
  published: true,
  createdAt: 1_776_000_000_000,
  updatedAt: 1_776_000_000_000,
  boostCount: 0,
  ...extra,
});

export function seedDevelopmentProfile() {
  if (!import.meta.env.DEV) return;
  myProfileStore.replace({
    username: "@frazer",
    photo: mePhoto,
    aboutMe: "building kinder ways for neighbours to share what they know and have.",
    byDay: "product designer",
    byNight: "community cook",
    weekend: "lake walks",
    built: true,
    sparkles: 6,
    sparklesAwarded: true,
    sparks: 80,
    sparksSeeded: true,
    reserved: {},
    rewarded: [],
  });
  itemsStore.replaceMine([
    item("dev-me-give", "give", "science tutoring"),
    item("dev-me-wish", "wish", "help planting a balcony garden"),
    item("dev-me-trade", "trade", tradeText("logo feedback", "bike repair"), {
      offer: "logo feedback",
      want: "bike repair",
    }),
    item("dev-me-borrow", "borrow", "a projector for movie night", { side: "borrow" }),
  ]);
  tutorialSeenStore.markSeen();
  introSeenStore.markAllSeen();
  lifecycleStore.complete();
  window.localStorage.setItem(CHOICE_KEY, "seeded");
}

export function replayOnboarding() {
  if (!import.meta.env.DEV) return;
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "replay");
}

export function resetNewUser() {
  if (!import.meta.env.DEV) return;
  myProfileStore.reset();
  itemsStore.clearMine();
  tutorialSeenStore.reset();
  introSeenStore.reset();
  lifecycleStore.reset();
  window.localStorage.setItem(CHOICE_KEY, "new");
}

export function completeOnboarding() {
  if (!import.meta.env.DEV) return;
  lifecycleStore.complete();
  tutorialSeenStore.markSeen();
  window.localStorage.setItem(CHOICE_KEY, "complete");
}

export function seedDevelopmentProfileOnce() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (window.localStorage.getItem(CHOICE_KEY)) return;
  seedDevelopmentProfile();
}