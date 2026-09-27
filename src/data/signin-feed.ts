import { COMMUNITY_GIVES, sampleMembers } from "@/data/giver";
import { splitTrade } from "@/data/items";

/**
 * THE SIGN-IN FEED — community activity lines drifting behind the sign-in
 * circle ("giulia is giving science tutoring").
 *
 * PRIVACY (decision pending with Frazer): nobody real is shown before login.
 * This reads ONLY the app's written SAMPLE fixtures already in the repo —
 * sampleMembers() (the four sample people, never REMOTE testers or edits) and
 * COMMUNITY_GIVES — first names only, and only give / lend / trade lines.
 * No database read, no new public endpoint, no RLS change.
 *
 * THE ONE SWAP POINT: when a sanitized server endpoint exists (first names,
 * give/lend/trade only, opted-in members), replace the body of
 * signInFeedLines() and nothing else changes.
 */
export type SignInFeedKind = "give" | "lend" | "trade";
export type SignInFeedLine = { kind: SignInFeedKind; text: string };

const firstName = (name: string) => (name.trim().split(/\s+/)[0] ?? "").toLowerCase();

const VERB: Record<SignInFeedKind, string> = {
  give: "giving",
  lend: "lending",
  trade: "trading",
};

const line = (kind: SignInFeedKind, who: string, what: string): SignInFeedLine | null => {
  const name = firstName(who);
  const thing = what.trim().toLowerCase();
  return name && thing ? { kind, text: `${name} is ${VERB[kind]} ${thing}` } : null;
};

/** "six bags of apples. come and take them — tom, 400m" -> tom / six bags of apples */
function fromCommunityGive(raw: string): SignInFeedLine | null {
  const [what = "", who = ""] = raw.split(" — ");
  const name = who.split(",")[0] ?? "";
  const thing = what.split(". ")[0] ?? "";
  return line("give", name, thing);
}

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
  /* Interleaved (person by person, give then trade) so the feed never reads
     as one person's list. The sample borrow items are asks, not lends, so the
     fixture currently yields no lend lines; a lend source would slot in here. */
  for (let i = 0; i < depth; i += 1) {
    for (const m of members) {
      const give = m.active.give[i];
      if (give) push(line("give", m.name, give));
      const trade = m.active.trade[i];
      if (trade) {
        const { offer, want } = splitTrade(trade);
        const full = want ? line("trade", m.name, `${offer} for ${want}`) : null;
        push(full && full.text.length <= MAX_CHARS ? full : line("trade", m.name, offer));
      }
    }
  }
  COMMUNITY_GIVES.forEach((raw, i) => {
    const l = fromCommunityGive(raw);
    if (l && l.text.length <= MAX_CHARS) out.splice(Math.min(out.length, 3 + i * 7), 0, l);
  });
  return out;
}
