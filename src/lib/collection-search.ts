import { collectionLabelSchema, collectionPinSchema, coarseCollectionPin, type CollectionLocation } from "./collection-location";

/** Reuse the prototype's OSM provider on explicit search only; no forbidden per-keystroke autocomplete. */
export async function searchCollectionArea(query: string, signal?: AbortSignal): Promise<CollectionLocation[]> {
  const checked = collectionLabelSchema.safeParse(query);
  if (!checked.success) throw new Error("enter a real intersection or area and city");
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&q=${encodeURIComponent(checked.data)}`, { headers: { Accept: "application/json" }, ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error("place search is unavailable; try again or use my location");
  const results: unknown = await response.json();
  if (!Array.isArray(results)) return [];
  return results.flatMap((hit: { lat?: string; lon?: string; address?: Record<string, string> }) => {
    const pin = collectionPinSchema.safeParse({ lat: Number(hit.lat), lng: Number(hit.lon) });
    const a = hit.address ?? {};
    // Never publish house number, full address or the provider's display_name.
    const area = a["neighbourhood"] ?? a["suburb"] ?? a["quarter"] ?? a["city_district"] ?? a["road"] ?? a["town"] ?? a["city"] ?? a["village"];
    const city = a["city"] ?? a["town"] ?? a["village"] ?? a["county"];
    const label = collectionLabelSchema.safeParse([area, city !== area ? city : undefined, a["country"]].filter(Boolean).join(", ").toLowerCase());
    return pin.success && label.success && area ? [{ label: label.data, pin: coarseCollectionPin(pin.data), source: "place" as const }] : [];
  });
}