import type { BorrowSide, ItemType } from "@/data/items";
import type { Exchange } from "@/data/intents";

/**
 * GIVER INTELLIGENCE — the structured object under the Living G.
 *
 * AI may fill this. It may not invent a product rule, publish, message,
 * spend Sparks, or contact anyone. Item + intents.ts stay authoritative.
 * Fund is not a table: it is a wish with details.fundTarget.
 * Lend is not a type: it is borrow with side "lend".
 */

export const GIVER_ACTIONS = [
  "give",
  "wish",
  "borrow",
  "lend",
  "trade",
  "fund",
] as const;

export type GiverAction = (typeof GIVER_ACTIONS)[number];

export type ConfidenceBand = "high" | "moderate" | "low";

/** High proceeds. Moderate shows the reading. Low asks one question. */
export const bandOf = (confidence: number): ConfidenceBand =>
  confidence >= 0.85 ? "high" : confidence >= 0.55 ? "moderate" : "low";

export type ActionEntities = {
  item: string | null;
  category: string | null;
  condition: string | null;
  location: string | null;
  availability: string | null;
  date: string | null;
  duration: string | null;
  offer: string | null;
  want: string | null;
  /** Integer cents. Never a float dollar. */
  amountCents: number | null;
  quantity: string | null;
};

export const emptyEntities = (): ActionEntities => ({
  item: null,
  category: null,
  condition: null,
  location: null,
  availability: null,
  date: null,
  duration: null,
  offer: null,
  want: null,
  amountCents: null,
  quantity: null,
});

export type Clarification = {
  ask: string;
  choices: readonly string[];
};

export type ActionDraft = {
  action: GiverAction | null;
  confidence: number;
  entities: ActionEntities;
  missingRequired: string[];
  suggested: string[];
  clarification: Clarification | null;
  /** rules = offline binder. model = gateway, already sanitised. */
  source: "rules" | "model";
};

/** Fields the existing flows already require. AI does not own this list. */
export const REQUIRED_FIELDS: Record<GiverAction, readonly string[]> = {
  give: ["item", "location"],
  wish: ["item"],
  borrow: ["item"],
  lend: ["item"],
  trade: ["offer", "want"],
  fund: ["item", "amountCents"],
};

export const SUGGESTED_FIELDS: Record<GiverAction, readonly string[]> = {
  give: ["category", "condition", "availability"],
  wish: ["date", "location", "category"],
  borrow: ["date", "duration", "location"],
  lend: ["availability", "location", "condition"],
  trade: ["condition", "location"],
  fund: ["location"],
};

const FIELD_KEY: Record<string, keyof ActionEntities> = {
  item: "item",
  category: "category",
  condition: "condition",
  location: "location",
  availability: "availability",
  date: "date",
  duration: "duration",
  offer: "offer",
  want: "want",
  amountCents: "amountCents",
  quantity: "quantity",
};

export const filled = (entities: ActionEntities, field: string): boolean => {
  const key = FIELD_KEY[field];
  if (!key) return false;
  const v = entities[key];
  return v != null && v !== "";
};

export const missingOf = (action: GiverAction, entities: ActionEntities): string[] =>
  REQUIRED_FIELDS[action].filter((f) => !filled(entities, f));

export const suggestedOf = (action: GiverAction, entities: ActionEntities): string[] =>
  SUGGESTED_FIELDS[action].filter((f) => !filled(entities, f));

/** Seat the existing door already understands. Fund stays a wish. */
export const exchangeOf = (action: GiverAction): Exchange => {
  if (action === "lend") return { category: "borrow", side: "lend" satisfies BorrowSide };
  if (action === "borrow") return { category: "borrow", side: "borrow" };
  if (action === "fund") return { category: "wish" };
  return { category: action as ItemType };
};

export const isAction = (v: unknown): v is GiverAction =>
  typeof v === "string" && (GIVER_ACTIONS as readonly string[]).includes(v);
