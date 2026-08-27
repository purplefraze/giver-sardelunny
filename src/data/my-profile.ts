
import type { Member } from "@/data/giver";
import {
  ITEM_TYPES,
  MAX_ACTIVE,
  ME_ID,
  completedItems,
  itemsStore,
  myItems,
  itemLine,
  splitTrade,
  tradeText,
  WISH_TTL_MS,
  type BorrowSide,
  type Item,
  type ItemDetails,
  type ItemType,
} from "@/data/items";


import { ledgerStore } from "@/data/ledger";
import {
  ageFrom,
  hashPassword,
  normaliseBirthday,
  publishEligibility,
} from "@/data/account";
import { sparkFlashStore } from "@/data/spark-flash";
import { sessionStore } from "@/data/cloud/session";
import { haptics } from "@/lib/haptics";


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

/**
 * PERMANENT LIMITS: gives are unlimited; wishes, trades and borrows are 3.
 */
export const MAX_PER_CATEGORY: Record<Category, number> = MAX_ACTIVE;
export const SETUP_PER_CATEGORY = 3;



/** HOW THE CHOSEN CIRCLE SITS OVER THE ORIGINAL PICTURE. */
export type PhotoCrop = { x: number; y: number; zoom: number };

export type MyProfile = {
  username: string;
  photo: string | null;
  /** The untouched picture, kept so the crop can always be reopened. */
  photoSource: string | null;
  photoCrop: PhotoCrop | null;
  aboutMe: string;
  byDay: string;
  byNight: string;
  weekend: string;
  /** THE FUN QUESTIONS, ANSWERED: prompt id -> what they said. */
  answers: Record<string, string>;
  /** IDENTITY, KEPT SHORT: an ISO date and one chosen word. */
  birthday: string;
  gender: string;
  /** SALTED AND HASHED. The typed password is never stored anywhere. */
  password: string;
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
  /** SPARKS: spent to wish, earned from completed generosity. */
  sparks: number;
  /**
   * RESERVED, NOT SPENT. A wish holds its 10 sparks until the wish is either
   * granted-and-verified (they settle) or withdrawn (they come back).
   * Keyed by the wish's item id, so a reservation always has an owner.
   */
  reserved: Record<string, number>;
  /** The onboarding balance lands exactly once. */
  sparksSeeded: boolean;
  /** One key per already-rewarded completed interaction. Never pays twice. */
  rewarded: string[];
};

type Person = {
  username: string;
  photo: string | null;
  photoSource: string | null;
  photoCrop: PhotoCrop | null;
  aboutMe: string;
  byDay: string;
  byNight: string;
  weekend: string;
  answers: Record<string, string>;
  birthday: string;
  gender: string;
  password: string;
  built: boolean;
  sparkles: number;
  sparklesAwarded: boolean;
  sparks: number;
  reserved: Record<string, number>;
  sparksSeeded: boolean;
  rewarded: string[];
};



const KEY = "giver.my-profile.v1";

/** POSTING A WISH COSTS. COMPLETED GENEROSITY EARNS. Same size, opposite sign. */
export const WISH_COST = 10;
export const GENEROSITY_REWARD = 10;
/** What onboarding leaves in the account: 100 given, 50 gifted onward. */
export const STARTING_SPARKS = 50;

const EMPTY_PERSON: Person = {
  username: "@you",
  photo: null,
  photoSource: null,
  photoCrop: null,
  aboutMe: "",
  byDay: "",
  byNight: "",
  weekend: "",
  answers: {},
  birthday: "",
  gender: "",
  password: "",
  built: false,

  sparkles: 0,
  sparklesAwarded: false,
  sparks: 0,
  reserved: {},
  sparksSeeded: false,
  rewarded: [],
};


const NO_ITEMS: Record<Category, Item[]> = {
  wish: [],
  give: [],
  trade: [],
  borrow: [],
};

/**
 * ONE SHAPE FOR A DATE OF BIRTH. Whatever arrives — a picked day, an older
 * stored value, a stray timestamp — becomes the exact calendar day "YYYY-MM-DD",
 * so hydration, formatting and editing all read back the day that was chosen.
 */
