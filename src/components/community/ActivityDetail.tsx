import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine, type ItemType } from "@/data/items";
import {
  STATE_WORD,
  activityStatus,
  connectionsForItem,
  connectionsStore,
  isOpen,
  myConnectionFor,
} from "@/data/connections";
import { myProfileStore } from "@/data/my-profile";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * ONE ACTIVITY, IN FULL — AND ONE HONEST BUTTON.
 *
 * The button below starts something; it never finishes anything. Pressing it
 * expresses INTENT: it opens a conversation between two people and leaves the
 * activity exactly where it was, still active, still discoverable by others.
 */

/** THE INVITATION, in the language of the activity. Never "claim" or "accept". */
const INTENT_WORD: Record<ItemType, string> = {
  wish: "think you can grant this wish?",
  give: "would this help you?",
  trade: "want to trade?",
  borrow: "can you lend this?",
};

export function ActivityDetail({
  itemId,
  onOpenConnection,
  onClose,
}: {
  itemId: string;
  onOpenConnection: (connectionId: string) => void;
  onClose: () => void;
}) {
  const items = useItems();
  const links = useConnections();
  const sparkles = useMyProfile().sparkles;
  const item = items.items.find((i) => i.id === itemId);

  if (!item)
    return (
      <div
        data-world="community"
        className="relative flex h-full w-full flex-col justify-center px-7"
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
      >
        <BackArrow onClick={onClose} />
        <p className="g-display">this one is gone</p>
      </div>
    );

  const owner = memberById(item.ownerId);
  const mine = myConnectionFor(links, item.id);
  const status = activityStatus(links, item.id, item.status);
  const others = connectionsForItem(links, item.id).filter(
    (c) => isOpen(c) && c.helperId !== ME_ID,
  ).length;

  const step = () => {
    buzz();
    if (mine) {
      onOpenConnection(mine.id);
      return;
    }
    /* INTENT ONLY. This opens a conversation — it completes nothing. */
    const result = connectionsStore.expressIntent(item.id, ME_ID);
    if (result.ok && result.id) onOpenConnection(result.id);
  };

  return (
    <div
      data-world="community"
      className="g-page g-page-top g-page-bottom relative flex h-full w-full flex-col overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to community" />

      <span
        className="g-heading"
        style={{ color: ACTIVITY_FILL[item.type] }}
      >
        {/* WHAT THIS IS, SAID EXACTLY: borrowing and lending are not the same. */}
        {item.type === "borrow" && item.side === "lend"
          ? "lending"
          : item.type === "borrow"
            ? "wants to borrow"
            : item.type}
      </span>
      <h1
        className="g-display mt-4"
        style={{ color: ACTIVITY_FILL[item.type] }}
      >
        {itemLine(item)}
      </h1>

      {/* WHO POSTED IT, RIGHT NEXT TO WHAT IT IS. No hunting. */}
      <p className="g-meta mt-5">
        {owner ? owner.username : "someone"}
        {item.distanceKm === undefined ? "" : ` · ${item.distanceKm} km away`}
        {" · "}
        {status === "completed"
          ? "completed and verified"
          : mine
            ? STATE_WORD[mine.state]
            : status === "connecting"
              ? `${others} ${others === 1 ? "person" : "people"} already talking — still open`
              : "open"}
      </p>

      {item.note ? (
        <p className="mt-3 g-body opacity-70">
          {item.note}
        </p>
      ) : null}

      {/* THE PHOTOS OF THE REAL THING, from the one shared record. */}
      {item.photos?.length ? (
        <div className="mt-4 flex gap-3 overflow-x-auto">
          {item.photos.map((p, i) => (
            <img
              key={i}
              src={p}
              alt={`${itemLine(item)} photo ${i + 1}`}
              className="h-32 w-32 shrink-0 object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col items-start gap-4 pb-4">

        {status === "completed" ? (
          <p className="g-display-sm opacity-45">
            this one already happened.
          </p>
        ) : (
          <button
            type="button"
            onClick={step}
            className="text-left g-display-sm"
            style={{ color: ACTIVITY_FILL[item.type] }}
          >
            {mine ? "open the conversation" : INTENT_WORD[item.type]}
          </button>
        )}

        {/* SPARKLES HELP SOMEBODY ELSE GET SEEN. Not a completion, not a payment. */}
        {status !== "completed" ? (
          <button
            type="button"
            disabled={sparkles < 1}
            onClick={() => {
              buzz();
              myProfileStore.useSparkle(item.id);
            }}
            className="text-[12px] font-black lowercase tracking-[0.26em] disabled:opacity-25"
            style={{ color: "var(--giver-participation)" }}
          >
            {item.boostCount > 0 ? `sparkled ×${item.boostCount}` : "sparkle this"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
