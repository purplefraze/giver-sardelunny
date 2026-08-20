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
      className="g-page g-page-top g-page-bottom relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <h1 className="g-display">community</h1>
      <p className="g-meta mt-3">everything moving near you right now</p>

      {/* FILTERS ARE WORDS, NOT CHIPS OR ICONS. */}
      <div className="g-rule mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-2 pt-4 text-[13px] font-black lowercase tracking-[0.18em]">
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

      <div className="mt-3 flex gap-5 text-[10px] font-black lowercase tracking-[0.26em] opacity-45">
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

      <ul className="mt-7 flex-1 overflow-y-auto pb-10">
        {list.length === 0 ? (
          <li className="g-lede opacity-55">
            nothing here yet — yours could be the first
          </li>
        ) : null}
        {list.map((item, index) => {
          const owner = memberById(item.ownerId);
          const status = activityStatus(links, item.id, item.status);
          return (
            <li key={item.id} className={index === 0 ? undefined : "g-rule"}>
              <button
                type="button"
                className="block w-full py-7 text-left"
                onClick={() => {
                  buzz();
                  onOpen(item.id);
                }}
              >
                <span className="flex items-baseline justify-between gap-4">
                  <span
                    className="g-heading"
                    style={{ color: ACTIVITY_FILL[item.type] }}
                  >
                    {item.type}
                  </span>
                  <span className="g-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span
                  className="g-display-sm mt-3 block"
                  style={{ color: ACTIVITY_FILL[item.type] }}
                >
                  {itemLine(item)}
                </span>
                {item.note ? (
                  <span className="g-body mt-3 block opacity-65">{item.note}</span>
                ) : null}
                <span className="g-meta mt-4 block">
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
