import { useSyncExternalStore } from "react";
import { lifecycleStore } from "@/data/lifecycle";

export function useLifecycle() {
  return useSyncExternalStore(
    lifecycleStore.subscribe,
    lifecycleStore.get,
    lifecycleStore.getServer,
  );
}