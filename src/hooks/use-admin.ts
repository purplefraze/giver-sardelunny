import { useSyncExternalStore } from "react";
import { adminStore } from "@/data/admin";

/** Is the developer switch on right now? */
export function useAdmin(): boolean {
  return useSyncExternalStore(
    adminStore.subscribe,
    adminStore.get,
    adminStore.getServer,
  );
}
