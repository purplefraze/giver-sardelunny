import type { ItemDetails } from "@/data/items";
import { exchangeOf, type ActionDraft, type GiverAction } from "@/intelligence/action-draft";

/** Known fields the existing form can show. Not a second listing. */
export type FormSeed = {
  text: string;
  want?: string;
  details: ItemDetails;
};

export type FormHandoff =
  | { kind: "give"; seed: FormSeed }
  | { kind: "category"; category: "wish" | "trade" | "borrow"; side?: "borrow" | "lend"; seed: FormSeed }
  | { kind: "ask-fund"; seed: FormSeed };

const detailsOf = (draft: ActionDraft): ItemDetails => {
  const e = draft.entities;
  const details: ItemDetails = {};
  if (e.category) details.topic = e.category;
  if (e.date) details.date = e.date;
  if (e.duration) details.duration = e.duration;
  if (e.location) details.where = e.location;
  if (e.condition) details.extras = { condition: e.condition };
  if (draft.action === "fund" && e.amountCents) details.fundTarget = e.amountCents;
  return details;
};

/**
 * Resolved draft -> the existing form. Fund stays a wish with fundTarget.
 * Null if the action is still unresolved.
 */
export const handoffOf = (draft: ActionDraft): FormHandoff | null => {
  if (!draft.action) return null;
  const action: GiverAction = draft.action;
  const seed: FormSeed = {
    text: action === "trade" ? (draft.entities.offer ?? draft.entities.item ?? "") : (draft.entities.item ?? ""),
    details: detailsOf(draft),
    ...(action === "trade" && draft.entities.want ? { want: draft.entities.want } : {}),
  };
  if (action === "give") return { kind: "give", seed };
  if (action === "fund") return { kind: "ask-fund", seed };
  const exchange = exchangeOf(action);
  if (exchange.category === "borrow") {
    return { kind: "category", category: "borrow", side: exchange.side ?? "borrow", seed };
  }
  if (exchange.category === "wish" || exchange.category === "trade") {
    return { kind: "category", category: exchange.category, seed };
  }
  return null;
};
