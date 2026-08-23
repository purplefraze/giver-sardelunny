import type { ItemType } from "@/data/items";

/**
 * THE ONE PLACE COLOUR MEANING IS RESOLVED FROM AN EXCHANGE.
 *
 * BLUE     = me / the current user, in every interaction.
 * PURPLE   = wish + borrow: the world an asking interaction lives in.
 * GREEN    = give + lend: the world a generous interaction lives in.
 * HOT PINK = borrow, and the other person on the asking side.
 * SEAFOAM  = lend.
 * YELLOW   = the person receiving a give / lend.
 * ORANGE   = the trade world and the other person in a trade. RED = community.
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
  wish: "var(--person-other-wish)", // hot pink — they are asking
  give: "var(--person-other-give)", // yellow — they are receiving
  trade: "var(--person-other-trade)", // orange — the trade partner
};

/** Me, as a participant in an interaction: always blue. My identity stays green. */
export const SELF_COLOUR = "var(--person-self)";

/** Me inside the RED community environment: a differentiated deeper blue. */
export const SELF_COMMUNITY_COLOUR = "var(--person-self-community)";

/** The community environment itself: red. */
export const COMMUNITY_COLOUR = "var(--state-community)";

/** My own identity / home / profile: always green, whatever the mode. */
export const IDENTITY_COLOUR = "var(--giver-me)";

/** Who is speaking: blue for me, pink / yellow / orange for them. */
export function personColour(state: ExchangeState, isMe: boolean) {
  return isMe ? SELF_COLOUR : OTHER_PERSON_COLOUR[state];
}

