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
import { giveCapState } from "@/data/give-cap";
import {
  SESSION_CAP_PER_CONNECTION,
  SESSION_CAP_PER_WEEK,
  cadencePeriod,
  creditWeek,
  periodKey,
} from "@/data/give-sessions";

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

/**
 * ONE LESSON / SESSION OF A REPEATING GIVE (give-sessions.ts). The same
 * claim → confirm pattern as a connection, but it never completes the give:
 * the connection stays open for the next one. One per cadence period.
 */
export type GiveSession = {
  id: string;
  connectionId: string;
  /** "week:2026-09-28" — at most one counted session per period. */
  period: string;
  claimedBy: string;
  confirmedBy: string[];
  state: "awaiting" | "verified" | "disputed";
  /** Giver added sparks for it (false when a cap was reached). */
  credited: boolean;
  creditedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export const MESSAGE_MAX = 280;

type State = {
  connections: Connection[];
  messages: Message[];
  past: PastConnection[];
  sessions: GiveSession[];
};

const KEY = "giver.connections.v1";
const EMPTY: State = { connections: [], messages: [], past: [], sessions: [] };

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
      sessions: parsed.sessions ?? [],
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

/* ------------------------------ GIVE SESSIONS ------------------------------ */

/** How often this connection's give repeats, or null for a one-time give. */
export function sessionPeriodOf(c: Connection) {
  if (c.type !== "give") return null;
  const item = itemsStore.get().items.find((i) => i.id === c.itemId);
  return cadencePeriod(item?.details?.cadence);
}

/** A repeating give's connection counts lessons instead of settling once. */
export const isRepeatingGiveConnection = (c: Connection) => sessionPeriodOf(c) !== null;

export const sessionKey = (s: Pick<GiveSession, "connectionId" | "period">) =>
  `session:${s.connectionId}:${s.period}`;

/**
 * THE CAPS. A confirmed session earns sparks only while this connection has
 * fewer than SESSION_CAP_PER_CONNECTION credited sessions and the giver fewer
 * than SESSION_CAP_PER_WEEK credited sessions this week across all gives.
 */
function mayCredit(s: State, c: Connection, now: number): boolean {
  const credited = s.sessions.filter((x) => x.credited);
  if (credited.filter((x) => x.connectionId === c.id).length >= SESSION_CAP_PER_CONNECTION)
    return false;
  const owners = new Map(s.connections.map((x) => [x.id, x.ownerId]));
  const week = creditWeek(now);
  const thisWeek = credited.filter(
    (x) => owners.get(x.connectionId) === c.ownerId && creditWeek(x.creditedAt ?? x.updatedAt) === week,
  );
  return thisWeek.length < SESSION_CAP_PER_WEEK;
}

/**
 * THE GIVER'S SPARKS FOR A SESSION land on the giver's own device, through the
 * same earnSparks / rewarded-key path as every other spark — so the same
 * lesson can never pay twice, even after a reload or on a second phone.
 */
function creditMine(s: State) {
  const owners = new Map(s.connections.map((x) => [x.id, x.ownerId]));
  for (const x of s.sessions)
    if (x.state === "verified" && x.credited && owners.get(x.connectionId) === ME_ID)
      myProfileStore.earnSparks(sessionKey(x));
}

export const connectionsStore = {
  mergeCloud(connections: Connection[]) {
    const s = ensure();
    const cloudIds = new Set(connections.map((connection) => connection.id));
    const localOnly = s.connections.filter((connection) => !/^[0-9a-f-]{36}$/i.test(connection.id) && !cloudIds.has(connection.id));
    const past: PastConnection[] = connections.filter((connection) => connection.state === "verified").map((connection) => ({
      id: `past:${connection.id}`,
      connectionId: connection.id,
      itemId: connection.itemId,
      type: connection.type,
      withId: otherParty(connection),
      text: itemsStore.get().items.find((item) => item.id === connection.itemId)?.text ?? "a giver connection",
      at: connection.settledAt ?? connection.updatedAt,
    }));
    commit({ ...s, connections: [...connections, ...localOnly], past });
  },
  /** Sessions read from give_sessions (only once that sql is applied). */
  mergeCloudSessions(sessions: GiveSession[]) {
    const s = ensure();
    const localOnly = s.sessions.filter((x) => !/^[0-9a-f-]{36}$/i.test(x.connectionId));
    const next = { ...s, sessions: [...sessions, ...localOnly] };
    commit(next);
    creditMine(next);
  },

  /**
   * "THIS LESSON HAPPENED." One person's word for the current period. Refused
   * when this period already has a confirmed session.
   */
  claimSession(connectionId: string, byId = ME_ID, now = Date.now()): { ok: boolean; reason?: string } {
    const s = ensure();
    const c = s.connections.find((x) => x.id === connectionId);
    if (!c) return { ok: false, reason: "gone" };
    const period = sessionPeriodOf(c);
    if (!period) return { ok: false, reason: "not repeating" };
    if (c.state === "cancelled" || c.state === "verified") return { ok: false, reason: "stage" };
    if (!partiesOf(c).includes(byId)) return { ok: false, reason: "party" };
    /* One question at a time: an unanswered claim is still the open one. */
    if (s.sessions.some((x) => x.connectionId === c.id && x.state === "awaiting")) return { ok: true };
    const key = periodKey(period, now);
    const existing = s.sessions.find((x) => x.connectionId === c.id && x.period === key);
    if (existing?.state === "verified") return { ok: false, reason: "period" };
    const session: GiveSession = existing
      ? { ...existing, state: "awaiting", claimedBy: byId, confirmedBy: [byId], updatedAt: now }
      : {
          id: uid(),
          connectionId: c.id,
          period: key,
          claimedBy: byId,
          confirmedBy: [byId],
          state: "awaiting",
          credited: false,
          createdAt: now,
          updatedAt: now,
        };
    commit({
      ...s,
      sessions: existing
        ? s.sessions.map((x) => (x.id === existing.id ? session : x))
        : [...s.sessions, session],
    });
    return { ok: true };
  },

  /**
   * "DID THIS LESSON HAPPEN?" The other person answers. Yes = the session is
   * verified and, within the caps, giver adds sparks to the giver. No = it is
   * parked as disputed and nothing moves. The connection stays open either way.
   */
  respondSession(
    connectionId: string,
    agrees: boolean,
    byId = ME_ID,
    now = Date.now(),
  ): { ok: boolean; credited?: boolean; reason?: string } {
    const s = ensure();
    const c = s.connections.find((x) => x.id === connectionId);
    if (!c) return { ok: false, reason: "gone" };
    const session = s.sessions.find((x) => x.connectionId === c.id && x.state === "awaiting");
    if (!session) return { ok: false, reason: "state" };
    if (!partiesOf(c).includes(byId)) return { ok: false, reason: "party" };
    if (session.claimedBy === byId) return { ok: false, reason: "self" };
    const next: GiveSession = agrees
      ? (() => {
          const credited = mayCredit(s, c, now);
          return {
            ...session,
            state: "verified",
            confirmedBy: Array.from(new Set([...session.confirmedBy, byId])),
            credited,
            ...(credited ? { creditedAt: now } : {}),
            updatedAt: now,
          };
        })()
      : { ...session, state: "disputed", confirmedBy: [], updatedAt: now };
    const nextState = { ...s, sessions: s.sessions.map((x) => (x.id === session.id ? next : x)) };
    commit(nextState);
    if (agrees) creditMine(nextState);
    return { ok: true, credited: next.credited };
  },
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
    /* THE THREE-GIVES CAP (client-side; server version unapplied). */
    if (
      item.type === "give" &&
      byId === ME_ID &&
      !s.connections.some((c) => c.itemId === itemId && c.helperId === byId && isOpen(c)) &&
      giveCapState(s.connections, itemsStore.get().items, ME_ID).capped
    )
      return { ok: false, reason: "cap" };

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
  /**
   * SHARED DEV BUILD: a conversation that started on somebody else's device.
   * The connection is the same concept, simply learned about from the database
   * rather than created here. Returns the local connection id.
   */
  ingest(input: {
    itemId: string;
    type: ItemType;
    ownerId: string;
    helperId: string;
  }): string {
    const s = ensure();
    const existing = s.connections.find(
      (c) =>
        c.itemId === input.itemId &&
        c.ownerId === input.ownerId &&
        c.helperId === input.helperId,
    );
    if (existing) return existing.id;
    const now = Date.now();
    const connection: Connection = {
      id: uid(),
      itemId: input.itemId,
      type: input.type,
      ownerId: input.ownerId,
      helperId: input.helperId,
      state: "connecting",
      confirmedBy: [],
      ...(input.type === "borrow" ? { handedOver: false, returned: false } : {}),
      createdAt: now,
      updatedAt: now,
    };
    commit({ ...s, connections: [...s.connections, connection] });
    return connection.id;
  },

  /** A MESSAGE THAT ARRIVED FROM SOMEBODY ELSE. Never re-sent to the cloud. */
  receive(connectionId: string, fromId: string, text: string, at: number) {
    const s = ensure();
    if (!s.connections.some((c) => c.id === connectionId)) return;
    if (s.messages.some((m) => m.connectionId === connectionId && m.fromId === fromId && m.at === at))
      return;
    const message: Message = { id: uid(), connectionId, fromId, text, at };
    commit({ ...s, messages: [...s.messages, message].sort((a, b) => a.at - b.at) });
  },

  cancel(connectionId: string) {

    const s = ensure();
    commit({
      ...s,
      connections: s.connections.map((c) =>
        c.id === connectionId && c.state !== "verified"
          ? { ...c, state: "cancelled", confirmedBy: [], updatedAt: Date.now() }
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
  const lessons = new Set(
    s.sessions.filter((x) => x.state === "awaiting" && x.claimedBy !== meId).map((x) => x.connectionId),
  );
  return s.connections.filter(
    (c) =>
      partiesOf(c).includes(meId) &&
      ((c.state === "awaiting" && c.claimedBy !== meId) || (isOpen(c) && lessons.has(c.id))),
  );
}

/** The sessions of one connection, oldest first. */
export function sessionsOf(s: State, connectionId: string) {
  return s.sessions
    .filter((x) => x.connectionId === connectionId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * WHAT IS WAITING FOR ME IN MY INBOX. A conversation counts as unread when the
 * last thing said in it came from the other person, or when it is asking me to
 * confirm. Read-only derivation: message persistence is untouched.
 */
export function unreadCount(s: State, meId = ME_ID) {
  const waiting = new Set(needsMyAnswer(s, meId).map((c) => c.id));
  for (const c of myConnections(s, meId)) {
    const thread = messagesOf(s, c.id);
    const last = thread[thread.length - 1];
    if (last && last.fromId !== meId) waiting.add(c.id);
  }
  return waiting.size;
}

export const STATE_WORD: Record<ConnectionState, string> = {
  connecting: "connecting",
  awaiting: "awaiting confirmation",
  verified: "verified",
  disputed: "unresolved",
  cancelled: "cancelled",
};

/**
 * EARNED CONNECTIONS. A connection is NOT a follow, a message or a viewed
 * profile: it is created the moment a qualifying interaction reaches its
 * completed, mutually verified state — and it is mutual at that instant.
 * Anything still in motion (connecting, awaiting, disputed) counts for nothing.
 */
export function earnedConnectionIds(s: State, meId = ME_ID): string[] {
  const ids = new Set<string>();
  for (const p of s.past) if (p.withId && p.withId !== meId) ids.add(p.withId);
  return Array.from(ids);
}
