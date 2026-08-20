import { BackArrow } from "@/components/BackArrow";
import { connectionsOf, memberById, type Member } from "@/data/giver";
import { earnedConnectionIds } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { ITEM_TYPES, ME_ID, boostWeight, itemLine, myItems } from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";


/**
 * THE FULL PROFILE — the person, not their current activity.
 *
 * The Living G preview answers "what's happening". This page answers "who is
 * this". It is deliberately a NORMAL vertically scrollable personal page: a
 * little MySpace in spirit, human, browseable, never a dashboard and never
 * another giant Living G.
 *
 * There are NO friend requests in Giver. Connections listed here were earned by
 * a completed give, a granted wish or a completed trade.
 */

const CATEGORY_LABEL = {
  wish: "wishes",
  give: "giving",
  trade: "trading",
  borrow: "borrowing",
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="g-rule mt-12 pt-5">
      <h2 className="g-heading opacity-45">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function FullProfile({
  member,
  onBack,
  onOpen,
  /** RED when this is me, BLUE when this is somebody else. */
  world = "others",
}: {
  member: Member;
  onBack: () => void;
  world?: "others" | "me";
  /** Profile-to-profile discovery through completed acts. */
  onOpen?: (id: string) => void;
}) {
  const state = useItems();
  const links = useConnections();
  /*
    MY OWN connections are earned live: only interactions that reached their
    completed, mutually verified state ever appear. Sample people carry their
    own already-earned links.
  */
  const connections =
    member.id === ME_ID
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
  const sparkles = useMyProfile().sparkles;
  /* SAME ITEMS AS EVERY OTHER VIEW — read live, never copied into the page. */
  const activeGroups = ITEM_TYPES.map((key) => ({
    key,
    items: myItems(state, key, member.id),
  })).filter((group) => group.items.length > 0);


  return (
    <div
      data-world={world}
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onBack} label={`back to ${member.name}`} />

      <div className="g-page g-page-top g-page-bottom">
        {/* HEADER — photo, username, distance, member since. Nothing more. */}
        <header className="flex flex-col items-start">
          <img
            src={member.photo}
            alt={`${member.username}, ${member.byDay} by day`}
            className="h-32 w-32 rounded-full object-cover"
          />
          <h1 className="g-display mt-6">{member.username}</h1>
          <p className="g-meta mt-4">{member.distance}</p>
          <p className="g-meta mt-1">member of giver since {member.since}</p>
        </header>

        <Section title={world === "me" ? "about me" : "about them"}>
          <ul className="space-y-2">
            <li className="g-lede">{member.byDay} by day</li>
            <li className="g-lede">{member.byNight} by night</li>
            <li className="g-lede">{member.weekend} by weekend</li>
          </ul>
          <p className="g-body mt-6 opacity-70">
            {member.aboutMe}
          </p>
        </Section>

        <Section title="giver activity">
          <dl className="grid grid-cols-2 gap-y-6">
            {done.map(([label, count]) => (
              <div key={label}>
                <dd className="text-[3.25rem] font-black leading-none tracking-[-0.05em] tabular-nums">
                  {count}
                </dd>
                <dt className="g-meta mt-2">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </Section>

        {activeGroups.length ? (
          <Section title="active on giver">
            <div className="space-y-7">
              {activeGroups.map(({ key, items }) => (
                <div key={key}>
                  <p
                    className="g-heading"
                    style={{ color: `var(--mode-${key})` }}
                  >
                    {CATEGORY_LABEL[key]}
                  </p>
                  <ul className="mt-2 space-y-4">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-start gap-4">
                        <span className="g-lede flex-1">
                          {itemLine(item)}
                        </span>
                        {/* SPARKLES HELP OTHER PEOPLE GET SEEN — never me. */}
                        {member.id === ME_ID ? (
                          boostWeight(state, item.id) ? (
                            <span className="shrink-0 pt-1 text-[11px] font-black lowercase tracking-[0.24em] opacity-50">
                              {boostWeight(state, item.id)} sparkled
                            </span>
                          ) : null
                        ) : (
                          <button
                            type="button"
                            disabled={sparkles < 1}
                            onClick={() => {
                              buzz();
                              myProfileStore.useSparkle(item.id);
                            }}
                            className="shrink-0 pt-1 text-[11px] font-black lowercase tracking-[0.24em] disabled:opacity-25"
                            style={{ color: "var(--giver-participation)" }}
                          >
                            {boostWeight(state, item.id)
                              ? `sparkled ×${boostWeight(state, item.id)}`
                              : "use a sparkle"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {/*
          CONNECTION = me + them = purple. A connection only exists because a
          give, wish, trade or borrow was COMPLETED together — never because
          somebody messaged, followed or looked. Before the first completed act
          there is nothing here at all, so the section stays away entirely.
        */}
        {connections.length ? (
        <Section title="connections">
          <p
            className="g-body"
            style={{ color: "var(--giver-connection)" }}
          >
            people i’ve actually done something with — completed gives, granted
            wishes, trades and borrows.
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
                <img
                  src={person.photo}
                  alt={person.username}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <span className="g-meta text-center">
                  {person.username}
                </span>
              </button>
            ))}
          </div>
        </Section>
        ) : null}
      </div>
    </div>
  );
}
