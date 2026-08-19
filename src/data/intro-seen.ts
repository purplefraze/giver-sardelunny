import type { Category } from "@/data/my-profile";

/**
 * FOUR PERSISTED FLAGS — one per activity world. Giver explains a world the
 * FIRST time you walk into it, then never again automatically. Reopening the
 * app must not replay anything, so this is storage, never component state.
 */

const KEY = "giver.intro-seen.v1";

export type IntroSeen = Record<Category, boolean>;

const NONE: IntroSeen = { wish: false, give: false, trade: false, borrow: false };

let seen: IntroSeen = NONE;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): IntroSeen {
  if (typeof window === "undefined") return NONE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return NONE;
    return { ...NONE, ...(JSON.parse(raw) as Partial<IntroSeen>) };
  } catch {
    return NONE;
  }
}

function hydrate() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    seen = read();
  }
}

function save(next: IntroSeen) {
  seen = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* a flag is not worth failing over */
    }
  }
  for (const l of listeners) l();
}

export const introSeenStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): IntroSeen {
    hydrate();
    return seen;
  },
  getServer(): IntroSeen {
    return NONE;
  },
  markSeen(category: Category) {
    hydrate();
    if (seen[category]) return;
    save({ ...seen, [category]: true });
  },
};
