import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { connectionsOf, memberById, type Member } from "@/data/giver";
import { earnedConnectionIds } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import {
  ACTIVITY_FILL,
  ITEM_TYPES,
  ME_ID,
  boostWeight,
  myItems,
  pastItems,
  type ItemType,
} from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useAdmin } from "@/hooks/use-admin";
import { useMemberEdits } from "@/hooks/use-member-edits";
import { AdminMemberEditor } from "@/components/admin/AdminMemberEditor";
import { AdminItemEditor } from "@/components/admin/AdminItemEditor";
import { ItemRow } from "@/components/profile/ItemRow";
import { itemKindWord } from "@/components/profile/ItemFacts";
import { buzz } from "@/lib/haptics";
import { itemLine } from "@/data/items";
import { answeredStatements, pronounsFrom } from "@/data/prompts";



/**
 * THE FULL PROFILE — THE SHARED PROFILE SYSTEM FOR EVERY PERSON ON GIVER.
 *
 * Me, Giulia, Marcus, Robin, Sofia and anybody who ever joins are rendered by
 * THIS ONE COMPONENT, from the same Member projection and the same item store.
 * The content changes; the architecture, typography and colour rules never do.
 *
 * Every give, wish, trade, lend and borrow listed here is the SAME record the
 * community reads, rendered by the shared ItemRow, and every one of them opens
 * its own rich detail where the viewer can respond.
 *
 * There are NO friend requests in Giver. Connections listed here were earned by
 * a completed give, a granted wish or a completed trade.
 */

const CATEGORY_LABEL: Record<ItemType, string> = {
  give: "what they're giving",
  wish: "what they're wishing for",
  trade: "what they'll trade",
  borrow: "lending and borrowing",
};

const MY_CATEGORY_LABEL: Record<ItemType, string> = {
  give: "what i'm giving",
  wish: "what i'm wishing for",
  trade: "what i'll trade",
  borrow: "my lending and borrowing",
};

/** GIVE FIRST. Generosity leads on every profile in the app. */
const ORDER: ItemType[] = ["give", "wish", "trade", "borrow"];

/** COUNTS ARE DOORS, and each one leads to that category's own history. */
const DONE_TO_TYPE: Record<string, ItemType> = {
  "gifts shared": "give",
  "wishes granted": "wish",
  "trades completed": "trade",
  "borrows completed": "borrow",
};

