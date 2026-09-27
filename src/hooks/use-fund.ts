import { useSyncExternalStore } from "react";
import { fundStore } from "@/data/fund";

/** Every Fund view (pledge sheet, loop ticker, hint retirement) reads this one store. */
export function useFund() {
  return useSyncExternalStore(fundStore.subscribe, fundStore.get, fundStore.getServer);
}
