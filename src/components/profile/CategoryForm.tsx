import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import {
  CATEGORY_PLURAL,
  MAX_PER_CATEGORY,
  myProfileStore,
  type Category,
} from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * DESTINATION SCREEN — the editor behind ONE loop of the Living G.
 * add a wish, a give, a trade or a borrow; reorder, complete, remove. Saving is
 * continuous, so leaving the screen returns you straight to the G you came
 * from, with the new item already alive inside its loop.
 */

const CATEGORY_ASK: Record<Category, string> = {
  wish: "what do you wish for?",
  give: "what can you give?",
  trade: "what would you trade?",
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
  const items = me.items[category];
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const colour = `var(--me-${category})`;
  const full = items.length >= MAX_PER_CATEGORY;
  /** A WISH COSTS 10 SPARKS. Giving, trading and lending are free. */
  const cost = category === "wish" ? WISH_COST : 0;
  const broke = cost > 0 && me.sparks < cost;

  const add = () => {
    if (!draft.trim()) return;
    const result = myProfileStore.addItem(category, draft);
    if (!result.ok) {
      setProblem(
        result.reason === "sparks"
          ? `a wish costs ${WISH_COST} sparks. give something to earn more.`
          : `that’s ${MAX_PER_CATEGORY} already — complete one first.`,
      );
      buzz();
      return;
    }
    setProblem(null);
    setDraft("");
    buzz();
  };

  const leave = () => {
    if (draft.trim()) myProfileStore.addItem(category, draft);
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

        <ul className="mt-8 space-y-4">
          {items.map((item, i) => (
            <li key={`${category}-${i}`} className="flex items-center gap-3">
              <span
                className="w-6 shrink-0 text-[11px] font-black tracking-[0.2em]"
                style={{ color: colour, opacity: i === 0 ? 1 : 0.45 }}
              >
                {i + 1}
              </span>
              <input
                value={item}
                onChange={(e) =>
                  myProfileStore.editItem(category, i, e.target.value.slice(0, 40))
                }
                className="min-w-0 flex-1 border-b border-current/20 bg-transparent pb-1 text-xl font-medium lowercase outline-none"
              />
              <button
                type="button"
                aria-label={`move ${item} up`}
                onClick={() => {
                  buzz();
                  myProfileStore.moveItem(category, i, -1);
                }}
                disabled={i === 0}
                className="px-2 text-xl font-black disabled:opacity-20"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`move ${item} down`}
                onClick={() => {
                  buzz();
                  myProfileStore.moveItem(category, i, 1);
                }}
                disabled={i === items.length - 1}
                className="px-2 text-xl font-black disabled:opacity-20"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`mark ${item} completed`}
                onClick={() => {
                  buzz();
                  myProfileStore.completeItem(category, i);
                }}
                className="px-2 text-xl font-black opacity-45"
              >
                ✓
              </button>
              <button
                type="button"
                aria-label={`remove ${item}`}
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

        {items.length ? (
          <p className="mt-3 text-[11px] font-black lowercase tracking-[0.28em] opacity-40">
            #1 is your priority
          </p>
        ) : null}

        {full ? null : (
          <div className="mt-8 flex items-end gap-4">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 40))}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder={CATEGORY_ASK[category]}
              className="min-w-0 flex-1 border-b border-current/25 bg-transparent pb-1 text-xl font-medium lowercase outline-none placeholder:opacity-35"
            />
            <button
              type="button"
              onClick={add}
              className="text-xl font-black lowercase"
              style={{ color: colour }}
            >
              add
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={leave}
          className="mt-16 text-left text-[12vw] font-black lowercase leading-[0.85] tracking-[-0.055em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-participation)" }}
        >
          save
          <br />
          &amp; return
        </button>
        <p className="mt-6 text-[11px] font-black lowercase tracking-[0.3em] opacity-40">
          everything saves as you go
        </p>
      </div>
    </div>
  );
}
