import { useState } from "react";
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
import { activityStatus } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { buzz } from "@/lib/haptics";
import { OTHER_PERSON_COLOUR, exchangeState } from "@/lib/exchange-colours";

/**
 * THE COMMUNITY IS ONE MIXED FLOW OF REAL ACTIVITY.
 *
 * Wishes, gives, trades and borrows live side by side — the same Items their
 * owners posted, never copies — because discovering the mix is what makes the
 * place feel alive. Filters narrow it; they never split it into four apps.
 *
 * IT READS LIKE AN EDITORIAL MAP, NOT A SOCIAL FEED: no sequence numbers, no
 * cards, dense enough to scan, with just enough structured fact under each
 * headline to decide whether it is worth opening.
 *
 * TWO DESTINATIONS, NEVER ONE: the headline opens the activity, the @username
 * opens the person.
 */

type Sort = "nearby" | "latest" | "popular";

const SORTS: Sort[] = ["nearby", "latest", "popular"];

/** GIVE COMES FIRST. Community leads with generosity, then asks. */
const FILTERS: ItemType[] = ["give", "wish", "trade", "borrow"];

/**
 * ONE LINE, WHEREVER POSSIBLE. The headline scales inside a controlled range
 * by length — confident, never tiny.
 */
function headlineSize(text: string): string {
  const n = text.length;
  if (n <= 14) return "8.6vw";
  if (n <= 20) return "7.4vw";
  if (n <= 28) return "6.2vw";
  if (n <= 38) return "5.2vw";
  return "4.6vw";
}

export function CommunityFeed({
  initialType = null,
  onOpen,
  onOpenProfile,
  onClose,
}: {
  initialType?: ItemType | null;
  onOpen: (itemId: string) => void;
  /** THE PERSON IS THEIR OWN DESTINATION. */
  onOpenProfile?: (ownerId: string) => void;
  onClose: () => void;
}) {
  const items = useItems();
  const links = useConnections();
  const [type, setType] = useState<ItemType | null>(initialType);
  const [sort, setSort] = useState<Sort>("nearby");
  /** SEARCH LIVES HERE, NOT ON THE LIVING G: one quiet line, inside Communi-G. */
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const list = communityItems(items, {
    ...(type ? { type } : {}),
    excludeOwnerId: ME_ID,
  })
    .filter((item) => (needle ? itemLine(item).toLowerCase().includes(needle) : true))
    .sort((a, b) => {
      if (sort === "latest") return b.createdAt - a.createdAt;
      if (sort === "popular") return b.boostWeight - a.boostWeight || b.createdAt - a.createdAt;
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    });

  return (
    <div
      data-world="community"
      className="g-page g-page-top g-page-bottom relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      {/* COMMUNI-G SPEAKS IN BLACK. Blue stays its identity accent. */}
      <h1 className="g-display" style={{ color: "var(--giver-ink)" }}>
        communi-g
      </h1>
      <p className="g-meta mt-2 whitespace-nowrap opacity-55">
        it’s all happening near you, right now.
      </p>

      {/* SEARCH — a line, never a bar: no box, no icon, no button. */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search communi-g"
        className="g-rule mt-4 w-full border-0 bg-transparent pb-2 text-[15px] font-black lowercase tracking-[0.06em] outline-none placeholder:opacity-30"
        style={{ color: "var(--giver-ink)" }}
      />

      {/* FILTERS ARE WORDS, NOT CHIPS OR ICONS. ALL · GIVE · WISH · TRADE · BORROW */}
      <div className="g-rule mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 pt-3 text-[13px] font-black lowercase tracking-[0.16em]">
        <button
          type="button"
          onClick={() => setType(null)}
          className={type === null ? "opacity-100" : "opacity-35"}
          style={{ color: "var(--giver-ink)" }}
        >
          all
        </button>
        {FILTERS.map((t) => (
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

      {/* ONE COMPACT SORT CONTROL: NEARBY · LATEST · POPULAR */}
      <div className="mt-2.5 flex items-baseline gap-3 text-[10px] font-black lowercase tracking-[0.24em] opacity-45">
        {SORTS.map((s, i) => (
          <span key={s} className="flex items-baseline gap-3">
            {i === 0 ? null : <span className="opacity-30">·</span>}
            <button
              type="button"
              onClick={() => setSort(s)}
              className={sort === s ? "opacity-100" : undefined}
              style={sort === s ? { color: "var(--person-self-community)" } : undefined}
            >
              {s}
            </button>
          </span>
        ))}
      </div>

      <ul className="mt-4 flex-1 overflow-y-auto pb-8">
        {list.length === 0 ? (
          <li className="g-lede opacity-55">nothing here yet — yours could be the first</li>
        ) : null}
        {list.map((item, index) => {
          const owner = memberById(item.ownerId);
          const status = activityStatus(links, item.id, item.status);
          const line = itemLine(item);
          const facts = [
            item.distanceKm === undefined ? null : `${item.distanceKm} km`,
            ...detailBits(item),
            status === "connecting" ? "connecting" : null,
          ].filter(Boolean) as string[];
          return (
            <li key={item.id} className={index === 0 ? "pb-3.5" : "g-rule py-3.5"}>
              <span className="g-heading block" style={{ color: ACTIVITY_FILL[item.type] }}>
                {item.type === "borrow" && item.side === "lend" ? "lend" : item.type}
              </span>

              {/* THE HEADLINE OPENS THE ACTIVITY. */}
              <button
                type="button"
                className="g-post mt-1 block w-full overflow-hidden text-ellipsis whitespace-nowrap text-left"
                style={{
                  color: ACTIVITY_FILL[item.type],
                  fontSize: headlineSize(line),
                }}
                onClick={() => {
                  buzz();
                  onOpen(item.id);
                }}
              >
                {line}
              </button>

              {/* ENOUGH TO DECIDE WITHOUT OPENING IT. */}
              <p className="mt-1.5 g-meta opacity-55">
                <button
                  type="button"
                  onClick={() => {
                    buzz();
                    if (owner) onOpenProfile?.(owner.id);
                  }}
                  className="font-black underline decoration-current/40 underline-offset-4"
                  style={{ color: OTHER_PERSON_COLOUR[exchangeState(item.type)] }}
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
