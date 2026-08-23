import { useMemo, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import {
  ACTIVITY_FILL,
  ME_ID,
  communityItems,
  detailBits,
  itemLine,
  type ItemType,
} from "@/data/items";
import { CATEGORY_PLURAL } from "@/data/my-profile";
import { useItems } from "@/hooks/use-items";
import { buzz } from "@/lib/haptics";
import { OTHER_PERSON_COLOUR, exchangeState } from "@/lib/exchange-colours";

/**
 * SEARCH LIVES INSIDE THE LIVING G.
 *
 * There is no search bar, button or icon anywhere around the G: the top loop IS
 * the search portal, and it only exists on MY OWN G. The toggle has already said
 * which world is being searched, so this screen never asks for a content type
 * again — it opens knowing, and says so in one line.
 */
export function ModeSearch({
  mode,
  onOpen,
  onOpenProfile,
  onClose,
}: {
  mode: ItemType;
  onOpen: (itemId: string) => void;
  onOpenProfile?: (ownerId: string) => void;
  onClose: () => void;
}) {
  const items = useItems();
  const [q, setQ] = useState("");

  const pool = useMemo(
    () => communityItems(items, { type: mode, excludeOwnerId: ME_ID }),
    [items, mode],
  );

  const term = q.trim().toLowerCase();
  const list = term
    ? pool.filter((item) => {
        const owner = memberById(item.ownerId);
        return `${itemLine(item)} ${detailBits(item).join(" ")} ${owner?.username ?? ""}`
          .toLowerCase()
          .includes(term);
      })
    : pool;

  return (
    <div
      data-world={mode}
      className="g-page g-page-top g-page-bottom relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      {/* THE WORLD IS ALREADY KNOWN — the toggle said so. */}
      <h1 className="g-display" style={{ color: ACTIVITY_FILL[mode] }}>
        search {CATEGORY_PLURAL[mode]}
      </h1>

      {/* ONE FIELD, NO CHROME: a line to type on, nothing more. */}
      <input
        autoFocus
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="type a word"
        className="g-rule mt-4 w-full bg-transparent pb-2 text-[7vw] font-black lowercase tracking-[-0.03em] outline-none placeholder:opacity-25"
        style={{ color: "var(--world-ink)" }}
      />

      <p className="g-meta mt-3 opacity-45">
        {list.length} {list.length === 1 ? "result" : "results"}
      </p>

      <ul className="mt-3 flex-1 overflow-y-auto pb-10">
        {list.length === 0 ? (
          <li className="g-lede opacity-55">nothing matches that yet</li>
        ) : null}
        {list.map((item, index) => {
          const owner = memberById(item.ownerId);
          const facts = [
            item.distanceKm === undefined ? null : `${item.distanceKm} km`,
            ...detailBits(item),
          ].filter(Boolean) as string[];
          return (
            <li key={item.id} className={index === 0 ? "pb-3.5" : "g-rule py-3.5"}>
              <button
                type="button"
                className="g-post block w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-[6.4vw]"
                style={{ color: ACTIVITY_FILL[item.type] }}
                onClick={() => {
                  buzz();
                  onOpen(item.id);
                }}
              >
                {itemLine(item)}
              </button>
              <p className="g-meta mt-1.5 opacity-55">
                <button
                  type="button"
                  onClick={() => {
                    buzz();
                    if (owner) onOpenProfile?.(owner.id);
                  }}
                  className="font-black underline decoration-current/40 underline-offset-4"
                  style={{ color: OTHER_PERSON_COLOUR[exchangeState(item.type, item.side)] }}
                >
                  {owner ? owner.username : "someone"}
                </button>
                {facts.length ? ` · ${facts.join(" · ")}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
