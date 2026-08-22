/**
 * DEMO REPLIES — LOCAL, DETERMINISTIC, AND ONLY FOR SAMPLE PEOPLE.
 *
 * The onboarding sample people are not real, so a message sent to them would
 * otherwise sit unanswered and the exchange would never feel like an exchange.
 * This module answers, in their voice, USING ONLY WHAT IS ALREADY STORED IN
 * THEIR ITEM: the day, the time window, the duration, where, how often.
 *
 * It is NOT an AI service, NOT a chatbot, and it never invents a fact. If the
 * answer is not in the data, it says so plainly. Developers can switch the
 * whole behaviour off from the dev panel.
 */

import { itemFacts } from "@/components/profile/ItemFacts";
import { ME_ID, type Item } from "@/data/items";

const KEY = "giver.demo-replies.v1";

let state = true;
let hydrated = false;
const listeners = new Set<() => void>();

function ensure(): boolean {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = window.localStorage.getItem(KEY) !== "off";
  }
  return state;
}

/** THE SWITCH. On by default in the demo; a developer may turn it off. */
export const demoRepliesStore = {
  subscribe(listener: () => void) {
    ensure();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): boolean {
    return ensure();
  },
  getServer(): boolean {
    return true;
  },
  set(on: boolean) {
    state = on;
    if (typeof window !== "undefined") {
      if (on) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, "off");
    }
    for (const l of listeners) l();
  },
  toggle() {
    demoRepliesStore.set(!demoRepliesStore.get());
  },
};

const fact = (item: Item, label: string) =>
  itemFacts(item).find((f) => f.label === label)?.value;

type Rule = { match: RegExp; answer: (item: Item) => string | undefined };

/**
 * ONE QUESTION, ONE STORED ANSWER. Order matters: the first rule that matches
 * what was asked is the one that replies.
 */
const RULES: Rule[] = [
  {
    match: /what time|when in the|how late|which hour|time.*evening|evening.*time/i,
    answer: (i) => {
      const t = fact(i, "time");
      return t ? `${t}, that's the window i keep free.` : undefined;
    },
  },
  {
    match: /\bwhen\b|what day|which day|date/i,
    answer: (i) => {
      const parts = [fact(i, "days"), fact(i, "date"), fact(i, "time")].filter(Boolean);
      return parts.length ? `${parts.join(", ")}.` : undefined;
    },
  },
  {
    match: /how long|duration|how many hours/i,
    answer: (i) => {
      const d = fact(i, "how long");
      return d ? `about ${d} each time.` : undefined;
    },
  },
  {
    match: /where|which area|location|online|address/i,
    answer: (i) => {
      const w = fact(i, "where");
      return w ? `${w} — we can settle the exact spot between us.` : undefined;
    },
  },
  {
    match: /how often|weekly|every week|recurring|regular/i,
    answer: (i) => {
      const c = fact(i, "how often");
      return c ? `${c}.` : undefined;
    },
  },
  {
    match: /until|still available|still on|expire/i,
    answer: (i) => {
      const u = fact(i, "available until");
      return u ? `it's open until ${u}.` : "it's open, no closing date on it.";
    },
  },
  {
    match: /subject|level|grade|what kind/i,
    answer: (i) => {
      const parts = [fact(i, "subject"), fact(i, "level / grade"), fact(i, "level")].filter(
        Boolean,
      );
      return parts.length ? `${parts.join(", ")}.` : undefined;
    },
  },
];

/**
 * WHAT THEY WOULD SAY BACK. Returns null when replies are off, when the other
 * person is not a sample person, or when there is genuinely nothing to answer
 * with — silence is better than a made-up fact.
 */
export function demoReply(
  item: Item | undefined,
  text: string,
  theirId: string,
): string | null {
  if (!demoRepliesStore.get()) return null;
  if (!item || theirId === ME_ID) return null;

  const asked = text.trim();
  if (!asked) return null;

  for (const rule of RULES) {
    if (!rule.match.test(asked)) continue;
    const answer = rule.answer(item);
    if (answer) return answer;
    return "that part isn't set yet — say what suits you and we'll fix it.";
  }

  /* NOT A QUESTION: a plain, warm acknowledgement with the one useful fact. */
  const when = [fact(item, "days"), fact(item, "time")].filter(Boolean).join(", ");
  if (/\?$/.test(asked)) {
    return when
      ? `good question. ${when} is what i have set — anything else, just ask.`
      : "good question — ask me anything else you need to know.";
  }
  return when ? `hello! ${when} works for me. does that suit you?` : "hello! happy to help.";
}
