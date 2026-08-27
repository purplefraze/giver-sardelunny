import { useEffect, useRef, useState } from "react";
import { draftsStore } from "@/data/drafts";
import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import {
  CATEGORY_PLURAL,
  MAX_PER_CATEGORY,
  WISH_COST,
  myProfileStore,
  type Category,
} from "@/data/my-profile";
import {
  CADENCE_OPTIONS,
  DAY_NAMES,
  DURATION_OPTIONS,
  NOTE_COUNTDOWN_AT,
  NOTE_MAX_FOR,
  TIME_OPTIONS,
  TITLE_COUNTDOWN_AT,
  TITLE_MAX,
  TOPICS,
  ASKS_AREA,
  ASKS_DURATION,
  ASKS_RECURRENCE,
  WHERE_FOR,
  classifyKind,
  contextFieldsFor,
  detailBits,
  itemsStore,
  splitTrade,
  suggestCadence,
  suggestDays,
  suggestTopic,
  timeWindow,
  tradeText,
  type BorrowSide,
  type ItemDetails,
} from "@/data/items";
import { formatDateOnly } from "@/lib/date-only";


import { pickImages } from "@/lib/pick-image";
import { haptics } from "@/lib/haptics";

/**
 * DESTINATION SCREEN — the editor behind ONE loop of the Living G.
 * add a wish, a give, a trade or a borrow; reorder or remove. Saving is
 * continuous — AUTOSAVE IS THE CONFIRMATION, so there is no checkmark and no
 * save step.
 *
 * GIVES HAVE NO PRICE AND NO PRIORITY. A spark balance is irrelevant to
 * posting a give, and give #1 is not more important than give #2 — the number
 * beside a give is nothing but an organisational handle while editing.
 *
 * STRUCTURED DETAILS, NOT A FORM. Where, when and how long are tapped, not
 * typed, and only the questions that make sense for that kind of give are ever
 * asked. Giver never asks for an exact home address.
 */

const CATEGORY_ASK: Record<Category, string> = {
  wish: "what do you wish for?",
  give: "what can you give today?",
  trade: "what are you offering?",
  borrow: "what would you borrow?",
};

/**
 * THE ONE LINE UNDER THE TITLE. Said once, never repeated by the input below
 * it: the question belongs to the field, the invitation belongs to the page.
 */
const CATEGORY_CALL: Record<Category, string> = {
  wish: "make a wish",
  give: "are you a giver?",
  trade: "what are you offering?",
  borrow: "what would you borrow?",
};

/** ONE SHORT HUMAN LINE. Only where it adds something the labels cannot. */
const CATEGORY_TAGLINE: Partial<Record<Category, string>> = {
  give: "give what you can. make someone happy.",
};


/** BORROWING HAS TWO SIDES, and giver asks which one you mean. */
const SIDE_ASK: Record<BorrowSide, string> = {
  borrow: "what would you like to borrow?",
  lend: "what are you happy to lend?",
};

/** A CHIP IS A WORD YOU CAN TAP. Never a pill, never a button. */
function Choice({
  label,
  on,
  colour,
  onPress,
}: {
  label: string;
  on: boolean;
  colour: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.selection();
        onPress();
      }}
      className={`text-[12px] font-black lowercase tracking-[0.18em] transition-opacity ${
        on ? "opacity-100" : "opacity-35"
      }`}
      style={on ? { color: colour } : { color: "var(--world-ink)" }}
    >
      {label}
    </button>
  );
}

/**
 * REMOVING AN ANSWER IS AN ACTION, NOT A FAILURE. Pink, small, and always
 * available beside anything optional that has been filled in.
 */
function Clear({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.light();
        onPress();
      }}
      className="text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
      style={{ color: "var(--giver-action)" }}
    >
      {label}
    </button>
  );
}


function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="g-meta opacity-40">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

/**
 * A COMPACT FIELD — one word, its answer beside it, and its choices only while
 * it is open. Never a settings row, never every option at once.
 */
