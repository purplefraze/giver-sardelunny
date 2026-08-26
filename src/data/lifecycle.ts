const KEY = "giver.lifecycle.v1";

export type Lifecycle = {
  onboardingCompletedAt: number | null;
  profileSetupCompletedAt: number | null;
  firstUseInitializedAt: number | null;
  /**
   * MY G IS DISCOVERED, NOT ANNOUNCED. The first time a person opens their own
   * profile setup from the empty Living G, the 12 o'clock destination unlocks —
   * permanently, even if they press back without typing a word.
   */
  profileDiscoveredAt: number | null;
};
const EMPTY: Lifecycle = {
  onboardingCompletedAt: null,
  profileSetupCompletedAt: null,
  firstUseInitializedAt: null,
  profileDiscoveredAt: null,
};
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
  completeOnboarding() {
    hydrate();
    save({
      ...state,
      onboardingCompletedAt: state.onboardingCompletedAt ?? Date.now(),
    });
  },
  markFirstUseInitialized() {
    hydrate();
    if (state.firstUseInitializedAt) return;
    save({ ...state, firstUseInitializedAt: Date.now() });
  },
  /** THE DISCOVERY ITSELF: opening profile setup unlocks My G for good. */
  discoverProfile() {
    hydrate();
    if (state.profileDiscoveredAt) return;
    save({ ...state, profileDiscoveredAt: Date.now() });
  },
  completeProfileSetup() {
    hydrate();
    save({
      ...state,
      onboardingCompletedAt: state.onboardingCompletedAt ?? Date.now(),
      profileSetupCompletedAt: state.profileSetupCompletedAt ?? Date.now(),
      profileDiscoveredAt: state.profileDiscoveredAt ?? Date.now(),
    });
  },
  migrateCompletedProfile() {
    hydrate();
    if (state.profileSetupCompletedAt) return;
    save({
      ...state,
      onboardingCompletedAt: state.onboardingCompletedAt ?? Date.now(),
      profileSetupCompletedAt: Date.now(),
      profileDiscoveredAt: state.profileDiscoveredAt ?? Date.now(),
      firstUseInitializedAt: state.firstUseInitializedAt ?? Date.now(),
    });
  },
  reset() { hydrate(); save(EMPTY); },
};