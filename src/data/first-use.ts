import { draftsStore } from "@/data/drafts";
import { itemsStore } from "@/data/items";
import { lifecycleStore } from "@/data/lifecycle";
import { myProfileStore } from "@/data/my-profile";

/**
 * ONE CLEAN HANDOVER FROM ONBOARDING TO MY G.
 *
 * Sample-community records belong to other people and remain untouched. Only
 * the current person's profile, activities and unfinished drafts are cleared.
 * The lifecycle marker makes this boundary idempotent across refreshes.
 */
export function initializeFirstUse(earnedSparks: boolean) {
  const lifecycle = lifecycleStore.get();
  if (lifecycle.firstUseInitializedAt) return;

  myProfileStore.reset();
  itemsStore.clearMine();
  draftsStore.clearAll();
  if (earnedSparks) myProfileStore.seedSparks();

  lifecycleStore.completeOnboarding();
  lifecycleStore.markFirstUseInitialized();
}