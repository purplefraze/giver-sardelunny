import { useEffect, useRef, useState } from "react";
import { EMPTY_DRAFT, draftsStore, type DraftKey } from "@/data/drafts";
import { useMyProfile } from "@/hooks/use-my-profile";
import {
  CATEGORY_PLURAL,
  MAX_PER_CATEGORY,
  WISH_COST,
  myProfileStore,
  type Category,
} from "@/data/my-profile";
import {
  TITLE_MAX,
  classifyKind,
  detailBits,
  itemsStore,
  splitTrade,
  suggestCadence,
  suggestDays,
  suggestTopic,
  timeWindow,
  tradeText,
  type BorrowSide,
  type GiveKind,
  type ItemDetails,
  type Topic,
} from "@/data/items";
import {
  FUND_TARGET_MAX_CENTS,
  formatCents,
  parseAmount,
  validTarget,
} from "@/data/fund-rules";
import {
  FormAmount,
  FormG,
  FormLine,
  FormPickLine,
  FormQuestion,
  FormSend,
  type FormTag,
} from "@/components/forms/UnifiedForm";
import { LocationAsk } from "@/components/forms/LocationAsk";
import { WhenPicker } from "@/components/give/WhenPicker";
import { whenLabel, type WhenPick } from "@/data/give-when";
import { savePin } from "@/data/give-pins";
import { myLocationStore } from "@/data/my-location";

import { pickImages } from "@/lib/pick-image";
import { storeChosenImage } from "@/lib/media";
import { haptics } from "@/lib/haptics";
import { askToNotify, notifyDecided } from "@/lib/notify";
import { pullItems, pushItems } from "@/data/cloud/items-sync";

/**
 * DESTINATION SCREEN — the form behind ONE seat of the Living G, in the ONE
 * unified pattern every seat shares (/workspace/giver-forms-unified): the G
 * top left, a light heading, two lines (the thing, then when), 2–3 quiet
 * tags under line 1 — the last one asks one full-screen question — and a
 * solid seat-colour send circle. Nothing else on the first screen.
 *
 * Presentation only: drafts, autosave-once, the account / sparks / limit
 * gates and publishing are unchanged. My current records (edit, reorder,
 * remove) stay available below the fold.
 *
 * GIVES HAVE NO PRICE AND NO PRIORITY. NO MONEY ANYWHERE EXCEPT FUND: the
 * Fund seat ("ask for funding") is this same form over a Wish, and its
 * follow-up question is the only one that asks for an amount.
 */

type FormSeat = "give" | "lend" | "trade" | "fund" | "borrow" | "wish";

/** THE SEAT'S OWN WORDS — heading, then the two line labels. */
const SEAT_COPY: Record<FormSeat, { heading: string; l1: string; l2: string }> = {
  give: { heading: "give something", l1: "what", l2: "when" },
  lend: { heading: "lend something", l1: "what", l2: "when" },
  trade: { heading: "trade", l1: "you offer", l2: "for" },
  fund: { heading: "ask for funding", l1: "for", l2: "by" },
  borrow: { heading: "borrow something", l1: "what", l2: "when" },
  wish: { heading: "make a wish", l1: "wish", l2: "by" },
};

/** Grey placeholders — line 1, line 2. Give / lend / borrow's "when" is a
    calendar now (never a silent "anytime"): its placeholder asks for a day. */
const SEAT_PLACEHOLDER: Record<FormSeat, [string, string]> = {
  give: ["something", "pick a day"],
  lend: ["something", "pick a day"],
  trade: ["something", "something"],
  fund: ["something", "whenever"],
  borrow: ["something", "pick a day"],
  wish: ["something", "whenever"],
};

/** Seats whose "when" opens the calendar (WhenPicker). */
const CALENDAR_WHEN: Record<FormSeat, boolean> = {
  give: true,
  lend: true,
  borrow: true,
  trade: false,
  fund: false,
  wish: false,
};

