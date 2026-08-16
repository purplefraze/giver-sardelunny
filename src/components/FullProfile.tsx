import { BackArrow } from "@/components/BackArrow";
import { connectionsOf, type Member } from "@/data/giver";
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
    <section className="mt-11">
      <h2 className="text-[11px] font-black lowercase tracking-[0.34em] opacity-45">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function FullProfile({
  member,
  onBack,
  onOpen,
}: {
  member: Member;
  onBack: () => void;
  /** Profile-to-profile discovery through completed acts. */
  onOpen?: (id: string) => void;
}) {
  const connections = connectionsOf(member.id);
  const done: [string, number][] = [
    ["gifts shared", member.done.gifts],
    ["wishes granted", member.done.wishes],
    ["trades completed", member.done.trades],
    ["borrows completed", member.done.borrows],
  ];
  const activeGroups = (["wish", "give", "trade", "borrow"] as const)
    .map((key) => ({ key, items: member.active[key] }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      data-world="others"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onBack} label={`back to ${member.name}`} />

      <div className="px-7 pb-24 pt-20">
        {/* HEADER — photo, username, distance, member since. Nothing more. */}
        <header className="flex flex-col items-start">
          <img
            src={member.photo}
            alt={`${member.username}, ${member.byDay} by day`}
            className="h-28 w-28 rounded-full object-cover"
          />
          <h1 className="mt-5 text-[13vw] font-black lowercase leading-[0.85] tracking-[-0.05em]">
            {member.username}
          </h1>
          <p className="mt-3 text-[11px] font-black lowercase tracking-[0.3em] opacity-50">
            {member.distance}
          </p>
          <p className="mt-1 text-[11px] font-black lowercase tracking-[0.3em] opacity-50">
            member of giver since {member.since}
          </p>
        </header>

        <Section title="about them">
          <ul className="space-y-2">
            <li className="text-2xl font-medium lowercase leading-tight">
              {member.byDay} by day
            </li>
            <li className="text-2xl font-medium lowercase leading-tight">
              {member.byNight} by night
            </li>
            <li className="text-2xl font-medium lowercase leading-tight">
              {member.weekend} by weekend
            </li>
          </ul>
          <p className="mt-6 text-xl font-medium lowercase leading-snug opacity-75">
            {member.aboutMe}
          </p>
        </Section>

        <Section title="giver activity">
          <dl className="grid grid-cols-2 gap-y-6">
            {done.map(([label, count]) => (
              <div key={label}>
                <dd className="text-5xl font-black leading-none tracking-[-0.04em]">
                  {count}
                </dd>
                <dt className="mt-2 text-[11px] font-black lowercase tracking-[0.26em] opacity-50">
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
                    className="text-[11px] font-black lowercase tracking-[0.3em]"
                    style={{ color: `var(--mode-${key})` }}
                  >
                    {CATEGORY_LABEL[key]}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="text-2xl font-medium lowercase leading-tight"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="connections">
          <p className="text-sm font-medium lowercase opacity-55">
            earned through completed gives, granted wishes and trades.
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
                <span className="text-[10px] font-black lowercase tracking-[0.2em] opacity-60">
                  {person.username}
                </span>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
