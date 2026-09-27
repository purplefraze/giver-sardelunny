/**
 * THE THREE-GIVES CAP — CLIENT-SIDE ONLY FOR NOW.
 * (Server version: supabase/unapplied/20260928_give_trust.sql — NOT applied.)
 *
 * Browsing is always open. What the cap blocks is ACTING on someone else's
 * give: applying / expressing interest, messaging the giver, requesting.
 *
 *   ACCEPTED = a give connection where I am the helper (the recipient) and it
 *              was not cancelled. Starting one (connectionsStore.expressIntent
 *              / startConnection) IS the accept.
 *   COUNTER  = accepted gives created since my counter last reset.
 *   RESET    = the moment the recipient of one of MY OWN gives confirms they
 *              got it (they are in that connection's confirmedBy — the
 *              existing claim/confirm step, shown to them as "got it").
 *              Posted, unmatched, expired or cancelled gives never reset it.
 *   CAPPED   = counter ≥ 3.
 *   WAITING  = capped, and I have a give out there (posted and live, or
 *              matched but not yet received).
 *
 * Pure: pass in the connections and items; no store imports (no cycles).
 */
import type { Item } from "./items";

export const GIVE_CAP = 3;

type Conn = {
  itemId: string;
  type: string;
  ownerId: string;
  helperId: string;
  state: string;
  confirmedBy: string[];
  settledAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type GiveCapState = {
  accepted: number;
  capped: boolean;
  waiting: boolean;
  resetAt: number;
};

export function giveCapState(
  connections: readonly Conn[],
  items: readonly Item[],
  me: string,
  now = Date.now(),
): GiveCapState {
  /* The last time someone confirmed they received one of MY gives. */
  const received = connections.filter(
    (c) => c.type === "give" && c.ownerId === me && c.confirmedBy.includes(c.helperId),
  );
  const resetAt = received.reduce((t, c) => Math.max(t, c.settledAt ?? c.updatedAt), 0);
  const accepted = connections.filter(
    (c) =>
      c.type === "give" &&
      c.helperId === me &&
      c.ownerId !== me &&
      c.state !== "cancelled" &&
      c.createdAt > resetAt,
  ).length;
  const capped = accepted >= GIVE_CAP;
  const myLiveGive = items.some(
    (i) =>
      i.ownerId === me &&
      i.type === "give" &&
      i.status === "active" &&
      !(i.details?.expiresAt && Date.parse(i.details.expiresAt) < now),
  );
  const matchedNotReceived = connections.some(
    (c) =>
      c.type === "give" &&
      c.ownerId === me &&
      c.state !== "cancelled" &&
      !c.confirmedBy.includes(c.helperId),
  );
  return { accepted, capped, waiting: capped && (myLiveGive || matchedNotReceived), resetAt };
}
