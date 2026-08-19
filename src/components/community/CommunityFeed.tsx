import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import {
  ACTIVITY_FILL,
  ITEM_TYPES,
  ME_ID,
  communityItems,
  itemLine,
  type ItemType,
} from "@/data/items";
import { activityStatus } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { buzz } from "@/lib/haptics";

/**
 * THE COMMUNITY IS ONE MIXED FLOW OF REAL ACTIVITY.
 *
 * Wishes, gives, trades and borrows live side by side — the same Items their
 * owners posted, never copies — because discovering the mix is what makes the
 * place feel alive. Filters narrow it; they never split it into four apps.
 *
 * NOTHING DISAPPEARS BECAUSE SOMEONE IS INTERESTED. An activity someone has
 * stepped forward on stays right here, honestly labelled "connecting".
 */

type Sort = "latest" | "nearby";

export function CommunityFeed({
  initialType = null,
  onOpen,
  onClose,
}: {
  initialType?: ItemType | null;
  onOpen: (itemId: string) => void;
  onClose: () => void;
}) {
  const items = useItems();
  const links = useConnections();
  const [type, setType] = useState<ItemType | null>(initialType);
  const [sort, setSort] = useState<Sort>("latest");

  const list = communityItems(items, {
    ...(type ? { type } : {}),
    excludeOwnerId: ME_ID,
  }).sort((a, b) =>
    sort === "latest"
      ? b.createdAt - a.createdAt
      : (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999),
  );

  return (
    <div
      data-world="community"
      className="relative flex h-full w-full flex-col overflow-hidden px-6 pb-8 pt-16"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <h1 className="text-[13vw] font-black lowercase leading-[0.82] tracking-[-0.055em]">
        community
      </h1>

      {/* FILTERS ARE WORDS, NOT CHIPS OR ICONS. */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[13px] font-black lowercase tracking-[0.2em]">
        <button
          type="button"
          onClick={() => setType(null)}
          className={type === null ? "opacity-100" : "opacity-35"}
        >
          everything
        </button>
        {ITEM_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={type === t ? "opacity-100" : "opacity-35"}
            style={{ color: ACTIVITY_FILL[t] }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] font-black lowercase tracking-[0.28em] opacity-45">
        {(["latest", "nearby"] as Sort[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={sort === s ? "opacity-100" : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      <ul className="mt-8 flex-1 space-y-7 overflow-y-auto pb-10">
        {list.length === 0 ? (
          <li className="opacity-60">nothing here yet. yours could be first.</li>
        ) : null}
        {list.map((item) => {
          const owner = memberById(item.ownerId);
          const status = activityStatus(links, item.id, item.status);
          return (
            <li key={item.id}>
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  buzz();
                  onOpen(item.id);
                }}
              >
                <span
                  className="block text-[11px] font-black lowercase tracking-[0.3em]"
                  style={{ color: ACTIVITY_FILL[item.type] }}
                >
                  {item.type}
                </span>
                <span
                  className="mt-1 block text-[7.4vw] font-black lowercase leading-[0.94] tracking-[-0.04em]"
                  style={{ color: ACTIVITY_FILL[item.type] }}
                >
                  {itemLine(item)}
                </span>
                {item.note ? (
                  <span className="mt-1 block text-[13px] font-medium lowercase opacity-55">
                    {item.note}
                  </span>
                ) : null}
                <span className="mt-2 block text-[12px] font-medium lowercase opacity-45">
                  {owner ? owner.username : "someone"}
                  {item.distanceKm === undefined ? "" : ` · ${item.distanceKm} km`}
                  {status === "connecting" ? " · connecting" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
