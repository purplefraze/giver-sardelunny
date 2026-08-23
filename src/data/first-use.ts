import { lifecycleStore } from "@/data/lifecycle";
import { myProfileStore } from "@/data/my-profile";

/**
 * ONE CLEAN HANDOVER FROM ONBOARDING TO MY G — AND NOTHING IS LOST.
 *
 * Onboarding is already part of the app, not a rehearsal of it: the photo,
 * username, birthday, about-me, answers and anything given during the opening
 * belong to the person and travel with them into My G. NOTHING is reset here.
 * The only thing this boundary does is make the welcome balance real, once.
 */
export function initializeFirstUse(earnedSparks: boolean) {
  const lifecycle = lifecycleStore.get();
  if (lifecycle.firstUseInitializedAt) return;

  if (earnedSparks) myProfileStore.seedSparks();

  lifecycleStore.completeOnboarding();
  lifecycleStore.markFirstUseInitialized();
}
