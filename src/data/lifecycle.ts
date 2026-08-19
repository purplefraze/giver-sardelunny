const KEY = "giver.lifecycle.v1";

export type Lifecycle = { onboardingCompletedAt: number | null };
const EMPTY: Lifecycle = { onboardingCompletedAt: null };
let state = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Lifecycle {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Lifecycle>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function hydrate() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    /* Preview starts with a completed real-store fixture unless QA explicitly
       selected another path. Loaded lazily to keep production lifecycle pure. */
    if (import.meta.env.DEV && !window.localStorage.getItem("giver.dev-state-chosen.v1")) {
      window.localStorage.setItem(KEY, JSON.stringify({ onboardingCompletedAt: Date.now() }));
    }
    state = read();
  }
}

function save(next: Lifecycle) {
  state = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export const lifecycleStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    hydrate();
    listener();
    return () => listeners.delete(listener);
  },
  get() { hydrate(); return state; },
  getServer() { return EMPTY; },
  complete() { hydrate(); save({ onboardingCompletedAt: Date.now() }); },
  reset() { hydrate(); save(EMPTY); },
};