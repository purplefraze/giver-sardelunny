import type { BorrowSide, ItemDetails, ItemType } from "@/data/items";

/**
 * DRAFTS ARE DATA TOO.
 *
 * A half-finished give is still something the person typed, so it survives
 * navigation and reload exactly like a finished record does. The moment a draft
 * is complete enough to be real it becomes ONE Item (see CategoryForm), and
 * `liveId` remembers which record this draft is already saved as — so a draft
 * can never quietly create a second copy of itself.
 */

export type Draft = {
  text: string;
  want: string;
  note: string;
  side: BorrowSide;
  photos: string[];
  details: ItemDetails;
  /** The real record this draft has already been saved as, if any. */
  liveId: string | null;
};

export const EMPTY_DRAFT: Draft = {
  text: "",
  want: "",
  note: "",
  side: "borrow",
  photos: [],
  details: {},
  liveId: null,
};

const KEY = "giver.drafts.v1";

type Drafts = Partial<Record<ItemType, Draft>>;

function read(): Drafts {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Drafts) : {};
  } catch {
    return {};
  }
}

function write(next: Drafts) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* prototype persistence is best-effort */
  }
}

export const draftsStore = {
  get(type: ItemType): Draft {
    return { ...EMPTY_DRAFT, ...(read()[type] ?? {}) };
  },
  set(type: ItemType, draft: Draft) {
    write({ ...read(), [type]: draft });
  },
  clear(type: ItemType) {
    const all = read();
    delete all[type];
    write(all);
  },
  clearAll() {
    write({});
  },
};