/**
 * AFTER PUBLISHING A BORROW (or a lend) the confirmation is a DOOR, not a
 * receipt: one tap goes straight into communi-gy, opened on my own posts.
 */
const PUBLISHED_TAP: Record<BorrowSide, string> = {
  borrow: "tap to see your borrow request live in communi-gy",
  lend: "tap to see your lend live in communi-gy",
};

/** WHAT A PROBLEM LINE ASKS FOR when line 1 is still empty. */
const CATEGORY_ASK: Record<Category, string> = {
  wish: "what do you wish for?",
  give: "what can you give today?",
  trade: "what are you offering?",
  borrow: "what would you borrow?",
};

/** WHAT CAME BACK. One line, then it steps out of the way. */
const PUBLISHED_SAY: Record<"give" | "wish" | "trade" | "borrow" | "lend", string> = {
  give: "it’s live in communi-gy",
  wish: "your wish is live in communi-gy",
  trade: "your trade is live in communi-gy",
  borrow: "your borrow is live in communi-gy",
  lend: "your lend is live in communi-gy",
};

/** BORROWING HAS TWO SIDES; the seat (or the door) already said which. */
const SIDE_ASK: Record<BorrowSide, string> = {
  borrow: "what would you like to borrow?",
  lend: "what are you happy to lend?",
};

/**
 * THE INFERRED TAG — one short word for what giver thinks this is, from the
 * existing topic guess (suggestTopic), else from the kind (classifyKind).
 * Deterministic, no backend.
 */
const TOPIC_TAG: Record<Topic, string> = {
  "items / household": "household",
  transportation: "transport",
  "outdoors / recreation": "outdoors",
  "home / repair": "repair",
  "skills / teaching": "lessons",
  "services / help": "help",
  food: "food",
  "events / experiences": "events",
};
const KIND_TAG: Record<GiveKind, string> = {
  object: "things",
  food: "food",
  skill: "skills",
  experience: "experiences",
  help: "help",
  digital: "online",
};

