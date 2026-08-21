import { useSyncExternalStore } from "react";
import { ledgerStore, type LedgerEvent } from "@/data/ledger";

/** The one spark/sparkle history, read live by every history portal. */
export function useLedger(): LedgerEvent[] {
  return useSyncExternalStore(
    ledgerStore.subscribe,
    ledgerStore.get,
    ledgerStore.getServer,
  );
}
