import type { Seat } from "@/components/living-g/EarSelector";
import { ME_ID, type ItemsState, type ItemType } from "@/data/items";

/**
 * TOGGLE HINT COPY, keyed by toggle seat.
 * `middle` = YOUR ACTION, shown in the upper bowl of the G (LivingG region
 * "middle"); `bottom` = THE OTHER SIDE, shown in the lower bowl (region
 * "bottom"). The small ear ring is where the toggle lives and never carries
 * hint copy. Shown faintly for ~1.8s on every toggle use, then gone — never
 * permanent copy — until the hints are retired (see hintsRetired below).
 */
export type LoopCopy = { middle: string; bottom: string };

const LOOP_COPY: Record<Seat, LoopCopy> = {
  give: { middle: "give something", bottom: "get something" },
  wish: { middle: "make a wish", bottom: "grant a wish" },
  borrow: { middle: "borrow something", bottom: "lend something" },
  lend: { middle: "lend something", bottom: "borrow something" },
  trade: { middle: "trade for something", bottom: "trade for something" },
  /** My G: no loop copy. */
  giver: { middle: "", bottom: "" },
};

export function loopCopyFor(seat: Seat): LoopCopy {
  return LOOP_COPY[seat] ?? { middle: "", bottom: "" };
}

/** True when a seat has any hint copy at all (My G has none). */
export function hasLoopCopy(seat: Seat): boolean {
  const { middle, bottom } = loopCopyFor(seat);
  return Boolean(middle || bottom);
}

/**
 * HINT RETIREMENT — read-only, derived from the EXISTING items collection
 * (itemsStore / useItems), which is exactly what CategoryForm's publish writes
 * to (myProfileStore.addItem → itemsStore.add(ME_ID, type, …)).
 *
 * "Posted" = at least one item I own of that type, in ANY status (active,
 * paused, completed, archived — expiry/completion keep the record). Only
 * "give" and "wish" count; lend lives under type "borrow" and never counts.
 * No new store or storage key.
 */
function postedMine(state: ItemsState, type: ItemType): boolean {
  return state.items.some((i) => i.ownerId === ME_ID && i.type === type);
}

/** Hints go silent for good once I have posted a Give AND a Wish. */
export function hintsRetired(state: ItemsState): boolean {
  return postedMine(state, "give") && postedMine(state, "wish");
}
