/**
 * TEACH ONCE, THEN GET OUT OF THE WAY.
 *
 * The Living G teaches itself — the loop words, the selector, the way into the
 * community — the FIRST time a person lands on their own G, and never again
 * automatically. That is a PERSISTED fact about the person, so returning to the
 * profile, remounting, or reopening the app can never replay the lesson.
 *
 * It stays available on purpose: the help area can replay it at any time, which
 * does NOT clear the flag.
 */

const KEY = "living_g_tutorial_seen";

let seen = false;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    seen = window.localStorage.getItem(KEY) === "true";
  } catch {
    seen = false;
  }
}

export const tutorialSeenStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): boolean {
    hydrate();
    return seen;
  },
  getServer(): boolean {
    return true;
  },
  markSeen() {
    hydrate();
    if (seen) return;
    seen = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, "true");
      } catch {
        /* a flag is not worth failing over */
      }
    }
    for (const l of listeners) l();
  },
};
