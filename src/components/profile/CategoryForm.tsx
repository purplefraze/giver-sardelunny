import { useState } from "react";
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
  WHERE_OPTIONS,
  contextFieldsFor,
  detailBits,
  itemsStore,
  splitTrade,
  tradeText,
  type BorrowSide,
  type ItemDetails,
} from "@/data/items";

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

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="g-meta opacity-40">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

export function CategoryForm({
  category,
  onDone,
}: {
  category: Category;
  onDone: () => void;
}) {
  const me = useMyProfile();
  const records = me.records[category];
  const [draft, setDraft] = useState("");
  const [want, setWant] = useState("");
  /** ONE OPTIONAL, SHORT LINE OF CONTEXT. Never a description box. */
  const [note, setNote] = useState("");
  /** BORROW OR LEND — asked plainly, never assumed. */
  const [side, setSide] = useState<BorrowSide>("borrow");
  /** OPTIONAL PHOTOS. They belong to the item the moment it exists. */
  const [photos, setPhotos] = useState<string[]>([]);
  /** WHERE · WHEN · HOW LONG — tapped, and all of it optional. */
  const [details, setDetails] = useState<ItemDetails>({});
  const [problem, setProblem] = useState<string | null>(null);
  const colour = `var(--me-${category})`;
  const limit = MAX_PER_CATEGORY[category];
  const unlimited = !Number.isFinite(limit);
  const full = records.length >= limit;
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
  /** A BRIGHT WAY BACK — electric, never muddy. */
  const wayBack = "var(--giver-me-complement)";

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

  const pickPhotos = (attachTo?: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = !attachTo;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const shrunk = (await Promise.all(files.map(readSmall))).filter(Boolean);
      if (attachTo) {
        for (const photo of shrunk) itemsStore.addPhoto(attachTo, photo);
      } else {
        setPhotos((prev) => [...prev, ...shrunk].slice(0, 3));
      }
      haptics.light();
    };
    input.click();
  };

  const add = () => {
    if (!draft.trim()) return;
    if (category === "trade" && !want.trim()) {
      setProblem("a trade has two sides. what would you like in return?");
      haptics.warning();
      return;
    }
    /* ONE ITEM, MANY VIEWS: photos, the borrow/lend side and the structured
       details are stored on the real record, so every screen reads one truth. */
    const cleaned: ItemDetails = {
      ...details,
      ...(details.days?.length ? {} : { days: undefined }),
    };
    const extra = {
      ...(photos.length ? { photos } : {}),
      ...(category === "borrow" ? { side } : {}),
      ...(Object.values(cleaned).some((v) =>
        Array.isArray(v) ? v.length : Boolean(v),
      )
        ? { details: cleaned }
        : {}),
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
      setProblem(
        result.reason === "sparks"
          ? `a wish holds ${WISH_COST} sparks until it’s granted. give something to earn more.`
          : `you can have ${limit} at a time — remove one to add another.`,
      );
      haptics.warning();
      return;
    }
    setProblem(null);
    setDraft("");
    setWant("");
    setNote("");
    setPhotos([]);
    setDetails({});
    haptics.light();
  };

  const leave = () => {
    if (draft.trim() && (category !== "trade" || want.trim())) add();
    haptics.light();
    onDone();
  };

  return (
    <div
      data-world="profile"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={leave} label="back to my g" />

      <div className="g-page pb-14 pt-16">
        {/* GIVING IS AN INVITATION, NOT AN INVENTORY. */}
        {category === "give" ? (
          <>
            <h1 className="g-display" style={{ color: colour }}>
              are you a giver?
            </h1>
            <p className="g-meta mt-3 opacity-50">
              give what you can · give what you want · make someone happy
            </p>
          </>
        ) : (
          <>
            <h1 className="g-display" style={{ color: colour }}>
              my {CATEGORY_PLURAL[category]}
            </h1>
            {/* THE ECONOMY, SAID PLAINLY — and never on a give. */}
            <p className="mt-3 g-meta">
              {cost
                ? `${cost} sparks stay with each wish for 7 days · 3 at a time · you have ${me.sparks}`
                : `no sparks needed · ${limit} at a time`}
            </p>
          </>
        )}

        {problem ? (
          <p
            className="mt-3 text-sm font-black lowercase"
            style={{ color: "var(--me-wish)" }}
          >
            {problem}
          </p>
        ) : null}

        <ul className="mt-7 space-y-4">
          {records.map((item, i) => (
            <li key={item.id} className="g-rule pt-4 first:border-0 first:pt-0">
              <div className="flex items-start gap-3">
                <span
                  className="w-5 shrink-0 pt-1 text-[11px] font-black tracking-[0.2em] opacity-45"
                  style={{ color: colour }}
                >
                  {i + 1}
                </span>

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
                      onClick={() => pickPhotos(item.id)}
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
                      onClick={() => pickPhotos(item.id)}
                      className="shrink-0 pt-1 text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                      style={{ color: wayBack }}
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
          ))}
        </ul>

        {/* PRIORITY IS FOR ASKS. Gives are never ranked against each other. */}
        {records.length && category !== "give" ? (
          <p className="mt-3 g-meta">#1 is your priority</p>
        ) : null}

        {full ? (
          <p className="mt-7 g-meta">that’s {limit} — remove one to add another</p>
        ) : (
          <div className="g-rule mt-7 space-y-4 pt-5">
            {/* BORROW OR LEND — one plain question, two honest answers. */}
            {category === "borrow" ? (
              <div className="flex gap-6 text-[13px] font-black lowercase tracking-[0.24em]">
                {(["borrow", "lend"] as BorrowSide[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setSide(s);
                    }}
                    style={{ color: side === s ? colour : "var(--world-ink)" }}
                    className={side === s ? "opacity-100" : "opacity-40"}
                  >
                    {s === "borrow" ? "i want to borrow" : "i can lend"}
                  </button>
                ))}
              </div>
            ) : null}

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
                  onClick={() => pickPhotos()}
                  className="shrink-0 text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                  style={{ color: wayBack }}
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

            {/* WHERE · WHEN · HOW LONG — tapped, never typed out in full. */}
            <div className="space-y-3.5">
              <Line label="where">
                {WHERE_OPTIONS.map((w) => (
                  <Choice
                    key={w}
                    label={w}
                    colour={colour}
                    on={details.where === w}
                    onPress={() =>
                      setDetail({ where: details.where === w ? undefined : w })
                    }
                  />
                ))}
                <input
                  value={
                    details.where && !WHERE_OPTIONS.includes(details.where)
                      ? details.where
                      : ""
                  }
                  onChange={(e) => setDetail({ where: e.target.value.slice(0, 24) })}
                  placeholder="neighbourhood / area"
                  aria-label="neighbourhood or general area"
                  className="w-40 border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium lowercase outline-none placeholder:opacity-30"
                />
              </Line>

              <Line label="when">
                {DAY_NAMES.map((d) => (
                  <Choice
                    key={d}
                    label={d}
                    colour={colour}
                    on={Boolean(details.days?.includes(d))}
                    onPress={() => toggleDay(d)}
                  />
                ))}
              </Line>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
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
                <input
                  type="time"
                  value={
                    details.time && /^\d{2}:\d{2}$/.test(details.time)
                      ? details.time
                      : ""
                  }
                  onChange={(e) => setDetail({ time: e.target.value })}
                  aria-label="exact time"
                  className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                />
                <input
                  type="date"
                  value={details.date ?? ""}
                  onChange={(e) => setDetail({ date: e.target.value })}
                  aria-label="date"
                  className="border-b border-current/15 bg-transparent pb-0.5 text-sm font-medium outline-none"
                />
              </div>

              <Line label="how long">
                {CADENCE_OPTIONS.map((c) => (
                  <Choice
                    key={c}
                    label={c}
                    colour={colour}
                    on={details.cadence === c}
                    onPress={() =>
                      setDetail({ cadence: details.cadence === c ? undefined : c })
                    }
                  />
                ))}
                {DURATION_OPTIONS.map((d) => (
                  <Choice
                    key={d}
                    label={d}
                    colour={colour}
                    on={details.duration === d}
                    onPress={() =>
                      setDetail({ duration: details.duration === d ? undefined : d })
                    }
                  />
                ))}
              </Line>

              {/* ONLY WHAT MAKES SENSE FOR THIS KIND OF THING. */}
              {extraFields.length ? (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
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
                  onClick={() => pickPhotos()}
                  className="text-[11px] font-black lowercase tracking-[0.2em] underline decoration-current/40 underline-offset-4"
                  style={{ color: wayBack }}
                >
                  add another
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={add}
              disabled={broke}
              className="text-xl font-black lowercase disabled:opacity-30"
              style={{ color: colour }}
            >
              {records.length
                ? `+ add another ${category}`
                : `+ add ${category === "borrow" ? "a borrow" : `a ${category}`}`}
            </button>
          </div>
        )}

        {/* THE WAY BACK IS A LINK, NOT A MONUMENT. */}
        <div className="g-rule mt-9 flex items-baseline justify-between pt-4">
          <button
            type="button"
            onClick={leave}
            className="text-[15px] font-black lowercase tracking-[0.16em] transition-transform active:scale-95"
            style={{ color: wayBack }}
          >
            ← back to my g
          </button>
          <span className="g-meta opacity-35">everything saves as you go</span>
        </div>
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
