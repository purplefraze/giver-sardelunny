import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine } from "@/data/items";
import { itemFacts } from "@/components/profile/ItemFacts";
import { MESSAGE_MAX, connectionsStore, messagesOf, otherParty } from "@/data/connections";
import { demoReply } from "@/data/demo-replies";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";

/**
 * A CONVERSATION IS AN EXCHANGE, NOT A CONTROL PANEL.
 *
 * The activity's own parameters sit at the top so nobody has to go back a page
 * to remember when or where. Below them the thread runs downward, and the
 * starter line lives INSIDE the composer, where the typing happens.
 *
 * The two people are drawn as two related oranges — the meeting of their two
 * profile colours — while their names keep their own identity colour.
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
  const me = useMyProfile();
  const [draft, setDraft] = useState("");
  const [usedStarter, setUsedStarter] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const c = links.connections.find((x) => x.id === connectionId);
  const item = c ? items.items.find((i) => i.id === c.itemId) : undefined;
  const messages = c ? messagesOf(links, c.id) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

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

  const themId = otherParty(c, ME_ID);
  const them = memberById(themId);
  const theirName = them ? them.name.toLowerCase() : "them";
  const myName = (me.username || "you").replace(/^@/, "") || "you";
  /* The person who posted the activity carries the deeper orange. */
  const toneOf = (fromId: string) =>
    fromId === c.ownerId ? "var(--convo-poster)" : "var(--convo-responder)";
  const nameOf = (fromId: string) => (fromId === ME_ID ? myName : theirName);
  const nameColour = (fromId: string) =>
    fromId === ME_ID ? "var(--giver-me)" : "var(--giver-community)";

  const facts = item ? itemFacts(item) : [];
  const starter = `hey ${theirName}`;
  const showStarter = messages.length === 0 && !usedStarter && !draft.trim();

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    connectionsStore.send(c.id, text, ME_ID);
    setDraft("");
    buzz();
    /* DEMO ONLY: a sample person answers from their own stored parameters. */
    const reply = demoReply(item, text, themId);
    if (reply)
      window.setTimeout(() => connectionsStore.send(c.id, reply, themId), 900);
  };

  return (
    <div
      data-world="connection"
      className="relative flex h-full w-full flex-col overflow-hidden px-6 pb-5 pt-16"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back" />

      {/* WHO. Just their name — nothing about "connecting". */}
      <h1 className="g-display-sm" style={{ color: "var(--giver-community)" }}>
        {theirName}
      </h1>

      {/* WHAT, AND ITS PARAMETERS — one quiet line, carried through from the give. */}
      {item ? (
        <>
          <p className="mt-2 g-name" style={{ color: ACTIVITY_FILL[c.type] }}>
            {itemLine(item)}
          </p>
          {facts.length ? (
            <p className="mt-2 g-meta" style={{ color: "var(--convo-poster)" }}>
              {facts.map((f) => f.value).join(" · ")}
            </p>
          ) : null}
        </>
      ) : null}


      {/* THE THREAD. It runs downward, newest at the bottom. */}
      <ul className="g-rule mt-5 flex-1 space-y-5 overflow-y-auto pb-4 pt-5">
        {messages.map((m) => (
          <li key={m.id} className={m.fromId === ME_ID ? "text-right" : "text-left"}>
            <span className="g-meta block" style={{ color: nameColour(m.fromId) }}>
              {nameOf(m.fromId)}
            </span>
            <span
              className="mt-1 inline-block max-w-[85%] g-body"
              style={{ color: toneOf(m.fromId) }}
            >
              {m.text}
            </span>
          </li>
        ))}
        <div ref={endRef} />
      </ul>

      {/* ONE MESSAGE AREA: the suggestion, the field and send, together. */}
      {c.state !== "cancelled" ? (
        <div>
          {showStarter ? (
            <button
              type="button"
              onClick={() => {
                setDraft(starter);
                setUsedStarter(true);
              }}
              className="mb-2 g-meta"
              style={{ color: "var(--convo-responder)" }}
            >
              {starter}
            </button>
          ) : null}
          <div
            className="flex items-end gap-3 border-b-2 pb-2"
            style={{ borderColor: "var(--convo-poster)" }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
              rows={2}
              placeholder="type your message"
              className="min-w-0 flex-1 resize-none bg-transparent g-body outline-none placeholder:opacity-30"
              style={{ color: "var(--convo-responder)" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="shrink-0 pb-1 text-[15px] font-black lowercase tracking-[0.22em] disabled:opacity-25"
              style={{ color: "var(--convo-poster)" }}
            >
              send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
