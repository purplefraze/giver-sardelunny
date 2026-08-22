/**
 * THE LEDGER — EVERY SPARK AND EVERY SPARKLE HAS A STORY.
 *
 * Sparks and sparkles are not counters: they are the trace of what a person has
 * done. One append-only event log, deliberately open-ended, so new kinds of
 * movement (gifts, refunds, rewards, future economies) can be recorded without
 * touching a single screen.
 */

export type Currency = "spark" | "sparkle";

export type LedgerKind =
  | "received"
  | "gifted"
  | "spent"
  | "reserved"
  | "returned"
  | "earned";

export type LedgerEvent = {
  id: string;
  at: number;
  currency: Currency;
  kind: LedgerKind;
  /** Signed: what the balance actually did. */
  amount: number;
  /** One short human line — what this movement was. */
  say: string;
  /** Where it came from or went, when that is known. */
  itemId?: string;
  personId?: string;
};

const KEY = "giver.ledger.v1";

const NO_EVENTS: LedgerEvent[] = Object.freeze([]) as LedgerEvent[];

let events: LedgerEvent[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function read(): LedgerEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LedgerEvent[]) : [];
  } catch {
    return [];
  }
}

function hydrate() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    events = read();
  }
}

function commit(next: LedgerEvent[]) {
  events = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* best effort persistence */
    }
  }
  for (const l of listeners) l();
}

export const ledgerStore = {
  subscribe(listener: () => void) {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): LedgerEvent[] {
    hydrate();
    return events;
  },
  getServer(): LedgerEvent[] {
    /* ONE frozen snapshot: a fresh array here loops forever on the server. */
    return NO_EVENTS;
  },
  /** RECORD ONE MOVEMENT. Idempotent when an id is supplied. */
  record(event: Omit<LedgerEvent, "id" | "at"> & { id?: string; at?: number }) {
    hydrate();
    const id =
      event.id ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (events.some((e) => e.id === id)) return;
    commit([{ ...event, id, at: event.at ?? Date.now() }, ...events]);
  },
  reset() {
    hydrated = true;
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    commit([]);
  },
};

export const eventsOf = (all: LedgerEvent[], currency: Currency) =>
  all.filter((e) => e.currency === currency).sort((a, b) => b.at - a.at);

/** A movement reads with its own sign, always. */
export const signed = (amount: number) =>
  `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${Math.abs(amount)}`;

/** Plain, human time. Never a timestamp. */
export function whenWord(at: number, now = Date.now()): string {
  const mins = Math.round((now - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toLowerCase();
}
