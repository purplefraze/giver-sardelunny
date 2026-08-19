import { useSyncExternalStore } from "react";
import { connectionsStore } from "@/data/connections";

/** Every view of a connection, a conversation or a history reads this one store. */
export function useConnections() {
  return useSyncExternalStore(
    connectionsStore.subscribe,
    connectionsStore.get,
    connectionsStore.getServer,
  );
}
