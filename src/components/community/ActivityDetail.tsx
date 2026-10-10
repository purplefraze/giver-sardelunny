import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { itemMode, CG_INK } from "@/data/communigy";
import { useFund } from "@/hooks/use-fund";
import { fundedTotal, wishTarget } from "@/data/fund";
import { formatCents } from "@/data/fund-rules";
import { BackArrow } from "@/components/BackArrow";
import { memberById } from "@/data/giver";
import { ACTIVITY_FILL, ME_ID, itemLine, visibleToOthers, type Item, type ItemType } from "@/data/items";
import {
  STATE_WORD,
  activityStatus,
  connectionsForItem,
  connectionsStore,
  isOpen,
  myConnectionFor,
} from "@/data/connections";
import { myProfileStore } from "@/data/my-profile";
import { useConnections } from "@/hooks/use-connections";
import { useItems } from "@/hooks/use-items";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useAdmin } from "@/hooks/use-admin";
import { useMemberEdits } from "@/hooks/use-member-edits";
import { AdminItemEditor } from "@/components/admin/AdminItemEditor";
import { itemFacts, itemKindWord } from "@/components/profile/ItemFacts";
import { buzz } from "@/lib/haptics";
import { OTHER_PERSON_COLOUR, exchangeState } from "@/lib/exchange-colours";
import { startConnection } from "@/data/cloud/connections-sync";
import { sessionStore } from "@/data/cloud/session";
import { canEngageCommunity } from "@/data/community-access";
import { giveCapState } from "@/data/give-cap";
import { CapScreen } from "@/components/give/CapScreen";


/**
 * ONE ITEM, IN FULL — WHOEVER POSTED IT, WHEREVER IT WAS OPENED FROM.
 *
 * This is the shared detail experience for every give, wish, trade, lend and
 * borrow in Giver: the community feed, any person's profile and my own profile
 * all land here, because there is only ever one record behind them.
 *
 * The actions below START something; they never finish anything. They express
 * INTENT and open a conversation ABOUT THIS ITEM, leaving the activity exactly
 * where it was — still active, still discoverable by other people.
 */

/** THE INVITATION, in the language of the activity. Never "claim" or "accept". */
const INTENT_WORD: Record<ItemType, string> = {
  wish: "grant this wish",
  give: "apply for this give",
  trade: "propose a trade",
  borrow: "offer to lend it",
};

/** Lending and borrowing are opposites, and never share a sentence. */
function actionWord(item: Item): string {
  if (item.type === "borrow")
    return item.side === "lend" ? "ask to borrow it" : "offer to lend it";
  return INTENT_WORD[item.type];
}

