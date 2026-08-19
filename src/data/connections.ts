/**
 * THE CONNECTION LAYER — INTENT IS NOT COMPLETION.
 *
 * Everything between "I think I can help" and "we both agree it happened"
 * lives here, as SEPARATE, PERSISTED concepts:
 *
 *   ACTIVITY            src/data/items.ts (never deleted by someone's interest)
 *   INTENT / CONNECTION a pending link between two people        (this file)
 *   CONVERSATION        the messages they exchange               (this file)
 *   COMPLETION CLAIM    one person says it happened              (this file)
 *   VERIFICATION        the other person agrees                  (this file)
 *   SPARK SETTLEMENT    Giver pays, exactly once, after that     (this file)
 *   PAST CONNECTION     the history of what actually happened    (this file)
 *
 * No single boolean anywhere. Pressing an intent button can never complete an
 * activity, close it, or pay anybody.
 */

import { ME_ID, itemsStore, type ItemType } from "@/data/items";
import { myProfileStore } from "@/data/my-profile";

export type ConnectionState =
  /** Intent expressed. Messaging is open. The activity is STILL ACTIVE. */
  | "connecting"
  /** One person claims it happened. The other has not answered yet. */
  | "awaiting"
  /** Both people agreed it happened. The only state that ever pays. */
  | "verified"
  /** They disagree. Nothing is fulfilled, nothing is paid, they keep talking. */
  | "disputed"
  /** It did not work out. The activity returns to ACTIVE for someone else. */
  | "cancelled";

export type Connection = {
  id: string;
  itemId: string;
  type: ItemType;
  /** Who posted the activity. */
  ownerId: string;
  /** Who stepped forward to help. */
  helperId: string;
  state: ConnectionState;
  /** Who said it was completed (a claim, never a completion). */
  claimedBy?: string;
  /** Everyone who has confirmed it truly happened. */
  confirmedBy: string[];
  /** BORROW ONLY: the lending cycle is not the same as the handover. */
  handedOver?: boolean;
  returned?: boolean;
  /** Set the moment sparks settle, so they can never settle twice. */
  settledAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  connectionId: string;
  fromId: string;
  text: string;
  at: number;
};

/** WHAT ACTUALLY HAPPENED. Written only by mutual verification. */
export type PastConnection = {
  id: string;
  connectionId: string;
  itemId: string;
  type: ItemType;
  /** The other person in it. */
  withId: string;
  text: string;
  at: number;
};

export const MESSAGE_MAX = 280;

type State = {
  connections: Connection[];
  messages: Message[];
  past: PastConnection[];
};

const KEY = "giver.connections.v1";
const EMPTY: State = { connections: [], messages: [], past: [] };

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let state: State = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      connections: parsed.connections ?? [],
      messages: parsed.messages ?? [],
      past: parsed.past ?? [],
    };
  } catch {
    return EMPTY;
  }
}

function commit(next: State) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* best effort */
    }
  }
  for (const l of listeners) l();
}

