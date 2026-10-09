import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";

/**
 * LEAD-VERB INTENT — the plain spoken openings the binder misses or misreads
 * ("i can lend my drill", "my tent is free to borrow", "i wish i had a desk").
 * Only clear first-person phrasing matches; anything else falls through to the
 * binder/router unchanged. Pure; the item is only words the person said.
 */
const LEADS: [RegExp, GiverAction][] = [
  [/\bmy (.+?) is (?:free|available) to (?:borrow|lend)\b/, "lend"],
  [/\b(?:i can|i could|happy to|i'?m happy to|i'?ll|willing to|i'?m willing to|i want to|i'd like to) lend(?: out)? (.+)/, "lend"],
  [/\b(?:can|could|may) i borrow (.+)/, "borrow"],
  [/\b(?:i need to|i want to|i'd like to|i'?d love to) borrow (.+)/, "borrow"],
  [/\b(?:could|can|would) (?:someone|anyone|somebody) lend me (.+)/, "borrow"],
  [/^free (.+?)(?: to a good home| for anyone| up for grabs)?$/, "give"],
  [/\b(?:i'?m |i am )?(?:giving away|getting rid of) (.+)/, "give"],
  [/\bi have (?:a |an |some )?(?:spare |old )?(.+?) to give away\b/, "give"],
  [/\bi wish i had (.+)/, "wish"],
  [/\bi'?d (?:really )?love (.+?) to keep\b/, "wish"],
];

const CUT =
  /\s+(?:in|at|near|around|on|from|for|until|till|back by|this|next|tomorrow|today|tonight|after|before|by|if|please|pls)\b.*$/;

export function itemOf(phrase: string): string {
  return phrase
    .replace(/[.?!,].*$/, "")
    .replace(CUT, "")
    .replace(/^(?:out )?(?:my|a|an|the|some|your|our|one|spare|old|\s)+/g, "")
    .trim();
}

export function leadIntent(raw: string): ActionDraft | null {
  const lower = raw.toLowerCase().replace(/[’]/g, "'").trim();
  for (const [re, action] of LEADS) {
    const m = lower.match(re);
    const item = m ? itemOf(m[1] ?? "") : "";
    if (!m || item.length < 2) continue;
    const base = bindUtterance(raw);
    return {
      ...base,
      action,
      confidence: 0.95,
      entities: { ...base.entities, item },
      clarification: null,
    };
  }
  return null;
}
