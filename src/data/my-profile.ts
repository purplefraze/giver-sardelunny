import meFallback from "@/assets/me.jpg";
import type { Member } from "@/data/giver";
import {
  ITEM_TYPES,
  MAX_ACTIVE_PER_TYPE,
  ME_ID,
  completedItems,
  itemsStore,
  myItems,
  type Item,
  type ItemType,
} from "@/data/items";

/**
 * MY PROFILE — THE SINGLE SOURCE OF TRUTH FOR THE PERSON.
 *
 * The person's own fields (photo, about, by day/night/weekend, rewards) live
 * here. Their WISHES, GIVES, TRADES and BORROWS do not: those are Items in
 * src/data/items.ts, shared with the community. This module only projects them,
 * so there is exactly ONE copy of every item and no onboarding draft anywhere.
 */

export type Category = ItemType;

export const CATEGORIES: Category[] = ITEM_TYPES;

/** Plural label per category — used by the builder and the full profile. */
export const CATEGORY_PLURAL: Record<Category, string> = {
  wish: "wishes",
  give: "gives",
  trade: "trades",
  borrow: "borrows",
};

/** Architecture ceiling. Onboarding only encourages the first three. */
export const MAX_PER_CATEGORY = MAX_ACTIVE_PER_TYPE;
export const SETUP_PER_CATEGORY = 3;

/** Sparkles awarded once, the first time a profile is completed. */
export const PROFILE_SPARKLES = 10;

export type MyProfile = {
  username: string;
  photo: string | null;
  aboutMe: string;
  byDay: string;
  byNight: string;
  weekend: string;
  /** PROJECTION of my active items, in my own priority order. Read-only. */
  items: Record<Category, string[]>;
  /** The same items, with ids — for editing, completing and reordering. */
  records: Record<Category, Item[]>;
  /** My completed items, kept as history. */
  completed: Record<Category, Item[]>;
  /** True once the person has been through the builder at least once. */
  built: boolean;
  /** Sparks power my own activity. Sparkles help OTHER people get seen. */
  sparkles: number;
  /** The profile-completion reward is given exactly once. */
  sparklesAwarded: boolean;
};

type Person = {
  username: string;
  photo: string | null;
  aboutMe: string;
  byDay: string;
  byNight: string;
  weekend: string;
  built: boolean;
  sparkles: number;
  sparklesAwarded: boolean;
};

const KEY = "giver.my-profile.v1";

const EMPTY_PERSON: Person = {
  username: "@you",
  photo: null,
  aboutMe: "",
  byDay: "",
  byNight: "",
  weekend: "",
  built: false,
  sparkles: 0,
  sparklesAwarded: false,
};

const NO_ITEMS: Record<Category, Item[]> = {
  wish: [],
  give: [],
  trade: [],
  borrow: [],
};

function readPerson(): Person {
  if (typeof window === "undefined") return EMPTY_PERSON;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PERSON;
    const parsed = JSON.parse(raw) as Partial<Person>;
    return { ...EMPTY_PERSON, ...parsed };
  } catch {
    return EMPTY_PERSON;
  }
}

let person: Person = EMPTY_PERSON;
let hydrated = false;
const listeners = new Set<() => void>();

/** Cached projection so useSyncExternalStore sees a stable snapshot. */
let snapshot: MyProfile | null = null;

const EMPTY_SNAPSHOT: MyProfile = {
  ...EMPTY_PERSON,
  items: { wish: [], give: [], trade: [], borrow: [] },
  records: NO_ITEMS,
  completed: NO_ITEMS,
};

function project(): MyProfile {
  const state = itemsStore.get();
  const records = {} as Record<Category, Item[]>;
  const completed = {} as Record<Category, Item[]>;
  const items = {} as Record<Category, string[]>;
  for (const category of CATEGORIES) {
    records[category] = myItems(state, category);
    completed[category] = completedItems(state, category);
    items[category] = records[category].map((i) => i.text);
  }
  return { ...person, items, records, completed };
}

function invalidate() {
  snapshot = null;
  for (const l of listeners) l();
}

/** Items change independently of the person, and every view must follow. */
itemsStore.subscribe(invalidate);

/**
 * WRITE-THROUGH PERSISTENCE. Every keystroke lands in localStorage, so leaving
 * a screen, reloading the preview or reopening the app restores exactly what
 * was typed. A photo can be large enough to blow the storage quota; if that
 * happens the WORDS must still survive, so we retry without the photo rather
 * than silently losing the whole profile.
 */
function writePerson(next: Person) {
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    const withoutPhoto = { ...next, photo: null };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(withoutPhoto));
      return withoutPhoto;
    } catch {
      return next;
    }
  }
}

function savePerson(next: Person) {
  person = writePerson(next);
  invalidate();
}

function hydrate() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    person = readPerson();
    snapshot = null;
  }
}

export const myProfileStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): MyProfile {
    hydrate();
    if (!snapshot) snapshot = project();
    return snapshot;
  },
  /** SERVER SNAPSHOT — SSR renders the empty profile, never localStorage. */
  getServer(): MyProfile {
    return EMPTY_SNAPSHOT;
  },
  /** AUTO-SAVE: every mutation below writes straight through. */
  patch(fields: Partial<Person>) {
    hydrate();
    savePerson({ ...person, ...fields });
  },

  /* ---- ITEMS: thin delegation to the one shared item collection. ---- */
  addItem(category: Category, text: string) {
    itemsStore.add(ME_ID, category, text);
  },
  editItem(category: Category, index: number, text: string) {
    const item = myProfileStore.get().records[category][index];
    if (item) itemsStore.patch(item.id, { text });
  },
  removeItem(category: Category, index: number) {
    const item = myProfileStore.get().records[category][index];
    if (item) itemsStore.remove(item.id);
  },
  completeItem(category: Category, index: number) {
    const item = myProfileStore.get().records[category][index];
    if (item) itemsStore.complete(item.id);
  },
  /** REORDER = PRIORITISE. Position #1 is what the Living G shows. */
  moveItem(category: Category, index: number, delta: number) {
    itemsStore.move(ME_ID, category, index, delta);
  },

  /* ---- SPARKLES: earned, never bought. ---- */
  /** Awarded once, when the first profile setup is completed. */
  awardProfileSparkles(): number {
    hydrate();
    if (person.sparklesAwarded) return 0;
    savePerson({
      ...person,
      sparkles: person.sparkles + PROFILE_SPARKLES,
      sparklesAwarded: true,
    });
    return PROFILE_SPARKLES;
  },
  /** Spend one sparkle on somebody ELSE's active community item. */
  useSparkle(itemId: string): { ok: boolean; reason?: string } {
    hydrate();
    if (person.sparkles < 1) return { ok: false, reason: "none" };
    const result = itemsStore.boost(itemId, ME_ID);
    if (!result.ok) return result;
    savePerson({ ...person, sparkles: person.sparkles - 1 });
    return { ok: true };
  },
};

/** The one give the Living G advertises: priority #1 of my active gives. */
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
    id: ME_ID,
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
    history: {
      wishes: p.completed.wish.map((i) => i.text),
      gives: p.completed.give.map((i) => i.text),
      trades: p.completed.trade.map((i) => i.text),
    },
    since: "today",
    aboutMe: p.aboutMe,
    done: {
      gifts: p.completed.give.length,
      wishes: p.completed.wish.length,
      trades: p.completed.trade.length,
      borrows: p.completed.borrow.length,
    },
    connections: [],
  };
}

/** Photo with a graceful prototype fallback for the ring. */
export const myPhoto = (p: MyProfile) => p.photo ?? meFallback;
