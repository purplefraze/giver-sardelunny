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
  /** The one line an item reads as. For a trade it is always "offer for want". */
  text: string;
  /** TRADES HAVE TWO SIDES, stored separately and rendered as one line. */
  offer?: string;
  want?: string;
  status: ItemStatus;
  /** 0 = the owner's #1 priority in that type. User-controlled ordering. */
  priority: number;
  /** Only published + active items are discoverable by the community. */
  published: boolean;
  createdAt: number;
  updatedAt: number;
  /**
   * ANYTHING ELSE WE SHOULD KNOW — one optional, deliberately short line of
   * context (a size, a time window, a condition). Never a description field.
   */
  note?: string;
  /**
   * PHOTOS BELONG TO THE ITEM, NEVER TO A SCREEN. One item, many views: a photo
   * added while creating a give or a trade appears on my g, in community, on my
   * full profile and on the detail page, because they all read this one record.
   */
  photos?: string[];
  /**
   * BORROWING HAS TWO SIDES. "borrow" = I would like to borrow something.
   * "lend" = I am willing to lend something out. Never the same copy.
   */
  side?: BorrowSide;
  /**
   * STRUCTURED DETAILS — where, when, how long, plus context-specific answers.
   * Optional everywhere; they exist so people do not have to message to find
   * out the basics.
   */
  details?: ItemDetails;
  /** Where available — community discovery may sort or filter on it later. */
  distanceKm?: number;
  /** Cheap denormalised counter; the truth is the boost ledger. */
  boostCount: number;
};

export type BorrowSide = "borrow" | "lend";

/** How each side of the borrow world reads, everywhere it appears. */
export const BORROW_SIDE_WORD: Record<BorrowSide, string> = {
  borrow: "borrow",
  lend: "lend",
};

/** The word an item calls itself — borrow and lend are never interchangeable. */
export const typeWord = (item: Pick<Item, "type" | "side">) =>
  item.type === "borrow" ? BORROW_SIDE_WORD[item.side ?? "borrow"] : item.type;

/** Photos are kept small enough to live happily in local storage. */
export const MAX_PHOTOS = 4;


export const ME_ID = "me";

/**
 * SHORT AND SWEET, ENFORCED. An activity is a headline, not a description:
 * one glanceable line, plus at most one short line of extra context.
 */
export const ACTIVITY_MAX = 50;
export const NOTE_MAX = 100;

/** Per-type room. A give may say a little more; asks stay terse. */
export const TITLE_MAX: Record<ItemType, number> = {
  wish: 40,
  give: 50,
  trade: 40,
  borrow: 40,
};

export const NOTE_MAX_FOR: Record<ItemType, number> = {
  wish: 50,
  give: 100,
  trade: 50,
  borrow: 50,
};

/**
 * A COUNTDOWN IS A WARNING, NOT A METER. It stays hidden until the end is
 * actually in sight.
 */
export const TITLE_COUNTDOWN_AT = 10;
export const NOTE_COUNTDOWN_AT = 40;

/**
 * STRUCTURED DETAILS — enough for somebody to decide without messaging, never
 * a form. Everything is optional, and nothing is ever an exact home address.
 */
export type ItemDetails = {
  /** neighbourhood / general area, "online" or "flexible". Never an address. */
  where?: string | undefined;
  /** days of the week, in order, e.g. ["tues", "thurs"]. */
  days?: string[] | undefined;
  /** a time or time range: "evenings", "7 pm". */
  time?: string | undefined;
  /** a date or date range, where it matters. */
  date?: string | undefined;
  /** one time · recurring · flexible. */
  cadence?: string | undefined;
  /** approximate duration: "1 hour". */
  duration?: string | undefined;
  /** context-specific answers (subject, level, format...). */
  extras?: Record<string, string> | undefined;
};

export const DAY_NAMES = ["mon", "tues", "wed", "thurs", "fri", "sat", "sun"];

export const WHERE_OPTIONS = ["online", "flexible"];
export const CADENCE_OPTIONS = ["one time", "recurring", "flexible"];
export const TIME_OPTIONS = ["mornings", "afternoons", "evenings", "flexible"];
export const DURATION_OPTIONS = ["30 min", "1 hour", "2 hours", "flexible"];

