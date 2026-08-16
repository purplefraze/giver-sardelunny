/**
 * THE ITEM LAYER — ONE ITEM, MANY VIEWS.
 *
 * Every wish, give, trade and borrow in Giver — mine or anyone else's — exists
 * exactly ONCE, here, as an Item with a stable id. The profile builder, my
 * Living G, my full profile, other people's profiles and any future community
 * discovery surface are all VIEWS over this one collection. Nothing copies an
 * item; everything references it.
 *
 * MY items are the ones owned by ME_ID. COMMUNITY is not a different store: it
 * is the same items, queried by status/published rather than by owner.
 *
 * Sparkles (a reward distinct from Sparks) boost OTHER PEOPLE's items. The
 * ledger below records who boosted what and when so a ranking model can be
 * designed later without changing the data.
 */

import { MEMBERS } from "@/data/giver";

export type ItemType = "wish" | "give" | "trade" | "borrow";

export const ITEM_TYPES: ItemType[] = ["wish", "give", "trade", "borrow"];

export type ItemStatus = "active" | "completed" | "paused" | "archived";

export type Boost = {
  id: string;
  itemId: string;
  /** Who spent the sparkle. Never the item's owner (see useSparkle). */
  byOwnerId: string;
  at: number;
};

export type Item = {
  id: string;
  ownerId: string;
  type: ItemType;
  text: string;
  status: ItemStatus;
  /** 0 = the owner's #1 priority in that type. User-controlled ordering. */
  priority: number;
  /** Only published + active items are discoverable by the community. */
  published: boolean;
  createdAt: number;
  updatedAt: number;
  /** Where available — community discovery may sort or filter on it later. */
  distanceKm?: number;
  /** Cheap denormalised counter; the truth is the boost ledger. */
  boostCount: number;
};

export const ME_ID = "me";

/** Architecture ceiling per person, per type. */
export const MAX_ACTIVE_PER_TYPE = 5;

/** How much a single sparkle may ever be worth — guardrails, not a ranking. */
export const BOOST_RULES = {
  /** Boosts older than this stop counting toward visibility. */
  windowMs: 7 * 24 * 60 * 60 * 1000,
  /** No amount of sparkles can pin an item to the top forever. */
  maxCountedPerItem: 25,
  /** One person may only sparkle the same item this many times. */
  maxPerPersonPerItem: 3,
};

type ItemsState = { items: Item[]; boosts: Boost[]; seeded: boolean };

const KEY = "giver.items.v1";

const EMPTY: ItemsState = { items: [], boosts: [], seeded: false };

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseKm = (distance: string) => {
  const m = /([\d.]+)\s*km/.exec(distance);
  if (m) return Number(m[1]);
  const metres = /([\d.]+)\s*m/.exec(distance);
  return metres ? Number(metres[1]) / 1000 : undefined;
};

/**
 * The sample community starts out as REAL items, so my items and theirs live
 * in one collection from the first render. Seeded once, then persisted.
 */
function seedItems(): Item[] {
  const now = Date.now();
  const out: Item[] = [];
  MEMBERS.forEach((member, mi) => {
    const km = parseKm(member.distance);
    ITEM_TYPES.forEach((type) => {
      member.active[type].forEach((text, i) => {
        out.push({
          id: `seed-${member.id}-${type}-${i}`,
          ownerId: member.id,
          type,
          text,
          status: "active",
          priority: i,
          published: true,
          createdAt: now - (mi + 1) * 86400000 - i * 3600000,
          updatedAt: now - (mi + 1) * 86400000 - i * 3600000,
          ...(km === undefined ? {} : { distanceKm: km }),
          boostCount: 0,
        });
      });
    });
  });
  return out;
}

function read(): ItemsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: seedItems(), boosts: [], seeded: true };
    const parsed = JSON.parse(raw) as Partial<ItemsState>;
    return {
      items: parsed.items ?? seedItems(),
      boosts: parsed.boosts ?? [],
      seeded: true,
    };
  } catch {
    return { items: seedItems(), boosts: [], seeded: true };
  }
}

