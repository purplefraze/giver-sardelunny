import type { CgMode } from "@/data/communigy";

/**
 * LOWER-LOOP SELECTION — one value drives the inside toggle, the filter row
 * and the feed. "map" is NOT a seat: it means Community (everything) shown in
 * the map view. "mine" remains a
 * legacy voice scope routed to My G activity, never a lower seat.
 */
export type CgSelection = CgMode | "map" | "mine";

export const CG_FILTERS: { value: CgSelection; word: string }[] = [
  { value: "wish", word: "wishes" },
  { value: "borrow", word: "borrows" },
  { value: "fund", word: "funds" },
  { value: "everything", word: "communi-g" },
  { value: "trade", word: "trades" },
  { value: "lend", word: "lends" },
  { value: "give", word: "gives" },
];

const RULES: [RegExp, CgSelection][] = [
  [/\bmap\b/, "map"],
  [/\b(?:my (?:posts|gives|wishes|trades|borrows|lends|funds|community posts|active posts)|mine)\b/, "mine"],
  [/\bgives?\b|\bgiving\b/, "give"],
  [/\bwish(?:es)?\b/, "wish"],
  [/\btrades?\b|\btrading\b/, "trade"],
  [/\bborrow(?:s|ing)?\b/, "borrow"],
  [/\blend(?:s|ing)?\b/, "lend"],
  [/\bfunds?\b|\bfunding\b/, "fund"],
  [/\b(?:all|everything)\b/, "everything"],
];

/** "show community borrows" → borrow. Needs "community" or a show/filter verb. */
export function communityFilterOf(raw: string, inCommunity = false): CgSelection | null {
  const t = raw.toLowerCase().replace(/[’]/g, "'");
  const scoped = /\bcommunity\b|\bcommuni-?g\b/.test(t);
  if (!scoped && !(inCommunity && /\b(?:show|filter|only|see|just|all|everything)\b/.test(t))) return null;
  if (scoped && /\bmy (?:posts|gives|wishes|trades|borrows|lends|funds)\b/.test(t)) return "mine";
  for (const [re, v] of RULES) if (re.test(t)) return v;
  return scoped ? "everything" : null;
}
