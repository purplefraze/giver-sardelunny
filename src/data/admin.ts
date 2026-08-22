/**
 * THE DEVELOPER SWITCH.
 *
 * Admin editing is a developer capability, not a feature of Giver: it only ever
 * exists in a development build, it is turned on from the existing dev panel,
 * and while it is off the app looks and behaves exactly as an end user sees it.
 *
 * The switch itself is persisted so a reload does not throw the developer out
 * of the middle of editing.
 */

const KEY = "giver.admin-mode.v1";

/** Editing is only ever POSSIBLE in a development build. */
export const ADMIN_AVAILABLE = import.meta.env.DEV;

let state = false;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): boolean {
  if (!ADMIN_AVAILABLE || typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "on";
}

function ensure() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

function commit(next: boolean) {
  state = next;
  if (typeof window !== "undefined") {
    if (next) window.localStorage.setItem(KEY, "on");
    else window.localStorage.removeItem(KEY);
  }
  for (const l of listeners) l();
}

export const adminStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): boolean {
    return ADMIN_AVAILABLE ? ensure() : false;
  },
  getServer(): boolean {
    return false;
  },
  set(on: boolean) {
    if (!ADMIN_AVAILABLE) return;
    commit(on);
  },
  toggle() {
    adminStore.set(!adminStore.get());
  },
};
