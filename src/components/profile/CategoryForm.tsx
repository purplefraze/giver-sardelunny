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
import { ACTIVITY_MAX, NOTE_MAX, splitTrade, tradeText } from "@/data/items";
import { buzz } from "@/lib/haptics";

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
  const [problem, setProblem] = useState<string | null>(null);
  const colour = `var(--me-${category})`;
  const limit = MAX_PER_CATEGORY[category];
  const unlimited = !Number.isFinite(limit);
  const full = records.length >= limit;
  /** A WISH COSTS 10 SPARKS. Giving, trading and lending are free. */
  const cost = category === "wish" ? WISH_COST : 0;
  const broke = cost > 0 && me.sparks < cost;

  const add = () => {
    if (!draft.trim()) return;
    if (category === "trade" && !want.trim()) {
      setProblem("a trade has two sides. what would you like in return?");
      buzz();
      return;
    }
    const result =
      category === "trade"
        ? myProfileStore.addItem(
            "trade",
            tradeText(draft, want),
            { offer: draft, want },
            note,
          )
        : myProfileStore.addItem(category, draft, undefined, note);
    if (!result.ok) {
      setProblem(
        result.reason === "sparks"
          ? `a wish holds ${WISH_COST} sparks until it’s granted. give something to earn more.`
          : `you can have ${limit} at a time — remove one to add another.`,
      );
      buzz();
      return;
    }
    setProblem(null);
    setDraft("");
    setWant("");
    setNote("");
    buzz();
  };

  const leave = () => {
    if (draft.trim() && (category !== "trade" || want.trim())) add();
    buzz();
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
          className="text-[13vw] font-black lowercase leading-[0.85] tracking-[-0.055em]"
          style={{ color: colour }}
        >
          my {CATEGORY_PLURAL[category]}
        </h1>

        {/* THE ECONOMY, SAID PLAINLY: wishes cost, generosity earns. */}
        <p className="mt-3 text-[11px] font-black lowercase tracking-[0.28em] opacity-45">
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
                    className="w-full border-b border-current/20 bg-transparent pb-1 text-xl font-medium lowercase outline-none"
                  />
                  <p className="text-[11px] font-black lowercase tracking-[0.3em] opacity-40">
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
                    className="w-full border-b border-current/20 bg-transparent pb-1 text-xl font-medium lowercase outline-none"
                  />
                </div>
              ) : (
                <input
                  value={item.text}
                  onChange={(e) =>
                    myProfileStore.editItem(category, i, e.target.value.slice(0, 40))
                  }
                  className="min-w-0 flex-1 border-b border-current/20 bg-transparent pb-1 text-xl font-medium lowercase outline-none"
                />
              )}

              {/* ↑ ↓ × — nothing else. Autosave is the confirmation. */}
              {i === 0 ? null : (
                <button
                  type="button"
                  aria-label={`move ${item.text} up`}
                  onClick={() => {
                    buzz();
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
                    buzz();
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
                  buzz();
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
          <p className="mt-3 text-[11px] font-black lowercase tracking-[0.28em] opacity-40">
            #1 is your priority
          </p>
        ) : null}

        {full ? (
          <p className="mt-8 text-[11px] font-black lowercase tracking-[0.28em] opacity-40">
            that’s {limit} — remove one to add another
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, ACTIVITY_MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && category !== "trade") add();
              }}
              placeholder={CATEGORY_ASK[category]}
              className="w-full border-b border-current/25 bg-transparent pb-1 text-xl font-medium lowercase outline-none placeholder:opacity-35"
            />
            {category === "trade" ? (
              <input
                value={want}
                onChange={(e) => setWant(e.target.value.slice(0, ACTIVITY_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="what would you like in return?"
                className="w-full border-b border-current/25 bg-transparent pb-1 text-xl font-medium lowercase outline-none placeholder:opacity-35"
              />
            ) : null}
            {/* SHORT AND SWEET, VISIBLY SO. */}
            <p className="text-[11px] font-black lowercase tracking-[0.28em] opacity-35">
              keep it short and sweet · {ACTIVITY_MAX - draft.length} left
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="anything else we should know? (optional)"
              className="w-full border-b border-current/15 bg-transparent pb-1 text-base font-medium lowercase outline-none placeholder:opacity-30"
            />
            <p className="text-[11px] font-black lowercase tracking-[0.28em] opacity-30">
              {NOTE_MAX - note.length} left
            </p>
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
          className="mt-16 text-left text-[12vw] font-black lowercase leading-[0.85] tracking-[-0.055em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-participation)" }}
        >
          back
          <br />
          to my g
        </button>
        <p className="mt-6 text-[11px] font-black lowercase tracking-[0.3em] opacity-40">
          everything saves as you go
        </p>
      </div>
    </div>
  );
}
