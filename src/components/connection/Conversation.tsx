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
import {
  OTHER_PERSON_COLOUR,
  SELF_COLOUR,
  STATE_COLOUR,
  STATE_WORLD,
  exchangeState,
} from "@/lib/exchange-colours";

/**
 * A CONVERSATION IS AN EXCHANGE, NOT A CONTROL PANEL.
 *
 * The activity's own parameters sit at the top so nobody has to go back a page
 * to remember when or where. Below them the thread runs downward, and the
 * starter line lives INSIDE the composer, where the typing happens.
 *
 * The two speakers are drawn in the person colours — me in blue, the other
 * person in red when we are asking (wish / borrow) or yellow when we are
 * offering (give / lend) — while the whole thread sits inside the colour of the
 * relationship itself: purple for asking, green for offering, orange for trade.
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
        data-world="connection-wish"
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
  /* THE STATE THIS THREAD LIVES IN — purple asking, green offering, orange trade. */
  const state = exchangeState(item ? item.type : "wish");
  const stateColour = STATE_COLOUR[state];
  const themColour = OTHER_PERSON_COLOUR[state];
  /* WHO IS SPEAKING: me blue, them red / yellow / orange. Never by who posted. */
  const toneOf = (fromId: string) => (fromId === ME_ID ? SELF_COLOUR : themColour);
  const nameOf = (fromId: string) => (fromId === ME_ID ? myName : theirName);
  const nameColour = toneOf;

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
      data-world={STATE_WORLD[state]}
      className="relative flex h-full w-full flex-col overflow-y-auto px-6 pb-5 pt-16"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back" />

      {/* WHO. Just their name — nothing about "connecting". */}
      <h1 className="g-display-sm" style={{ color: themColour }}>
        {theirName}
      </h1>

      {/* WHAT, AND ITS PARAMETERS — one quiet line, carried through from the give. */}
      {item ? (
        <>
          <p className="mt-2 g-name" style={{ color: stateColour }}>
            {itemLine(item)}
          </p>
          {facts.length ? (
            <p className="mt-2 g-meta" style={{ color: stateColour, opacity: 0.75 }}>
              {facts.map((f) => f.value).join(" · ")}
            </p>
          ) : null}
        </>
      ) : null}


      {/* THE THREAD. It runs downward, and the composer follows it immediately. */}
      <ul className="g-rule mt-5 space-y-5 pt-5">
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


      {/*
        DID THIS HAPPEN? — THE ONLY WAY ANYTHING EVER SETTLES.
        One person says it happened; the other is asked. Sparks move only when
        both have said yes, and "no" never decides who is right.
      */}
      {c.state !== "cancelled" && c.state !== "verified" ? (
        <div className="g-rule mt-6 pt-5">
          {/* A BORROW IS NOT FINISHED AT PICKUP. Both halves of the cycle first. */}
          {c.type === "borrow" && c.state !== "awaiting" ? (
            <div className="mb-4 flex flex-wrap items-baseline gap-5">
              {(["handedOver", "returned"] as const).map((stage) => {
                const on = stage === "handedOver" ? c.handedOver === true : c.returned === true;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => {
                      buzz();
                      connectionsStore.setBorrowStage(c.id, stage, !on);
                    }}
                    className="g-meta"
                    style={{ color: on ? stateColour : undefined, opacity: on ? 1 : 0.45 }}
                  >
                    {on ? "✓ " : "· "}
                    {stage === "handedOver" ? "handed over" : "given back"}
                  </button>
                );
              })}
            </div>
          ) : null}

          {c.state === "awaiting" ? (
            c.claimedBy === ME_ID ? (
              <p className="g-body" style={{ color: stateColour }}>
                waiting for {theirName} to confirm it happened.
              </p>
            ) : (
              <div>
                <p className="g-name" style={{ color: stateColour }}>
                  did this happen?
                </p>
                <div className="mt-3 flex items-baseline gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      connectionsStore.respond(c.id, true, ME_ID);
                    }}
                    className="g-display-sm"
                    style={{ color: stateColour }}
                  >
                    yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      connectionsStore.respond(c.id, false, ME_ID);
                    }}
                    className="g-name"
                    style={{ opacity: 0.5 }}
                  >
                    not yet
                  </button>
                </div>
              </div>
            )
          ) : canClaim(c) ? (
            <button
              type="button"
              onClick={() => {
                buzz();
                connectionsStore.claimComplete(c.id, ME_ID);
              }}
              className="g-name text-left"
              style={{ color: stateColour }}
            >
              this happened
            </button>
          ) : (
            <p className="g-meta opacity-45">
              {c.type === "borrow"
                ? "mark the handover and the return, then giver can verify it"
                : "when it happens, you can both verify it here"}
            </p>
          )}

          {c.state === "disputed" ? (
            <p className="g-meta mt-3 opacity-55">
              you two don’t agree yet — nothing has settled. keep talking.
            </p>
          ) : null}
        </div>
      ) : null}

      {c.state === "verified" ? (
        <p className="g-rule mt-6 g-name pt-5" style={{ color: stateColour }}>
          you both verified it. sparks have moved.
        </p>
      ) : null}


      {c.state !== "cancelled" ? (
        <div className="mt-4">

          {showStarter ? (
            <button
              type="button"
              onClick={() => {
                setDraft(starter);
                setUsedStarter(true);
              }}
              className="mb-2 g-meta"
              style={{ color: themColour }}
            >
              {starter}
            </button>
          ) : null}
          <div
            className="flex items-end gap-3 border-b-2 pb-2"
            style={{ borderColor: stateColour }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
              rows={2}
              placeholder="type your message"
              className="min-w-0 flex-1 resize-none bg-transparent g-body outline-none placeholder:opacity-30"
              style={{ color: SELF_COLOUR }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="shrink-0 pb-1 text-[15px] font-black lowercase tracking-[0.22em] disabled:opacity-25"
              style={{ color: stateColour }}
            >
              send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
