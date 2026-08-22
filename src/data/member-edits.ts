import type { Member } from "@/data/giver";

/**
 * DEVELOPER / ADMIN OVERRIDES FOR SAMPLE PEOPLE.
 *
 * The four sample members are written in code, but a developer must be able to
 * correct any of their words without a code change. Every admin edit is stored
 * HERE, as a sparse patch per person, and applied on top of the written record
 * by src/data/giver.ts — so there is still exactly ONE Member projection that
 * every profile, feed, detail page and count reads from.
 *
 * Nothing in the end-user experience writes to this store: it is only ever
 * touched from the admin editors behind the developer switch.
 */

export type MemberPatch = Partial<Member>;

export type MemberEdits = Record<string, MemberPatch>;

const KEY = "giver.admin.member-edits.v1";

let state: MemberEdits = {};
let hydrated = false;
const listeners = new Set<() => void>();

function read(): MemberEdits {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as MemberEdits) ?? {}) : {};
  } catch {
    return {};
  }
}

function ensure() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

function commit(next: MemberEdits) {
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

export const memberEditsStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): MemberEdits {
    return ensure();
  },
  /** SSR reads the written record, never a browser-only override. */
  getServer(): MemberEdits {
    /* ONE frozen snapshot: a fresh object here loops forever on the server. */
    return NO_EDITS;
  },

  /** EDIT ONE PERSON. Every view of them updates with it. */
  patch(id: string, fields: MemberPatch) {
    const s = ensure();
    commit({ ...s, [id]: { ...(s[id] ?? {}), ...fields } });
  },

  /** BACK TO THE WRITTEN RECORD, for one person or for everybody. */
  reset(id: string) {
    const s = ensure();
    const next = { ...s };
    delete next[id];
    commit(next);
  },

  resetAll() {
    commit({});
  },
};
