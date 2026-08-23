import type { BorrowSide, ItemType } from "@/data/items";

/**
 * THE ONE PLACE COLOUR MEANING IS RESOLVED FROM AN EXCHANGE.
 *
 * BLUE   = me / the current user, always, in every interaction.
 * RED    = the OTHER person in ANY wish or borrow interaction — whoever is
 *          asking and whoever is fulfilling. Never decided by who receives.
 * YELLOW = the OTHER person in ANY give, lend or trade interaction.
 *
 * The WORLD around the interaction is its own thing:
 * wish = purple · borrow = hot pink · give = bright green ·
 * lend = seafoam · trade = orange · community = orange.
 */

export type ExchangeState = "wish" | "borrow" | "give" | "lend" | "trade";

/** Which interaction world an activity lives in. */
export function exchangeState(type: ItemType, side?: BorrowSide): ExchangeState {
  if (type === "trade") return "trade";
  if (type === "give") return "give";
  if (type === "wish") return "wish";
  return side === "lend" ? "lend" : "borrow";
}

/** The world colour the whole interaction lives in. */
export const STATE_COLOUR: Record<ExchangeState, string> = {
  wish: "var(--state-wish)",
  borrow: "var(--state-borrow)",
  give: "var(--state-give)",
  lend: "var(--state-lend)",
  trade: "var(--state-trade)",
};

/** The data-world name for a connection in that state. */
export const STATE_WORLD: Record<ExchangeState, string> = {
  wish: "connection-wish",
  borrow: "connection-borrow",
  give: "connection-give",
  lend: "connection-lend",
  trade: "connection-trade",
};

/**
 * THE COLOUR OF THE OTHER PERSON — decided ONLY by the kind of interaction.
 * Wish / borrow -> RED. Give / lend / trade -> YELLOW.
 */
export const OTHER_PERSON_COLOUR: Record<ExchangeState, string> = {
  wish: "var(--person-other-asking)", // red
  borrow: "var(--person-other-asking)", // red
  give: "var(--person-other-offering)", // yellow
  lend: "var(--person-other-offering)", // yellow
  trade: "var(--person-other-offering)", // yellow
};

/** Me, as a participant in an interaction: always blue. My identity stays green. */
export const SELF_COLOUR = "var(--person-self)";

/** Me inside the community environment: a differentiated deeper blue. */
export const SELF_COMMUNITY_COLOUR = "var(--person-self-community)";

/** The community environment itself: orange. */
export const COMMUNITY_COLOUR = "var(--state-community)";

/** My own identity / home / profile: always green, whatever the mode. */
export const IDENTITY_COLOUR = "var(--giver-me)";

/** Who is speaking: blue for me, red / yellow for them. */
export function personColour(state: ExchangeState, isMe: boolean) {
  return isMe ? SELF_COLOUR : OTHER_PERSON_COLOUR[state];
}
