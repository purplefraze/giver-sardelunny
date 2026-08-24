import type { ItemType } from "@/data/items";

/**
 * THE ONE PLACE COLOUR MEANING IS RESOLVED FROM AN EXCHANGE.
 *
 * GREEN  = me, my world — and the shared state of giving and lending.
 * PURPLE = wishing and borrowing: somebody is asking.
 * BLUE   = the initiating person in an interaction (normally me).
 * RED    = the other person on the wish / borrow side.
 * YELLOW = the other person on the give / lend side.
 * ORANGE = trade, kept apart from the wish/give mixing entirely.
 */

export type ExchangeState = "wish" | "give" | "trade";

/** Which relationship state an activity type inhabits. */
export function exchangeState(type: ItemType): ExchangeState {
  if (type === "trade") return "trade";
  if (type === "give") return "give";
  return "wish"; // wish + borrow both ask for something
}

/** The world colour the whole interaction lives in. */
export const STATE_COLOUR: Record<ExchangeState, string> = {
  wish: "var(--state-wish)",
  give: "var(--state-give)",
  trade: "var(--state-trade)",
};

/** The data-world name for a connection in that state. */
export const STATE_WORLD: Record<ExchangeState, string> = {
  wish: "connection-wish",
  give: "connection-give",
  trade: "connection-trade",
};

/** The colour of the OTHER person in that state. */
export const OTHER_PERSON_COLOUR: Record<ExchangeState, string> = {
  wish: "var(--person-other-wish)",
  give: "var(--person-other-give)",
  trade: "var(--person-other-trade)",
};

/** Me, as a participant in an interaction: always blue. My identity stays blue too. */
export const SELF_COLOUR = "var(--person-self)";

/** My own identity / home / profile: always my vibrant blue, whatever the mode. */
export const IDENTITY_COLOUR = "var(--giver-me)";

/** Who is speaking: blue for me, red / yellow / orange for them. */
export function personColour(state: ExchangeState, isMe: boolean) {
  return isMe ? SELF_COLOUR : OTHER_PERSON_COLOUR[state];
}

/**
 * TRADE IS THE ONE TWO-SIDED WORLD: THE PROPOSER LEADS IT.
 *
 * If I proposed the trade the immersive world is blue-led, with the other
 * person's orange present as the counterpart. If they proposed it the world is
 * orange-led with my blue as the counterpart. Nothing else about trade changes.
 */
export type TradeLead = "me" | "them";

export function tradeLead(proposerIsMe: boolean): TradeLead {
  return proposerIsMe ? "me" : "them";
}

/** The two colours of a trade world, in perspective order. */
export function tradePerspective(lead: TradeLead) {
  return lead === "me"
    ? { lead: SELF_COLOUR, counter: STATE_COLOUR.trade }
    : { lead: STATE_COLOUR.trade, counter: SELF_COLOUR };
}