function Section({
  title,
  accent,
  children,
  innerRef,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
  innerRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={innerRef} className="g-rule mt-12 pt-5">
      <h2 className="g-heading" style={accent ? { color: accent } : { opacity: 0.45 }}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}


export function FullProfile({
  member,
  onBack,
  onOpen,
  onOpenItem,
  onEdit,
  /** RED when this is me, BLUE when this is somebody else. */
  world = "others",
  focus = null,
}: {
  member: Member;
  onBack: () => void;
  /** MY OWN PROFILE IS ALSO HOW I CHANGE IT: touching me opens the same state. */
  onEdit?: () => void;
  world?: "others" | "me";
  /** Profile-to-profile discovery through completed acts. */
  onOpen?: (id: string) => void;
  /** ITEM -> RICH DETAIL -> ACTION. Every entry on every profile is clickable. */
  onOpenItem?: (itemId: string) => void;
  /**
   * DEEP LINK. The profile was opened FROM an activity region, so it opens with
   * that category's section at the top of the viewport — never at about me.
   */
  focus?: ItemType | null;
}) {
  const state = useItems();
  const links = useConnections();
  const mine = member.id === ME_ID;
  const me = useMyProfile();
  const sparkles = me.sparkles;
  /** Which activity count has been opened. A count is never a dead number. */
  const [openedCount, setOpenedCount] = useState<ItemType | null>(null);
  /* THE DEVELOPER SWITCH: the profile becomes directly editable while it is on. */
  const admin = useAdmin();
  useMemberEdits();
  const [editPerson, setEditPerson] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);


  /*
    MY OWN connections are earned live: only interactions that reached their
    completed, mutually verified state ever appear. Sample people carry their
    own already-earned links.
  */
  const connections = mine
    ? earnedConnectionIds(links, ME_ID)
        .map(memberById)
        .filter((m): m is Member => Boolean(m))
    : connectionsOf(member.id);

  const done: [string, number][] = [
    ["gifts shared", member.done.gifts],
    ["wishes granted", member.done.wishes],
    ["trades completed", member.done.trades],
    ["borrows completed", member.done.borrows],
  ];

  /* SAME ITEMS AS EVERY OTHER VIEW — read live, never copied into the page. */
  const activeGroups = ORDER.map((key) => ({
    key,
    items: myItems(state, key, member.id),
  })).filter((group) => group.items.length > 0);

  const openItem = onOpenItem ?? (() => {});

  /* THE ANCHOR ITSELF: a real element, scrolled to as soon as it exists. */
  const scroller = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!focus) return;
    const section = target.current;
    const box = scroller.current;
    if (!section || !box) return;
    box.scrollTo({ top: section.offsetTop - 8, behavior: "auto" });
  }, [focus, member.id, activeGroups.length]);

  /** WHO THIS PERSON IS, IN ONE LINE: age, how they describe themselves, distance. */
  const identity = [
    member.age ? `${member.age}` : null,
    member.gender || null,
    mine ? null : member.distance,
  ].filter(Boolean) as string[];

  return (
    <div
      data-world={world}
      ref={scroller}
      className="relative h-full w-full overflow-y-auto"
      style={{
        background: "var(--world-bg)",
        /* MY OWN WORLD IS RED, and my profile reads in it. Somebody else's page
           reads in ink, and every colour on it belongs to a real activity. */
        color: mine ? "var(--giver-me)" : "var(--giver-ink)",
      }}
    >
      {/* MY OWN PROFILE IS NOT A SEPARATE SCREEN: no exit stage, only the way
          back out of the G. Somebody else's keeps their name on the way back. */}
      <BackArrow onClick={onBack} {...(mine ? {} : { label: `back to ${member.name}` })} sticky />

      <div className="g-page g-page-top g-page-bottom">
        {/* HEADER — photo, handle, age, gender, distance, member since. */}
        <header className="flex flex-col items-start">
          {member.photo ? (
            <img
              src={member.photo}
              alt={`${member.username}, ${member.byDay} by day`}
              className="h-32 w-32 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="h-32 w-32 rounded-full"
              style={{ background: "var(--giver-ink)", opacity: 0.08 }}
            />
          )}
          {mine && onEdit ? (
            <button
              type="button"
              onClick={() => {
                buzz();
                onEdit();
              }}
              className="g-display mt-6 text-left transition-opacity active:opacity-60"
            >
              {member.username}
            </button>
          ) : (
            <h1 className="g-display mt-6">{member.username}</h1>
          )}
          {identity.length ? <p className="g-meta mt-4">{identity.join(" · ")}</p> : null}
          <p className="g-meta mt-1">member of giver since {member.since}</p>

          {/*
            THE DEVELOPER DOOR — every person, not one special case. It is only
            ever here while the dev switch is on; end users never see it.
          */}
          {admin && !mine ? (
            <button
              type="button"
              onClick={() => {
                buzz();
                setEditPerson(true);
              }}
              className="mt-5 text-[12px] font-black lowercase tracking-[0.26em]"
              style={{ color: "var(--giver-me)" }}
            >
              edit this person
            </button>
          ) : null}
        </header>


        <Section title={mine ? "" : "about them"}>
          {member.aboutMe ? (
            mine && onEdit ? (
              <button
                type="button"
                onClick={() => {
                  buzz();
                  onEdit();
                }}
                className="g-lede block w-full text-left transition-opacity active:opacity-60"
              >
                {member.aboutMe}
              </button>
            ) : (
              <p className="g-lede">{member.aboutMe}</p>
            )
          ) : null}
          {/* THE FUN ANSWERS, ALREADY SENTENCES. No questions, no field labels. */}
          {mine ? (
            <ul className="mt-7 space-y-6">
              {answeredStatements(me.answers, { mine: true }).map((line) => (
                <li key={line.id}>
                  {onEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        buzz();
                        onEdit();
                      }}
                      className="g-lede block w-full text-left transition-opacity active:opacity-60"
                    >
                      {line.line}
                    </button>
                  ) : (
                    <span className="g-lede">{line.line}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            (() => {
              /* THEIR OWN ANSWERS, AS SENTENCES — never question/answer labels. */
              const said = answeredStatements(member.answers, {
                mine: false,
                name: member.name.toLowerCase(),
                pronouns: pronounsFrom(member.gender),
              });
              if (said.length)
                return (
                  <ul className="mt-7 space-y-6">
                    {said.map((line) => (
                      <li key={line.id} className="g-lede">
                        {line.line}
                      </li>
                    ))}
                  </ul>
                );
              return (
                <ul className="mt-6 space-y-3">
                  {[
                    ["by day", member.byDay],
                    ["by night", member.byNight],
                    ["by weekend", member.weekend],
                  ]
                    .filter(([, value]) => Boolean(value) && value !== "—")
                    .map(([label, value]) => (
                      <li key={label}>
                        <span className="g-meta">{label}</span>
                        <span className="g-name mt-1 block">{value}</span>
                      </li>
                    ))}
                </ul>
              );
            })()
          )}

        </Section>

        {/*
          EVERY ENTRY IS RICH AND CLICKABLE, on every person's profile: the
          shared ItemRow prints the headline in its own category colour with its
          structured parameters underneath, and opens the item's detail.
        */}
        {activeGroups.map(({ key, items }) => (
          <Section
            key={key}
            title={mine ? MY_CATEGORY_LABEL[key] : CATEGORY_LABEL[key]}
            accent={ACTIVITY_FILL[key]}
            {...(focus === key
              ? { innerRef: (node: HTMLElement | null) => { target.current = node; } }
              : {})}
          >
            <ul>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onOpen={openItem}
                  trailing={
                    <div className="flex flex-col items-end gap-2">
                      {/* SPARKLES HELP OTHER PEOPLE GET SEEN — never me. */}
                      {mine ? (
                        boostWeight(state, item.id) ? (
                          <span className="g-meta">{boostWeight(state, item.id)} sparkled</span>
                        ) : null
                      ) : (
                        <button
                          type="button"
                          disabled={sparkles < 1}
                          onClick={() => {
                            buzz();
                            myProfileStore.useSparkle(item.id);
                          }}
                          className="text-[11px] font-black lowercase tracking-[0.24em] disabled:opacity-25"
                          style={{ color: "var(--giver-participation)" }}
                        >
                          {boostWeight(state, item.id) ? "sparkle again" : "sparkle"}
                        </button>
                      )}

                      {/* FAST DEVELOPER EDITING, right where the item is listed. */}
                      {admin ? (
                        <button
                          type="button"
                          onClick={() => {
                            buzz();
                            setEditItem(item.id);
                          }}
                          className="text-[11px] font-black lowercase tracking-[0.24em]"
                          style={{ color: "var(--giver-me)" }}
                        >
                          edit
                        </button>
                      ) : null}
                    </div>
                  }

                />
              ))}
            </ul>
          </Section>
        ))}

        {/* GIVER ACTIVITY — counts that actually lead somewhere. */}
        <Section title="giver activity">
          <dl className="grid grid-cols-2 gap-y-6">
            {done.map(([label, count]) => {
              const type = DONE_TO_TYPE[label]!;
              const opened = openedCount === type;
              return (
                <div key={label}>
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      setOpenedCount(opened ? null : type);
                    }}
                    className="text-left transition-opacity active:opacity-60"
                  >
                    <dd
                      className="text-[3.25rem] font-black leading-none tracking-[-0.05em] tabular-nums"
                      style={opened ? { color: ACTIVITY_FILL[type] } : undefined}
                    >
                      {count}
                    </dd>
                    <dt className="g-meta mt-2">{label}</dt>
                  </button>
                </div>
              );
            })}
          </dl>

          {openedCount ? (
            <PastActivity
              member={member}
              type={openedCount}
              {...(onOpenItem ? { onOpenItem: openItem } : {})}
            />
          ) : null}
        </Section>

        {/*
          CONNECTION = me + them = purple. A connection only exists because a
          give, wish, trade or borrow was COMPLETED together — never because
          somebody messaged, followed or looked. Before the first completed act
          there is nothing here at all, so the section stays away entirely.
        */}
        {connections.length ? (
          <Section title="connections" accent="var(--giver-connection)">
            <p className="g-body" style={{ color: "var(--giver-connection)" }}>
              {mine
                ? "people i’ve actually done something with — completed gives, granted wishes, trades and borrows."
                : "people they’ve actually done something with."}
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              {connections.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    buzz();
                    onOpen?.(person.id);
                  }}
                  className="flex w-20 flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  {person.photo ? (
                    <img
                      src={person.photo}
                      alt={person.username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="h-16 w-16 rounded-full"
                      style={{ background: "var(--giver-ink)", opacity: 0.08 }}
                    />
                  )}
                  <span className="g-meta text-center">{person.username}</span>
                </button>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      {/* THE DEVELOPER EDITORS. One person or one activity, same records. */}
      {admin && editPerson ? (
        <AdminMemberEditor member={member} onClose={() => setEditPerson(false)} />
      ) : null}
      {admin && editItem ? (
        <AdminItemEditor itemId={editItem} onClose={() => setEditItem(null)} />
      ) : null}
    </div>
  );

}

