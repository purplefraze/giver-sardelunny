import { useMemo, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { CommunigyMap } from "@/components/community/CommunigyMap";
import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import {
  CG_INK,
  CG_WORD,
  NEAR_KM,
  inMode,
  kmBetween,
  mapPins,
  modeFor,
  type CgMode,
} from "@/data/communigy";
import { CITY_CENTRE } from "@/data/give-boundary";
import { askLocation, useMyLocation } from "@/data/my-location";
import { memberById } from "@/data/giver";
import {
  ACTIVITY_FILL,
  ME_ID,
  communityItems,
  detailBits,
  itemLine,
  type BorrowSide,
  type ItemType,
} from "@/data/items";
import { itemsStore } from "@/data/items";
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
 *
 * COMMUNI-G SPATIAL NAV. One continuous map: a zoomed lower loop (substantial
 * red trace) sits behind the phone window (PerimeterToggle.tsx). The window
 * slides around the circumference — upright, lower on the screen, most of
 * the screen — with corners clipped by the red circle. The toggle travels
 * with the window. Seats: give 1:30 · lend 3:00 · trade 4:30 · everything
 * 6:00 entry · fund 7:30 · borrow 9:00 · wish 10:30; 12:00 exits. Midpoint
 * snap; only content and text colour change. Text stays readable inside the
 * window (--cg-ink).
 * Two views of the same filtered listings: the LIST, and the MAP (the 6:00
 * map seat's door), where every listing drops a pin in its mode colour and a
 * red circle marks what is near me.
 */

type Sort = "nearby" | "latest" | "popular";

const SORTS: Sort[] = ["nearby", "latest", "popular"];

/** WHOSE ACTIVITY IS SHOWING. My own gives belong in communi-g too. */
type Scope = "everyone" | "mine";

type View = "list" | "map";

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
  initialScope = "everyone",
  initialView = "list",
  initialSide,
  onOpen,
  onOpenProfile,
  onEditMine,
  onClose,
  onExit,
}: {
  initialType?: ItemType | null;
  /** OPENED ON MY OWN GIVES when arriving straight from publishing one. */
  initialScope?: Scope;
  /** The map seat (6:00) opens straight onto the map. */
  initialView?: View;
  /** Lend is the lending side of borrow. */
  initialSide?: BorrowSide;
  onOpen: (itemId: string) => void;
  /** THE PERSON IS THEIR OWN DESTINATION. */
  onOpenProfile?: (ownerId: string) => void;
  /** MY OWN POST, REOPENED WHERE IT WAS WRITTEN. */
  onEditMine?: (itemId: string) => void;
  onClose: () => void;
  /** 12:00 ON THE LOWER LOOP: back to the full G, the toggle at 6:00. */
  onExit?: () => void;
}) {
  const items = useItems();
  const links = useConnections();
  const [mode, setMode] = useState<CgMode>(modeFor(initialType, initialSide));
  const [view, setView] = useState<View>(initialView);
  const [sort, setSort] = useState<Sort>("nearby");
  const [scope, setScope] = useState<Scope>(initialScope);
  /** NEAR ME: asks for location only on this tap; then keeps the circle's pins. */
  const [nearMe, setNearMe] = useState(false);
  const [nearSay, setNearSay] = useState<string | null>(null);
  const myLocation = useMyLocation();
  const centre = myLocation?.pin ?? CITY_CENTRE;
  const ink = CG_INK[mode];

  /** SEARCH LIVES HERE, NOT ON THE LIVING G: one quiet line, inside communi-g. */
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  /**
   * SEARCH ALWAYS SEARCHES EVERYTHING. A word finds a match no matter which
   * filter happened to be showing, and it looks everywhere a person would
   * expect: the words of the activity, its note, its kind, who posted it, and
   * the little facts underneath.
   */
  const haystack = (item: ReturnType<typeof communityItems>[number]): string => {
    const owner = memberById(item.ownerId);
    return [
      itemLine(item),
      item.note ?? "",
      item.offer ?? "",
      item.want ?? "",
      item.type,
      item.side ?? "",
      owner?.username ?? "",
      owner?.name ?? "",
      ...detailBits(item),
    ]
      .join(" ")
      .toLowerCase();
  };

  /* MY PUBLISHED GIVES ARE PART OF THE COMMUNITY, not hidden from their author. */
  const list = communityItems(items, {
    ...(scope === "mine" && !searching ? { ownerId: ME_ID } : {}),
  })
    .filter((item) => (searching ? true : inMode(item, mode)))
    .filter((item) =>
      searching
        ? needle.split(/\s+/).every((word) => haystack(item).includes(word))
        : true,
    )
    .sort((a, b) => {
      if (sort === "latest") return b.createdAt - a.createdAt;
      if (sort === "popular") return b.boostWeight - a.boostWeight || b.createdAt - a.createdAt;
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    });

  /* THE MAP'S PINS — see communigy.ts for exactly what backs them. */
  const allPins = useMemo(
    () => (view === "map" ? mapPins(list, searching ? "everything" : mode, itemLine) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list is derived from these
    [view, items, mode, scope, needle, sort],
  );
  const pins = nearMe ? allPins.filter((p) => kmBetween(p.pin, centre) <= NEAR_KM) : allPins;

  const toggleNearMe = async () => {
    buzz();
    if (nearMe) {
      setNearMe(false);
      setNearSay(null);
      return;
    }
    setNearMe(true);
    if (myLocation) return;
    setNearSay("finding you…");
    const got = await askLocation();
    setNearSay(
      got.ok
        ? null
        : got.reason === "denied"
          ? "location is off — showing the city centre"
          : "location isn’t available here — showing the city centre",
    );
  };

  return (
    <div
      data-world="communigy"
      data-cg-mode={mode}
      data-cg-view={view}
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--world-bg)",
        color: "var(--world-ink)",
        ["--cg-ink" as string]: ink,
      }}
    >
      {/* THE RECTANGLE RIDES THE LOWER LOOP: its place on the arc is the mode. */}
      <PerimeterToggle
        value={mode}
        onChange={(next) => {
          setMode(next);
          setScope("everyone");
        }}
        onExit={onExit ?? onClose}
      >
        {/* --cg-clear clears the toggle fixed at the page's top edge. */}
        <div
          className="relative flex h-full w-full flex-col"
          style={{
            paddingTop: "calc(var(--cg-clear, 48px) + 36px)",
            paddingBottom: "var(--cg-clear, 48px)",
            paddingLeft: 14,
            paddingRight: 14,
            containerType: "inline-size",
          }}
        >
          <div
            className="absolute"
            style={{ left: -20, top: "calc(var(--cg-clear, 48px) - 24px)", width: 60, height: 60 }}
          >
            <BackArrow onClick={onClose} label="back to my g" />
          </div>

          {/* COMMUNI-G IN THE MODE'S COLOUR (red for everything). */}
          {/* The shorter name fits at the normal g-display size on one line. */}
          <h1
            className="g-display"
            style={{ color: ink }}
          >
            communi-g
          </h1>
          <p className="cg-mode-word" style={{ color: ink }}>
            {scope === "mine" ? `my ${CG_WORD[mode]}` : CG_WORD[mode]}
          </p>

          {/* SEARCH — one big line. Type a word, see it. Tap the × to see it all again. */}
          <div className="g-rule mt-3 flex items-center gap-3 pb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search"
              autoComplete="off"
              className="min-h-11 w-full border-0 bg-transparent text-[19px] font-black lowercase tracking-[0.02em] outline-none placeholder:opacity-30"
              style={{ color: ink }}
            />
            {searching ? (
              <button
                type="button"
                aria-label="clear search"
                onClick={() => {
                  buzz();
                  setQuery("");
                }}
                className="min-h-11 min-w-11 text-[22px] font-black leading-none opacity-45"
                style={{ color: ink }}
              >
                ×
              </button>
            ) : null}
          </div>

          {searching ? (
            /* SEARCHING IS THE WHOLE SCREEN. No filters to fight with, just answers. */
            <p className="g-meta mt-3 opacity-55">
              {list.length === 0
                ? `nothing matches “${query.trim()}”`
                : `${list.length} ${list.length === 1 ? "match" : "matches"} for “${query.trim()}”`}
            </p>
          ) : (
            <>
              {/* ONE ROW OF WORDS: LIST · MAP · MINE (the modes live on the border). */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-3 text-[15px] font-black lowercase tracking-[0.1em]">
                {(["list", "map"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      buzz();
                      setView(v);
                    }}
                    className={view === v ? "opacity-100" : "opacity-30"}
                    style={{ color: ink }}
                    aria-pressed={view === v}
                  >
                    {v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    buzz();
                    setScope(scope === "mine" ? "everyone" : "mine");
                  }}
                  className={scope === "mine" ? "opacity-100" : "opacity-30"}
                  style={{ color: ink }}
                  aria-pressed={scope === "mine"}
                >
                  mine
                </button>
                {view === "map" ? (
                  <button
                    type="button"
                    onClick={() => void toggleNearMe()}
                    className={nearMe ? "opacity-100" : "opacity-30"}
                    style={{ color: ink }}
                    aria-pressed={nearMe}
                  >
                    near me
                  </button>
                ) : null}
              </div>

              {view === "map" ? (
                <p className="g-meta mt-3 min-h-6 opacity-60" style={{ color: ink }}>
                  {nearSay ??
                    (nearMe
                      ? `${pins.length} nearby · within ${NEAR_KM} km of you`
                      : `${pins.length} ${pins.length === 1 ? "pin" : "pins"} · the circle is ${NEAR_KM} km round ${myLocation ? "you" : "the city centre"}`)}
                </p>
              ) : (
                /* ONE TAP CHANGES THE ORDER. No menus, no icons. */
                <button
                  type="button"
                  onClick={() => {
                    buzz();
                    setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]!);
                  }}
                  className="g-meta mt-3 min-h-11 self-start text-left opacity-55"
                  style={{ color: ink }}
                >
                  {sort} first — tap to change
                </button>
              )}
            </>
          )}

          {view === "map" && !searching ? (
            <CommunigyMap pins={pins} centre={centre} radiusKm={NEAR_KM} onOpen={onOpen} />
          ) : null}

          <ul
            className={view === "map" && !searching ? "hidden" : "mt-4 flex-1 overflow-y-auto pb-2"}
          >
            {list.length === 0 && !searching ? (
              <li className="g-lede opacity-55">nothing here yet — yours could be the first</li>
            ) : null}
            {list.map((item, index) => {
              const owner = memberById(item.ownerId);
              const status = activityStatus(links, item.id, item.status);
              const line = itemLine(item);
              /* AT MOST TWO FACTS. Distance and the one thing that matters most. */
              const facts = [
                /* A GIVE SAYS ITS NEIGHBOURHOOD — only ever the coarse label. */
                item.type === "give" && item.details?.where ? item.details.where : null,
                item.distanceKm === undefined ? null : `${item.distanceKm} km away`,
                status === "connecting" ? "connecting" : (detailBits(item)[0] ?? null),
              ].filter((f, i, all): f is string => Boolean(f) && all.indexOf(f) === i);
              return (
                <li key={item.id} className={index === 0 ? "pb-4" : "g-rule py-4"}>
                  {/* THE WHOLE ROW OPENS THE ACTIVITY — one big, obvious target. */}
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      buzz();
                      onOpen(item.id);
                    }}
                  >
                    {/* ONE PHOTO ON TOP when the give has one — none, no placeholder. */}
                    {item.type === "give" && item.photos?.[0] ? (
                      <img
                        src={item.photos[0]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="gf-listing-photo"
                      />
                    ) : null}
                    <span className="g-heading block" style={{ color: ACTIVITY_FILL[item.type] }}>
                      {item.type === "borrow" && item.side === "lend" ? "lend" : item.type}
                    </span>
                    <span
                      className="g-post mt-1 block w-full overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ color: ACTIVITY_FILL[item.type], fontSize: headlineSize(line) }}
                    >
                      {line}
                    </span>
                    {facts.length ? (
                      <span className="g-meta mt-1.5 block opacity-50">{facts.join(" · ")}</span>
                    ) : null}
                  </button>

                  {/* THE PERSON IS THEIR OWN DESTINATION. */}
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      if (owner) onOpenProfile?.(owner.id);
                    }}
                    className="g-meta mt-1.5 min-h-11 font-black underline decoration-current/40 underline-offset-4"
                    style={{ color: OTHER_PERSON_COLOUR[exchangeState(item.type)] }}
                  >
                    {owner ? owner.username : "someone"}
                  </button>

                  {/* MY OWN POST IS MINE TO CHANGE OR TAKE DOWN, right here. */}
                  {item.ownerId === ME_ID ? (
                    <div className="flex items-baseline gap-6 text-[12px] font-black lowercase tracking-[0.16em]">
                      <button
                        type="button"
                        className="min-h-11"
                        onClick={() => {
                          buzz();
                          onEditMine?.(item.id);
                        }}
                        style={{ color: "var(--person-self-community)" }}
                      >
                        change it
                      </button>
                      <button
                        type="button"
                        className="min-h-11 opacity-45"
                        onClick={() => {
                          buzz();
                          itemsStore.remove(item.id);
                        }}
                      >
                        take it down
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </PerimeterToggle>
    </div>
  );
}
