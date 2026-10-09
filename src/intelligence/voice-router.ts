import type { BorrowSide, ItemType } from "@/data/items";
import type { ActionDraft } from "@/intelligence/action-draft";
import { emptyEntities, missingOf, suggestedOf } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";

/**
 * THE ONE VOICE ROUTER. Every utterance from the S-curve mic lands here.
 * Pure and local: no network, no write, no publish.
 *
 *   search  → read existing community listings (itemsStore), never a copy
 *   draft   → a resolved ActionDraft for the existing forms (give first)
 *   clarify → one plain question from the binder
 */
export type VoiceIntent = "search" | "give" | "wish" | "trade" | "borrow" | "lend" | "fund" | "clarify";

export type SearchSpec = {
  term: string;
  /** Which listings to look through. Empty = everything. */
  types: ItemType[];
  side?: BorrowSide;
  nearby: boolean;
  /** The create path offered when search isn't what they meant. */
  fallback: ActionDraft;
};

export type VoiceRoute =
  | { intent: "search"; search: SearchSpec }
  | { intent: Exclude<VoiceIntent, "search" | "clarify">; draft: ActionDraft }
  | { intent: "clarify"; draft: ActionDraft };

const SEARCH = /\b(?:i'?m looking for|i am looking for|looking for|find me|find|search for|search|show me|is there|are there|anyone got|anyone have|does anyone have|is (?:anyone|anybody) (?:giving away|offering|lending))\s+(.+)/;
const WANT_BORROW = /\b(?:i want to borrow|i'd like to borrow|i need to borrow|can i borrow|borrow)\s+(.+)/;

const singular = (w: string) =>
  w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.replace(/(ie)s$/, "y").replace(/s$/, "") : w;

/** "some ladders nearby" → "ladder". Keeps meaning, drops filler. */
export const searchTerm = (phrase: string): string =>
  phrase
    .toLowerCase()
    .replace(/[.?!,]/g, " ")
    .replace(/\b(nearby|near me|around here|close by|please|today|right now)\b/g, " ")
    .replace(/^\s*(a|an|the|some|any)\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(singular)
    .join(" ");

const draftOf = (action: "wish" | "borrow", item: string): ActionDraft => {
  const entities = { ...emptyEntities(), item };
  return {
    action,
    confidence: 0.9,
    entities,
    missingRequired: missingOf(action, entities),
    suggested: suggestedOf(action, entities),
    clarification: null,
    source: "rules",
  };
};

export function routeVoice(raw: string): VoiceRoute {
  const lower = raw.toLowerCase().replace(/[’]/g, "'").trim();

  /* BORROW: look for what's on lend first; asking to borrow is the offered alternative. */
  const b = lower.match(WANT_BORROW);
  if (b && !/\blend me\b/.test(lower)) {
    const term = searchTerm(b[1] ?? "");
    if (term.length >= 2) {
      return {
        intent: "search",
        search: { term, types: ["borrow"], side: "lend", nearby: /nearby|near me/.test(lower), fallback: draftOf("borrow", term) },
      };
    }
  }

  /* SEARCH: "looking for", "show me", "find" read the community first. */
  const s = lower.match(SEARCH);
  if (s) {
    const term = searchTerm(s[1] ?? "");
    if (term.length >= 2) {
      const looking = /looking for|anyone|is there|are there/.test(lower);
      return {
        intent: "search",
        search: {
          term,
          /* Looking for a thing = what people are offering. "show me" = everything. */
          types: looking ? ["give", "borrow", "trade"] : [],
          ...(looking ? { side: "lend" as BorrowSide } : {}),
          nearby: /nearby|near me|around here|close by/.test(lower),
          fallback: draftOf("wish", term),
        },
      };
    }
  }

  const draft = bindUtterance(raw);
  if (draft.action && draft.confidence >= 0.85) return { intent: draft.action, draft };
  return { intent: "clarify", draft };
}
