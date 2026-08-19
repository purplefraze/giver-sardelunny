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
      className="relative flex h-full w-full flex-col overflow-y-auto px-6 pb-10 pt-16"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <h1 className="text-[13vw] font-black lowercase leading-[0.82] tracking-[-0.055em]">
        connections
      </h1>

      <ul className="mt-8 space-y-6">
        {open.length === 0 ? (
          <li className="opacity-55">nothing in motion right now.</li>
        ) : null}
        {open.map((c) => {
          const them = memberById(otherParty(c, ME_ID));
          return (
            <li key={c.id}>
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  buzz();
                  onOpen(c.id);
                }}
              >
                <span
                  className="block text-[6.8vw] font-black lowercase leading-[0.95] tracking-[-0.04em]"
                  style={{ color: ACTIVITY_FILL[c.type] }}
                >
                  {line(c.itemId, c.type)}
                </span>
                <span className="mt-1 block text-[12px] font-medium lowercase opacity-50">
                  {them ? them.username : "someone"} · {STATE_WORD[c.state]}
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
          <h2 className="mt-14 text-[11px] font-black lowercase tracking-[0.3em] opacity-45">
            past connections
          </h2>
          <ul className="mt-5 space-y-4">
            {past.map((p) => {
              const them = memberById(p.withId);
              return (
                <li key={p.id} className="text-lg font-medium lowercase leading-snug">
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
