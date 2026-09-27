/**
 * THE EXACT PIN NEVER LEAVES THIS DEVICE.
 *
 * `items` and `profiles` are publicly readable, so a give's exact coordinates
 * are never written to items.details or any other shared column: only the
 * coarse label (a neighbourhood, or "near <street>") is. The exact pin lives
 * here, in localStorage keyed by the item id, for "reveal on match" later
 * (a follow-up: it would need a private owner-only table — not built).
 */
const KEY = "giver.give-pins.v1";

export type Pin = { lat: number; lng: number };

function read(): Record<string, Pin> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, Pin>;
  } catch {
    return {};
  }
}

export function savePin(itemId: string, pin: Pin) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), [itemId]: pin }));
  } catch {
    /* storage full: the give still saves with its coarse label */
  }
}

export function pinFor(itemId: string): Pin | null {
  return read()[itemId] ?? null;
}
