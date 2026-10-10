import { CITY_CENTRE } from "@/data/give-boundary";
import { pinFor, type Pin } from "@/data/give-pins";
import type { Item, ItemType } from "@/data/items";
import { signInFeedLines, type SignInFeedKind } from "@/data/signin-feed";

/**
 * COMMUNI-G — everyone's bottom loop, opened. Pure data helpers for the
 * communi-g view (CommunityFeed), its loop-riding page toggle and its map.
 *
 * THE MODES the page visits round the lower loop, at the wheel's seat
 * angles (EarSelector SEAT_ANGLE; PerimeterToggle maps each mode to its
 * seat), clockwise from 12:00 (the exit back to the full G):
 *   give 1:30 · lend 3:00 · trade 4:30 · everything 6:00 (entry) ·
 *   fund 7:30 · borrow 9:00 · wish 10:30
 * Lend is a borrow record with side "lend"; fund is a wish with a money
 * target (details.fundTarget). No new tables: this only reads Items.
 */
export type CgMode = "everything" | SignInFeedKind;

/** The modes in clock order from 1:30 (see above). */
export const CG_MODES: CgMode[] = ["give", "lend", "trade", "everything", "fund", "borrow", "wish"];

/** The mode colour (the frame stays red; this is the INTERIOR ink). */
export const CG_COLOUR: Record<CgMode, string> = {
  everything: "var(--mode-communigy)",
  give: "var(--mode-give)",
  lend: "var(--mode-lend)",
  trade: "var(--mode-trade)",
  fund: "var(--mode-fund)",
  borrow: "var(--mode-borrow)",
  wish: "var(--mode-wish)",
};

/** Text ink: the pale seats read in their deeper text tints. */
export const CG_INK: Record<CgMode, string> = {
  ...CG_COLOUR,
  lend: "var(--mode-lend-text)",
  borrow: "var(--mode-borrow-text)",
};

/** Plural words for the interior heading ("communi-g trades"). */
export const CG_WORD: Record<CgMode, string> = {
  everything: "everything",
  give: "gives",
  lend: "lends",
  trade: "trades",
  fund: "funds",
  borrow: "borrows",
  wish: "wishes",
};

/** Which mode an item belongs to (lend and fund are views of borrow / wish). */
export function itemMode(item: Pick<Item, "type" | "side" | "details">): SignInFeedKind {
  if (item.type === "borrow") return item.side === "lend" ? "lend" : "borrow";
  if (item.type === "wish" && item.details?.fundTarget) return "fund";
  return item.type;
}

/** Does an item show under a mode? Fund wishes still show under wish too. */
export function inMode(item: Pick<Item, "type" | "side" | "details">, mode: CgMode): boolean {
  if (mode === "everything") return true;
  if (mode === "wish") return item.type === "wish";
  return itemMode(item) === mode;
}

/** The mode a type (+ side) opens on. */
export function modeFor(type: ItemType | null, side?: "borrow" | "lend"): CgMode {
  if (!type) return "everything";
  if (type === "borrow") return side === "lend" ? "lend" : "borrow";
  return type;
}

/* ---------------------------------------------------------------------------
 * THE MAP'S PINS.
 *
 * Only explicitly supplied device pins may be mapped. Unknown locations stay
 * unknown; no hashed bearings, assumed city or filler listings.
 * ------------------------------------------------------------------------- */
export type MapPin = {
  id: string;
  mode: SignInFeedKind;
  pin: Pin;
  text: string;
  /** A real listing (opens its detail) vs a sample feed line. */
  itemId: string | null;
  sample: boolean;
  exact: boolean;
};

const MIN_PER_MODE = 3;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** A point `km` from `from` on a bearing (degrees clockwise from north). */
export function destination(from: Pin, km: number, bearingDeg: number): Pin {
  const R = 6371;
  const d = km / R;
  const b = (bearingDeg * Math.PI) / 180;
  const la1 = (from.lat * Math.PI) / 180;
  const lo1 = (from.lng * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 =
    lo1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(la1),
      Math.cos(d) - Math.sin(la1) * Math.sin(la2),
    );
  return { lat: (la2 * 180) / Math.PI, lng: (lo2 * 180) / Math.PI };
}

/** Great-circle distance in km. */
export function kmBetween(a: Pin, b: Pin): number {
  const R = 6371;
  const dLa = ((b.lat - a.lat) * Math.PI) / 180;
  const dLo = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const placed = (id: string, km: number | undefined): Pin => {
  const dist = km ?? 0.4 + hash(`${id}:km`) * 2.4;
  return destination(CITY_CENTRE, Math.max(0.15, dist), hash(id) * 360);
};

export function mapPins(items: Item[], mode: CgMode, itemText: (item: Item) => string): MapPin[] {
  return items.filter(i=>inMode(i,mode)).flatMap(item=> {
    const pin=pinFor(item.id);
    return pin ? [{id:item.id,mode:itemMode(item),pin,text:itemText(item),itemId:item.id,sample:item.id.startsWith("seed-"),exact:false}] : [];
  });
}

/** NEAR ME: the radius the circle draws and the filter keeps (km). */
export const NEAR_KM = 2;
