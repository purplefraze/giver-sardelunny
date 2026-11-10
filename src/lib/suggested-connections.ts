import { itemLine, type Item } from "@/data/items";
import { kmBetween, listingPin } from "@/data/communigy";
import type { Pin } from "@/data/give-pins";

const CONCEPTS: [string, RegExp][] = [
  ["cake baking", /\bcakes?\b|\bbak(?:e|es|er|ers|ing)\b/],
  ["dog walking", /\bdogs?\b|\bcanine\b|\bpet(?:s)?\b/],
  ["science tutoring", /\bscience\b|\bphysics\b|\bchemistry\b|\bbiology\b/],
  ["math tutoring", /\bmath(?:s|ematics)?\b|\balgebra\b|\bcalculus\b/],
  ["food", /\bfood\b|\bmeals?\b|\bgroceries\b|\bcook(?:ing)?\b/],
  ["bicycle", /\bbikes?\b|\bbicycles?\b|\bcycling\b/],
];
const STOP = new Set("a an the i my me for to of and with wish wishing want wanted need needed offer offering give giving can help twice weekly nearby".split(" "));
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{3,}/g)?.filter(w => !STOP.has(w)) ?? []);
const textOf = (i: Item) => [itemLine(i), i.note, i.details?.topic, ...Object.values(i.details?.extras ?? {})].filter(Boolean).join(" ");
export type Suggestion = { item: Item; reason: string; score: number; distanceKm: number | null };

/** Read-only local discovery, never an AI promise, post or connection mutation. */
export function suggestedConnections(query: string, offers: Item[], options: { ownerId?: string; centre?: Pin | null; radiusKm?: number | null; pin?: (i: Item) => Pin | null } = {}): Suggestion[] {
  if (!query.trim()) return [];
  const tokens = words(query);
  const concepts = CONCEPTS.filter(([, pattern]) => pattern.test(query));
  return offers.flatMap(item => {
    if (item.status !== "active" || !item.published || item.ownerId === options.ownerId || !(item.type === "give" || (item.type === "borrow" && item.side === "lend"))) return [];
    const text = textOf(item), candidate = words(text);
    const shared = [...tokens].filter(w => candidate.has(w)).length;
    const concept = concepts.find(([, pattern]) => pattern.test(text));
    const score = shared + (concept ? 3 : 0);
    if (score < 1) return [];
    const pin = (options.pin ?? listingPin)(item);
    const distanceKm = options.centre && pin ? kmBetween(options.centre, pin) : null;
    if (options.radiusKm != null && (distanceKm === null || distanceKm > options.radiusKm)) return [];
    return [{ item, score, distanceKm, reason: concept ? `might help with ${concept[0]}` : "shares something you're looking for" }];
  }).sort((a,b) => b.score-a.score || (a.distanceKm ?? Infinity)-(b.distanceKm ?? Infinity) || a.item.id.localeCompare(b.item.id)).slice(0,5);
}