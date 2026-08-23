import type { BorrowSide, ItemType } from "@/data/items";

/**
 * THREE INTENTS, FIVE MEANINGS.
 *
 * Nobody arrives at Giver thinking "wish, give, trade, borrow, lend". People
 * arrive thinking one of three things: i need something, i have something, or
 * i'd like to swap. So the door asks that — and ONE small follow-up decides
 * which of the five real exchange types is being made.
 *
 * The five underlying types are untouched: wish and borrow, give and lend,
 * trade. The taxonomy is giver's job, never the person's.
 */

export type Intent = "looking" | "offering" | "trading";

export type Exchange = { category: ItemType; side?: BorrowSide };

export const INTENTS: Intent[] = ["looking", "offering", "trading"];

/** WHAT THE PERSON IS ACTUALLY DOING, said in their own words. */
export const INTENT_WORDS: Record<Intent, string> = {
  looking: "i’m looking for something",
  offering: "i have something to offer",
  trading: "i want to trade",
};

/** THE COLOUR EACH DOOR WEARS — the colour of what it usually becomes. */
export const INTENT_COLOUR: Record<Intent, string> = {
  looking: "var(--activity-wish)",
  offering: "var(--activity-give)",
  trading: "var(--activity-trade)",
};

/** THE ONE FOLLOW-UP. Asked once, in plain language, never as a data type. */
export type Choice = { say: string; exchange: Exchange; colour: string };

export const INTENT_FOLLOW_UP: Record<
  Intent,
  { ask: string; choices: Choice[] } | null
> = {
  looking: {
    ask: "would you like to keep it, or borrow it for a while?",
    choices: [
      {
        say: "i’d like to keep it",
        exchange: { category: "wish" },
        colour: "var(--activity-wish)",
      },
      {
        say: "just borrowing it",
        exchange: { category: "borrow", side: "borrow" },
        colour: "var(--activity-borrow)",
      },
    ],
  },
  offering: {
    ask: "are you giving it away, or lending it for a while?",
    choices: [
      {
        say: "giving it away",
        exchange: { category: "give" },
        colour: "var(--activity-give)",
      },
      {
        say: "lending it",
        exchange: { category: "borrow", side: "lend" },
        colour: "var(--activity-lend)",
      },
    ],
  },
  trading: null,
};

/** THE TRADE DOOR NEEDS NOTHING ELSE. */
export const TRADE_EXCHANGE: Exchange = { category: "trade" };
