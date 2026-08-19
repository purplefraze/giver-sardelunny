import { useSyncExternalStore } from "react";
import { introSeenStore, type IntroSeen } from "@/data/intro-seen";

/** Which world explanations this person has already met. */
export function useIntroSeen(): IntroSeen {
  return useSyncExternalStore(
    introSeenStore.subscribe,
    introSeenStore.get,
    introSeenStore.getServer,
  );
}