function Field({
  label,
  summary,
  open,
  colour,
  onToggle,
  children,
}: {
  label: string;
  summary?: string | undefined;
  open: boolean;
  colour: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="g-rule py-3.5">
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          onToggle();
        }}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <span className="g-meta opacity-40">{label}</span>
        <span
          className="min-w-0 flex-1 truncate pb-[0.12em] text-right text-[13px] font-black lowercase leading-[1.25] tracking-[0.02em]"
          style={{ color: summary ? colour : "var(--world-ink)" }}
        >
          {summary || (
            <span style={{ color: "var(--giver-action)", opacity: 0.85 }}>add</span>
          )}
        </span>
      </button>
      {open ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CategoryForm({
  category,
  side: decidedSide,
  onDone,
}: {
  category: Category;
  /**
   * THE DOOR ALREADY ASKED. When the three-intent door has settled keeping vs
   * borrowing, or giving vs lending, the form never asks the same question
   * again — it simply knows.
   */
  side?: BorrowSide;
  onDone: () => void;
}) {
  const me = useMyProfile();
  /* THE DRAFT SURVIVES LEAVING AND RELOADING — it is persisted, not held. */
  const stored = useRef(draftsStore.get(category)).current;
  const [draft, setDraft] = useState(stored.text);
  const [want, setWant] = useState(stored.want);
  /** ONE OPTIONAL, SHORT LINE OF CONTEXT. Never a description box. */
  const [note, setNote] = useState(stored.note);
  /** BORROW OR LEND — answered at the door when the door knew, else asked here. */
  const [side, setSide] = useState<BorrowSide>(decidedSide ?? stored.side);

  /** OPTIONAL PHOTOS. They belong to the item the moment it exists. */
  const [photos, setPhotos] = useState<string[]>(stored.photos);
  /** WHERE · WHEN · HOW LONG — tapped, and all of it optional. */
  const [details, setDetails] = useState<ItemDetails>(stored.details);
  const [problem, setProblem] = useState<string | null>(null);
  /**
   * THE ONE RECORD THIS DRAFT IS ALREADY SAVED AS. Once the draft is complete
   * enough to be real it becomes an Item, and every later keystroke edits THAT
   * record — so there is never a second copy and Back is never the save button.
   */
  const [liveId, setLiveId] = useState<string | null>(stored.liveId);
  /** ONE SELECTOR OPEN AT A TIME. Closed is the resting state. */
  const [open, setOpen] = useState<"topic" | "where" | "when" | "long" | null>(null);

  /* THE FORM IS THE COLOUR OF WHAT IT MAKES: wish purple, give green,
     trade orange, borrow blue. It never inherits profile red. */
  const colour =
    category === "borrow" && side === "lend"
      ? "var(--activity-lend)"
      : `var(--activity-${category})`;
  const limit = MAX_PER_CATEGORY[category];
  const unlimited = !Number.isFinite(limit);
  /* THE RECORD BEING TYPED IS SHOWN IN THE FIELD, NOT TWICE IN THE LIST. */
  const records = me.records[category].filter((i) => i.id !== liveId);
  /* THE LIMIT COUNTS EVERY ACTIVE RECORD, including the one being typed. */
  const full =
    category === "borrow"
      ? me.records.borrow.filter((i) => (i.side ?? "borrow") === side).length >= limit
      : me.records[category].length >= limit;
  /** A WISH COSTS 10 SPARKS. Giving, trading and lending are free. */
  const cost = category === "wish" ? WISH_COST : 0;
  const broke = cost > 0 && me.sparks < cost;
  /** PHOTOS HELP FOR REAL THINGS: gives, trades and borrows. Never wishes. */
  const canPhoto = category !== "wish";
  const titleMax = TITLE_MAX[category];
  const noteMax = NOTE_MAX_FOR[category];
  const titleLeft = titleMax - draft.length;
  const noteLeft = noteMax - note.length;
  /** ONLY THE QUESTIONS THAT MAKE SENSE for this kind of thing. */
  const extraFields = contextFieldsFor(draft);
  /** WHAT KIND OF THING THIS IS decides which metadata is even offered. */
  const kind = classifyKind(draft);
  const whereOptions = WHERE_FOR[kind];
  /**
   * NOTHING IS ASKED BEFORE THE WORDS EXIST. Until the person has said what
   * this is, the screen is one line and a placeholder — every follow-up appears
   * only once giver has something to be intelligent about.
   */
  const described = draft.trim().length >= 3;
  /** WHAT GIVER THINKS THIS IS. A suggestion to confirm, never a decision. */
  const guessedTopic = suggestTopic(category === "trade" ? `${draft} ${want}` : draft);
  const topic = details.topic ?? undefined;
  /** BORROWING AND LENDING ARE ALWAYS A WINDOW: it starts, and it comes back. */
  const isWindow = category === "borrow";
  /** A ONE-OFF THING IS NEVER ASKED ABOUT A WEEKLY SCHEDULE. */
  const asksRecurrence = ASKS_RECURRENCE[kind];
  const whenSummary =
    [
      details.days?.length ? details.days.join(" + ") : null,
      details.date ? formatDateOnly(details.date, { day: "numeric", month: "short" }) : null,
      details.flexibleDate && !details.date ? "any day" : null,
      details.time,
      details.flexibleTime && !details.time ? "any time" : null,
      details.until
        ? `${isWindow ? "back by" : "until"} ${formatDateOnly(details.until, { day: "numeric", month: "short" })}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const longSummary =
    [details.cadence, details.duration].filter(Boolean).join(" · ") || undefined;
  /**
   * PINK IS THE COLOUR OF AN ACTION WHILE CREATING — add a photo, add a
   * detail. The mode colour stays the identity of the thing being made, so a
   * saved give is always green and never pink.
   */
  const action = colour;

  /* A PHYSICAL THING CAN NEVER BE "ONLINE" — an answer that stops making
     sense as the give is described is quietly dropped, never corrected aloud. */
  useEffect(() => {
    if (
      details.where &&
      !whereOptions.includes(details.where) &&
      !ASKS_AREA[kind]
    )
      setDetails((prev) => ({ ...prev, where: undefined }));
    if (details.where === "online" && !whereOptions.includes("online"))
      setDetails((prev) => ({ ...prev, where: undefined }));
    if (details.duration && !ASKS_DURATION[kind])
      setDetails((prev) => ({ ...prev, duration: undefined }));
    if (details.cadence && !ASKS_RECURRENCE[kind] && details.cadence !== "one time")
      setDetails((prev) => ({ ...prev, cadence: undefined }));
  }, [kind, details.where, details.duration, details.cadence, whereOptions]);

  /*
    THE SUGGESTIONS ARE OFFERED ONCE, AND ONLY WHERE THE PERSON SAID SO.
    "for the weekend" fills saturday and sunday, "every week" fills weekly —
    both stay editable, and giver never invents a day nobody mentioned.
  */
  useEffect(() => {
    if (!described) return;
    const said = category === "trade" ? `${draft} ${want}` : draft;
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

  /* THE READABLE TIME IS ALWAYS BUILT FROM THE PICKERS, so a time field can
     never end up holding a word like "butterflies". */
  useEffect(() => {
    const built = timeWindow(details.startTime, details.endTime);
    if (!details.startTime && !details.endTime) return;
    if (built !== details.time) setDetails((prev) => ({ ...prev, time: built }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.startTime, details.endTime]);


  const setDetail = (patch: Partial<ItemDetails>) =>
    setDetails((prev) => ({ ...prev, ...patch }));

  const toggleDay = (day: string) =>
    setDetails((prev) => {
      const days = prev.days ?? [];
      const next = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...DAY_NAMES.filter((d) => days.includes(d) || d === day)];
      return { ...prev, days: next };
    });

  const pickPhotos = async (attachTo?: string) => {
    /* THE ONE RELIABLE PICKER — a real input, so the first attempt works. */
    const files = await pickImages({ multiple: !attachTo });
    if (!files.length) return;
    const read = await Promise.allSettled(files.map((f) => readSmall(f)));
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

  /** The structured details, with empty answers dropped. */
  const cleanDetails = (): ItemDetails => ({
    ...details,
    ...(details.days?.length ? {} : { days: undefined }),
  });

  const hasDetails = (d: ItemDetails) =>
    Object.values(d).some((v) => (Array.isArray(v) ? v.length : Boolean(v)));

  /** REAL ENOUGH TO BE A RECORD: a title, and for a trade, both sides. */
  const complete =
    draft.trim().length >= 3 && (category !== "trade" || want.trim().length >= 2);

  /**
   * AUTOSAVE, ONCE. The first time a draft is complete it becomes exactly ONE
   * record (a wish holds its sparks at that single moment); after that every
   * change patches that same record, so no screen ever holds a stale copy and
   * nothing is created twice by a rerender, a reopen or a reload.
   */
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
        ? myProfileStore.addItem(
            "trade",
            tradeText(draft, want),
            { offer: draft, want },
            note,
            extra,
          )
        : myProfileStore.addItem(category, draft, undefined, note, extra);
    if (!result.ok) {
      /*
        NOT YET IS NOT NO. When the account is incomplete or the person is not
        yet 18, the words stay exactly where they are — the draft is kept, the
        record is simply not published.
      */
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
    return true;
  };


  /* SAVING IS CONTINUOUS, briefly debounced so we do not write per keystroke. */
  useEffect(() => {
    if (!complete) return;
    const t = window.setTimeout(save, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, draft, want, note, side, photos, details, liveId]);

  /* THE DRAFT ITSELF IS PERSISTED, so leaving mid-sentence loses nothing. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!draft && !want && !note && !photos.length && !hasDetails(details)) {
        draftsStore.clear(category);
        return;
      }
      draftsStore.set(category, {
        text: draft,
        want,
        note,
        side,
        photos,
        details,
        liveId,
      });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, draft, want, note, side, photos, details, liveId]);

  /**
   * PUBLISH. The words were already being saved as they were typed — this is the
   * moment a person SAYS SO, and hears back that it is live in communi-g. If the
   * account gate answers "not yet", nothing is cleared: the draft stays intact.
   */
  const add = () => {
    if (!draft.trim()) return;
    if (category === "trade" && !want.trim()) {
      setProblem("a trade has two sides. what would you like in return?");
      haptics.warning();
      return;
    }
    if (!save()) {
      haptics.warning();
      return;
    }
    setProblem(null);
    setLive(PUBLISHED_SAY[category === "borrow" ? side : category]);
    setLiveId(null);
    setDraft("");
    setWant("");
    setNote("");
    setPhotos([]);
    setDetails({});
    draftsStore.clear(category);
    haptics.light();
  };


  /* BACK IS NOT THE SAVE BUTTON. It only flushes the pending debounce. */
  const leave = () => {
    save();
    haptics.light();
    onDone();
  };


  return (
    <div
      data-world={category}
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={leave} label="back to my g" sticky />

      <div className="g-page pb-[8.5rem] pt-16">
        {/*
          ONE TYPOGRAPHY SYSTEM, EVERYWHERE. The old oversized "add a give"
          display type is gone: a creation screen states itself in the shared
          heading register, in its own semantic colour, and lets the content
          below be the loudest thing on the page.
        */}
        <h1 className="g-heading" style={{ color: colour }}>
          my {CATEGORY_PLURAL[category]}
        </h1>
        <p className="g-body mt-2 max-w-[24ch]" style={{ color: colour }}>
          {CATEGORY_CALL[category]}
        </p>
        {/* THE ECONOMY, IN AS FEW WORDS AS IT TAKES. Nothing is explained twice. */}
        <p className="mt-2 g-meta">
          {cost
            ? `${cost} sparks stay with each wish for 7 days · 3 at a time · you have ${me.sparks}`
            : "no sparks needed"}
        </p>
        {CATEGORY_TAGLINE[category] ? (
          <p className="mt-1 g-meta opacity-45">{CATEGORY_TAGLINE[category]}</p>
        ) : null}


        {problem ? (
          <p
            className="mt-3 text-sm font-black lowercase"
            style={{ color: colour }}
          >
            {problem}
          </p>
        ) : null}

        <ul className="mt-7 space-y-4">
          {records.map((item, i) => {
            /* EACH RECORD WEARS ITS OWN COLOUR — a lend is never mistaken
               for a borrow in a list. */
            const rowColour =
              category === "borrow"
                ? (item.side ?? "borrow") === "lend"
                  ? "var(--activity-lend)"
                  : "var(--activity-borrow)"
                : colour;
            return (
            <li key={item.id} className="g-rule pt-4 first:border-0 first:pt-0">
              {category === "borrow" ? (
                <p
                  className="mb-1 text-[11px] font-black lowercase tracking-[0.2em]"
                  style={{ color: rowColour }}
                >
                  {(item.side ?? "borrow") === "lend" ? "lending" : "borrowing"}
                </p>
              ) : null}
              <div className="flex items-start gap-3">
                {/* GIVING IS NOT A RANKED QUEUE — only scarce asks are numbered. */}
                {category === "give" ? null : (
                  <span
                    className="w-5 shrink-0 pt-1 text-[11px] font-black tracking-[0.2em] opacity-45"
                    style={{ color: rowColour }}
                  >
                    {i + 1}
                  </span>
                )}


                {/* ONE TRADE = ONE RECORD, two inputs, one set of controls. */}
                {category === "trade" ? (
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      value={item.offer ?? splitTrade(item.text).offer}
                      onChange={(e) =>
                        myProfileStore.editTradeSide(
                          i,
                          "offer",
                          e.target.value.slice(0, titleMax),
                        )
                      }
                      aria-label="offering"
                      className="w-full border-b border-current/20 bg-transparent pb-1 g-lede outline-none"
                    />
                    <p className="g-meta">for</p>
                    <input
                      value={item.want ?? splitTrade(item.text).want}
                      onChange={(e) =>
                        myProfileStore.editTradeSide(
                          i,
                          "want",
                          e.target.value.slice(0, titleMax),
                        )
                      }
                      aria-label="in return"
                      className="w-full border-b border-current/20 bg-transparent pb-1 g-lede outline-none"
                    />
                  </div>
                ) : (
                  <input
                    value={item.text}
                    onChange={(e) =>
                      myProfileStore.editItem(category, i, e.target.value.slice(0, titleMax))
                    }
                    className="min-w-0 flex-1 border-b border-current/20 bg-transparent pb-1 g-lede outline-none"
                  />
                )}

                {/* THE PHOTO CONTROL SITS BESIDE THE THING ITSELF. */}
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
                      className="shrink-0 pt-1 text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                      style={{ color: action }}
                    >
                      + add photo
                    </button>
                  )
                ) : null}

                {/* ↑ ↓ × — reordering exists only where order means something. */}
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
                        className="px-1.5 text-lg font-black"
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
                        className="px-1.5 text-lg font-black"
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
                    // GONE, GENTLY: a confirmation, never a celebration.
                    haptics.light();
                    myProfileStore.removeItem(category, i);
                  }}
                  className="px-1.5 text-lg font-black opacity-45"
                >
                  ×
                </button>
              </div>

              {/* WHAT SOMEBODY ELSE WOULD NEED TO KNOW, in one quiet line. */}
              {detailBits(item).length ? (
                <p className="ml-8 mt-1.5 g-meta opacity-45">
                  {detailBits(item).join(" · ")}
                </p>
              ) : null}
              {item.note ? (
                <p className="ml-8 mt-1 g-meta opacity-35">{item.note}</p>
              ) : null}
            </li>
            );
          })}
        </ul>

        {/* PRIORITY IS FOR ASKS. Gives are never ranked against each other. */}
        {records.length && category !== "give" ? (
          <p className="mt-3 g-meta">#1 is your priority</p>
        ) : null}

        {/* BORROW OR LEND — asked here ONLY when the door did not already ask.
            The same question is never put to a person twice. */}
        {category === "borrow" && !decidedSide ? (

          <div className="mt-7 flex gap-6 text-[13px] font-black lowercase tracking-[0.24em]">
            {(["borrow", "lend"] as BorrowSide[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setSide(s);
                }}
                style={{
                  color:
                    s === "lend" ? "var(--activity-lend)" : "var(--activity-borrow)",
                }}
                className={side === s ? "opacity-100" : "opacity-35"}
              >
                {s === "borrow" ? "i want to borrow" : "i can lend"}
              </button>
            ))}
          </div>
        ) : null}

        {full ? (
          <p className="mt-7 g-meta">
            that’s {limit}
            {category === "borrow" ? (side === "lend" ? " lends" : " borrows") : ""} —
            remove one to add another
          </p>
        ) : (
          <div
            className={`mt-7 space-y-4 ${
              records.length === 0 ? "" : "g-rule pt-5"
            }`}
          >


            <div className="flex items-end gap-3">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, titleMax))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && category !== "trade") add();
                }}
                placeholder={
                  category === "borrow" ? SIDE_ASK[side] : CATEGORY_ASK[category]
                }
                className="min-w-0 flex-1 border-b border-current/25 bg-transparent pb-1 g-lede outline-none placeholder:opacity-35"
              />
              {canPhoto && photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => void pickPhotos()}
                  className="shrink-0 text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                  style={{ color: action }}
                >
                  + add photo
                </button>
              ) : null}
            </div>

            {category === "trade" ? (
              <input
                value={want}
                onChange={(e) => setWant(e.target.value.slice(0, titleMax))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="what would you like in return?"
                className="w-full border-b border-current/25 bg-transparent pb-1 g-lede outline-none placeholder:opacity-35"
              />
            ) : null}

            {/* A COUNTDOWN ONLY WHEN THE END IS IN SIGHT. */}
            {titleLeft <= TITLE_COUNTDOWN_AT ? (
              <p className="g-meta opacity-45">{titleLeft} characters left</p>
            ) : null}

            {/*
              THE WORDS COME FIRST. Nothing below appears until the person has
              said what this is — then giver asks only the next question that
              actually matters for this kind of thing, one at a time.
            */}
            {described ? (
              <div className="space-y-0">
                {/* WHAT GIVER THINKS THIS IS — one word, tap to change. */}
                <Field
                  label="this is about"
                  summary={topic ?? guessedTopic ?? undefined}
                  open={open === "topic"}
                  colour={colour}
                  onToggle={() => setOpen(open === "topic" ? null : "topic")}
                >
                  {TOPICS.map((t) => (
                    <Choice
                      key={t}
                      label={t}
                      colour={colour}
                      on={(topic ?? guessedTopic) === t}
                      onPress={() => {
                        setDetail({ topic: t });
                        setOpen(null);
                      }}
                    />
                  ))}
                </Field>

                <Field
                  label="where"
                  summary={details.where}
                  open={open === "where"}
                  colour={colour}
                  onToggle={() => setOpen(open === "where" ? null : "where")}
                >
                  {whereOptions.map((w) => (
                    <Choice
                      key={w}
                      label={w}
                      colour={colour}
                      on={details.where === w}
                      onPress={() => {
                        setDetail({ where: details.where === w ? undefined : w });
                        setOpen(null);
                      }}
                    />
                  ))}
                  {ASKS_AREA[kind] ? (
                    <input
                      value={
                        details.where && !whereOptions.includes(details.where)
                          ? details.where
                          : ""
                      }
                      onChange={(e) => setDetail({ where: e.target.value.slice(0, 24) })}
                      placeholder="neighbourhood / area"
                      aria-label="neighbourhood or general area"
                      className="w-40 border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium lowercase outline-none placeholder:opacity-30"
                    />
                  ) : null}
                </Field>

                {/*
                  WHEN — PICKED, NEVER TYPED. A date comes from a date picker, a
                  time from a time picker, and being easy about either is said
                  precisely: flexible on the day, or flexible on the time.
                */}
                <Field
                  label={isWindow ? "when, and for how long" : "when"}
                  summary={whenSummary}
                  open={open === "when"}
                  colour={colour}
                  onToggle={() => setOpen(open === "when" ? null : "when")}
                >
                  <div className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-2">
                    <Line label={isWindow ? "from" : "day"}>
                      <input
                        type="date"
                        value={details.date ?? ""}
                        onChange={(e) =>
                          setDetail({
                            date: e.target.value || undefined,
                            ...(e.target.value ? { flexibleDate: undefined } : {}),
                          })
                        }
                        aria-label={isWindow ? "first day" : "date"}
                        className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                      />
                      {details.date ? (
                        <Clear
                          label="clear"
                          onPress={() => setDetail({ date: undefined })}
                        />
                      ) : (
                        <Choice
                          label="i’m flexible on the day"
                          colour={colour}
                          on={Boolean(details.flexibleDate)}
                          onPress={() =>
                            setDetail({
                              flexibleDate: details.flexibleDate ? undefined : true,
                            })
                          }
                        />
                      )}
                    </Line>

                    <Line label={isWindow ? "back by" : "available until"}>
                      <input
                        type="date"
                        value={details.until ?? ""}
                        onChange={(e) => setDetail({ until: e.target.value || undefined })}
                        aria-label={isWindow ? "back by" : "available until"}
                        className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                      />
                      {details.until ? (
                        <Clear
                          label={isWindow ? "clear" : "always available"}
                          onPress={() => setDetail({ until: undefined })}
                        />
                      ) : null}
                    </Line>
                  </div>

                  {/* THE EXACT WINDOW, FROM TWO PICKERS. 7–9 pm, not free text. */}
                  <Line label="time">
                    <input
                      type="time"
                      value={details.startTime ?? ""}
                      onChange={(e) =>
                        setDetail({
                          startTime: e.target.value || undefined,
                          ...(e.target.value ? { flexibleTime: undefined } : {}),
                        })
                      }
                      aria-label="start time"
                      className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                    />
                    <span className="g-meta opacity-40">to</span>
                    <input
                      type="time"
                      value={details.endTime ?? ""}
                      onChange={(e) =>
                        setDetail({
                          endTime: e.target.value || undefined,
                          ...(e.target.value ? { flexibleTime: undefined } : {}),
                        })
                      }
                      aria-label="end time"
                      className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                    />
                    {details.startTime || details.endTime ? (
                      <Clear
                        label="clear time"
                        onPress={() =>
                          setDetail({
                            startTime: undefined,
                            endTime: undefined,
                            time: undefined,
                          })
                        }
                      />
                    ) : (
                      <Choice
                        label="i’m flexible on the time"
                        colour={colour}
                        on={Boolean(details.flexibleTime)}
                        onPress={() =>
                          setDetail({
                            flexibleTime: details.flexibleTime ? undefined : true,
                          })
                        }
                      />
                    )}
                  </Line>

                  {/* PART OF THE DAY, for anyone who thinks in mornings. */}
                  {details.startTime || details.endTime ? null : (
                    <Line label="or roughly">
                      {TIME_OPTIONS.map((t) => (
                        <Choice
                          key={t}
                          label={t}
                          colour={colour}
                          on={details.time === t}
                          onPress={() =>
                            setDetail({ time: details.time === t ? undefined : t })
                          }
                        />
                      ))}
                    </Line>
                  )}

                  {/* DAYS OF THE WEEK ONLY WHERE SOMETHING CAN REPEAT. */}
                  {asksRecurrence && details.cadence !== "one time" ? (
                    <Line label="days">
                      {DAY_NAMES.map((d) => (
                        <Choice
                          key={d}
                          label={d}
                          colour={colour}
                          on={Boolean(details.days?.includes(d))}
                          onPress={() => toggleDay(d)}
                        />
                      ))}
                      {details.days?.length ? (
                        <Clear
                          label="clear days"
                          onPress={() => setDetail({ days: undefined })}
                        />
                      ) : null}
                    </Line>
                  ) : null}
                </Field>

                {/* HOW OFTEN, AND HOW LONG — each only where it means something. */}
                {asksRecurrence || ASKS_DURATION[kind] ? (
                  <Field
                    label={asksRecurrence ? "how often, how long" : "how long"}
                    summary={longSummary}
                    open={open === "long"}
                    colour={colour}
                    onToggle={() => setOpen(open === "long" ? null : "long")}
                  >
                    {asksRecurrence ? (
                      <Line label="how often">
                        {CADENCE_OPTIONS.map((c) => (
                          <Choice
                            key={c}
                            label={c}
                            colour={colour}
                            on={details.cadence === c}
                            onPress={() =>
                              setDetail({
                                cadence: details.cadence === c ? undefined : c,
                              })
                            }
                          />
                        ))}
                      </Line>
                    ) : null}
                    {ASKS_DURATION[kind] ? (
                      <Line label="each time">
                        {DURATION_OPTIONS.map((d) => (
                          <Choice
                            key={d}
                            label={d}
                            colour={colour}
                            on={details.duration === d}
                            onPress={() =>
                              setDetail({
                                duration: details.duration === d ? undefined : d,
                              })
                            }
                          />
                        ))}
                      </Line>
                    ) : null}
                  </Field>
                ) : null}

                {/* ONLY WHAT MAKES SENSE FOR THIS KIND OF THING. */}
                {extraFields.length ? (
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4">
                    {extraFields.map((field) => (
                      <input
                        key={field.key}
                        value={details.extras?.[field.key] ?? ""}
                        onChange={(e) =>
                          setDetail({
                            extras: {
                              ...(details.extras ?? {}),
                              [field.key]: e.target.value.slice(0, 24),
                            },
                          })
                        }
                        placeholder={field.ask}
                        aria-label={field.ask}
                        className="w-36 border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium lowercase outline-none placeholder:opacity-30"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}



            {/* SHORT AND SWEET — said under the field, not above it. */}
            <div className="space-y-1">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, noteMax))}
                placeholder="anything else we should know? (optional)"
                className="w-full border-b border-current/15 bg-transparent pb-1 text-base font-medium lowercase outline-none placeholder:opacity-30"
              />
              <p className="g-meta opacity-40">
                keep it short and sweet
                {noteLeft <= NOTE_COUNTDOWN_AT ? ` · ${noteLeft} left` : ""}
              </p>
            </div>

            {/* PHOTOS ARE OPTIONAL, AND THEY BELONG TO THE THING ITSELF. */}
            {canPhoto && photos.length ? (
              <div className="flex items-center gap-3">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label="remove photo"
                    onClick={() => {
                      haptics.light();
                      setPhotos((prev) => prev.filter((_, k) => k !== i));
                    }}
                    className="relative h-16 w-16 overflow-hidden"
                  >
                    <img
                      src={p}
                      alt="photo of what you're offering"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void pickPhotos()}
                  className="text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                  style={{ color: action }}
                >
                  add another
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={add}
              disabled={broke}
              className="g-heading disabled:opacity-30"
              style={{ color: colour }}
            >
              {category === "borrow"
                ? side === "lend"
                  ? "+ add a lend"
                  : "+ add a borrow"
                : `+ add a ${category === "wish" ? "wish" : category}`}
            </button>
          </div>
        )}

        <p className="mt-9 g-meta opacity-35">everything saves as you go</p>
      </div>

      {/* THE WAY BACK IS ALWAYS THERE — one small line, never over content. */}
      <div
        className="g-page fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{
          background: "var(--giver-paper, #fff)",
          borderColor: "var(--edit-rule)",
          paddingTop: "0.85rem",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)",
        }}
      >
        <button
          type="button"
          onClick={leave}
          className="whitespace-nowrap text-[13px] font-black lowercase tracking-[0.16em] transition-transform active:scale-95"
          style={{ color: "var(--giver-me)" }}
        >
          ← back to my g
        </button>
      </div>
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