let state: ItemsState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function commit(next: ItemsState) {
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

function ensure() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

/** Reindex one owner+type so priority is always 0..n with no gaps. */
function reindex(items: Item[], ownerId: string, type: ItemType): Item[] {
  const order = items
    .filter((i) => i.ownerId === ownerId && i.type === type)
    .sort((a, b) => a.priority - b.priority)
    .map((i) => i.id);
  return items.map((i) =>
    order.includes(i.id) ? { ...i, priority: order.indexOf(i.id) } : i,
  );
}

export const itemsStore = {
  subscribe(listener: () => void) {
    if (!hydrated) {
      hydrated = true;
      state = read();
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): ItemsState {
    return ensure();
  },
  /** SSR snapshot — never localStorage, and never a fresh random seed. */
  getServer(): ItemsState {
    return EMPTY;
  },

  /** CREATE. Belongs to MY list and, being active+published, to community too. */
  add(ownerId: string, type: ItemType, text: string): Item | null {
    const t = text.trim();
    if (!t) return null;
    const s = ensure();
    const mine = s.items.filter(
      (i) => i.ownerId === ownerId && i.type === type && i.status === "active",
    );
    if (mine.length >= MAX_ACTIVE_PER_TYPE) return null;
    const now = Date.now();
    const item: Item = {
      id: uid(),
      ownerId,
      type,
      text: t,
      status: "active",
      priority: mine.length,
      published: true,
      createdAt: now,
      updatedAt: now,
      boostCount: 0,
    };
    commit({ ...s, items: [...s.items, item] });
    return item;
  },

  /** EDIT ONE ITEM — every view that references it updates with it. */
  patch(id: string, fields: Partial<Omit<Item, "id" | "ownerId" | "type">>) {
    const s = ensure();
    commit({
      ...s,
      items: s.items.map((i) =>
        i.id === id ? { ...i, ...fields, updatedAt: Date.now() } : i,
      ),
    });
  },

  setStatus(id: string, status: ItemStatus) {
    const s = ensure();
    const item = s.items.find((i) => i.id === id);
    if (!item) return;
    itemsStore.patch(id, { status });
    const after = ensure();
    commit({ ...after, items: reindex(after.items, item.ownerId, item.type) });
  },

  complete(id: string) {
    itemsStore.setStatus(id, "completed");
  },

  remove(id: string) {
    const s = ensure();
    const item = s.items.find((i) => i.id === id);
    if (!item) return;
    const items = s.items.filter((i) => i.id !== id);
    commit({
      ...s,
      items: reindex(items, item.ownerId, item.type),
      boosts: s.boosts.filter((b) => b.itemId !== id),
    });
  },

  /** REORDER = REPRIORITISE. Position #1 is what the Living G advertises. */
  move(ownerId: string, type: ItemType, from: number, delta: number) {
    const s = ensure();
    const ordered = activeOf(s.items, ownerId, type);
    const to = from + delta;
    if (from < 0 || from >= ordered.length || to < 0 || to >= ordered.length)
      return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    const order = new Map(next.map((i, index) => [i.id, index]));
    commit({
      ...s,
      items: s.items.map((i) =>
        order.has(i.id) ? { ...i, priority: order.get(i.id)!, updatedAt: Date.now() } : i,
      ),
    });
  },

  /** SPEND A SPARKLE on somebody else's active community item. */
  boost(itemId: string, byOwnerId: string): { ok: boolean; reason?: string } {
    const s = ensure();
    const item = s.items.find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: "gone" };
    if (item.ownerId === byOwnerId) return { ok: false, reason: "self" };
    if (item.status !== "active" || !item.published)
      return { ok: false, reason: "inactive" };
    const already = s.boosts.filter(
      (b) => b.itemId === itemId && b.byOwnerId === byOwnerId,
    ).length;
    if (already >= BOOST_RULES.maxPerPersonPerItem)
      return { ok: false, reason: "capped" };
    const boost: Boost = {
      id: uid(),
      itemId,
      byOwnerId,
      at: Date.now(),
    };
    commit({
      ...s,
      boosts: [...s.boosts, boost],
      items: s.items.map((i) =>
        i.id === itemId ? { ...i, boostCount: i.boostCount + 1 } : i,
      ),
    });
    return { ok: true };
  },
};

/* ------------------------------ VIEWS / QUERIES ----------------------------- */

function activeOf(items: Item[], ownerId: string, type: ItemType) {
  return items
    .filter((i) => i.ownerId === ownerId && i.type === type && i.status === "active")
    .sort((a, b) => a.priority - b.priority);
}

/** MY list (or anyone's): active, in the owner's own priority order. */
export function myItems(state: ItemsState, type: ItemType, ownerId = ME_ID) {
  return activeOf(state.items, ownerId, type);
}

/** The owner's history: everything that is no longer active. */
export function completedItems(
  state: ItemsState,
  type: ItemType,
  ownerId = ME_ID,
) {
  return state.items.filter(
    (i) => i.ownerId === ownerId && i.type === type && i.status === "completed",
  );
}

/**
 * COMMUNITY DISCOVERY — the same items, queried. Deliberately UNRANKED: the
 * interface (feed, map, cards, hybrid) and the ranking model come later, so
 * this only filters and exposes the signals they will need.
 */
export function communityItems(
  state: ItemsState,
  query: {
    type?: ItemType;
    ownerId?: string;
    /** Exclude one person — usually me, when browsing others. */
    excludeOwnerId?: string;
    createdAfter?: number;
    withinKm?: number;
    /** e.g. 1 = only each person's #1 priority item. */
    topPriority?: number;
    boostedOnly?: boolean;
  } = {},
) {
  const now = Date.now();
  return state.items
    .filter((i) => i.status === "active" && i.published)
    .filter((i) => (query.type ? i.type === query.type : true))
    .filter((i) => (query.ownerId ? i.ownerId === query.ownerId : true))
    .filter((i) => (query.excludeOwnerId ? i.ownerId !== query.excludeOwnerId : true))
    .filter((i) => (query.createdAfter ? i.createdAt >= query.createdAfter : true))
    .filter((i) =>
      query.withinKm === undefined
        ? true
        : i.distanceKm !== undefined && i.distanceKm <= query.withinKm,
    )
    .filter((i) =>
      query.topPriority === undefined ? true : i.priority < query.topPriority,
    )
    .map((i) => ({ ...i, boostWeight: boostWeight(state, i.id, now) }))
    .filter((i) => (query.boostedOnly ? i.boostWeight > 0 : true));
}

/** Capped, time-limited boost signal. A ranking model can weight this later. */
export function boostWeight(state: ItemsState, itemId: string, now = Date.now()) {
  const counted = state.boosts.filter(
    (b) => b.itemId === itemId && now - b.at <= BOOST_RULES.windowMs,
  ).length;
  return Math.min(counted, BOOST_RULES.maxCountedPerItem);
}

export function boostsFor(state: ItemsState, itemId: string) {
  return state.boosts.filter((b) => b.itemId === itemId);
}
