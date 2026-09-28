/**
 * FUND — MONEY PLEDGED TOWARD SOMEONE ELSE'S EXISTING WISH.
 *
 * One member contributes an amount toward another member's Wish; many people
 * can chip in. The funder does not need to know the recipient and provides no
 * item. Fund ATTACHES TO a Wish — it is not a Give, Lend/Borrow, Trade or
 * communi-g, and it never replaces the Wish itself.
 *
 * STORAGE mirrors the item layer (src/data/items.ts): one local collection,
 * persisted to localStorage, read through useSyncExternalStore.
 * Cloud: supabase/migrations/20260927150000_wish_contributions.sql defines the
 * matching table + RLS. TODO(fund-sync): push/pull like items-sync.ts once
 * that migration is applied — it is NOT applied yet, so nothing syncs.
 *
 * LOOPHOLES, CLOSED BY CONSTRUCTION:
 *   - SPARKS: this module never imports my-profile / ledger. A pledge grants,
 *     moves, reserves or spends NO sparks. Money is not sparks.
 *   - GIVE: contributions live in their own store, never in itemsStore, so
 *     they cannot satisfy hasActiveGive (community-access.ts) and never
 *     reach give counts (done.gifts / completed gives).
 *   - WISH RULES: every pledge goes through checkContribution (fund-rules.ts).
 *   - COMPLETION: nothing here ever calls itemsStore.complete/setStatus. A
 *     Wish can only show "fully funded"; completion stays with the Wish flow.
 *   - PAYMENT: no processor. status is "pledged" only.
 *     TODO(payment-rails): charge through a real processor; never fake one.
 */

import { ME_ID, itemsStore, type Item, type ItemsState } from "@/data/items";
import {
  FUND_CURRENCY,
  checkContribution,
  validTarget,
  type Cents,
  type FundCheck,
} from "@/data/fund-rules";

export type Contribution = {
  id: string;
  /** The Wish (Item.id) this money is pledged toward. */
  wishId: string;
  /** Who pledged. Never the Wish's owner. */
  funderId: string;
  /** Integer cents, $1 … $10,000. */
  amountCents: Cents;
  currency: string;
  /** Only "pledged" exists until payment rails do (TODO(payment-rails)). */
  status: "pledged";
  createdAt: number;
};

export type FundState = { contributions: Contribution[] };

const KEY = "giver.contributions.v1";
const EMPTY: FundState = { contributions: [] };

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * SAMPLE PLEDGES — demo only, like the seeded sample items. They sit on the one
 * sample Wish that states a money cost (see FIXTURE_FUND_TARGET in items.ts),
 * so a new person can see several people chipping in toward one target.
 */
function seedContributions(): Contribution[] {
  const at = Date.now() - 2 * 86400000;
  return [
    { funder: "giulia", cents: 4000 },
    { funder: "marcus", cents: 2500 },
    { funder: "sofia", cents: 1500 },
  ].map((s, i) => ({
    id: `seed-fund-robin-wish-3-${s.funder}`,
    wishId: "seed-robin-wish-3",
    funderId: s.funder,
    amountCents: s.cents,
    currency: FUND_CURRENCY,
    status: "pledged" as const,
    createdAt: at + i * 3600000,
  }));
}

function read(): FundState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const stored = raw ? ((JSON.parse(raw) as Partial<FundState>).contributions ?? []) : [];
    const known = new Set(stored.map((c) => c.id));
    const fresh = seedContributions().filter((c) => !known.has(c.id));
    return { contributions: [...stored, ...fresh] };
  } catch {
    return { contributions: seedContributions() };
  }
}

let state: FundState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function ensure() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
  return state;
}

function commit(next: FundState) {
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

/* ------------------------------ SELECTORS ------------------------------ */

/** A Wish's stated money cost (integer cents), or null when it has none. */
export const wishTarget = (item: Pick<Item, "details">): Cents | null =>
  validTarget(item.details?.fundTarget);

export function contributionsFor(s: FundState, wishId: string) {
  return s.contributions.filter((c) => c.wishId === wishId);
}

/** Running total pledged toward one Wish, by everyone. */
export function fundedTotal(s: FundState, wishId: string): Cents {
  return contributionsFor(s, wishId).reduce((sum, c) => sum + c.amountCents, 0);
}

/** How many distinct people have chipped in. Names are never exposed here. */
export function contributorCount(s: FundState, wishId: string): number {
  return new Set(contributionsFor(s, wishId).map((c) => c.funderId)).size;
}

/** My pledges, newest first. */
export function myContributions(s: FundState, funderId = ME_ID) {
  return s.contributions
    .filter((c) => c.funderId === funderId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * WISHES I COULD FUND: someone else's active, published Wish. The same
 * collection communi-g reads — Fund never has its own copy of a Wish.
 */
export function fundableWishes(items: ItemsState, funderId = ME_ID): Item[] {
  return items.items
    .filter(
      (i) =>
        i.type === "wish" && i.status === "active" && i.published && i.ownerId !== funderId,
    )
    .sort((a, b) => {
      /* Wishes that state a cost come first — they are the ones money answers. */
      const ta = wishTarget(a) !== null ? 0 : 1;
      const tb = wishTarget(b) !== null ? 0 : 1;
      return ta - tb || b.createdAt - a.createdAt;
    });
}

/* -------------------------------- STORE -------------------------------- */

export const fundStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): FundState {
    return ensure();
  },
  /** SSR snapshot — never localStorage. */
  getServer(): FundState {
    return EMPTY;
  },

  /** Would this pledge be accepted? Same answer contribute() gives. */
  check(wishId: string, amountCents: number, funderId = ME_ID): FundCheck {
    const item = itemsStore.get().items.find((i) => i.id === wishId);
    return checkContribution({
      wish: item
        ? {
            ownerId: item.ownerId,
            type: item.type,
            status: item.status,
            published: item.published,
            target: wishTarget(item),
          }
        : undefined,
      funderId,
      amountCents,
      fundedCents: fundedTotal(ensure(), wishId),
    });
  },

  /**
   * RECORD A PLEDGE. No money moves, no sparks move, no Wish status changes —
   * a single record is appended, and only if every rule agrees.
   */
  contribute(
    wishId: string,
    amountCents: number,
    funderId = ME_ID,
  ): FundCheck & { contribution?: Contribution } {
    const verdict = fundStore.check(wishId, amountCents, funderId);
    if (!verdict.ok) return verdict;
    const contribution: Contribution = {
      id: uid(),
      wishId,
      funderId,
      amountCents,
      currency: FUND_CURRENCY,
      status: "pledged",
      createdAt: Date.now(),
    };
    const s = ensure();
    commit({ contributions: [...s.contributions, contribution] });
    return { ok: true, contribution };
  },
};