/**
 * ASK LESS, UNDERSTAND MORE. What kind of thing this is decides which
 * questions are even worth asking. A sourdough starter can never be "online";
 * an object being given away has no duration.
 */
export type GiveKind =
  | "object"
  | "food"
  | "skill"
  | "experience"
  | "help"
  | "digital";

const KIND_MATCH: { kind: GiveKind; match: RegExp }[] = [
  {
    kind: "food",
    match:
      /sourdough|starter|bread|jam|meal|dinner|lunch|soup|cake|bake|preserve|honey|eggs|veg|produce|food|coffee|seed/i,
  },
  {
    kind: "digital",
    match: /online|remote|cv|resume|website|spreadsheet|code|design review|admin|form|zoom|call/i,
  },
  {
    kind: "skill",
    match:
      /tutor|lesson|teach|class|coach|language|conversation|math|science|chemistry|guitar|music|photograph|translat|mentor|advice|practice/i,
  },
  {
    kind: "experience",
    match: /dinner party|walk|hike|swim|film|cinema|concert|company|hour|club|game|tour|ride along/i,
  },
  {
    kind: "help",
    match:
      /help|ride|lift|drive|move|haul|deliver|repair|fix|paint|build|garden|clean|sit|walking|watering|shop/i,
  },
  {
    kind: "object",
    match:
      /tent|projector|waders|ladder|drill|bike|book|jars|boxes|chair|table|clothes|coat|shoes|toys|plant|tool|jar|kit/i,
  },
];

export function classifyKind(text: string): GiveKind {
  return KIND_MATCH.find((k) => k.match.test(text))?.kind ?? "help";
}

/** WHERE — never an exact home address, and never "online" for a real thing. */
const PHYSICAL_WHERE = ["nearby pickup", "in person", "flexible"];
const REMOTE_WHERE = ["online", "in person", "flexible"];

export const WHERE_FOR: Record<GiveKind, string[]> = {
  object: PHYSICAL_WHERE,
  food: PHYSICAL_WHERE,
  skill: REMOTE_WHERE,
  digital: ["online", "flexible"],
  experience: ["in person", "flexible"],
  help: ["in person", "nearby pickup", "online", "flexible"],
};

/** An area can only be named where meeting in person is possible at all. */
export const ASKS_AREA: Record<GiveKind, boolean> = {
  object: true,
  food: true,
  skill: true,
  digital: false,
  experience: true,
  help: true,
};

/** HOW LONG only where a duration means anything. */
export const ASKS_DURATION: Record<GiveKind, boolean> = {
  object: false,
  food: false,
  skill: true,
  digital: true,
  experience: true,
  help: true,
};


/**
 * THE SCANNABLE FACTS OF ONE ITEM, in one order, everywhere they appear. Only
 * what exists is ever shown — no empty labels, no placeholders.
 */
export function detailBits(item: Item): string[] {
  const d = item.details;
  if (!d) return [];
  const out: string[] = [];
  if (d.days?.length) out.push(d.days.join(" + "));
  if (d.date) out.push(d.date);
  if (d.time) out.push(d.time);
  if (d.duration) out.push(d.duration);
  if (d.cadence && d.cadence !== "flexible") out.push(d.cadence);
  if (d.where) out.push(d.where);
  for (const value of Object.values(d.extras ?? {}))
    if (value.trim()) out.push(value.trim());
  return out;
}

/**
 * CONTEXT-SPECIFIC QUESTIONS. A give only ever asks what makes sense for that
 * kind of give — tutoring is asked about subject and level, a meal is not.
 */
export const CONTEXT_FIELDS: {
  match: RegExp;
  fields: { key: string; ask: string }[];
}[] = [
  {
    match: /tutor|lesson|teach|class|coach|math|science|language/i,
    fields: [
      { key: "subject", ask: "subject" },
      { key: "level", ask: "level / grade" },
    ],
  },
  {
    match: /dinner|meal|lunch|food|cook|bake|seat/i,
    fields: [
      { key: "people", ask: "how many people" },
      { key: "diet", ask: "dietary notes" },
    ],
  },
  {
    match: /ride|lift|drive|move|haul|deliver/i,
    fields: [
      { key: "from", ask: "general area (from)" },
      { key: "to", ask: "general area (to)" },
    ],
  },
  {
    match: /repair|fix|paint|build|garden|clean|help/i,
    fields: [{ key: "kind", ask: "what kind of work" }],
  },
];

