import { useSyncExternalStore } from "react";
import { tutorialSeenStore } from "@/data/tutorial-seen";

/** True once the Living G has taught itself. Persisted, never component state. */
export function useTutorialSeen(): boolean {
  return useSyncExternalStore(
    tutorialSeenStore.subscribe,
    tutorialSeenStore.get,
    tutorialSeenStore.getServer,
  );
}
