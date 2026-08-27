import { useSyncExternalStore } from "react";
import { wallStore, type WallState } from "@/data/wall";

/** Every wall — mine or somebody else's — reads this one record. */
export function useWall(): WallState {
  return useSyncExternalStore(wallStore.subscribe, wallStore.get, wallStore.getServer);
}
