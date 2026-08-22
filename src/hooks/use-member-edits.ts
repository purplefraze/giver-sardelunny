import { useSyncExternalStore } from "react";
import { memberEditsStore, type MemberEdits } from "@/data/member-edits";

/**
 * SUBSCRIBE TO ADMIN PEOPLE EDITS. Any screen that reads a Member (profiles,
 * feed, item detail, conversations) re-renders the instant a developer changes
 * that person, because the projection is rebuilt from this one store.
 */
export function useMemberEdits(): MemberEdits {
  return useSyncExternalStore(
    memberEditsStore.subscribe,
    memberEditsStore.get,
    memberEditsStore.getServer,
  );
}
