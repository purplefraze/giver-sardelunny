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
  ACTIVITY_MAX,
  NOTE_MAX,
  splitTrade,
  tradeText,
  type BorrowSide,
} from "@/data/items";

import { haptics } from "@/lib/haptics";

/**
 * DESTINATION SCREEN — the editor behind ONE loop of the Living G.
 * add a wish, a give, a trade or a borrow; reorder or remove. Saving is
 * continuous — AUTOSAVE IS THE CONFIRMATION, so there is no checkmark and no
 * save step. Leaving returns you to the G you came from, with the new item
 * already alive inside its loop.
 *
 * LIMITS: gives are UNLIMITED. wishes, trades and borrows are 3 at a time.
 * A TRADE IS ONE RECORD WITH TWO SIDES, and reads everywhere as "offer for want".
 */

const CATEGORY_ASK: Record<Category, string> = {
  wish: "what do you wish for?",
  give: "what can you give?",
  trade: "what are you offering?",
  borrow: "what would you borrow?",
};

/** BORROWING HAS TWO SIDES, and giver asks which one you mean. */
const SIDE_ASK: Record<BorrowSide, string> = {
  borrow: "what would you like to borrow?",
  lend: "what are you happy to lend?",
};

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

  const pickPhotos = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const shrunk = await Promise.all(files.map(readSmall));
      setPhotos((prev) => [...prev, ...shrunk.filter(Boolean)].slice(0, 3) as string[]);
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
    /* ONE ITEM, MANY VIEWS: photos and the borrow/lend side are stored on the
       real record, so every screen that reads it shows the same truth. */
    const extra = {
      ...(photos.length ? { photos } : {}),
      ...(category === "borrow" ? { side } : {}),
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

      <div className="px-7 pb-20 pt-20">
        <h1
          className="g-display"
          style={{ color: colour }}
        >
          my {CATEGORY_PLURAL[category]}
        </h1>

        {/* THE ECONOMY, SAID PLAINLY: wishes cost, generosity earns. */}
        <p className="mt-3 g-meta">
          {cost
            ? `${cost} sparks stay with each wish until it’s granted · 3 at a time · you have ${me.sparks}`
            : unlimited
              ? `give as much as you’ve got · ${me.sparks} sparks in your account`
              : `no sparks needed · ${limit} at a time`}
        </p>

        {problem ? (
          <p
            className="mt-3 text-sm font-black lowercase"
            style={{ color: "var(--me-wish)" }}
          >
            {problem}
          </p>
        ) : null}

        <ul className="mt-8 space-y-5">
          {records.map((item, i) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                className="w-6 shrink-0 pt-1 text-[11px] font-black tracking-[0.2em]"
                style={{ color: colour, opacity: i === 0 ? 1 : 0.45 }}
              >
                {i + 1}
              </span>

              {/* ONE TRADE = ONE RECORD, two inputs, one set of controls. */}
              {category === "trade" ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={item.offer ?? splitTrade(item.text).offer}
                    onChange={(e) =>
                      myProfileStore.editTradeSide(
                        i,
                        "offer",
                        e.target.value.slice(0, 40),
                      )
                    }
                    aria-label="offering"
                    className="w-full border-b border-current/20 bg-transparent pb-1 g-lede outline-none"
                  />
                  <p className="g-meta">
                    for
                  </p>
                  <input
                    value={item.want ?? splitTrade(item.text).want}
                    onChange={(e) =>
                      myProfileStore.editTradeSide(
                        i,
                        "want",
                        e.target.value.slice(0, 40),
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
                    myProfileStore.editItem(category, i, e.target.value.slice(0, 40))
                  }
                  className="min-w-0 flex-1 border-b border-current/20 bg-transparent pb-1 g-lede outline-none"
                />
              )}

              {/* ↑ ↓ × — nothing else. Autosave is the confirmation. */}
              {i === 0 ? null : (
                <button
                  type="button"
                  aria-label={`move ${item.text} up`}
                  onClick={() => {
                    // A NEW PRIORITY LOCKS IN — felt on the change, not the press.
                    haptics.light();
                    myProfileStore.moveItem(category, i, -1);
                  }}
                  className="px-2 text-xl font-black"
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
                  className="px-2 text-xl font-black"
                >
                  ↓
                </button>
              )}
              <button
                type="button"
                aria-label={`remove ${item.text}`}
                onClick={() => {
                  // GONE, GENTLY: a confirmation, never a celebration.
                  haptics.light();
                  myProfileStore.removeItem(category, i);
                }}
                className="px-2 text-xl font-black opacity-45"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {records.length ? (
          <p className="mt-3 g-meta">
            #1 is your priority
          </p>
        ) : null}

        {full ? (
          <p className="mt-8 g-meta">
            that’s {limit} — remove one to add another
          </p>
        ) : (
          <div className="mt-8 space-y-4">
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

            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, ACTIVITY_MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && category !== "trade") add();
              }}
              placeholder={
                category === "borrow" ? SIDE_ASK[side] : CATEGORY_ASK[category]
              }
              className="w-full border-b border-current/25 bg-transparent pb-1 g-lede outline-none placeholder:opacity-35"
            />

            {category === "trade" ? (
              <input
                value={want}
                onChange={(e) => setWant(e.target.value.slice(0, ACTIVITY_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="what would you like in return?"
                className="w-full border-b border-current/25 bg-transparent pb-1 g-lede outline-none placeholder:opacity-35"
              />
            ) : null}
            {/* SHORT AND SWEET, VISIBLY SO. */}
            <p className="g-meta opacity-40">
              keep it short and sweet · {ACTIVITY_MAX - draft.length} left
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="anything else we should know? (optional)"
              className="w-full border-b border-current/15 bg-transparent pb-1 text-base font-medium lowercase outline-none placeholder:opacity-30"
            />
            <p className="g-meta opacity-35">
              {NOTE_MAX - note.length} left
            </p>

            {/* PHOTOS ARE OPTIONAL, AND THEY BELONG TO THE THING ITSELF. */}
            {canPhoto ? (
              <div className="space-y-3">
                {photos.length ? (
                  <div className="flex gap-3">
                    {photos.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label="remove photo"
                        onClick={() => {
                          haptics.light();
                          setPhotos((prev) => prev.filter((_, k) => k !== i));
                        }}
                        className="relative h-20 w-20 overflow-hidden"
                      >
                        <img
                          src={p}
                          alt="photo of what you're offering"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={pickPhotos}
                  className="g-meta opacity-70"
                >
                  {photos.length ? "add another photo" : "add a photo (optional)"}
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

        <button
          type="button"
          onClick={leave}
          className="mt-16 text-left g-display transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-participation)" }}
        >
          back
          <br />
          to my g
        </button>
        <p className="mt-6 g-meta">
          everything saves as you go
        </p>
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
