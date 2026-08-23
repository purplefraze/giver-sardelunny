import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine } from "@/data/items";
import {
  STATE_WORD,
  isOpen,
  myConnections,
  myPastConnections,
  otherParty,
} from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { buzz } from "@/lib/haptics";
import { OTHER_PERSON_COLOUR, exchangeState } from "@/lib/exchange-colours";

/**
 * EVERYTHING I AM IN THE MIDDLE OF — and everything that actually happened.
 *
 * Open connections are conversations, not completions. Past connections are the
 * only place a completed interaction is ever recorded, and it got there because
 * BOTH people said yes.
 */
export function ConnectionsList({
  onOpen,
  onClose,
}: {
  onOpen: (connectionId: string) => void;
  onClose: () => void;
}) {
  const links = useConnections();
  const items = useItems();
  const open = myConnections(links, ME_ID).filter(isOpen);
  const past = myPastConnections(links);

  const line = (itemId: string, fallback: string) =>
    (() => {
      const item = items.items.find((i) => i.id === itemId);
      return item ? itemLine(item) : fallback;
    })();

  return (
    <div
      data-world="connection"
      className="g-page g-page-top g-page-bottom relative flex h-full w-full flex-col overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" sticky />

      <h1 className="g-display">conversations</h1>

      <ul className="mt-8">
        {open.length === 0 ? (
          <li className="g-lede opacity-55">nothing in motion right now</li>
        ) : null}
        {open.map((c, index) => {
          const them = memberById(otherParty(c, ME_ID));
          return (
            <li key={c.id} className={index === 0 ? undefined : "g-rule"}>
              <button
                type="button"
                className="block w-full py-6 text-left"
                onClick={() => {
                  buzz();
                  onOpen(c.id);
                }}
              >
                <span
                  className="g-display-sm block"
                  style={{ color: ACTIVITY_FILL[c.type] }}
                >
                  {line(c.itemId, c.type)}
                </span>
                <span className="g-meta mt-3 block">
                  <span style={{ color: OTHER_PERSON_COLOUR[exchangeState(c.type)] }}>
                    {them ? them.username : "someone"}
                  </span>{" "}
                  · {STATE_WORD[c.state]}
                  {c.state === "awaiting" && c.claimedBy !== ME_ID
                    ? " · needs your answer"
                    : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {past.length ? (
        <>
          {/* THE COMPLETED ACT CREATED THE CONNECTION — nothing else does. */}
          <h2 className="g-rule g-heading mt-14 pt-5 opacity-45">
            connections · completed together
          </h2>
          <ul className="mt-5 space-y-4">
            {past.map((p) => {
              const them = memberById(p.withId);
              return (
                <li key={p.id} className="g-body">
                  <span style={{ color: ACTIVITY_FILL[p.type] }}>{p.text}</span>
                  <span className="opacity-45">
                    {them ? ` — ${them.username}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
