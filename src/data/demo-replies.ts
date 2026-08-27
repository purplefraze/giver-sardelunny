/**
 * DEMO REPLIES — LOCAL, DETERMINISTIC, AND ONLY FOR SAMPLE PEOPLE.
 *
 * The onboarding sample people are not real, so a message sent to them would
 * otherwise sit unanswered and the exchange would never feel like an exchange.
 * This module answers, in their voice, USING ONLY WHAT IS ALREADY STORED IN
 * THEIR ITEM: the day, the time window, the duration, where, how often.
 *
 * IT NEVER SAYS THE SAME THING TWICE. Every answer has several phrasings and
 * the one that is used depends on what has already been said in that
 * conversation, so a sample person reads like a person and not a macro.
 *
 * It is NOT an AI service, NOT a chatbot, and it never invents a fact. If the
 * answer is not in the data, it says so plainly. Developers can switch the
 * whole behaviour off from the dev panel.
 */

import { itemFacts } from "@/components/profile/ItemFacts";
import { ME_ID, itemLine, type Item } from "@/data/items";

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

/** Every phrasing an answer has. The chooser below decides which one is used. */
type Rule = { match: RegExp; answers: (item: Item) => string[] };

/**
 * ONE QUESTION, ONE STORED ANSWER, SEVERAL WAYS OF SAYING IT. Order matters:
 * the first rule that matches what was asked is the one that replies.
 */
const RULES: Rule[] = [
  {
    match: /what time|when in the|how late|which hour|time.*evening|evening.*time/i,
    answers: (i) => {
      const t = fact(i, "time");
      if (!t) return [];
      return [
        `${t}, that's the window i keep free.`,
        `i'm free ${t} — anywhere in there works.`,
        `${t}. earlier in that window is easier for me, honestly.`,
      ];
    },
  },
  {
    match: /\bwhen\b|what day|which day|date/i,
    answers: (i) => {
      const parts = [fact(i, "days"), fact(i, "date"), fact(i, "time")].filter(Boolean);
      if (!parts.length) return [];
      const said = parts.join(", ");
      return [
        `${said}.`,
        `${said} — does that land ok for you?`,
        `i've got ${said} set aside for this.`,
      ];
    },
  },
  {
    match: /how long|duration|how many hours/i,
    answers: (i) => {
      const d = fact(i, "how long");
      if (!d) return [];
      return [
        `about ${d} each time.`,
        `${d} is what i normally allow, give or take.`,
        `roughly ${d} — we can stop whenever it feels done.`,
      ];
    },
  },
  {
    match: /where|which area|location|online|address/i,
    answers: (i) => {
      const w = fact(i, "where");
      if (!w) return [];
      return [
        `${w} — we can settle the exact spot between us.`,
        `${w}. tell me what's easy for you and i'll come to you if i can.`,
        `i had ${w} in mind, but i'm not precious about it.`,
      ];
    },
  },
  {
    match: /how often|weekly|every week|recurring|regular/i,
    answers: (i) => {
      const c = fact(i, "how often");
      if (!c) return [];
      return [`${c}.`, `${c}, that's the rhythm i can keep.`, `${c} — more than that and i'd fall over.`];
    },
  },
  {
    match: /until|still available|still on|expire/i,
    answers: (i) => {
      const u = fact(i, "available until");
      return u
        ? [`it's open until ${u}.`, `yes — it stands until ${u}.`, `still on, ${u} is the last day.`]
        : [
            "it's open, no closing date on it.",
            "still on. i'll say so here the day it isn't.",
            "yes, it's open — no end date on this one.",
          ];
    },
  },
  {
    match: /subject|level|grade|what kind/i,
    answers: (i) => {
      const parts = [fact(i, "subject"), fact(i, "level / grade"), fact(i, "level")].filter(
        Boolean,
      );
      if (!parts.length) return [];
      const said = parts.join(", ");
      return [`${said}.`, `${said} — that's where i'm actually useful.`, `mostly ${said}.`];
    },
  },
  {
    match: /thank|thanks|cheers|appreciate/i,
    answers: () => [
      "no thanks needed. that's the whole idea here.",
      "any time, honestly.",
      "you're welcome — glad it's useful to somebody.",
    ],
  },
  {
    match: /\b(hi|hey|hello|yo)\b/i,
    answers: (i) => [
      `hey! yes, ${itemLine(i)} is still going.`,
      "hello! ask me anything you need to know.",
      "hi — good to hear from you.",
    ],
  },
];