function ensure(): State {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

/**
 * WHO WAS GENEROUS. Only the generous side of a verified interaction is
 * recognised by Giver, and only once the two people agree it happened.
 *   wish   — the granter gave
 *   give   — the poster gave
 *   trade  — both gave
 *   borrow — the lender gave
 */
export function generousIds(c: Connection): string[] {
  if (c.type === "give") return [c.ownerId];
  if (c.type === "trade") return [c.ownerId, c.helperId];
  return [c.helperId];
}

/** Both sides of a connection, in no particular order. */
export const partiesOf = (c: Connection) => [c.ownerId, c.helperId];

export const otherParty = (c: Connection, meId = ME_ID) =>
  c.ownerId === meId ? c.helperId : c.ownerId;

/** A connection that is still in play — messaging is open. */
export const isOpen = (c: Connection) =>
  c.state === "connecting" || c.state === "awaiting" || c.state === "disputed";

/**
 * BORROWING IS NOT COMPLETE AT PICKUP. Until the item has been handed over AND
 * returned, nobody may even CLAIM the borrow is finished.
 */
export const canClaim = (c: Connection) =>
  (c.state === "connecting" || c.state === "disputed") &&
  (c.type !== "borrow" || (c.handedOver === true && c.returned === true));

function touch(c: Connection, fields: Partial<Connection>): Connection {
  return { ...c, ...fields, updatedAt: Date.now() };
}

/**
 * THE ONLY PLACE GENEROSITY IS EVER PAID FOR.
 * Requires: state === verified, both parties confirmed, never settled before.
 */
function settle(c: Connection): Connection {
  if (c.settledAt) return c;
  const bothAgree = partiesOf(c).every((p) => c.confirmedBy.includes(p));
  if (c.state !== "verified" || !bothAgree) return c;

  const item = itemsStore.get().items.find((i) => i.id === c.itemId);
  const text = item?.text ?? "a giver connection";

  /* Giver recognises the generous side — once per connection, per person. */
  for (const id of generousIds(c)) {
    if (id === ME_ID) myProfileStore.earnSparks(`connection:${c.id}:${id}`);
  }
  /* A wish's reserved sparks have now done their job. */
  if (c.type === "wish") myProfileStore.releaseWish(c.itemId, false);

  /* The activity is resolved: it leaves discovery and becomes history. */
  itemsStore.complete(c.itemId);

  const past: PastConnection = {
    id: uid(),
    connectionId: c.id,
    itemId: c.itemId,
    type: c.type,
    withId: otherParty(c),
    text,
    at: Date.now(),
  };
  const s = ensure();
  const settled = touch(c, { settledAt: Date.now() });
  commit({
    ...s,
    connections: s.connections.map((x) => (x.id === c.id ? settled : x)),
    past: s.past.some((p) => p.connectionId === c.id) ? s.past : [...s.past, past],
  });
  return settled;
}

export const connectionsStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): State {
    return ensure();
  },
  /** SSR snapshot — never localStorage. */
  getServer(): State {
    return EMPTY;
  },

  /**
   * EXPRESS INTENT. This is the BEGINNING of something: it opens messaging and
   * nothing else. It does not complete, close, remove or pay for anything, and
   * the activity stays visible in the community for other people too.
   */
  expressIntent(itemId: string, byId = ME_ID): { ok: boolean; id?: string; reason?: string } {
    const s = ensure();
    const item = itemsStore.get().items.find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: "gone" };
    if (item.ownerId === byId) return { ok: false, reason: "self" };
    if (item.status !== "active") return { ok: false, reason: "closed" };

    const existing = s.connections.find(
      (c) => c.itemId === itemId && c.helperId === byId && isOpen(c),
    );
    if (existing) return { ok: true, id: existing.id };

    const now = Date.now();
    const connection: Connection = {
      id: uid(),
      itemId,
      type: item.type,
      ownerId: item.ownerId,
      helperId: byId,
      state: "connecting",
      confirmedBy: [],
      ...(item.type === "borrow" ? { handedOver: false, returned: false } : {}),
      createdAt: now,
      updatedAt: now,
    };
    commit({ ...s, connections: [...s.connections, connection] });
    return { ok: true, id: connection.id };
  },

  /** COORDINATE. Messages persist — a conversation is never temporary. */
  send(connectionId: string, text: string, fromId = ME_ID) {
    const body = text.trim().slice(0, MESSAGE_MAX);
    if (!body) return;
    const s = ensure();
    const c = s.connections.find((x) => x.id === connectionId);
    if (!c || c.state === "cancelled") return;
    const message: Message = {
      id: uid(),
      connectionId,
      fromId,
      text: body,
      at: Date.now(),
    };
    commit({ ...s, messages: [...s.messages, message] });
  },

  /** BORROW: the physical cycle, tracked separately from completion. */
  setBorrowStage(connectionId: string, stage: "handedOver" | "returned", value: boolean) {
    const s = ensure();
    commit({
      ...s,
      connections: s.connections.map((c) =>
        c.id === connectionId && c.type === "borrow" ? touch(c, { [stage]: value }) : c,
      ),
    });
  },

  /**
   * A COMPLETION CLAIM — one person's word, not a completion. The other person
   * is asked "did this happen?" and nothing settles until they answer yes.
   */
  claimComplete(connectionId: string, byId = ME_ID): { ok: boolean; reason?: string } {
    const s = ensure();
    const c = s.connections.find((x) => x.id === connectionId);
    if (!c) return { ok: false, reason: "gone" };
    if (!canClaim(c)) return { ok: false, reason: "stage" };
    if (!partiesOf(c).includes(byId)) return { ok: false, reason: "party" };
    commit({
      ...s,
      connections: s.connections.map((x) =>
        x.id === c.id
          ? touch(x, { state: "awaiting", claimedBy: byId, confirmedBy: [byId] })
          : x,
      ),
    });
    return { ok: true };
  },

  /**
   * VERIFICATION. Both people must agree. "no" NEVER decides who is right: it
   * parks the interaction as disputed and leaves the conversation open.
   */
  respond(connectionId: string, agrees: boolean, byId = ME_ID): { ok: boolean; reason?: string } {
    const s = ensure();
    const c = s.connections.find((x) => x.id === connectionId);
    if (!c) return { ok: false, reason: "gone" };
    if (c.state !== "awaiting") return { ok: false, reason: "state" };
    if (!partiesOf(c).includes(byId)) return { ok: false, reason: "party" };
    if (c.claimedBy === byId) return { ok: false, reason: "self" };

    if (!agrees) {
      commit({
        ...s,
        connections: s.connections.map((x) =>
          x.id === c.id ? touch(x, { state: "disputed", confirmedBy: [] }) : x,
        ),
      });
      return { ok: true };
    }

    const confirmedBy = Array.from(new Set([...c.confirmedBy, byId]));
    const verified = touch(c, { state: "verified", confirmedBy });
    commit({
      ...s,
      connections: s.connections.map((x) => (x.id === c.id ? verified : x)),
    });
    /* Only now — mutually verified, once, ever. */
    settle(verified);
    return { ok: true };
  },

  /**
   * CANCEL. The connection ends; the ACTIVITY DOES NOT. It stays active so
   * another giver can help, and nobody is paid.
   */
  cancel(connectionId: string) {
    const s = ensure();
    commit({
      ...s,
      connections: s.connections.map((c) =>
        c.id === connectionId && c.state !== "verified"
          ? touch(c, { state: "cancelled", claimedBy: undefined, confirmedBy: [] })
          : c,
      ),
    });
  },
};

