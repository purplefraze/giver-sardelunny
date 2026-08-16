import { useSyncExternalStore } from "react";
import { myProfileStore, type MyProfile } from "@/data/my-profile";

/** Every view of my profile reads the same store, and updates the moment it changes. */
export function useMyProfile(): MyProfile {
  return useSyncExternalStore(
    myProfileStore.subscribe,
    myProfileStore.get,
    myProfileStore.getServer,
  );
}
