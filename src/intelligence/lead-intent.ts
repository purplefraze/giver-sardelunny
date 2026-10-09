import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";

/**
 * LEAD-VERB INTENT — the plain spoken openings the binder misses or misreads
 * ("i can lend my drill", "my tent is free to borrow", "i wish i had a desk").
 * Only clear first-person phrasing matches; anything else falls through to the
 * binder/router unchanged. Pure; the item is only words the person said.
 */
const LEADS: [RegExp, GiverAction][] = [
  [/\b(?:i want to|i'd like to|i'?m looking to|happy to|i'?ll) (?:trade|swap) (.+)/, "trade"],
  [/\b(?:i'?m |we'?re |i am )?(?:raising|fundraising|crowdfunding|help(?:ing)? (?:to )?fund|collecting money)\b(.*)/, "fund"],
  [/\bi(?: can|'?m happy to|'?d be happy to| could) ((?:walk|help|tutor|teach|fix|mow|clean|cook|babysit|dog ?sit|paint)\b.+)/, "give"],
  [/\bi'?m offering (?:free )?(.+)/, "give"],
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
  /* A question about others ("is anyone giving away…") is a search, not a post. */
  if (/^(?:is|are|does|do|has|have) (?:anyone|anybody|someone|somebody)\b/.test(lower)) return null;
  for (const [re, action] of LEADS) {
    const m = lower.match(re);
    if (!m) continue;
    const base = bindUtterance(raw);
    const e = { ...base.entities };
    if (action === "fund") {
      const amt = lower.match(/[£$€]\s?(\d[\d,]*)|\b(\d[\d,]*)\s*(?:pounds|quid|dollars|euros)?\b/);
      const n = amt ? Number((amt[1] ?? amt[2] ?? "").replace(/,/g, "")) : NaN;
      if (Number.isFinite(n) && n > 0) e.amountCents = n * 100;
      const cause = lower.match(/\bfor\s+(.+?)(?=[.,!?]|$)/)?.[1] ?? "";
      e.item = cause.trim() || e.item;
      return { ...base, action, confidence: 0.95, entities: e, clarification: null };
    }
    if (action === "trade") {
      const [offer, want] = (m[1] ?? "").split(/\s+for\s+/);
      e.offer = itemOf(offer ?? "");
      e.want = want ? itemOf(want) : null;
      if ((e.offer ?? "").length < 2) continue;
      return { ...base, action, confidence: 0.95, entities: e, clarification: null };
    }
    const service = /^(?:walk|help|tutor|teach|fix|mow|clean|cook|babysit|dog ?sit|paint)\b|tutoring|lessons?\b/.test(m[1] ?? "");
    const item = service ? (m[1] ?? "").replace(/[.?!]+$/, "").trim() : itemOf(m[1] ?? "");
    if (item.length < 2) continue;
    if (service) e.category = /tutor|teach|lesson/.test(item) ? "a skill" : "a hand";
    return { ...base, action, confidence: 0.95, entities: { ...e, item }, clarification: null };
  }
  return null;
}