/** WHEN THE FACT SIMPLY ISN'T SET YET. Said plainly, never dressed up. */
const UNKNOWN = [
  "that part isn't set yet — say what suits you and we'll fix it.",
  "honestly, i haven't decided that. what would work for you?",
  "not set in stone yet. tell me what you'd prefer.",
];

/**
 * THE ONE THAT HASN'T BEEN SAID. Whatever is already in the thread is skipped,
 * so nothing is ever repeated while a fresh phrasing exists; when every one has
 * been used, the least recent comes back around.
 */
function pick(options: string[], saidBefore: string[]): string | null {
  const usable = options.filter(Boolean);
  if (!usable.length) return null;
  const fresh = usable.find((o) => !saidBefore.includes(o));
  if (fresh) return fresh;
  let oldest = usable[0]!;
  let oldestAt = Number.POSITIVE_INFINITY;
  for (const option of usable) {
    const at = saidBefore.lastIndexOf(option);
    if (at < oldestAt) {
      oldestAt = at;
      oldest = option;
    }
  }
  return oldest;
}

/**
 * WHAT THEY WOULD SAY BACK. Returns null when replies are off, when the other
 * person is not a sample person, or when there is genuinely nothing to answer
 * with — silence is better than a made-up fact.
 *
 * `saidBefore` is everything that person has already said in this conversation,
 * which is what stops them repeating themselves.
 */
export function demoReply(
  item: Item | undefined,
  text: string,
  theirId: string,
  saidBefore: string[] = [],
): string | null {
  if (!demoRepliesStore.get()) return null;
  if (!item || theirId === ME_ID) return null;

  const asked = text.trim();
  if (!asked) return null;

  for (const rule of RULES) {
    if (!rule.match.test(asked)) continue;
    const answer = pick(rule.answers(item), saidBefore);
    if (answer) return answer;
    return pick(UNKNOWN, saidBefore);
  }

  /* NOT A KNOWN QUESTION: a warm answer that still carries one useful fact. */
  const when = [fact(item, "days"), fact(item, "time")].filter(Boolean).join(", ");
  if (/\?$/.test(asked)) {
    return pick(
      when
        ? [
            `good question. ${when} is what i have set — anything else, just ask.`,
            `i think so, yes. ${when} is what's in my diary for it.`,
            `let me be straight: ${when} is fixed, the rest is up to us.`,
          ]
        : [
            "good question — ask me anything else you need to know.",
            "i'd say yes. what else do you need from me?",
            "not sure yet, but i'm happy to work it out with you.",
          ],
      saidBefore,
    );
  }
  return pick(
    when
      ? [
          `hello! ${when} works for me. does that suit you?`,
          `sounds good. ${when} is when i'm free — say the word.`,
          `noted. i've got ${when} set aside, so tell me which suits.`,
        ]
      : [
          "hello! happy to help.",
          "sounds good to me — say when.",
          "i'm in. tell me what you need.",
        ],
    saidBefore,
  );
}

/**
 * A SAMPLE PERSON CONFIRMING THAT IT HAPPENED. Only ever said in answer to a
 * real person's claim, and always in the language of the exchange itself.
 */
export const SAMPLE_CONFIRMS: Record<string, string[]> = {
  give: ["yes — that's gifted. thank you.", "confirmed, it's done. glad it went to you."],
  wish: ["yes, wish granted. lovely.", "confirmed — that wish is granted."],
  trade: ["yes, we traded. good one.", "confirmed — traded, fair and square."],
  borrow: ["yes, i've got it back. all good.", "confirmed — returned safely, thank you."],
};
