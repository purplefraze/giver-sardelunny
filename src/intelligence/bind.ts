import { inferGiveType } from "@/data/give-lexicon";
import {
  type ActionDraft,
  type ActionEntities,
  type Clarification,
  type GiverAction,
  emptyEntities,
  missingOf,
  suggestedOf,
} from "@/intelligence/action-draft";

/**
 * OFFLINE INTERPRETER.
 *
 * Runs when the gateway is quiet, and is the floor the model is not allowed
 * to undercut. Product rules stay here: no invented category, no publish.
 * "I have a couch" stays ambiguous. The taxonomy is Giver's job.
 */

const HAVE = /\b(i have|i've got|i’ve got|got a|got an)\b/;
const NEED = /\b(i need|need a|need an|looking for|can someone)\b/;
const GIVE = /\b(give away|to give|giving away|don't need|dont need|do not need|not using|anymore|no longer)\b/;
const LEND = /\b(someone can borrow|you can borrow|can be borrowed|to lend|for loan)\b/;
const BORROW = /\b(lend me|borrow|can someone lend)\b/;
const TRADE = /\b(trade|swap)\b/;
const FUND = /\bfund\b/;
const HELP = /\b(help|a hand)\b/;
const WHEN =
  /\b(saturday|sunday|monday|tuesday|wednesday|thursday|friday|this weekend|next weekend|tomorrow|today)\b/i;

const CLARIFY_HAVE: Clarification = {
  ask: "what would you like to do with it?",
  choices: ["give it away", "lend it for a while", "trade it"],
};

const CLARIFY_NEED: Clarification = {
  ask: "what are you looking to do?",
  choices: ["borrow one", "find one to keep", "something else"],
};

const CLARIFY_OPEN: Clarification = {
  ask: "what would you like to do?",
  choices: ["i have something", "i need something", "i want to trade"],
};

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

const moneyCents = (text: string): number | null => {
  const m = text.match(/\$\s*([0-9]{1,6})(?:\.([0-9]{2}))?/);
  if (!m) return null;
  const dollars = Number(m[1]);
  const cents = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(dollars)) return null;
  return dollars * 100 + cents;
};

const quantityOf = (text: string): string | null => {
  const m = text.match(/\b(one|two|three|four|five|\d+)\s+(boxes|box|bags|bag)\b/i);
  return m ? m[0].toLowerCase() : null;
};

const dateOf = (text: string): string | null => {
  const m = text.match(WHEN);
  return m ? m[0].toLowerCase() : null;
};

const stripNoun = (phrase: string): string => {
  let s = tidy(phrase).replace(/[.?!]+$/g, "");
  s = s.replace(/^(a|an|the|some|my)\s+/i, "");
  s = s.replace(/\s+(i don't|i dont|that someone|to give).*$/i, "");
  s = s.replace(/^(one|two|three|four|five|\d+)\s+(boxes|box|bags|bag)\s+of\s+/i, "");
  s = s.replace(
    /\s+(saturday|sunday|monday|tuesday|wednesday|thursday|friday|this weekend|next weekend|tomorrow|today)\b.*$/i,
    "",
  );
  return tidy(s).toLowerCase();
};

/** Pull the noun phrase. Does not invent a category. */
const itemOf = (text: string): string | null => {
  const bare = text.replace(/[.?!]/g, "");
  const patterns = [
    /(?:lend me|borrow)\s+(?:a|an|the|some)?\s*(.+)/i,
    /(?:trade|swap)\s+(?:my\s+)?(.+?)\s+for\s+/i,
    /fund\s+(?:some\s+)?(.+?)(?:\s+for\b|$)/i,
    /(?:have|got|need)\s+(?:a|an|the|some)?\s*(.+)/i,
    /help\s+(?:me\s+)?(.+)/i,
  ];
  for (const p of patterns) {
    const m = bare.match(p);
    if (!m) continue;
    const phrase = stripNoun(m[1] ?? "");
    if (phrase.length >= 2 && !phrase.startsWith("$")) return phrase;
  }
  return null;
};

const tradeSides = (text: string): { offer: string | null; want: string | null } => {
  const bare = text.replace(/[.?!]/g, "");
  const m = bare.match(/\b(?:trade|swap)\s+(?:my\s+)?(.+?)\s+for\s+(?:a|an|my\s+)?(.+)$/i);
  if (!m) return { offer: null, want: null };
  return {
    offer: stripNoun(m[1] ?? "") || null,
    want: stripNoun(m[2] ?? "") || null,
  };
};

const draft = (
  action: GiverAction | null,
  confidence: number,
  entities: ActionEntities,
  clarification: Clarification | null,
): ActionDraft => ({
  action,
  confidence,
  entities,
  missingRequired: action ? missingOf(action, entities) : [],
  suggested: action ? suggestedOf(action, entities) : [],
  clarification,
  source: "rules",
});

/**
 * Understand one utterance. Pure. No network. No write.
 * Spoken dates stay spoken — a picker still owns the real date.
 */
export const bindUtterance = (raw: string): ActionDraft => {
  const text = tidy(raw);
  const lower = text.toLowerCase();
  const entities = emptyEntities();
  entities.amountCents = moneyCents(lower);
  entities.quantity = quantityOf(lower);
  entities.date = dateOf(lower);
  entities.item = itemOf(lower);
  const sides = tradeSides(lower);
  entities.offer = sides.offer;
  entities.want = sides.want;
  if (entities.item) {
    entities.category = inferGiveType(entities.item) ?? inferGiveType(lower);
  }

  if (!text || /don't know what category|dont know what category|what category/i.test(lower)) {
    return draft(null, 0.2, entities, {
      ask: "tell me what you have, or what you need. the category can wait.",
      choices: ["i have something", "i need something"],
    });
  }

  if (FUND.test(lower) || (entities.amountCents != null && /\b(coffee|coffees|fund)\b/.test(lower))) {
    if (!entities.item || entities.item.startsWith("$")) entities.item = "coffees";
    entities.category = entities.category ?? "food";
    return draft("fund", 0.92, entities, null);
  }

  if (TRADE.test(lower) && (entities.offer || entities.want)) {
    return draft("trade", entities.offer && entities.want ? 0.94 : 0.6, entities, null);
  }

  /* "I'm getting rid of a fridge": an explicit giving-away phrase names the item. */
  const rid = lower
    .replace(/[.?!]/g, "")
    .match(/\b(?:getting rid of|get rid of|giving away|give away)\s+(.+)/);
  if (rid) {
    const item = stripNoun(rid[1] ?? "");
    if (item.length >= 2) {
      entities.item = item;
      entities.category = inferGiveType(item) ?? entities.category;
      return draft("give", 0.92, entities, null);
    }
  }

  if (BORROW.test(lower)) {
    return draft("borrow", 0.93, entities, null);
  }

  if (LEND.test(lower)) {
    return draft("lend", 0.93, entities, null);
  }

  if (GIVE.test(lower) && HAVE.test(lower)) {
    return draft("give", 0.92, entities, null);
  }

  if (HELP.test(lower) && NEED.test(lower)) {
    if (!entities.item?.startsWith("help")) {
      entities.item = entities.item ? `help ${entities.item}` : "help";
    }
    entities.category = "a hand";
    return draft("wish", 0.9, entities, null);
  }

  if (HAVE.test(lower) && entities.item && !GIVE.test(lower) && !LEND.test(lower)) {
    return draft(null, 0.34, entities, CLARIFY_HAVE);
  }

  if (NEED.test(lower) && entities.item && !BORROW.test(lower)) {
    return draft("wish", 0.62, entities, CLARIFY_NEED);
  }

  return draft(null, 0.25, entities, CLARIFY_OPEN);
};

const CHOICE: Record<string, GiverAction | "back"> = {
  "give it away": "give",
  "lend it for a while": "lend",
  "trade it": "trade",
  "borrow one": "borrow",
  "find one to keep": "wish",
  "something else": "back",
  "i have something": "back",
  "i need something": "back",
};

/** A tap resolves the draft. "Something else" returns to input. It does not invent an action. */
export const resolveChoice = (prev: ActionDraft, say: string): ActionDraft | null => {
  const next = CHOICE[say.trim().toLowerCase()];
  if (!next || next === "back") return null;
  const entities = { ...prev.entities };
  return {
    action: next,
    confidence: 0.9,
    entities,
    missingRequired: missingOf(next, entities),
    suggested: suggestedOf(next, entities),
    clarification: null,
    source: "rules",
  };
};
