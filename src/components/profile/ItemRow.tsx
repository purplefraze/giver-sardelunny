import { ACTIVITY_FILL, itemLine, type Item } from "@/data/items";
import { factLine, itemKindWord } from "@/components/profile/ItemFacts";
import { buzz } from "@/lib/haptics";

/**
 * ONE ITEM, IN A LIST, ANYWHERE — mine, Giulia's, Marcus's, anyone's.
 *
 * A big expressive headline in the item's own category colour, the word it
 * calls itself above it, and its structured parameters underneath. Always a
 * touch target: tapping opens the item's own rich detail.
 */
export function ItemRow({
  item,
  onOpen,
  trailing,
}: {
  item: Item;
  onOpen: (itemId: string) => void;
  /** Optional right-hand affordance (a sparkle, a count). Never a card badge. */
  trailing?: React.ReactNode;
}) {
  const fill = ACTIVITY_FILL[item.type];
  const facts = factLine(item, item.boostCount ? [`sparkled ×${item.boostCount}`] : []);
  return (
    <li className="g-rule py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => {
            buzz();
            onOpen(item.id);
          }}
          className="min-w-0 flex-1 text-left transition-opacity active:opacity-60"
        >
          <span className="g-meta block" style={{ color: fill, opacity: 0.9 }}>
            {itemKindWord(item)}
          </span>
          <span
            className="g-display-sm mt-1.5 block"
            style={{ color: fill }}
          >
            {itemLine(item)}
          </span>
          {facts ? <span className="g-body mt-2 block opacity-60">{facts}</span> : null}
        </button>
        {trailing ? <div className="shrink-0 pt-5">{trailing}</div> : null}
      </div>
    </li>
  );
}