/* --------------------------------- QUERIES -------------------------------- */

export function connectionsForItem(s: State, itemId: string) {
  return s.connections.filter((c) => c.itemId === itemId);
}

/** The community status of an activity, derived — never a stored boolean. */
export type ActivityStatus = "active" | "connecting" | "completed";

export function activityStatus(
  s: State,
  itemId: string,
  itemStatus: string,
): ActivityStatus {
  if (itemStatus === "completed") return "completed";
  return connectionsForItem(s, itemId).some(isOpen) ? "connecting" : "active";
}

/** MY open connection on an activity, if I already stepped forward. */
export function myConnectionFor(s: State, itemId: string, meId = ME_ID) {
  return (
    s.connections.find(
      (c) => c.itemId === itemId && (c.ownerId === meId || c.helperId === meId) && isOpen(c),
    ) ?? null
  );
}

/** Every conversation I am part of, most recently active first. */
export function myConnections(s: State, meId = ME_ID) {
  return s.connections
    .filter((c) => c.ownerId === meId || c.helperId === meId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function messagesOf(s: State, connectionId: string) {
  return s.messages
    .filter((m) => m.connectionId === connectionId)
    .sort((a, b) => a.at - b.at);
}

export function myPastConnections(s: State) {
  return s.past.slice().sort((a, b) => b.at - a.at);
}

/** Anything waiting on ME right now: an unanswered "did this happen?". */
export function needsMyAnswer(s: State, meId = ME_ID) {
  return s.connections.filter(
    (c) => c.state === "awaiting" && c.claimedBy !== meId && partiesOf(c).includes(meId),
  );
}

export const STATE_WORD: Record<ConnectionState, string> = {
  connecting: "connecting",
  awaiting: "awaiting confirmation",
  verified: "verified",
  disputed: "unresolved",
  cancelled: "cancelled",
};
