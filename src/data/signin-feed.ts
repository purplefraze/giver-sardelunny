import { COMMUNITY_GIVES, sampleMembers } from "@/data/giver";
import { splitTrade } from "@/data/items";

/**
 * THE SIGN-IN FEED — community activity lines drifting behind the sign-in
 * circle ("giulia is giving science tutoring").
 *
 * PRIVACY (decision pending with Frazer): nobody real is shown before login.
 * This reads ONLY the app's written SAMPLE fixtures already in the repo —
 * sampleMembers() (the four sample people, never REMOTE testers or edits) and
 * COMMUNITY_GIVES — first names only: open give / trade lines, plus each
 * person's most recent completed give / trade / granted wish — plus the written
 * SAMPLE_ACTIVITY lines below (all six actions, invented names, so every seat
 * colour appears). Sample members' open wishes / borrows are NOT read.
 * No database read, no new public endpoint, no RLS change.
 *
 * THE ONE SWAP POINT: when a sanitized server endpoint exists (first names,
 * give/lend/trade only, opted-in members), replace the body of
 * signInFeedLines() and nothing else changes.
 */
export type SignInFeedKind = "give" | "lend" | "trade" | "fund" | "borrow" | "wish";
export type SignInFeedLine = { kind: SignInFeedKind; text: string };

const firstName = (name: string) => (name.trim().split(/\s+/)[0] ?? "").toLowerCase();

/**
 * THE TENSE RULE — one rule for every feed line:
 *   OPEN (still live, in progress)  -> present continuous
 *     "theo is lending a ladder", "ana is wishing for a guitar teacher"
 *   COMPLETED (given, granted, done) -> past tense
 *     "jin gave a crib", "hugo’s wish for a piano teacher came true"
 * Sample members' lines take their status from the data itself: `active`
 * items are open, `history` items are completed. The written lines below are
 * marked open / done by hand. Aim: about four open lines to one completed.
 */
type Status = "open" | "done";

/**
 * WRITTEN SAMPLE LINES FOR ALL SIX ACTIONS, so every seat colour appears in
 * the feed (the sample members only yield give / trade / wish). Invented first
 * names and things, from the sign-in stills — sample content, nobody real.
 * Five open lines and one completed line per action.
 */
const SAMPLE_ACTIVITY: Record<SignInFeedKind, Record<Status, string[]>> = {
  give: {
    open: [
      "omar is giving bike repairs",
      "madison is giving singing lessons",
      "yara is giving a sourdough starter",
      "amara is giving french tutoring",
      "finn is giving houseplants",
    ],
    done: ["jin gave a crib"],
  },
  lend: {
    open: [
      "theo is lending a ladder",
      "ben is lending a drill",
      "arjun is lending a lawn mower",
      "nia is lending a kayak",
      "mei is lending a stand mixer",
    ],
    done: ["iris lent a car seat"],
  },
  trade: {
    open: [
      "ivy is trading a record player",
      "june is trading a winter coat",
      "felix is trading a road bike",
      "emeka is trading an espresso machine",
      "rosa is trading a skateboard",
    ],
    done: ["kai traded a desk lamp"],
  },
  fund: {
    open: [
      "priya is funding a school trip",
      "madison is funding a library van",
      "hana is funding a soccer team",
      "june is funding a music camp",
      "marco is funding a mural",
    ],
    done: ["sofia’s dental work got funded"],
  },
  borrow: {
    open: [
      "sam is borrowing a tent",
      "leah is borrowing a camping stove",
      "lucy is borrowing a stroller",
      "theo is borrowing a car seat",
      "hana is borrowing a tuxedo",
    ],
    done: ["dev borrowed a pressure washer"],
  },
  wish: {
    open: [
      "ana is wishing for a guitar teacher",
      "lena is wishing for a study buddy",
      "kofi is wishing for a chess partner",
      "noah is wishing for a dog walker",
      "esme is wishing for a spare desk",
    ],
    done: ["hugo’s wish for a piano teacher came true"],
  },
};

/** One phrasing per action and status. `thing` is already lowercase. */
const PHRASE: Record<"give" | "trade" | "wish", Record<Status, (name: string, thing: string) => string>> = {
  give: { open: (n, t) => `${n} is giving ${t}`, done: (n, t) => `${n} gave ${t}` },
  trade: { open: (n, t) => `${n} is trading ${t}`, done: (n, t) => `${n} traded ${t}` },
  wish: { open: (n, t) => `${n} is wishing for ${t}`, done: (n, t) => `${n}’s wish for ${t} came true` },
};