function withDateOnlyFields(p: Person): Person {
  const birthday = normaliseBirthday(p.birthday);
  return birthday === p.birthday ? p : { ...p, birthday };
}

function readPerson(): Person {
  if (typeof window === "undefined") return EMPTY_PERSON;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PERSON;
    const parsed = JSON.parse(raw) as Partial<Person>;
    return withDateOnlyFields({
      ...EMPTY_PERSON,
      ...parsed,
      reserved: parsed.reserved ?? {},
      answers: parsed.answers ?? {},
    });
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
    items[category] = records[category].map(itemLine);
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
    /*
      THE CHOSEN CIRCLE IS THE PHOTO, so it is the LAST thing to go. The
      untouched original only exists so "reposition" can reopen; dropping it
      first frees most of the room while the picture the person just chose
      still applies.
    */
    const lighter = { ...next, photoSource: null, photoCrop: null };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lighter));
      return lighter;
    } catch {
      const withoutPhoto = { ...lighter, photo: null };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(withoutPhoto));
        /* IN MEMORY THE PHOTO STILL STANDS for this session. */
        return { ...next, photoSource: null, photoCrop: null };
      } catch {
        return next;
      }
    }
  }
}

function savePerson(next: Person) {
  person = writePerson(withDateOnlyFields(next));
  invalidate();
}

/**
 * THE CHOSEN CIRCLE, GIVEN A HOME. Best effort and never in the way: the photo
 * already applies locally, and this only swaps the bytes for a link so other
 * people can load it and the phone keeps its storage.
 */
async function hostPhoto(cropped: string) {
  try {
    const { dataUrlToBlob, uploadMedia } = await import("@/lib/media");
    const blob = dataUrlToBlob(cropped);
    if (!blob) return;
    const hosted = await uploadMedia(blob, { extension: "jpg" });
    if (!hosted) return;
    if (person.photo !== cropped) return;
    savePerson({ ...person, photo: hosted });
  } catch {
    /* Signed out, offline, or storage unavailable: the local circle stands. */
  }
}

function hydrate() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    person = readPerson();
    snapshot = null;
  }
}

/**
 * THE ONE PLACE SPARKS ARE EARNED. Ten sparks from GIVER — never from another
 * person — for a completed act of generosity, recorded against a key so the
 * same completed interaction can never pay out twice.
 */
function reward(key: string) {
  hydrate();
  if (person.rewarded.includes(key)) return;
  savePerson({
    ...person,
    sparks: person.sparks + GENEROSITY_REWARD,
    rewarded: [...person.rewarded, key],
  });
  ledgerStore.record({
    id: `earn:${key}`,
    currency: "spark",
    kind: "earned",
    amount: GENEROSITY_REWARD,
    say: "giver recognised an act of generosity",
  });

  // GIVER RECOGNISING GENEROSITY: brief, warm, unmistakably an arrival.
  haptics.success();
  sparkFlashStore.show(`+${GENEROSITY_REWARD} sparks ✨`);
}



/**
 * SEVEN DAYS, THEN THE SPARKS COME HOME.
 *
 * A wish stays in circulation for a week. If nobody grants it, the wish leaves
 * circulation, its ten reserved sparks are returned in full and the active wish
 * slot is freed. Nothing about this applies to gives.
 */
function sweepExpiredWishes() {
  hydrate();
  const now = Date.now();
  const stale = itemsStore
    .get()
    .items.filter(
      (i) =>
        i.ownerId === ME_ID &&
        i.type === "wish" &&
        i.status === "active" &&
        now - i.createdAt > WISH_TTL_MS,
    );
  for (const wish of stale) {
    myProfileStore.releaseWish(wish.id, true);
    itemsStore.setStatus(wish.id, "archived");
  }
}

