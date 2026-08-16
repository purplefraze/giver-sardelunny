import meFallback from "@/assets/me.jpg";
import type { Member } from "@/data/giver";

/**
 * MY PROFILE — THE SINGLE SOURCE OF TRUTH.
 *
 * The first-time profile builder, my Living G, my full profile and every later
 * edit all read and write THIS store. There is no separate onboarding draft:
 * every change is committed immediately and persisted, so nothing a person
 * types can ever quietly disappear.
 */

export type Category = "wish" | "give" | "trade" | "borrow";

export const CATEGORIES: Category[] = ["wish", "give", "trade", "borrow"];

/** Plural label per category — used by the builder and the full profile. */
export const CATEGORY_PLURAL: Record<Category, string> = {
  wish: "wishes",
  give: "gives",
  trade: "trades",
  borrow: "borrows",
};

/** Architecture ceiling. Onboarding only encourages the first three. */
export const MAX_PER_CATEGORY = 5;
export const SETUP_PER_CATEGORY = 3;

export type MyProfile = {
  username: string;
  photo: string | null;
  aboutMe: string;
  byDay: string;
  byNight: string;
  weekend: string;
  /** Ordered: index 0 is the PRIORITY item the Living G advertises. */
  items: Record<Category, string[]>;
  /** True once the person has been through the builder at least once. */
  built: boolean;
};

const KEY = "giver.my-profile.v1";

const EMPTY: MyProfile = {
  username: "@you",
  photo: null,
  aboutMe: "",
  byDay: "",
  byNight: "",
  weekend: "",
  items: { wish: [], give: [], trade: [], borrow: [] },
  built: false,
};

function read(): MyProfile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<MyProfile>;
    return {
      ...EMPTY,
      ...parsed,
      items: { ...EMPTY.items, ...(parsed.items ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

let state: MyProfile = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function commit(next: MyProfile) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* prototype persistence is best-effort */
    }
  }
  for (const l of listeners) l();
}

export const myProfileStore = {
  subscribe(listener: () => void) {
    if (!hydrated) {
      hydrated = true;
      state = read();
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): MyProfile {
    if (!hydrated && typeof window !== "undefined") {
      hydrated = true;
      state = read();
    }
    return state;
  },
  /** SERVER SNAPSHOT — SSR renders the empty profile, never localStorage. */
  getServer(): MyProfile {
    return EMPTY;
  },
  /** AUTO-SAVE: every mutation below writes straight through. */
  patch(fields: Partial<Omit<MyProfile, "items">>) {
    commit({ ...myProfileStore.get(), ...fields });
  },
  setItems(category: Category, items: string[]) {
    const p = myProfileStore.get();
    commit({
      ...p,
      items: { ...p.items, [category]: items.slice(0, MAX_PER_CATEGORY) },
    });
  },
  addItem(category: Category, text: string) {
    const t = text.trim();
    if (!t) return;
    const current = myProfileStore.get().items[category];
    if (current.length >= MAX_PER_CATEGORY) return;
    myProfileStore.setItems(category, [...current, t]);
  },
  editItem(category: Category, index: number, text: string) {
    const next = [...myProfileStore.get().items[category]];
    if (index < 0 || index >= next.length) return;
    next[index] = text;
    myProfileStore.setItems(category, next);
  },
  removeItem(category: Category, index: number) {
    myProfileStore.setItems(
      category,
      myProfileStore.get().items[category].filter((_, i) => i !== index),
    );
  },
  /** REORDER = PRIORITISE. Position #1 is what the Living G shows. */
  moveItem(category: Category, index: number, delta: number) {
    const next = [...myProfileStore.get().items[category]];
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item!);
    myProfileStore.setItems(category, next);
  },
};

/** The one give the Living G advertises: priority #1 of my gives. */
export function primaryGive(p: MyProfile): string | null {
  return p.items.give[0] ?? null;
}

/**
 * The one ASK the Living G advertises. It may be a wish, a trade or a borrow —
 * whichever category the person has prioritised, in that order.
 */
export function primaryAsk(
  p: MyProfile,
): { category: Category; text: string } | null {
  for (const category of ["wish", "trade", "borrow"] as Category[]) {
    const text = p.items[category][0];
    if (text) return { category, text };
  }
  return null;
}

/**
 * MY FULL PROFILE IS THE SAME DATA. The conventional profile page speaks
 * Member, so my profile is projected into it — never copied into it.
 */
export function myAsMember(p: MyProfile): Member {
  return {
    id: "me",
    name: "you",
    username: p.username,
    distance: "right here",
    photo: myPhoto(p),
    blurb: "",
    mode: "giving",
    world: "giving",
    action: "giving",
    headline: p.items.give[0] ?? "",
    activity: p.items.give[0] ?? "",
    about: p.aboutMe,
    age: "",
    byDay: p.byDay || "—",
    byNight: p.byNight || "—",
    weekend: p.weekend || "—",
    bottom: [],
    active: p.items,
    history: { wishes: p.items.wish, gives: p.items.give, trades: p.items.trade },
    since: "today",
    aboutMe: p.aboutMe,
    done: { gifts: 1, wishes: 0, trades: 0, borrows: 0 },
    connections: [],
  };
}

/** Photo with a graceful prototype fallback for the ring. */
export const myPhoto = (p: MyProfile) => p.photo ?? meFallback;
