import type { Seat } from "@/components/living-g/EarSelector";
import { ME_ID, type BorrowSide, type Item, type ItemsState } from "@/data/items";
import type { Connection } from "@/data/connections";

/**
 * TOGGLE HINT COPY, keyed by toggle seat.
 * `middle` = YOUR ACTION, shown in the upper bowl of the G (LivingG region
 * "middle"); `bottom` = THE OTHER SIDE, shown in the lower bowl (region
 * "bottom"). The small ear ring is where the toggle lives and never carries
 * hint copy. Shown faintly for ~1.8s on every toggle use, then gone — never
 * permanent copy — per seat, until that seat is retired (seatHintRetired below).
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
 * PER-SEAT HINT RETIREMENT — read-only selectors over EXISTING stores only
 * (no new store, table or storage key):
 *
 *   items        itemsStore / useItems — what CategoryForm's publish writes
 *                (myProfileStore.addItem → itemsStore.add(ME_ID, type, …)).
 *                Lend and borrow share type "borrow", split by `side`.
 *   connections  connectionsStore / useConnections — written when I step
 *                forward on someone else's activity (expressIntent: I am the
 *                `helperId`).
 *
 * A seat goes silent once I have done THAT seat's action; other seats keep
 * hinting. Items count in ANY status (expiry/completion keep the record);
 * connections count unless cancelled. My G is always silent.
 *
 *   give    I own a "give" item
 *   wish    I own a "wish" item
 *   trade   I own a "trade" item, or I stepped forward on someone's trade
 *   borrow  I own a "borrow" item with side "borrow" (asked to borrow), or I
 *           stepped forward on someone's LEND offer (asked to borrow it)
 *   lend    I own a "borrow" item with side "lend" (offered to lend), or I
 *           stepped forward on someone's BORROW request (offered to lend)
 */
type HelperLink = Pick<Connection, "itemId" | "type" | "helperId" | "state">;
type LinksState = { connections: HelperLink[] };

const sideOf = (i: Item): BorrowSide => i.side ?? "borrow";

function ownsItem(items: ItemsState, match: (i: Item) => boolean): boolean {
  return items.items.some((i) => i.ownerId === ME_ID && match(i));
}

/** Connections where I stepped forward on someone else's activity. */
function helped(
  items: ItemsState,
  links: LinksState,
  match: (c: HelperLink, item: Item | undefined) => boolean,
): boolean {
  return links.connections.some(
    (c) =>
      c.helperId === ME_ID &&
      c.state !== "cancelled" &&
      match(
        c,
        items.items.find((i) => i.id === c.itemId),
      ),
  );
}

/** True when this seat's hint is retired (or the seat never hints). */
export function seatHintRetired(seat: Seat, items: ItemsState, links: LinksState): boolean {
  switch (seat) {
    case "give":
      return ownsItem(items, (i) => i.type === "give");
    case "wish":
      return ownsItem(items, (i) => i.type === "wish");
    case "trade":
      return (
        ownsItem(items, (i) => i.type === "trade") ||
        helped(items, links, (c) => c.type === "trade")
      );
    case "borrow":
      return (
        ownsItem(items, (i) => i.type === "borrow" && sideOf(i) === "borrow") ||
        helped(
          items,
          links,
          (c, item) => c.type === "borrow" && item !== undefined && sideOf(item) === "lend",
        )
      );
    case "lend":
      return (
        ownsItem(items, (i) => i.type === "borrow" && sideOf(i) === "lend") ||
        helped(
          items,
          links,
          (c, item) => c.type === "borrow" && item !== undefined && sideOf(item) === "borrow",
        )
      );
    default:
      /* My G: always silent. */
      return true;
  }
}