export const contextFieldsFor = (text: string) =>
  CONTEXT_FIELDS.find((c) => c.match.test(text))?.fields ?? [];

/** A WISH LIVES SEVEN DAYS. After that its sparks come home. */
export const WISH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * PERMANENT LIMITS. Generosity is never capped; asking is deliberately scarce.
 */
export const MAX_ACTIVE: Record<ItemType, number> = {
  wish: 3,
  give: Number.POSITIVE_INFINITY,
  trade: 3,
  borrow: 3,
};

/**
 * A TRADE ALWAYS READS AS BOTH OF ITS SIDES — everywhere it appears, through
 * this one formatter. A half-finished trade keeps its structure: "haircut for
 * ___" / "___ for photography", so both sides are always visible.
 */
/**
 * COLOUR = MEANING. The ONE map from an activity type to the colour its text
 * uses anywhere it is displayed — including inside My G, where several activity
 * colours can legitimately live at once. Values are the world tokens, so the
 * text can never drift from its Living G world.
 */
export const ACTIVITY_FILL: Record<ItemType, string> = {
  wish: "var(--activity-wish)",
  give: "var(--activity-give)",
  trade: "var(--activity-trade)",
  borrow: "var(--activity-borrow)",
};

export const TRADE_BLANK = "___";

export const tradeText = (offer: string, want: string) =>
  `${offer.trim() || TRADE_BLANK} for ${want.trim() || TRADE_BLANK}`;

/** Recover the two sides from a legacy/seeded single-line trade. */
export const splitTrade = (text: string): { offer: string; want: string } => {
  const i = text.toLowerCase().indexOf(" for ");
  if (i === -1) return { offer: text.trim(), want: "" };
  return { offer: text.slice(0, i).trim(), want: text.slice(i + 5).trim() };
};

/**
 * THE ONE LINE AN ITEM READS AS, anywhere in the app. No screen formats a
 * trade for itself — this is the single display source for "offer for want".
 */
export const itemLine = (item: Item): string => {
  if (item.type !== "trade") return item.text;
  const sides = splitTrade(item.text);
  return tradeText(item.offer ?? sides.offer, item.want ?? sides.want);
};



/** How much a single sparkle may ever be worth — guardrails, not a ranking. */
export const BOOST_RULES = {
  /** Boosts older than this stop counting toward visibility. */
  windowMs: 7 * 24 * 60 * 60 * 1000,
  /** No amount of sparkles can pin an item to the top forever. */
  maxCountedPerItem: 25,
  /** One person may only sparkle the same item this many times. */
  maxPerPersonPerItem: 3,
};

export type ItemsState = { items: Item[]; boosts: Boost[]; seeded: boolean };

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
 * SEEDED DETAILS EXIST FOR THE SAME REASON REAL ONES DO: so community can be
 * scanned and understood without opening anything. Deterministic, never random,
 * and never nonsense — a sourdough starter is picked up nearby, not "online".
 */
function seedDetails(text: string, mi: number, i: number): ItemDetails {
  const kind = classifyKind(text);
  const daySets = [["tues", "thurs"], ["sat"], ["sun"], ["mon", "wed", "fri"]];
  const areas = ["west end", "north side", "nearby pickup", "in person"];
  const times = ["evenings", "7 pm", "afternoons", "mornings"];
  const spans = ["one time", "recurring", "flexible"];
  const k = (mi + i) % 4;
  const wheres = WHERE_FOR[kind];
  const where = wheres[k % wheres.length]!;
  const cadence = spans[(mi + i) % spans.length]!;
  const flexible = where === "flexible" && cadence === "recurring";
  return {
    /* A FLEXIBLE, RECURRING THING DOES NOT CLAIM FIXED DAYS. */
    ...(flexible ? {} : { days: daySets[k % daySets.length]! }),
    ...(flexible ? {} : { time: times[k % times.length]! }),
    where:
      where === "in person" || where === "nearby pickup"
        ? (areas[(k + i) % areas.length] ?? where)
        : where,
    cadence,
    ...(ASKS_DURATION[kind]
      ? { duration: DURATION_OPTIONS[k % DURATION_OPTIONS.length]! }
      : {}),
  };
}


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
        /* SEEDED TRADES CARRY BOTH SIDES, like every trade the user makes. */
        const sides = type === "trade" ? splitTrade(text) : null;
        out.push({
          id: `seed-${member.id}-${type}-${i}`,
          ownerId: member.id,
          type,
          text: sides ? tradeText(sides.offer, sides.want) : text,
          ...(sides ? { offer: sides.offer, want: sides.want } : {}),

          status: "active",
          priority: i,
          published: true,
          createdAt: now - (mi + 1) * 86400000 - i * 3600000,
          updatedAt: now - (mi + 1) * 86400000 - i * 3600000,
          ...(km === undefined ? {} : { distanceKm: km }),
          details: seedDetails(text, mi, i),
          boostCount: 0,
        });
      });
    });
  });
  return out;
}