const line = (
  kind: "give" | "trade" | "wish",
  status: Status,
  who: string,
  what: string,
): SignInFeedLine | null => {
  const name = firstName(who);
  const thing = what.trim().toLowerCase();
  return name && thing ? { kind, text: PHRASE[kind][status](name, thing) } : null;
};

/** A trade, as "offer for want" when it fits on one line, else just the offer. */
const tradeLine = (status: Status, who: string, text: string): SignInFeedLine | null => {
  const { offer, want } = splitTrade(text);
  const full = want ? line("trade", status, who, `${offer} for ${want}`) : null;
  return full && full.text.length <= MAX_CHARS ? full : line("trade", status, who, offer);
};

/** "six bags of apples. come and take them — tom, 400m" -> tom / six bags of apples (open) */
function fromCommunityGive(raw: string): SignInFeedLine | null {
  const [what = "", who = ""] = raw.split(" — ");
  const name = who.split(",")[0] ?? "";
  const thing = what.split(". ")[0] ?? "";
  return line("give", "open", name, thing);
}

/** A written history entry that means "nothing happened" is not a line. */
const isReal = (s: string | undefined): s is string => Boolean(s && s.trim() && s.trim() !== "nothing yet");

/**
 * ONE FEED LINE IS ONE LINE on a phone. A trade that would run past this keeps
 * its offer and drops "for …"; anything still longer is left out.
 */
const MAX_CHARS = 42;

export function signInFeedLines(): SignInFeedLine[] {
  const members = sampleMembers();
  const out: SignInFeedLine[] = [];
  const push = (l: SignInFeedLine | null) => {
    if (l && l.text.length <= MAX_CHARS) out.push(l);
  };
  const depth = Math.max(
    0,
    ...members.map((m) => Math.max(m.active.give.length, m.active.trade.length)),
  );
  /* OPEN: what each sample person has live right now (`active`), interleaved
     person by person, give then trade, so the feed never reads as one
     person's list. Their wishes / borrows stay out (asks, not offers). */
  for (let i = 0; i < depth; i += 1) {
    for (const m of members) {
      const give = m.active.give[i];
      if (give) push(line("give", "open", m.name, give));
      const trade = m.active.trade[i];
      if (trade) push(tradeLine("open", m.name, trade));
    }
  }
  /* COMPLETED: each sample person's most recent finished give, trade and
     granted wish (`history`), spread through the open lines. */
  const done: SignInFeedLine[] = [];
  for (const m of members) {
    const [give] = m.history.gives;
    if (isReal(give)) done.push(line("give", "done", m.name, give)!);
    const [trade] = m.history.trades;
    if (isReal(trade)) {
      const t = tradeLine("done", m.name, trade);
      if (t) done.push(t);
    }
    const [wish] = m.history.wishes;
    if (isReal(wish)) {
      /* "x’s wish for y came true", or the shorter "x got y" when that runs long. */
      const w = line("wish", "done", m.name, wish)!;
      done.push(w.text.length <= MAX_CHARS ? w : { kind: "wish", text: `${firstName(m.name)} got ${wish.trim().toLowerCase()}` });
    }
  }
  done
    .filter((l) => l.text.length <= MAX_CHARS)
    .forEach((l, i) => out.splice(Math.min(out.length, 2 + i * 4), 0, l));
  COMMUNITY_GIVES.forEach((raw, i) => {
    const l = fromCommunityGive(raw);
    if (l && l.text.length <= MAX_CHARS) out.splice(Math.min(out.length, 3 + i * 7), 0, l);
  });
  /* EVERY COLOUR: the written sample lines, dealt one action at a time, the
     completed line last in each action's run. */
  const kinds = Object.keys(SAMPLE_ACTIVITY) as SignInFeedKind[];
  const runs = kinds.map((k) => [...SAMPLE_ACTIVITY[k].open, ...SAMPLE_ACTIVITY[k].done]);
  const most = Math.max(...runs.map((r) => r.length));
  for (let i = 0; i < most; i += 1)
    kinds.forEach((k, j) => {
      const text = runs[j]![i];
      if (text) out.push({ kind: k, text });
    });
  return out;
}
