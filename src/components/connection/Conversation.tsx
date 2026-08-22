import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine } from "@/data/items";
import {
  MESSAGE_MAX,
  STATE_WORD,
  canClaim,
  connectionsStore,
  generousIds,
  messagesOf,
  otherParty,
} from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { buzz, haptics } from "@/lib/haptics";

/**
 * THE CONNECTION LIVES ON THE S-CURVE.
 *
 * In the Living G, the two loops are the two people and the S between them is
 * what passes between them — so a conversation is drawn on that curve, and it
 * PERSISTS: leaving this screen never ends it.
 *
 * NOTHING HERE COMPLETES ANYTHING ON ITS OWN. One person can only CLAIM that it
 * happened; the other is asked plainly, and only their yes settles the sparks.
 */
export function Conversation({
  connectionId,
  onClose,
}: {
  connectionId: string;
  onClose: () => void;
}) {
  const links = useConnections();
  const items = useItems();
  const [draft, setDraft] = useState("");
  const [calling, setCalling] = useState(false);

  const c = links.connections.find((x) => x.id === connectionId);
  const item = c ? items.items.find((i) => i.id === c.itemId) : undefined;

  if (!c)
    return (
      <div
        data-world="connection"
        className="relative flex h-full w-full items-center justify-center px-7"
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
      >
        <BackArrow onClick={onClose} />
        <p className="g-display">no connection here.</p>
      </div>
    );

  const them = memberById(otherParty(c, ME_ID));
  const messages = messagesOf(links, c.id);
  const iClaimed = c.claimedBy === ME_ID;
  const awaitingMe = c.state === "awaiting" && !iClaimed;
  const earns = generousIds(c).includes(ME_ID);

  const send = () => {
    if (!draft.trim()) return;
    connectionsStore.send(c.id, draft, ME_ID);
    setDraft("");
    buzz();
  };

  return (
    <div
      data-world="connection"
      className="relative flex h-full w-full flex-col overflow-hidden px-6 pb-6 pt-16"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back" />

      {/* NO ORNAMENT. The conversation itself is the only thing on this page. */}


      <span className="g-meta opacity-70">
        {them ? them.username : "someone"} · {STATE_WORD[c.state]}
      </span>
      <h1
        className="mt-2 g-display-sm"
        style={{ color: ACTIVITY_FILL[c.type] }}
      >
        {item ? itemLine(item) : c.type}
      </h1>

      {/* THE CONVERSATION. It is coordination, not a completion signal. */}
      <ul className="mt-6 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <li className="g-body opacity-55">
            say hello. work out the where and the when.
          </li>
        ) : null}
        {messages.map((m) => (
          <li
            key={m.id}
            className={m.fromId === ME_ID ? "text-right" : "text-left"}
          >
            <span
              className="inline-block max-w-[85%] g-body"
              style={{
                color:
                  m.fromId === ME_ID ? "var(--giver-me)" : "var(--giver-others)",
              }}
            >
              {m.text}
            </span>
          </li>
        ))}
      </ul>

      {/* BORROWING HAS A CYCLE: out, then back. Neither one is a completion. */}
      {c.type === "borrow" && (c.state === "connecting" || c.state === "disputed") ? (
        <div className="mb-3 flex gap-5 text-[11px] font-black lowercase tracking-[0.24em]">
          <button
            type="button"
            onClick={() =>
              connectionsStore.setBorrowStage(c.id, "handedOver", !c.handedOver)
            }
            className={c.handedOver ? "opacity-100" : "opacity-40"}
          >
            handed over
          </button>
          <button
            type="button"
            onClick={() =>
              connectionsStore.setBorrowStage(c.id, "returned", !c.returned)
            }
            className={c.returned ? "opacity-100" : "opacity-40"}
          >
            returned
          </button>
        </div>
      ) : null}

      {/* THE TWO-SIDED ENDING. */}
      {c.state === "verified" ? (
        <p className="mb-4 g-display-sm" style={{ color: "var(--giver-generosity)" }}>
          you both verified it. {earns ? "sparks settled." : "thank you."}
        </p>
      ) : awaitingMe ? (
        <div className="mb-4">
          <p className="g-display-sm">
            did this actually happen?
          </p>
          <div className="mt-3 flex gap-6 text-[13px] font-black lowercase tracking-[0.24em]">
            <button
              type="button"
              onClick={() => {
                // MUTUAL VERIFICATION — the moment an act becomes real.
                haptics.success();
                connectionsStore.respond(c.id, true, ME_ID);
              }}
              style={{ color: "var(--giver-generosity)" }}
            >
              yes, it happened
            </button>
            <button
              type="button"
              onClick={() => connectionsStore.respond(c.id, false, ME_ID)}
              className="opacity-55"
            >
              not yet
            </button>
          </div>
        </div>
      ) : c.state === "awaiting" ? (
        <p className="mb-4 g-body opacity-65">
          waiting for {them ? them.username : "them"} to confirm it happened.
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[13px] font-black lowercase tracking-[0.24em]">
          <button
            type="button"
            disabled={!canClaim(c)}
            onClick={() => {
              haptics.light();
              connectionsStore.claimComplete(c.id, ME_ID);
            }}
            className="disabled:opacity-25"
            style={{ color: "var(--giver-generosity)" }}
          >
            this happened
          </button>
          <button
            type="button"
            onClick={() => setCalling(true)}
            className="opacity-60"
          >
            call
          </button>
          <button
            type="button"
            onClick={() => {
              connectionsStore.cancel(c.id);
              onClose();
            }}
            className="opacity-45"
          >
            it didn’t work out
          </button>
        </div>
      )}

      {c.state === "disputed" ? (
        <p className="mb-3 g-body opacity-65">
          you don’t agree yet. nothing is completed and nothing is paid — keep
          talking, then try again.
        </p>
      ) : null}

      {/* PRIVACY BY DEFAULT: numbers are never exchanged inside giver. */}
      {calling ? (
        <p className="mb-3 g-body opacity-65">
          giver connects the call for you — neither of you ever sees the other’s
          number. calling arrives with the phone build.
        </p>
      ) : null}

      {/*
        ONE MESSAGE AREA. The label, the field and send are a single group at the
        bottom of the page: tap, type, send. Nothing to work out.
      */}
      {c.state !== "verified" && c.state !== "cancelled" ? (
        <div>
          <span className="g-meta opacity-55">
            message {them ? them.username : "them"}
          </span>
          <div
            className="mt-2 flex items-end gap-3 border-b-2 pb-2"
            style={{ borderColor: "var(--giver-connection)" }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
              rows={2}
              placeholder="type your message"
              className="min-w-0 flex-1 resize-none bg-transparent g-body outline-none placeholder:opacity-30"
              style={{ color: "var(--world-ink)" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="shrink-0 pb-1 text-[15px] font-black lowercase tracking-[0.22em] disabled:opacity-25"
              style={{ color: "var(--giver-connection)" }}
            >
              send
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
