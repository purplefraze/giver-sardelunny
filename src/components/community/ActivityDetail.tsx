import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine, type Item, type ItemType } from "@/data/items";
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
import { ItemFacts, itemKindWord } from "@/components/profile/ItemFacts";
import { buzz } from "@/lib/haptics";

/**
 * ONE ITEM, IN FULL — WHOEVER POSTED IT, WHEREVER IT WAS OPENED FROM.
 *
 * This is the shared detail experience for every give, wish, trade, lend and
 * borrow in Giver: the community feed, any person's profile and my own profile
 * all land here, because there is only ever one record behind them.
 *
 * The actions below START something; they never finish anything. They express
 * INTENT and open a conversation ABOUT THIS ITEM, leaving the activity exactly
 * where it was — still active, still discoverable by other people.
 */

/** THE INVITATION, in the language of the activity. Never "claim" or "accept". */
const INTENT_WORD: Record<ItemType, string> = {
  wish: "grant this wish",
  give: "apply for this give",
  trade: "propose a trade",
  borrow: "offer to lend it",
};

/** Lending and borrowing are opposites, and never share a sentence. */
function actionWord(item: Item): string {
  if (item.type === "borrow")
    return item.side === "lend" ? "ask to borrow it" : "offer to lend it";
  return INTENT_WORD[item.type];
}

export function ActivityDetail({
  itemId,
  onOpenConnection,
  onOpenProfile,
  onClose,
}: {
  itemId: string;
  onOpenConnection: (connectionId: string) => void;
  /** The person is always their own destination. */
  onOpenProfile?: (ownerId: string) => void;
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
        style={{ background: "var(--world-bg)", color: "var(--giver-ink)" }}
      >
        <BackArrow onClick={onClose} />
        <p className="g-display">this one is gone</p>
      </div>
    );

  const owner = memberById(item.ownerId);
  const isMine = item.ownerId === ME_ID;
  const who = isMine ? "you" : (owner?.username ?? "someone");
  const mine = myConnectionFor(links, item.id);
  const status = activityStatus(links, item.id, item.status);
  const others = connectionsForItem(links, item.id).filter(
    (c) => isOpen(c) && c.helperId !== ME_ID,
  ).length;
  const fill = ACTIVITY_FILL[item.type];

  /**
   * ONE DOOR, TWO WAYS THROUGH IT. Messaging and responding both open the
   * conversation that belongs TO THIS ITEM, so the other person always sees
   * what the message is about — never an unexplained generic chat.
   */
  const open = () => {
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
      style={{ background: "var(--world-bg)", color: "var(--giver-ink)" }}
    >
      <BackArrow onClick={onClose} label="back" />

      {/* WHAT THIS IS, SAID EXACTLY: borrowing and lending are not the same. */}
      <span className="g-heading" style={{ color: fill }}>
        {itemKindWord(item)}
      </span>
      <h1 className="g-display mt-4" style={{ color: fill }}>
        {itemLine(item)}
      </h1>

      {/* WHO POSTED IT, RIGHT NEXT TO WHAT IT IS — and they are clickable. */}
      <p className="g-meta mt-5">
        {isMine || !owner ? (
          who
        ) : (
          <button
            type="button"
            onClick={() => {
              buzz();
              onOpenProfile?.(owner.id);
            }}
            className="font-black underline decoration-current/40 underline-offset-4"
            style={{ color: "var(--giver-others)" }}
          >
            {owner.username}
          </button>
        )}
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

      {/*
        THE PERSON, NOT JUST THEIR NAME. The item and whoever is behind it are
        read in the same breath — one door straight through to their whole
        profile, in the shared profile system everybody else uses.
      */}
      {!isMine && owner ? (
        <button
          type="button"
          onClick={() => {
            buzz();
            onOpenProfile?.(owner.id);
          }}
          className="g-rule mt-6 flex w-full items-center gap-4 pt-5 text-left transition-opacity active:opacity-60"
        >
          {owner.photo ? (
            <img
              src={owner.photo}
              alt={owner.username}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="h-14 w-14 shrink-0 rounded-full"
              style={{ background: "var(--giver-ink)", opacity: 0.08 }}
            />
          )}
          <span className="min-w-0">
            <span className="g-name block" style={{ color: "var(--giver-others)" }}>
              {owner.username}
            </span>
            <span className="g-meta mt-1 block opacity-55">
              {[owner.age ? `${owner.age}` : null, owner.gender || null, owner.distance || null]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="g-meta mt-1 block opacity-40">see their whole profile</span>
          </span>
        </button>
      ) : null}


      {/* THE PHOTOS OF THE REAL THING, from the one shared record. */}
      {item.photos?.length ? (
        <div className="mt-6 flex gap-3 overflow-x-auto">
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

      {/* EVERY STRUCTURED PARAMETER, ORGANISED — never a flat string. */}
      <ItemFacts item={item} accent={fill} />

      <div className="mt-10 flex flex-col items-start gap-5 pb-4">
        {status === "completed" ? (
          <p className="g-display-sm opacity-45">this one already happened.</p>
        ) : isMine ? (
          <p className="g-body opacity-55">this one is yours.</p>
        ) : (
          <>
            {/* THE RESPONSE, IN THIS ITEM'S OWN LANGUAGE. */}
            <button
              type="button"
              onClick={open}
              className="text-left g-display-sm"
              style={{ color: fill }}
            >
              {mine ? "open the conversation" : actionWord(item)}
            </button>

            {/* MESSAGING, WITH THE ITEM AS ITS SUBJECT. */}
            <button
              type="button"
              onClick={open}
              className="text-left text-[13px] font-black lowercase tracking-[0.26em]"
              style={{ color: "var(--giver-messages)" }}
            >
              {`message ${who}`}
            </button>
          </>
        )}

        {/* SPARKLES HELP SOMEBODY ELSE GET SEEN. Not a completion, not a payment. */}
        {status !== "completed" && !isMine ? (
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
