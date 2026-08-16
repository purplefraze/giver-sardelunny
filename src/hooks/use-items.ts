import { useSyncExternalStore } from "react";
import { itemsStore } from "@/data/items";

/**
 * Every view of an item — mine, someone else's, or the community's — reads the
 * same collection and re-renders the moment any item changes.
 */
export function useItems() {
  return useSyncExternalStore(
    itemsStore.subscribe,
    itemsStore.get,
    itemsStore.getServer,
  );
}
