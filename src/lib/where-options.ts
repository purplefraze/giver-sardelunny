import { collectionPinSchema, coarseCollectionPin } from "./collection-location";

/**
 * WHERE — never free text. The public "where" is only ever one of these,
 * resolved against a real place: the device (exact or approximate) or the
 * free OpenStreetMap Nominatim search already used for collection areas.
 */
export type WhereMode = "exact" | "approximate" | "intersection" | "neighbourhood" | "street";
export const WHERE_MODES: { mode: WhereMode; label: string; placeholder?: string }[] = [
  { mode: "exact", label: "exact" },
  { mode: "approximate", label: "approximate" },
  { mode: "intersection", label: "intersection", placeholder: "queen st & spadina ave, toronto" },
  { mode: "neighbourhood", label: "neighbourhood", placeholder: "kensington market, toronto" },
  { mode: "street", label: "street", placeholder: "college st, toronto" },
];
export type WherePick = { label: string; pin: { lat: number; lng: number } };

const INTERSECTION = /\s(&|and|at|\/|@)\s|\s?&\s?|\//i;
/** What the typed query must look like before any search runs. */
export function whereQueryProblem(mode: WhereMode, query: string): string | null {
  const q = query.trim();
  if (mode === "exact" || mode === "approximate") return null;
  if (q.length < 3 || !/[a-z]/i.test(q)) return "type a real place to search";
  if (q.length > 100) return "keep it under 100 characters";
  if (mode === "intersection" && !INTERSECTION.test(q)) return "name two streets, like queen st & spadina ave";
  return null;
}

type Hit = { lat?: string; lon?: string; address?: Record<string, string> };
const lower = (s: string) => s.trim().toLowerCase();
/** A search hit as a public label for that mode — or null when it is not that kind of place. */
export function whereFromHit(mode: WhereMode, hit: Hit, query = ""): WherePick | null {
  const pin = collectionPinSchema.safeParse({ lat: Number(hit.lat), lng: Number(hit.lon) });
  const a = hit.address ?? {};
  if (!pin.success || !a["country"]) return null;
  const city = a["city"] ?? a["town"] ?? a["village"] ?? a["municipality"] ?? a["county"];
  let place: string | undefined;
  if (mode === "street") place = a["road"];
  else if (mode === "neighbourhood") place = a["neighbourhood"] ?? a["suburb"] ?? a["quarter"] ?? a["city_district"];
  else if (mode === "intersection") {
    if (!a["road"]) return null;
    const streets = query.split(/\s(?:&|and|at|@)\s|&|\//i).map(s => s.split(",")[0]!.trim()).filter(Boolean);
    place = streets.length >= 2 ? `${lower(streets[0]!)} & ${lower(streets[1]!)}` : undefined;
  }
  if (!place) return null;
  const label = [lower(place), city && lower(city) !== lower(place) ? lower(city) : null].filter(Boolean).join(", ");
  return { label, pin: coarseCollectionPin(pin.data) };
}

const QUERY: Record<"intersection" | "neighbourhood" | "street", (q: string) => string> = {
  intersection: q => q.replace(/\s(?:and|at|@)\s/i, " & "),
  neighbourhood: q => q,
  street: q => q,
};
/** Explicit search only (never per keystroke), Nominatim's free endpoint. */
export async function searchWhere(mode: "intersection" | "neighbourhood" | "street", query: string, signal?: AbortSignal): Promise<WherePick[]> {
  const problem = whereQueryProblem(mode, query);
  if (problem) throw new Error(problem);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(QUERY[mode](query.trim()))}`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error("place search is unavailable; try again or use a location option");
  const hits: unknown = await response.json();
  if (!Array.isArray(hits)) return [];
  const seen = new Set<string>();
  return hits.flatMap((h: Hit) => { const p = whereFromHit(mode, h, query); if (!p || seen.has(p.label)) return []; seen.add(p.label); return [p]; });
}
