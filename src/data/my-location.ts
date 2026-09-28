import { useSyncExternalStore } from "react";

import { offsetPin } from "@/data/give-boundary";
import type { Pin } from "@/data/give-pins";

/**
 * "I'M NEARBY" — THE PERSON'S APPROXIMATE LOCATION, ON THIS DEVICE ONLY.
 *
 * Asked for ONLY when the person taps (the borrow / lend form's allow-location
 * line, or near me in communi-g's map) — never on load. What is kept is the
 * browser's position already OFFSET a few hundred metres (give-boundary
 * offsetPin, 200–400 m), so even this device never stores the exact spot. It
 * lives in localStorage only: nothing is written to items, profiles or any
 * other shared column, and no table is added.
 */
const KEY = "giver.my-location.v1";

export type MyLocation = { pin: Pin; at: number } | null;

let state: MyLocation = null;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as MyLocation) : null;
  } catch {
    state = null;
  }
}

function save(next: MyLocation) {
  state = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* best effort */
  }
  for (const l of listeners) l();
}

export const myLocationStore = {
  subscribe(l: () => void) {
    hydrate();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get(): MyLocation {
    hydrate();
    return state;
  },
  getServer(): MyLocation {
    return null;
  },
  clear() {
    save(null);
  },
};

export function useMyLocation(): MyLocation {
  return useSyncExternalStore(
    myLocationStore.subscribe,
    myLocationStore.get,
    myLocationStore.getServer,
  );
}

export type AskResult = { ok: true; pin: Pin } | { ok: false; reason: "unavailable" | "denied" };

/** THE ONE PERMISSION ASK — call it from a tap handler, never on mount. */
export function askLocation(): Promise<AskResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pin = offsetPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        save({ pin, at: Date.now() });
        resolve({ ok: true, pin });
      },
      () => resolve({ ok: false, reason: "denied" }),
      { timeout: 8000, maximumAge: 600000 },
    );
  });
}
