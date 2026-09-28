import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine } from "@/data/items";
import { itemFacts } from "@/components/profile/ItemFacts";
import {
  MESSAGE_MAX,
  canClaim,
  connectionsStore,
  messagesOf,
  otherParty,
  sessionPeriodOf,
  sessionsOf,
  type Connection,
} from "@/data/connections";
import {
  SESSION_SPARKS,
  nextPeriodStart,
  periodKey,
  sessionWord,
  type SessionPeriod,
} from "@/data/give-sessions";
import { dayLabel } from "@/data/give-when";
import { sessionsAvailability, sessionsLive, updateSession } from "@/data/cloud/sessions-sync";

import { demoReply, demoRepliesStore, SAMPLE_CONFIRMS } from "@/data/demo-replies";
import { notify } from "@/lib/notify";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { buzz } from "@/lib/haptics";
import { updateConnection } from "@/data/cloud/connections-sync";
import { isSampleProfile, profileIdForLocal } from "@/data/cloud/directory";
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
  /* Re-render once we know whether the server can count lessons yet. */
  useSyncExternalStore(
    sessionsAvailability.subscribe,
    sessionsAvailability.get,
    sessionsAvailability.getServer,
  );

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
  /** THE RECIPIENT OF A GIVE says "got it" (the existing claim/confirm). */
  const gotIt = c.type === "give" && c.helperId === ME_ID;
  const themColour = OTHER_PERSON_COLOUR[state];
  /* WHO IS SPEAKING: me blue, them red / yellow / orange. Never by who posted. */
  const toneOf = (fromId: string) => (fromId === ME_ID ? SELF_COLOUR : themColour);
  const nameOf = (fromId: string) => (fromId === ME_ID ? myName : theirName);
  const nameColour = toneOf;

  const facts = item ? itemFacts(item) : [];
  /*
    A REPEATING GIVE COUNTS LESSONS (give-sessions.ts). Each one is confirmed
    by both people and never completes the give. Until the server can count
    them (unapplied sql), a cloud connection keeps the one-off flow below.
  */
  const lessonPeriod = sessionPeriodOf(c);
  const perLesson =
    lessonPeriod !== null &&
    c.state !== "cancelled" &&
    c.state !== "verified" &&
    sessionsLive(c.id);
  const starter = `hey ${theirName}`;
  const showStarter = messages.length === 0 && !usedStarter && !draft.trim();

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    connectionsStore.send(c.id, text, ME_ID);
    setDraft("");
    buzz();
    /* DEMO ONLY: a sample person answers from their own stored parameters, and
       never repeats a phrasing they have already used in this thread. */
    const saidBefore = messages.filter((m) => m.fromId === themId).map((m) => m.text);
    const theirProfileId = profileIdForLocal(themId);
    const reply = theirProfileId && isSampleProfile(theirProfileId)
      ? demoReply(item, text, themId, saidBefore)
      : null;
    if (reply)
      window.setTimeout(() => {
        connectionsStore.send(c.id, reply, themId);
        notify(`${theirName}: ${reply}`);
      }, 900);
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
      {/*
        "GOT IT" — the recipient of a give confirms receipt with the existing
        claim/confirm step (it records them in confirmedBy / helper_confirmed).
        That confirmation is what lifts the giver's three-gives cap.
      */}
      {perLesson && lessonPeriod ? (
        <LessonConfirm
          c={c}
          period={lessonPeriod}
          unit={sessionWord(item?.details?.extras?.["kind"])}
          theirName={theirName}
          stateColour={stateColour}
          sessions={sessionsOf(links, c.id)}
        />
      ) : c.state !== "cancelled" && c.state !== "verified" ? (
        <div className="g-rule mt-6 pt-5" data-testid="did-it-happen">
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
                      void updateConnection(c.id, stage === "handedOver" ? "handover" : "return", !on);
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
                  {gotIt ? "did you get it?" : "did this happen?"}
                </p>
                <div className="mt-3 flex items-baseline gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      void updateConnection(c.id, "confirm");
                    }}
                    className="g-display-sm"
                    style={{ color: stateColour }}
                  >
                    {gotIt ? "got it" : "yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      void updateConnection(c.id, "dispute");
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
                void updateConnection(c.id, "claim");
                /* DEMO ONLY: a sample person confirms it too, in the language of
                   this exchange — a give is gifted, a wish is granted. */
                const theirProfileId = profileIdForLocal(themId);
                if (them && theirProfileId && isSampleProfile(theirProfileId) && demoRepliesStore.get()) {
                  const kind = (item ? item.type : "give") as keyof typeof SAMPLE_CONFIRMS;
                  const lines = SAMPLE_CONFIRMS[kind] ?? SAMPLE_CONFIRMS['give']!;
                  const said = lines[Math.min(lines.length - 1, messages.length % lines.length)]!;
                  window.setTimeout(() => {
                    connectionsStore.send(c.id, said, themId);
                    /* Sample confirmations are completed by the admin account,
                       never fabricated on behalf of a real participant. */
                  }, 1200);
                }
              }}
              className="g-name text-left"
              style={{ color: stateColour }}
            >
              {gotIt ? "got it" : "this happened"}
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


      {/* ONE MESSAGE AREA: the suggestion, the field and send, together. */}
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

