import type { ItemType } from "@/data/items";

/**
 * THE ONE PLACE COLOUR MEANING IS RESOLVED FROM AN EXCHANGE.
 *
 * BLUE     = me / the current user, in every interaction.
 * PURPLE   = wish + borrow: the world an asking interaction lives in.
 * GREEN    = give + lend: the world a generous interaction lives in.
 * ORCHID   = the other person on the asking (wish / borrow) side (#C154C1).
 * CLAY BROWN = FUND only (--mode-fund, #9E4B2C) — never a person colour.
 * SEAFOAM  = lend.
 * YELLOW   = the person receiving a give / lend.
 * ORANGE   = community, and the other person in a trade.
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
  wish: "var(--person-other-wish)", // orchid — they are asking
  give: "var(--person-other-give)", // yellow — they are receiving
  trade: "var(--person-other-trade)", // orange — the trade partner
};

/** Me, as a participant in an interaction: always blue. My identity stays green. */
export const SELF_COLOUR = "var(--person-self)";

/** Me inside the orange community environment: a differentiated deeper blue. */
export const SELF_COMMUNITY_COLOUR = "var(--person-self-community)";

/** The community environment itself: orange. */
export const COMMUNITY_COLOUR = "var(--state-community)";

/** My own identity / home / profile: always green, whatever the mode. */
export const IDENTITY_COLOUR = "var(--giver-me)";

/** Who is speaking: blue for me, pink / yellow / orange for them. */
export function personColour(state: ExchangeState, isMe: boolean) {
  return isMe ? SELF_COLOUR : OTHER_PERSON_COLOUR[state];
}