export const myProfileStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Expire any wish older than seven days and refund its sparks. */
  sweepWishes() {
    sweepExpiredWishes();
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
  replace(fields: Partial<Person>) {
    hydrate();
    savePerson({ ...EMPTY_PERSON, ...fields });
  },
  reset() {
    hydrated = true;
    person = EMPTY_PERSON;
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    invalidate();
  },

  /* ---- ITEMS: thin delegation to the one shared item collection. ---- */
  /**
   * POSTING. A wish costs 10 sparks; giving, trading and lending are free.
   * Nothing is created unless the cost can actually be paid.
   */
  addItem(
    category: Category,
    text: string,
    /** TRADES ONLY: offer + want, stored separately, always read as one line. */
    parts?: { offer: string; want: string },
    /** OPTIONAL, SHORT: anything else the other person should know. */
    note?: string,
    /** PHOTOS + BORROW/LEND SIDE — stored on the one real item, not a copy. */
    extra?: { photos?: string[]; side?: BorrowSide; details?: ItemDetails },
  ): {
    ok: boolean;
    reason?: "sparks" | "full" | "empty" | "account";
    say?: string;
    id?: string;
  } {
    hydrate();
    if (!text.trim()) return { ok: false, reason: "empty" };
    if (category === "wish" && person.sparks < WISH_COST)
      return { ok: false, reason: "sparks" };
    /*
      18+ AND A REAL ACCOUNT BEFORE ANYTHING IS PUBLISHED. The answer is only
      ever "not yet": the caller keeps its draft, word for word.
    */
    const allowed =
      category === "give" ? myProfileStore.canPublish() : ({ ok: true } as const);
    if (!allowed.ok) return { ok: false, reason: "account", say: allowed.say };

    const item = itemsStore.add(ME_ID, category, text, parts, note, extra);
    if (!item) return { ok: false, reason: "full" };
    /* A WISH RESERVES ITS SPARKS. They leave the balance but are not spent:
       they belong to the wish until it is granted and verified, or withdrawn. */
    if (category === "wish") {
      savePerson({
        ...person,
        sparks: person.sparks - WISH_COST,
        reserved: { ...person.reserved, [item.id]: WISH_COST },
      });
      ledgerStore.record({
        currency: "spark",
        kind: "reserved",
        amount: -WISH_COST,
        say: `held for your wish · ${text.trim()}`,
        itemId: item.id,
      });
    }
    return { ok: true, id: item.id };
  },

  /** IS THIS ACCOUNT ALLOWED TO PUBLISH? One answer, asked from everywhere. */
  canPublish() {
    hydrate();
    /* A SIGNED-IN DEV ACCOUNT COUNTS: its password lives with the account. */
    let signedIn = false;
    if (typeof window !== "undefined") {
      try {
        signedIn = Boolean(sessionStore.get().userId);
      } catch {
        signedIn = false;
      }
    }
    return publishEligibility({
      username: person.username,
      birthday: person.birthday,
      passwordSet: Boolean(person.password),
      signedIn,
    });
  },


  /** THE PASSWORD IS SALTED, HASHED AND FORGOTTEN. */
  async setPassword(plain: string) {
    hydrate();
    savePerson({ ...person, password: await hashPassword(plain) });
  },

  /** THE CHOSEN CROP IS THE PHOTO, EVERYWHERE — with the original kept. */
  setPhoto(cropped: string, source: string, crop: PhotoCrop) {
    hydrate();
    savePerson({ ...person, photo: cropped, photoSource: source, photoCrop: crop });
    /*
      A PICTURE OTHER PEOPLE CAN SEE. The circle applies instantly from the
      bytes we already have; hosting it is a quiet upgrade that also keeps
      device storage small. If it can't happen, nothing changes.
    */
    if (typeof window !== "undefined" && !/^https?:\/\//.test(cropped)) {
      void hostPhoto(cropped);
    }
  },


  editItem(category: Category, index: number, text: string) {
    const item = myProfileStore.get().records[category][index];
    if (item) itemsStore.patch(item.id, { text });
  },
  /** EDIT ONE SIDE OF A TRADE — the single record keeps both sides in step. */
  editTradeSide(index: number, side: "offer" | "want", value: string) {
    const item = myProfileStore.get().records.trade[index];
    if (!item) return;
    const sides = splitTrade(item.text);
    const offer = side === "offer" ? value : (item.offer ?? sides.offer);
    const want = side === "want" ? value : (item.want ?? sides.want);
    itemsStore.patch(item.id, { offer, want, text: tradeText(offer, want) });
  },

  removeItem(category: Category, index: number) {
    const item = myProfileStore.get().records[category][index];
    if (!item) return;
    /* WITHDRAWING A WISH RETURNS ITS RESERVED SPARKS. Nothing was completed. */
    if (category === "wish") myProfileStore.releaseWish(item.id, true);
    itemsStore.remove(item.id);
  },
  /**
   * COMPLETED GENEROSITY. A give that has actually reached another Giver is a
   * completed act, and Giver — not the other person — recognises it with 10
   * sparks. The ledger key makes the reward impossible to collect twice.
   */
  completeItem(category: Category, index: number) {
    const item = myProfileStore.get().records[category][index];
    if (!item) return;
    itemsStore.complete(item.id);
    if (category === "give") reward(`give:${item.id}`);
  },
  /**
   * SETTLE GENEROSITY. Called ONLY by the connection layer, and only once both
   * people have verified that the interaction actually happened. Expressing
   * intent, messaging or claiming completion never reaches this.
   */
  earnSparks(key: string) {
    reward(key);
  },

  /**
   * A WISH'S RESERVED SPARKS LEAVE RESERVE. Either they were settled to the
   * granter (refund = false) or the wish was withdrawn (refund = true).
   */
  releaseWish(itemId: string, refund: boolean) {
    hydrate();
    const held = person.reserved[itemId];
    if (held === undefined) return;
    const reserved = { ...person.reserved };
    delete reserved[itemId];
    savePerson({
      ...person,
      reserved,
      sparks: refund ? person.sparks + held : person.sparks,
    });
    ledgerStore.record({
      currency: "spark",
      kind: refund ? "returned" : "spent",
      amount: refund ? held : 0,
      say: refund
        ? "your wish came home — sparks returned"
        : "your wish was granted — sparks passed on",
      itemId,
    });
  },

  /** ONBOARDING LEAVES A REAL BALANCE — once, never on every reopen. */
  seedSparks() {
    hydrate();
    if (person.sparksSeeded) return;
    savePerson({ ...person, sparks: STARTING_SPARKS, sparksSeeded: true });
    ledgerStore.record({
      id: "seed:received",
      currency: "spark",
      kind: "received",
      amount: STARTING_SPARKS * 2,
      say: "giver welcomed you with 100 sparks",
    });
    ledgerStore.record({
      id: "seed:gifted",
      currency: "spark",
      kind: "gifted",
      amount: -STARTING_SPARKS,
      say: "you gifted 50 sparks onward — your first give",
    });
  },
  /** REORDER = PRIORITISE. Position #1 is what the Living G shows. */
  moveItem(category: Category, index: number, delta: number) {
    itemsStore.move(ME_ID, category, index, delta);
  },


  /* ---- SPARKLES: earned, never bought, never awarded for a profile. ---- */
  /** Spend one sparkle on somebody ELSE's active community item. */
  useSparkle(itemId: string): { ok: boolean; reason?: string } {
    hydrate();
    if (person.sparkles < 1) return { ok: false, reason: "none" };
    const result = itemsStore.boost(itemId, ME_ID);
    if (!result.ok) return result;
    savePerson({ ...person, sparkles: person.sparkles - 1 });
    ledgerStore.record({
      currency: "sparkle",
      kind: "spent",
      amount: -1,
      say: "you helped somebody else get seen",
      itemId,
    });
    return { ok: true };
  },

};

/** Sparks currently held inside my open wishes — visible, never hidden. */
export const reservedTotal = (p: MyProfile) =>
  Object.values(p.reserved).reduce((sum, n) => sum + n, 0);

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
    /* MY OWN PROFILE READS EXACTLY LIKE ANYONE ELSE'S — same fields, my data. */
    age: (() => {
      const years = ageFrom(p.birthday);
      return years === null ? "" : String(years);
    })(),
    gender: p.gender,

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
      /* THE OPENING GIFT WAS A REAL GIVE: the 50 sparks passed to a real person
         count exactly once, alongside everything completed since. */
      gifts: p.completed.give.length + (p.sparksSeeded ? 1 : 0),

      wishes: p.completed.wish.length,
      trades: p.completed.trade.length,
      borrows: p.completed.borrow.length,
    },
    connections: [],
  };
}

/** MY picture, or nothing at all. There is never a stand-in person here. */
export const myPhoto = (p: MyProfile) => p.photo;