export function ActivityDetail({
  itemId,
  onOpenConnection,
  onOpenProfile,
  onNeedGive,
  onStartGive,
  onClose,
  embedded = false,
}: {
  itemId: string;
  onOpenConnection: (connectionId: string) => void;
  /** The person is always their own destination. */
  onOpenProfile?: ((ownerId: string) => void) | undefined;
  /** communi-g is visible; engaging still needs one active give. */
  onNeedGive?: (() => void) | undefined;
  /** The three-gives prompt's green circle: start a give. */
  onStartGive?: (() => void) | undefined;
  onClose: () => void;
  embedded?: boolean;
}) {
  const items = useItems();
  const fund = useFund();
  const links = useConnections();
  const sparkles = useMyProfile().sparkles;
  /* THE DEVELOPER SWITCH, and the live people projection it can edit. */
  const admin = useAdmin();
  useMemberEdits();
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState("");
  /* THE THREE-GIVES CAP (give-cap.ts, client-side): an overlay, so closing it
     returns exactly here. */
  const [capOpen, setCapOpen] = useState(false);
  /* A LATE CONNECTION never opens over a newer item or after this view left. */
  const live = useRef({ itemId, alive: true });
  live.current.itemId = itemId;
  useEffect(() => { live.current.alive = true; const ref = live.current; return () => { ref.alive = false; }; }, []);
  /* ONE SCREEN: the in-loop detail reflows (never scrolls) to fit its hollow. */
  const fitBox = useRef<HTMLDivElement | null>(null);
  /* Reflow levels: gentle type steps with a readable floor (0.88), then a
     denser arrangement (tighter rows, three-column facts) — never microtype. */
  const [level, setLevel] = useState(0);
  const fit = FIT_LEVELS[level] ?? 0.88;
  const setFit = (v: number) => { if (v === 1) setLevel(0); };
  useLayoutEffect(() => {
    const el = fitBox.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 1 && level < FIT_LEVELS.length) setLevel(l => l + 1);
  });
  useEffect(() => {
    const el = fitBox.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let w = el.clientWidth, h = el.clientHeight;
    const ro = new ResizeObserver(() => { if (el.clientWidth !== w || el.clientHeight !== h) { w = el.clientWidth; h = el.clientHeight; setFit(1); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, [embedded]);
  /* WITHOUT A LIVE GIVE, NOTHING ELSE OF THEIRS IS VISIBLE (items.ts). */
  const found = items.items.find((i) => i.id === itemId);
  const item = found && visibleToOthers(items, found) ? found : undefined;


  if (!item)
    return (
      <div
        data-world="community"
        className="relative flex h-full w-full flex-col justify-center px-7"
        style={{ background: "var(--world-bg)", color: "var(--giver-ink)" }}
      >
        <BackArrow onClick={onClose} />
        <p className="g-display">this one is gone</p>
      </div>
    );

  const owner = memberById(item.ownerId);
  const isMine = item.ownerId === ME_ID;
  const who = isMine ? "you" : (owner?.username ?? "someone");
  const mine = myConnectionFor(links, item.id);
  const status = activityStatus(links, item.id, item.status);
  const others = connectionsForItem(links, item.id).filter(
    (c) => isOpen(c) && c.helperId !== ME_ID,
  ).length;
  const fill = CG_INK[itemMode(item)];
  const target = itemMode(item) === "fund" ? wishTarget(item) : null;
  /* ACTING on someone else's give is blocked at the cap; looking never is.
     A conversation that already exists (one of the three) stays open. */
  const cap = giveCapState(links.connections, items.items, ME_ID);
  const capBlocks = item.type === "give" && !isMine && !mine && cap.capped;

  /**
   * ONE DOOR, TWO WAYS THROUGH IT. Messaging and responding both open the
   * conversation that belongs TO THIS ITEM, so the other person always sees
   * what the message is about — never an unexplained generic chat.
   */
  const open = async () => {
    buzz();
    if (mine) {
      onOpenConnection(mine.id);
      return;
    }
    if (capBlocks) {
      setCapOpen(true);
      return;
    }
    /* LOOKING IS FREE. Responding needs one active give of your own. */
    if (!canEngageCommunity(items)) {
      onNeedGive?.();
      return;
    }
    /* INTENT ONLY. This opens a conversation — it completes nothing. */
    if (!sessionStore.get().profile) {
      setProblem("finish joining giver in my g first.");
      return;
    }
    const asked = item.id;
    try {
      const id = await startConnection(asked);
      if (!live.current.alive || live.current.itemId !== asked) return;
      onOpenConnection(id);
    } catch (error) {
      if (!live.current.alive || live.current.itemId !== asked) return;
      setProblem(error instanceof Error ? error.message.toLowerCase() : "that connection didn’t open");
    }
  };

  const personInk = OTHER_PERSON_COLOUR[exchangeState(item.type)];
  const statusWord = status === "completed" ? "completed and verified" : mine ? STATE_WORD[mine.state] : status === "connecting" ? `${others} ${others === 1 ? "person" : "people"} talking · still open` : "open";
  const facts = itemFacts(item);
  const title = itemLine(item);
  /* ONE COMPACT RECORD FOR EVERY ENTRY PATH (community hollow, a profile, my g). */
  return (
    <div className={embedded ? "contents" : "cg-detail-page"} data-world="community">
    <div
      ref={fitBox}
      data-world="community"
      data-community-detail={embedded ? "in-loop" : "standalone"}
      data-cg-fit={fit}
      data-dense={level >= FIT_LEVELS.length ? "1" : "0"}
      className="cg-detail"
      style={{ color: "var(--giver-ink)", ["--fit" as string]: fit, ["--title" as string]: title.length > 42 ? "21px" : title.length > 24 ? "24px" : "27px" }}
    >
      <span className="cg-flow-a" aria-hidden="true" /><span className="cg-flow-b" aria-hidden="true" />
      <div className="cg-d-head">
        <button type="button" className="cg-d-back" aria-label="back to the list" onClick={() => { buzz(); onClose(); }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
        </button>
        <span className="cg-d-kind" style={{ color: fill }}>{itemKindWord(item)}</span>
      </div>
      <h1 className="cg-d-title" style={{ color: fill }} data-cg-d-title="">{title}</h1>
      {target !== null ? <p className="cg-d-fund" data-cg-d-fund=""><span>{formatCents(fundedTotal(fund, item.id))} pledged · {formatCents(target)} target</span><span className="cg-d-meta">{item.id.startsWith("seed-") ? "demo cause · demo pledges only · no payments collected" : "pledges only · no payments collected"}</span></p> : null}
      {!isMine && owner ? (
        <button type="button" className="cg-d-owner" aria-label={`see ${owner.username}'s whole profile`} onClick={() => { buzz(); onOpenProfile?.(owner.id); }} data-cg-d-owner="">
          {owner.photo ? <img src={owner.photo} alt="" className="cg-d-avatar" /> : <span aria-hidden className="cg-d-avatar" style={{ background: "var(--giver-ink)", opacity: 0.08 }} />}
          <span className="min-w-0">
            <span className="cg-d-name" style={{ color: personInk }}>{owner.username}</span>
            <span className="cg-d-meta">{[owner.age || null, owner.gender || null, item.distanceKm === undefined ? owner.distance || null : `${item.distanceKm} km away`, statusWord].filter(Boolean).join(" · ")}</span>
          </span>
        </button>
      ) : <p className="cg-d-meta">{who} · {statusWord}</p>}
      {item.photos?.length ? <div className="cg-d-photos">{item.photos.map((p, i) => <img key={i} src={p} alt={`${title} photo ${i + 1}`} />)}</div> : null}
      {facts.length ? <dl className="cg-d-facts" data-cg-d-facts="">{facts.map(f => <div key={`${f.label}-${f.value}`}><dt>{f.label}</dt><dd style={{ color: fill }}>{f.value}</dd></div>)}</dl> : null}
      {item.note ? <p className="cg-d-note" data-cg-d-note="">{item.note}</p> : null}
      {problem ? <p className="cg-d-note" role="alert" style={{ color: fill }}>{problem}</p> : null}
      <div className="cg-d-actions" data-cg-d-actions="">
        {status === "completed" ? <p className="cg-d-meta">this one already happened.</p> : isMine ? <p className="cg-d-meta">this one is yours.</p> : <>
          <button type="button" onClick={open} className={`cg-d-primary ${capBlocks ? "gf-faded" : ""}`} style={{ color: fill }}>{mine ? "open the conversation" : target !== null ? "talk about this cause" : actionWord(item)}</button>
          <button type="button" onClick={open} className={`cg-d-quiet ${capBlocks ? "gf-faded" : ""}`} style={{ color: "var(--giver-messages)" }}>{`message ${who}`}</button>
        </>}
        {status !== "completed" && !isMine ? <button type="button" disabled={sparkles < 1} onClick={() => { buzz(); if (!canEngageCommunity(items)) { onNeedGive?.(); return; } myProfileStore.useSparkle(item.id); }} className="cg-d-quiet disabled:opacity-25" style={{ color: "var(--giver-sparkles)" }}>{item.boostCount > 0 ? `sparkled ×${item.boostCount}` : "sparkle this"}</button> : null}
        {admin ? <button type="button" onClick={() => { buzz(); setEditing(true); }} className="cg-d-quiet" style={{ color: "var(--giver-me)" }}>edit this activity</button> : null}
      </div>
      {capOpen ? <CapScreen kind={cap.waiting ? "waiting" : "prompt"} onBack={() => setCapOpen(false)} onGive={() => { setCapOpen(false); onStartGive?.(); }} /> : null}
      {admin && editing ? <AdminItemEditor itemId={item.id} onClose={() => setEditing(false)} /> : null}
    </div>
    </div>
  );
}

const FIT_LEVELS = [1, 0.94, 0.88];