/** WISH ONLY: "piano lessons for my daughter" -> "for my daughter". */
const forWhom = (text: string) => {
  const m = /\bfor (my|a|the|our) ([a-z’']+)/i.exec(text);
  return m ? `for ${m[1]} ${m[2]}`.toLowerCase() : null;
};

/** THE QUESTIONS, one per seat (Fund's is the amount, handled apart). */
const HOW_LONG = ["a day", "a weekend", "a week", "two weeks"] as const;
const TRADE_WHEN = ["this week", "this month", "whenever"] as const;
const HOW_OFTEN = ["once", "weekly", "every two weeks", "monthly"] as const;
/** How often, said the way the question says it <-> the stored cadence. */
const CADENCE_OF: Record<string, string> = {
  once: "one time",
  weekly: "weekly",
  "every two weeks": "fortnightly",
  monthly: "monthly",
};
const OFTEN_OF = (cadence: string | undefined) =>
  Object.keys(CADENCE_OF).find((k) => CADENCE_OF[k] === cadence);
/** WHERE — never an address; a physical thing is never "online". */
const whereFor = (kind: GiveKind) =>
  kind === "object" || kind === "food"
    ? ["at my place", "at yours", "nearby"]
    : ["at my place", "at yours", "nearby", "online"];

export function CategoryForm({
  category,
  side: decidedSide,
  asksFunding = false,
  onDone,
  onSeeInCommunity,
}: {
  category: Category;
  /**
   * THE DOOR ALREADY ASKED. When the three-intent door (or the Lend seat) has
   * settled borrowing vs lending, the form simply knows. Otherwise: borrow.
   */
  side?: BorrowSide;
  /** THE FUND SEAT: "ask for funding" — a Wish that states what it needs. */
  asksFunding?: boolean;
  onDone: () => void;
  /** After publishing a borrow / lend: the tappable way into communi-gy. */
  onSeeInCommunity?: () => void;
}) {
  const me = useMyProfile();
  const side0: BorrowSide = decidedSide ?? "borrow";
  const draftKey: DraftKey = asksFunding ? "fund" : category;
  /* THE DRAFT SURVIVES LEAVING AND RELOADING — it is persisted, not held.
     Lend and borrow share one draft slot; a draft from the other side is
     never shown on this one. */
  const stored = useRef(
    (() => {
      const d = draftsStore.get(draftKey);
      return category === "borrow" && d.side !== side0 ? { ...EMPTY_DRAFT, side: side0 } : d;
    })(),
  ).current;
  const [draft, setDraft] = useState(stored.text);
  const [want, setWant] = useState(stored.want);
  /* Kept and saved as before (no field on the unified form). */
  const [note, setNote] = useState(stored.note);
  const side = side0;
  const [photos, setPhotos] = useState<string[]>(stored.photos);
  const [details, setDetails] = useState<ItemDetails>(stored.details);
  const [problem, setProblem] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  /** The published borrow / lend's confirmation is tappable (PUBLISHED_TAP). */
  const [liveTap, setLiveTap] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(stored.liveId);
  const lastSaved = useRef<string | null>(null);
  /** THE CALENDAR for line 2 (give / lend / borrow). */
  const [picking, setPicking] = useState(false);
  /** ONE QUESTION AT A TIME, full screen. Closed is the resting state. */
  const [asking, setAsking] = useState(false);
  /** FUND ONLY: the amount, typed as text, stored as integer cents. */
  const [amountText, setAmountText] = useState(() => {
    const t = validTarget(stored.details.fundTarget);
    return t === null ? "" : (t / 100).toString();
  });
  const [amountSay, setAmountSay] = useState<string | null>(null);

  const seat: FormSeat = asksFunding
    ? "fund"
    : category === "borrow" && side === "lend"
      ? "lend"
      : category;
  const copy = SEAT_COPY[seat];
  const colour =
    category === "borrow" && side === "lend"
      ? "var(--activity-lend)"
      : `var(--activity-${category})`;
  const limit = MAX_PER_CATEGORY[category];
  /* THE RECORD BEING TYPED IS SHOWN IN THE FIELD, NOT TWICE IN THE LIST. */
  const records = asksFunding ? [] : me.records[category].filter((i) => i.id !== liveId);
  const full =
    category === "borrow"
      ? me.records.borrow.filter((i) => (i.side ?? "borrow") === side).length >= limit
      : me.records[category].length >= limit;
  /** PHOTOS HELP FOR REAL THINGS: gives, trades and borrows. Never wishes. */
  const canPhoto = category !== "wish";
  const titleMax = TITLE_MAX[category];
  const said = category === "trade" ? `${draft} ${want}` : draft;
  const kind = classifyKind(said);
  /** NOTHING IS INFERRED BEFORE THE WORDS EXIST. */
  const described = draft.trim().length >= 3;
  const topic = details.topic ?? suggestTopic(said) ?? undefined;
  const target = validTarget(details.fundTarget);
  const when = details.extras?.["when"] ?? "";

  /* A PHYSICAL THING CAN NEVER BE "ONLINE" — dropped quietly, never corrected
     aloud. (The other answers now come from explicit questions and stay.) */
  useEffect(() => {
    if (details.where === "online" && !whereFor(kind).includes("online"))
      setDetails((prev) => ({ ...prev, where: undefined }));
  }, [kind, details.where]);

  /* SUGGESTIONS, OFFERED ONCE and only where the person said so. */
  useEffect(() => {
    if (!described) return;
    setDetails((prev) => {
      const next: ItemDetails = { ...prev };
      if (!prev.topic) {
        const guess = suggestTopic(said);
        if (guess) next.topic = guess;
      }
      if (!prev.days?.length) {
        const days = suggestDays(said);
        if (days) next.days = days;
      }
      if (!prev.cadence) {
        const cadence = suggestCadence(said, classifyKind(said));
        if (cadence) next.cadence = cadence;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [described, draft, want]);

  useEffect(() => {
    const built = timeWindow(details.startTime, details.endTime);
    if (!details.startTime && !details.endTime) return;
    if (built !== details.time) setDetails((prev) => ({ ...prev, time: built }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.startTime, details.endTime]);

  const setDetail = (patch: Partial<ItemDetails>) =>
    setDetails((prev) => ({ ...prev, ...patch }));

  /** Line 2 ("when" / "by") lives in details.extras.when — no schema change. */
  const setWhen = (value: string) =>
    setDetails((prev) => {
      const extras: Record<string, string> = { ...(prev.extras ?? {}) };
      if (value) extras["when"] = value;
      else delete extras["when"];
      return { ...prev, extras: Object.keys(extras).length ? extras : undefined };
    });

  const pickPhotos = async (attachTo?: string) => {
    const files = await pickImages({ multiple: !attachTo });
    if (!files.length) return;
    const read = await Promise.allSettled(
      files.map((f) => storeChosenImage(f, (file) => readSmall(file))),
    );
    const shrunk = read
      .map((r) => (r.status === "fulfilled" ? r.value : ""))
      .filter(Boolean);
    if (!shrunk.length) return;
    if (attachTo) {
      for (const photo of shrunk) itemsStore.addPhoto(attachTo, photo);
    } else {
      setPhotos((prev) => [...prev, ...shrunk].slice(0, 3));
    }
    haptics.light();
  };

  const cleanDetails = (): ItemDetails => ({
    ...details,
    ...(details.days?.length ? {} : { days: undefined }),
  });

  const hasDetails = (d: ItemDetails) =>
    Object.values(d).some((v) =>
      Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : Boolean(v),
    );

  /** REAL ENOUGH TO BE A RECORD: a title, and for a trade, both sides. */
  const complete =
    draft.trim().length >= 3 && (category !== "trade" || want.trim().length >= 2);

  /** AUTOSAVE, ONCE — then every change patches that same record. */
  const save = (): boolean => {
    if (!complete) return false;
    const cleaned = cleanDetails();
    if (liveId) {
      itemsStore.patch(liveId, {
        text: category === "trade" ? tradeText(draft, want) : draft,
        ...(category === "trade" ? { offer: draft, want } : {}),
        note: note.trim(),
        photos,
        ...(category === "borrow" ? { side } : {}),
        details: hasDetails(cleaned) ? cleaned : {},
      });
      return true;
    }
    const extra = {
      ...(photos.length ? { photos } : {}),
      ...(category === "borrow" ? { side } : {}),
      ...(hasDetails(cleaned) ? { details: cleaned } : {}),
    };
    const result =
      category === "trade"
        ? myProfileStore.addItem("trade", tradeText(draft, want), { offer: draft, want }, note, extra)
        : myProfileStore.addItem(category, draft, undefined, note, extra);
    if (!result.ok) {
      /* NOT YET IS NOT NO: the words stay exactly where they are. */
      setProblem(
        result.reason === "account"
          ? (result.say ?? "finish your account in my g to publish this.")
          : result.reason === "sparks"
            ? `a wish holds ${WISH_COST} sparks until it’s granted. give something to earn more.`
            : `you can have ${limit} at a time — remove one to add another.`,
      );
      return false;
    }
    setProblem(null);
    setLiveId(result.id ?? null);
    lastSaved.current = result.id ?? null;
    return true;
  };

  useEffect(() => {
    if (!complete || !liveId) return;
    const t = window.setTimeout(save, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, draft, want, note, side, photos, details, liveId]);

  useEffect(() => {
    if (draft) {
      setLive(null);
      setLiveTap(false);
    }
  }, [draft]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!draft && !want && !note && !photos.length && !hasDetails(details)) {
        draftsStore.clear(draftKey);
        return;
      }
      draftsStore.set(draftKey, { text: draft, want, note, side, photos, details, liveId });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, draft, want, note, side, photos, details, liveId]);

  /** FUND: the amount answers the one money question, within the rules. */
  const commitAmount = (): boolean => {
    const cents = parseAmount(amountText);
    if (cents === null) {
      setAmountSay("enter an amount, like 1200.");
      haptics.warning();
      return false;
    }
    if (validTarget(cents) === null) {
      setAmountSay(`a wish can ask for up to ${formatCents(FUND_TARGET_MAX_CENTS)}.`);
      haptics.warning();
      return false;
    }
    setAmountSay(null);
    setDetail({ fundTarget: cents });
    return true;
  };

  /** PUBLISH — the send circle. The account gate's "not yet" clears nothing. */
  const add = async () => {
    if (full) {
      setProblem(`you can have ${limit} at a time — remove one to add another.`);
      haptics.warning();
      return;
    }
    if (!draft.trim()) {
      setProblem(category === "borrow" ? SIDE_ASK[side] : CATEGORY_ASK[category]);
      haptics.warning();
      return;
    }
    if (category === "trade" && !want.trim()) {
      setProblem("a trade has two sides. what would you like in return?");
      haptics.warning();
      return;
    }
    /* ASK FOR FUNDING NEEDS ITS AMOUNT: straight to that one question. */
    if (asksFunding && target === null) {
      haptics.warning();
      setAsking(true);
      return;
    }
    if (!save()) {
      haptics.warning();
      return;
    }
    try {
      await pushItems();
      await pullItems();
    } catch {
      setProblem("your words are safe, but communi-gy couldn’t be reached. tap send again.");
      haptics.warning();
      return;
    }
    setProblem(null);
    /* NEARBY, ON THIS DEVICE ONLY: if the person allowed location, their
       borrow / lend sits at that (already offset) spot on communi-gy's map. */
    const here = myLocationStore.get();
    if (category === "borrow" && here && lastSaved.current) savePin(lastSaved.current, here.pin);
    setLive(PUBLISHED_SAY[category === "borrow" ? side : category]);
    setLiveTap(category === "borrow" && !asksFunding);
    setLiveId(null);
    setDraft("");
    setWant("");
    setNote("");
    setPhotos([]);
    setDetails({});
    setAmountText("");
    draftsStore.clear(draftKey);
    haptics.light();
    if (!notifyDecided()) void askToNotify();
  };

  /* BACK IS NOT THE SAVE BUTTON. It only flushes the pending debounce. */
  const leave = () => {
    save();
    onDone();
  };

  /* ---- THE ONE QUESTION THIS SEAT ASKS ---- */
  const question: {
    tag: string;
    heading: string;
    options: readonly string[];
    selected: string | undefined;
    pick: (o: string) => void;
  } | null =
    seat === "give"
      ? {
          tag: "where?",
          heading: "where?",
          options: whereFor(kind),
          selected: details.where,
          pick: (o) => setDetail({ where: o }),
        }
      : seat === "lend" || seat === "borrow"
        ? {
            tag: "for how long?",
            heading: "for how long?",
            options: HOW_LONG,
            selected: details.duration,
            pick: (o) => setDetail({ duration: o }),
          }
        : seat === "trade"
          ? {
              tag: "when?",
              heading: "when?",
              options: TRADE_WHEN,
              selected: when || undefined,
              pick: (o) => setWhen(o),
            }
          : seat === "wish"
            ? {
                tag: "how often?",
                heading: "how often?",
                options: HOW_OFTEN,
                selected: OFTEN_OF(details.cadence),
                pick: (o) => setDetail({ cadence: CADENCE_OF[o] }),
              }
            : null;

  const askTag: FormTag =
    seat === "fund"
      ? {
          key: "ask",
          text: target !== null ? formatCents(target) : "how much?",
          onAsk: () => setAsking(true),
        }
      : {
          key: "ask",
          text: question?.selected ?? question?.tag ?? "",
          onAsk: () => setAsking(true),
        };
  const tags: FormTag[] = described
    ? [
        ...(seat === "wish" && forWhom(draft)
          ? [{ key: "for", text: forWhom(draft)! }]
          : []),
        { key: "topic", text: (topic ? (TOPIC_TAG as Record<string, string>)[topic] : undefined) ?? KIND_TAG[kind] },
        askTag,
      ]
    : [];

  /* THE CALENDAR — "when" for give / lend / borrow. */
  if (picking) {
    const initial: WhenPick | null = details.date
      ? {
          date: details.date,
          ...(details.startTime ? { start: details.startTime } : {}),
          ...(details.endTime ? { end: details.endTime } : {}),
        }
      : null;
    return (
      <div data-world={seat} className="g-form relative h-full w-full overflow-y-auto">
        <WhenPicker
          heading="when?"
          initial={initial}
          onBack={() => setPicking(false)}
          onDone={(p) => {
            setDetails((prev) => {
              const extras: Record<string, string> = { ...(prev.extras ?? {}), when: whenLabel(p) };
              return {
                ...prev,
                date: p.date,
                startTime: p.start,
                endTime: p.end,
                time: p.start ? timeWindow(p.start, p.end) : undefined,
                extras,
              };
            });
            setPicking(false);
          }}
        />
      </div>
    );
  }

  if (asking && seat === "fund") {
    return (
      <div data-world="fund" className="g-form relative h-full w-full overflow-y-auto">
        <FormAmount
          heading="how much do you need?"
          value={amountText}
          onChange={(v) => {
            setAmountText(v);
            setAmountSay(null);
          }}
          say={amountSay}
          onBack={() => setAsking(false)}
          onDone={() => {
            if (commitAmount()) setAsking(false);
          }}
        />
      </div>
    );
  }

  if (asking && question) {
    return (
      <div data-world={seat} className="g-form relative h-full w-full overflow-y-auto">
        <FormQuestion
          heading={question.heading}
          options={question.options}
          selected={question.selected}
          onBack={() => setAsking(false)}
          onPick={(o) => {
            question.pick(o);
            setAsking(false);
          }}
        />
      </div>
    );
  }

  const say = problem ?? live ?? (full ? `you can have ${limit} at a time — remove one to add another.` : null);

  return (
    <div data-world={seat} className="g-form relative h-full w-full overflow-y-auto">
      <div className="uf-screen">
        <FormG onBack={leave} />
        <h1 className="uf-heading">{copy.heading}</h1>
        <div className="uf-fields">
          <FormLine
            label={copy.l1}
            value={draft}
            onChange={setDraft}
            placeholder={SEAT_PLACEHOLDER[seat][0]}
            maxLength={titleMax}
            autoFocus
            tags={tags}
          />
          {seat === "trade" ? (
            <FormLine
              label={copy.l2}
              value={want}
              onChange={setWant}
              placeholder={SEAT_PLACEHOLDER[seat][1]}
              maxLength={titleMax}
              onEnter={() => void add()}
            />
          ) : CALENDAR_WHEN[seat] ? (
            <FormPickLine
              label={copy.l2}
              value={when}
              placeholder={SEAT_PLACEHOLDER[seat][1]}
              onPick={() => setPicking(true)}
            />
          ) : (
            <FormLine
              label={copy.l2}
              value={when}
              onChange={(v) => setWhen(v.slice(0, 24))}
              placeholder={SEAT_PLACEHOLDER[seat][1]}
              maxLength={24}
              onEnter={() => void add()}
            />
          )}
          {seat === "borrow" || seat === "lend" ? <LocationAsk /> : null}
          {liveTap && !problem && onSeeInCommunity ? (
            <button
              type="button"
              className="uf-say uf-say-tap"
              aria-live="polite"
              data-testid="borrow-live"
              onClick={() => {
                haptics.light();
                onSeeInCommunity();
              }}
            >
              {PUBLISHED_TAP[side]}
            </button>
          ) : say ? (
            <p className="uf-say" aria-live="polite">
              {say}
            </p>
          ) : null}
        </div>
        <FormSend label="send" onSend={() => void add()} />
      </div>

      {/* WHAT IS ALREADY OUT THERE — my current records, below the fold:
          edit, reorder (asks only) and remove, exactly as before. */}
      {records.length ? (
        <div className="uf-records">
          <p className="g-form-label mb-6">my {CATEGORY_PLURAL[category]}</p>
          <ul className="space-y-6">
            {records.map((item, i) => {
              const rowColour =
                category === "borrow"
                  ? (item.side ?? "borrow") === "lend"
                    ? "var(--activity-lend)"
                    : "var(--activity-borrow)"
                  : colour;
              return (
                <li key={item.id} className="g-rule pt-6 first:border-0 first:pt-0">
                  {category === "borrow" ? (
                    <p className="mb-1 g-form-label" style={{ color: rowColour }}>
                      {(item.side ?? "borrow") === "lend" ? "lending" : "borrowing"}
                    </p>
                  ) : null}
                  <div className="flex items-start gap-3">
                    {category === "give" ? null : (
                      <span className="w-5 shrink-0 pt-1 g-form-label">{i + 1}</span>
                    )}
                    {category === "trade" ? (
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                          value={item.offer ?? splitTrade(item.text).offer}
                          onChange={(e) =>
                            myProfileStore.editTradeSide(i, "offer", e.target.value.slice(0, titleMax))
                          }
                          aria-label="offering"
                          className="g-form-input w-full"
                        />
                        <p className="g-form-label pt-1">for</p>
                        <input
                          value={item.want ?? splitTrade(item.text).want}
                          onChange={(e) =>
                            myProfileStore.editTradeSide(i, "want", e.target.value.slice(0, titleMax))
                          }
                          aria-label="in return"
                          className="g-form-input w-full"
                        />
                      </div>
                    ) : (
                      <input
                        value={item.text}
                        onChange={(e) =>
                          myProfileStore.editItem(category, i, e.target.value.slice(0, titleMax))
                        }
                        aria-label={item.text}
                        className="g-form-input min-w-0 flex-1"
                      />
                    )}
                    {canPhoto ? (
                      item.photos?.length ? (
                        <button
                          type="button"
                          aria-label={`replace photo of ${item.text}`}
                          onClick={() => void pickPhotos(item.id)}
                          className="h-11 w-11 shrink-0 overflow-hidden"
                        >
                          <img
                            src={item.photos[0]}
                            alt={`${item.text} photo`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void pickPhotos(item.id)}
                          className="shrink-0 pt-1 g-form-label"
                          style={{ color: "var(--form-heading)" }}
                        >
                          + photo
                        </button>
                      )
                    ) : null}
                    {category === "give" ? null : (
                      <>
                        {i === 0 ? null : (
                          <button
                            type="button"
                            aria-label={`move ${item.text} up`}
                            onClick={() => {
                              haptics.light();
                              myProfileStore.moveItem(category, i, -1);
                            }}
                            className="px-1.5 text-lg font-light"
                          >
                            ↑
                          </button>
                        )}
                        {i === records.length - 1 ? null : (
                          <button
                            type="button"
                            aria-label={`move ${item.text} down`}
                            onClick={() => {
                              haptics.light();
                              myProfileStore.moveItem(category, i, 1);
                            }}
                            className="px-1.5 text-lg font-light"
                          >
                            ↓
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={`remove ${item.text}`}
                      onClick={() => {
                        haptics.light();
                        myProfileStore.removeItem(category, i);
                      }}
                      className="px-1.5 text-lg font-light opacity-45"
                    >
                      ×
                    </button>
                  </div>
                  {detailBits(item).length ? (
                    <p className="ml-8 mt-2 g-form-label">{detailBits(item).join(" · ")}</p>
                  ) : null}
                  {item.note ? <p className="ml-8 mt-1 g-form-label">{item.note}</p> : null}
                </li>
              );
            })}
          </ul>
          {category !== "give" ? <p className="mt-4 g-form-label">#1 is your priority</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A PHOTO MUST NEVER COST THE WORDS. Every picture is redrawn small before it
 * is stored, so a give with three photos still fits in persistent storage.
 */
async function readSmall(file: File, max = 480): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(file);
  });
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("bad image"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return dataUrl;
  }
}
