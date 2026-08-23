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

/** Me, as a participant in an interaction: always blue. My identity stays green. */
export const SELF_COLOUR = "var(--person-self)";

/** My own identity / home / profile: always green, whatever the mode. */
export const IDENTITY_COLOUR = "var(--giver-me)";

/** Who is speaking: blue for me, red / yellow / orange for them. */
export function personColour(state: ExchangeState, isMe: boolean) {
  return isMe ? SELF_COLOUR : OTHER_PERSON_COLOUR[state];
}
