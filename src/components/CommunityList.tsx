import {
  ME_ID,
  boostWeight,
  communityItems,
  itemLine,
  type ItemType,
} from "@/data/items";
import { memberById } from "@/data/giver";
import { myProfileStore } from "@/data/my-profile";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * COMMUNITY IS A VIEW, NOT A COPY.
 *
 * These are the very same Items people own on their own profiles, queried by
 * status instead of by owner. The browsing INTERFACE (feed, map, cards) is not
 * decided yet, so this stays a plain list — the query underneath is what
 * matters, and it already exposes type, owner, time, distance, priority and
 * boost state for whatever interface comes later.
 */
export function CommunityList({ type }: { type: ItemType }) {
  const state = useItems();
  const sparkles = useMyProfile().sparkles;
  const items = communityItems(state, { type, excludeOwnerId: ME_ID });

  if (!items.length)
    return <p className="opacity-70">nothing here yet. yours could be first.</p>;

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const owner = memberById(item.ownerId);
        const boosted = boostWeight(state, item.id);
        return (
          <li key={item.id} className="flex items-start gap-4">
            <span className="flex-1">
              {itemLine(item)}
              <span className="opacity-50">
                {owner ? ` — ${owner.username}` : ""}
                {item.distanceKm === undefined ? "" : `, ${item.distanceKm} km`}
              </span>
            </span>
            {/*
              GRANTING A WISH IS A COMPLETED ACT. Only when the wish is actually
              granted does giver recognise it with 10 sparks — never for
              offering, messaging or simply opening it.
            */}
            {type === "wish" ? (
              <button
                type="button"
                onClick={() => {
                  buzz();
                  myProfileStore.grantWish(item.id);
                }}
                className="shrink-0 text-[11px] font-black lowercase tracking-[0.24em]"
                style={{ color: "var(--giver-generosity)" }}
              >
                grant
              </button>
            ) : null}
            {/* SPARKLES HELP OTHER PEOPLE GET SEEN. */}
            <button
              type="button"
              disabled={sparkles < 1}
              onClick={() => {
                buzz();
                myProfileStore.useSparkle(item.id);
              }}
              className="shrink-0 text-[11px] font-black lowercase tracking-[0.24em] disabled:opacity-25"
              style={{ color: "var(--giver-participation)" }}
            >
              {boosted ? `sparkled ×${boosted}` : "sparkle"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

