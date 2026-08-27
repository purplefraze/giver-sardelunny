/**
 * THE WALL — WHAT PEOPLE SAY ABOUT SOMEBODY, ONCE THEY HAVE ACTUALLY MET.
 *
 * A compliment on Giver is not a review and not a rating. There are no stars,
 * no averages and no ranking: only sentences, left by people who have already
 * completed a give, a granted wish, a trade or a borrow with that person.
 *
 * EARNED, NEVER OPEN. Nothing can be written on a wall by a stranger; the
 * profile screen asks the connection store first. This module is only the
 * record, and it is the single author of it.
 */

const KEY = "giver.wall.v1";

export type Compliment = {
  id: string;
  /** Whose wall it is written on. */
  aboutId: string;
  /** Who wrote it. */
  fromId: string;
  text: string;
  at: number;
};

export type WallState = Record<string, Compliment[]>;

const EMPTY: WallState = Object.freeze({});

let state: WallState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): WallState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as WallState) ?? {}) : {};
  } catch {
    return {};
  }
}

function ensure(): WallState {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

function commit(next: WallState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* a full disk must never break a compliment */
    }
  }
  for (const l of listeners) l();
}

export const wallStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): WallState {
    return ensure();
  },
  getServer(): WallState {
    return EMPTY;
  },
  /** ONE VOICE, ONE LINE: writing again replaces what that person said before. */
  say(aboutId: string, fromId: string, text: string) {
    const said = text.trim().slice(0, 160);
    const s = ensure();
    const wall = (s[aboutId] ?? []).filter((c) => c.fromId !== fromId);
    if (!said) {
      commit({ ...s, [aboutId]: wall });
      return;
    }
    commit({
      ...s,
      [aboutId]: [
        { id: `${aboutId}-${fromId}`, aboutId, fromId, text: said, at: Date.now() },
        ...wall,
      ],
    });
  },
};

/** THE WALL, NEWEST FIRST. */
export const wallOf = (s: WallState, aboutId: string): Compliment[] =>
  [...(s[aboutId] ?? [])].sort((a, b) => b.at - a.at);

/** WHAT I ALREADY SAID ABOUT THEM, if anything. */
export const myCompliment = (s: WallState, aboutId: string, fromId: string) =>
  (s[aboutId] ?? []).find((c) => c.fromId === fromId)?.text ?? "";