/* Periods start at utc midnight; name that calendar day ("mon 12 oct"). */
const shortDate = (ms: number) => {
  const u = new Date(ms);
  return dayLabel(new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()));
};

/**
 * "THIS LESSON HAPPENED" — the same claim / confirm as a connection, once per
 * cadence period, for a give that repeats. Each lesson both people confirm,
 * giver adds ten sparks for the giver. The receiver pays nothing.
 */
function LessonConfirm({
  c,
  period,
  unit,
  theirName,
  stateColour,
  sessions,
}: {
  c: Connection;
  period: SessionPeriod;
  unit: string;
  theirName: string;
  stateColour: string;
  sessions: ReturnType<typeof sessionsOf>;
}) {
  const now = Date.now();
  const pending = sessions.find((x) => x.state === "awaiting");
  const thisOne = sessions.find((x) => x.period === periodKey(period, now));
  const counted = sessions.filter((x) => x.state === "verified").length;
  const iGive = c.ownerId === ME_ID;
  const forWhom = iGive ? "you" : theirName;
  const act = (action: "claim" | "confirm" | "dispute") => {
    buzz();
    void Promise.resolve(updateSession(c.id, action)).catch(() => undefined);
  };
  return (
    <div className="g-rule mt-6 pt-5" data-testid="lesson-confirm">
      {pending ? (
        pending.claimedBy === ME_ID ? (
          <p className="g-body" style={{ color: stateColour }}>
            waiting for {theirName} to confirm this {unit} happened.
          </p>
        ) : (
          <div>
            <p className="g-name" style={{ color: stateColour }}>
              did this {unit} happen?
            </p>
            <div className="mt-3 flex items-baseline gap-6">
              <button
                type="button"
                onClick={() => act("confirm")}
                className="g-display-sm"
                style={{ color: stateColour }}
              >
                yes
              </button>
              <button type="button" onClick={() => act("dispute")} className="g-name" style={{ opacity: 0.5 }}>
                not yet
              </button>
            </div>
          </div>
        )
      ) : thisOne?.state === "verified" ? (
        <div>
          <p className="g-name" style={{ color: stateColour }}>
            {thisOne.credited
              ? `this ${unit} is counted. giver added ${SESSION_SPARKS} sparks for ${forWhom}.`
              : `this ${unit} is counted. no sparks this time — the cap is reached.`}
          </p>
          <p className="g-meta mt-2 opacity-45">
            the next one can be confirmed from {shortDate(nextPeriodStart(period, now))}
          </p>
        </div>
      ) : (
        <button type="button" onClick={() => act("claim")} className="g-name text-left" style={{ color: stateColour }}>
          this {unit} happened
        </button>
      )}

      {!pending && thisOne?.state === "disputed" ? (
        <p className="g-meta mt-3 opacity-55">you two don’t agree yet — nothing has settled. keep talking.</p>
      ) : null}

      <p className="g-meta mt-3 opacity-45" data-testid="lesson-count">
        {counted
          ? `${counted} ${counted === 1 ? unit : `${unit}s`} counted · `
          : ""}
        each {unit} you both confirm, giver adds {SESSION_SPARKS} sparks for {forWhom}
        {iGive ? "." : ". it costs you nothing."}
      </p>
    </div>
  );
}