/**
 * OLDER SAMPLE ITEMS PREDATE STRUCTURED DETAILS. They are the same items, so
 * they are filled in place rather than replaced — nobody's own items are ever
 * touched.
 */
function withSeedDetails(item: Item): Item {
  /* DEMO ITEMS ARE ALWAYS RE-DERIVED, so old nonsense combinations heal. */
  if (!item.id.startsWith("seed-")) return item;
  const parts = item.id.split("-");
  const memberId = parts[1] ?? "";
  const index = Number(parts[3] ?? 0) || 0;
  const mi = Math.max(0, MEMBERS.findIndex((m) => m.id === memberId));
  const heal = (s: string) => s.replace(/^italian lessons(?= for )/, "language lessons");
  return {
    ...item,
    text: heal(item.text),
    ...(item.offer ? { offer: heal(item.offer) } : {}),
    details: seedDetails(item.text, mi, index),
  };
}


function read(): ItemsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: seedItems(), boosts: [], seeded: true };
    const parsed = JSON.parse(raw) as Partial<ItemsState>;
    return {
      items: (parsed.items ?? seedItems()).map(withSeedDetails),
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
  add(
    ownerId: string,
    type: ItemType,
    text: string,
    /** TRADES ONLY: the two sides, stored separately, read as one line. */
    parts?: { offer: string; want: string },
    note?: string,
    /** PHOTOS AND THE BORROW/LEND SIDE ride on the SAME underlying record. */
    extra?: { photos?: string[]; side?: BorrowSide; details?: ItemDetails },
  ): Item | null {
    const t = text.trim().slice(0, TITLE_MAX[type]);
    if (!t) return null;
    const s = ensure();
    const mine = s.items.filter(
      (i) => i.ownerId === ownerId && i.type === type && i.status === "active",
    );
    if (mine.length >= MAX_ACTIVE[type]) return null;
    const now = Date.now();
    const photos = (extra?.photos ?? []).slice(0, MAX_PHOTOS);
    const item: Item = {
      id: uid(),
      ownerId,
      type,
      text: t,
      ...(parts
        ? { offer: parts.offer.trim(), want: parts.want.trim() }
        : {}),
      ...(note && note.trim()
        ? { note: note.trim().slice(0, NOTE_MAX_FOR[type]) }
        : {}),
      ...(photos.length ? { photos } : {}),
      ...(type === "borrow" ? { side: extra?.side ?? "borrow" } : {}),
      ...(extra?.details && Object.keys(extra.details).length
        ? { details: extra.details }
        : {}),
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

  /** ATTACH A PHOTO TO THE REAL ITEM — never to a separate photo post. */
  addPhoto(id: string, dataUrl: string) {
    const s = ensure();
    const item = s.items.find((i) => i.id === id);
    if (!item) return;
    const photos = [...(item.photos ?? []), dataUrl].slice(0, MAX_PHOTOS);
    itemsStore.patch(id, { photos });
  },

  removePhoto(id: string, index: number) {
    const s = ensure();
    const item = s.items.find((i) => i.id === id);
    if (!item) return;
    const photos = (item.photos ?? []).filter((_, i) => i !== index);
    itemsStore.patch(id, { photos });
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
  /** Development fixtures still use the real collection and real projections. */
  replaceMine(items: Item[]) {
    const s = ensure();
    commit({
      ...s,
      items: [...s.items.filter((item) => item.ownerId !== ME_ID), ...items],
      boosts: s.boosts.filter((boost) =>
        !s.items.some((item) => item.ownerId === ME_ID && item.id === boost.itemId),
      ),
    });
  },
  clearMine() {
    itemsStore.replaceMine([]);
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