/**
 * WHAT ALREADY HAPPENED, in one category. Real records where they exist (they
 * open like anything else); the person's own written history otherwise.
 */
function PastActivity({
  member,
  type,
  onOpenItem,
}: {
  member: Member;
  type: ItemType;
  onOpenItem?: (itemId: string) => void;
}) {
  const state = useItems();
  const records = pastItems(state, type, member.id);
  const written =
    type === "give"
      ? member.history.gives
      : type === "wish"
        ? member.history.wishes
        : type === "trade"
          ? member.history.trades
          : [];

  if (!records.length && !written.length)
    return (
      <p className="g-body mt-6 opacity-55">
        nothing completed here yet.
      </p>
    );

  return (
    <ul className="mt-7">
      {records.map((item) =>
        onOpenItem ? (
          <ItemRow key={item.id} item={item} onOpen={onOpenItem} />
        ) : (
          <li key={item.id} className="g-rule py-4 first:border-t-0 first:pt-0">
            <span className="g-meta block" style={{ color: ACTIVITY_FILL[type] }}>
              {itemKindWord(item)}
            </span>
            <span className="g-name mt-1.5 block">{itemLine(item)}</span>
          </li>
        ),
      )}
      {written.map((line) => (
        <li key={line} className="g-rule py-4 first:border-t-0 first:pt-0">
          <span className="g-meta block" style={{ color: ACTIVITY_FILL[type] }}>
            completed
          </span>
          <span className="g-name mt-1.5 block">{line}</span>
        </li>
      ))}
    </ul>
  );
}
