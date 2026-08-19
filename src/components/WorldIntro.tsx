import { useState } from "react";
import type { Category } from "@/data/my-profile";
import { CATEGORY_PLURAL } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * GIVER TALKING TO YOU — the first-time explanation of one activity world.
 *
 * Fast by design: a few short beats, each a single tap away. No word-by-word
 * animation, no holds, no blank screens. It is introductory UI ONLY and never
 * touches items, community content or the profile.
 */

const BEATS: Record<Category, string[][]> = {
  wish: [
    [
      "time to make a wish.",
      "anything!",
      "each wish costs 10 sparks.",
      "don’t be shy. you’ve got a whole community of givers who’ve got your back.",
    ],
    ["when you wish upon a spark… makes no difference who you are. ✨", "so, what do you wish for?"],
    [
      "you get 3 wishes at a time.",
      "put what you want most at the top — we’ll make it more visible to your community.",
    ],
  ],
  give: [
    [
      "what have you got to give?",
      "it doesn’t have to be a thing.",
      "give your time. your skills. something you don’t need. a helping hand. whatever you’ve got.",
      "someone in your community might need exactly what you have to offer.",
    ],
    ["what would you like to give?", "there is no spark charge for offering something."],
  ],
  trade: [
    [
      "let’s make a trade.",
      "got something someone else might want? need something they might have?",
      "trade things, skills, time, or favours directly with another person.",
      "no sparks needed. just a good trade.",
    ],
    ["what would you trade?"],
  ],
  borrow: [
    [
      "need it, but don’t need to own it?",
      "borrow it.",
      "a drill. a ladder. camping gear. a pasta strainer. whatever you need for a little while.",
      "someone nearby might already have one sitting around.",
      "borrow what you need. give it back when you’re done.",
    ],
    ["what would you like to borrow?"],
  ],
};

export function WorldIntro({
  category,
  onDone,
}: {
  category: Category;
  onDone: () => void;
}) {
  const beats = BEATS[category];
  const [beat, setBeat] = useState(0);
  const lines = beats[beat] ?? [];
  const last = beat === beats.length - 1;
  const colour = `var(--me-${category})`;

  const next = () => {
    buzz();
    if (last) onDone();
    else setBeat(beat + 1);
  };

  return (
    <button
      type="button"
      onClick={next}
      data-world={category}
      className="relative flex h-full w-full flex-col justify-center px-7 pb-24 pt-16 text-left"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <span
        className="absolute left-7 top-6 text-[11px] font-black lowercase tracking-[0.3em]"
        style={{ color: colour }}
      >
        {category}
      </span>

      <div key={beat} className="space-y-5 animate-in fade-in duration-200">
        {lines.map((line, i) => (
          <p
            key={line}
            className="font-black lowercase leading-[0.95] tracking-[-0.04em]"
            style={{
              fontSize: i === 0 ? "9vw" : "5.2vw",
              opacity: i === 0 ? 1 : 0.78,
              ...(i === 0 ? { color: colour } : {}),
            }}
          >
            {line}
          </p>
        ))}
      </div>

      <span className="absolute inset-x-7 bottom-10 text-[11px] font-black lowercase tracking-[0.3em] opacity-45">
        {last ? `tap for my ${CATEGORY_PLURAL[category]}` : "tap to continue"}
      </span>
    </button>
  );
}
