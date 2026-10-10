import { z } from "zod";

export const collectionPinSchema = z.object({ lat: z.number().finite().min(-85).max(85), lng: z.number().finite().min(-180).max(180) });
export const collectionLabelSchema = z.string().trim().min(2).max(100).refine(value => !/\b(pluto|mars|jupiter|saturn|neptune|uranus|outer space)\b/i.test(value), "choose a real collection area on earth");
export const collectionLocationSchema = z.object({ label: collectionLabelSchema, pin: collectionPinSchema, source: z.enum(["device", "place"]) });
export type CollectionLocation = z.infer<typeof collectionLocationSchema>;

/** Device locations are already privacy-offset by askLocation. Keep only a coarse grid. */
export function coarseCollectionPin(pin: z.infer<typeof collectionPinSchema>) {
  const p = collectionPinSchema.parse(pin);
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}
/** A dragged pin may refine an established area, never invent another location. */
export function nearbyCollectionPin(origin: z.infer<typeof collectionPinSchema>, pin: z.infer<typeof collectionPinSchema>) {
  if (!collectionPinSchema.safeParse(pin).success) return false;
  const dy = (pin.lat - origin.lat) * 111320;
  const dx = (pin.lng - origin.lng) * 111320 * Math.cos(origin.lat * Math.PI / 180);
  return Math.hypot(dx, dy) <= 2000;
}
export function validCollectionLocation(location: unknown, label: string) {
  const result = collectionLocationSchema.safeParse(location);
  return result.success && result.data.label === label.trim();
}