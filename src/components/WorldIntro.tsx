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
      "a ride to the airport? help moving a couch? someone to teach you guitar? a birthday cake? a ladder? advice from someone who knows their stuff? company on a walk?",
      "big, small, practical, weird, meaningful — wish for it.",
    ],
    [
      "each wish costs 10 sparks.",
      "don’t be shy. you’ve got a whole community of givers who’ve got your back.",
      "when you wish upon a spark… makes no difference who you are. ✨",
    ],
    [
      "you get 3 wishes at a time.",
      "put what you want most at the top — we’ll make it more visible to your community.",
      "drag your wishes to reorder them any time.",
      "so, what do you wish for?",
    ],
  ],
  give: [
    [
      "what have you got to give?",
      "probably more than you think.",
      "give your time. your talent. your knowledge. something you’ve made. something you don’t need. or simply show up for someone.",
    ],
    [
      "cook someone dinner. cut their hair. teach them guitar. help build a shelf. give someone a ride. walk their dog. share vegetables from your garden. help with a résumé. fix a bike. take someone’s portrait. give away a jacket. sit down and listen.",
      "if you’ve got something that could make somebody else’s day a little better, you can give it.",
    ],
    [
      "and generosity creates sparks. ✨",
      "every time one of your gives is shared with another giver, giver gives you 10 sparks.",
      "every time you grant someone’s wish, giver gives you 10 sparks.",
      "nobody pays anybody. the sparks come from giver — then you wish with them.",
    ],
    ["so… what have you got to give?"],
  ],
  trade: [
    [
      "let’s make a trade.",
      "sometimes you’ve got something they want — and they’ve got something you want.",
      "trade things, skills, time, knowledge, or favours.",
    ],
    [
      "haircut for photography. guitar lesson for help moving. home-cooked dinner for help fixing a bike. plants for pottery. design help for language lessons. camping gear for something you need that weekend.",
      "if the trade works for both of you, it works for giver.",
      "no sparks are exchanged for the trade itself.",
    ],
    ["what would you trade?"],
  ],
  borrow: [
    [
      "need it, but don’t need to own it?",
      "borrow it.",
      "a drill for twenty minutes. a ladder for the afternoon. camping gear for the weekend. a pasta strainer for dinner. a dress for a party. a projector for movie night.",
      "a bike pump. a suitcase. a folding table. a tool you might literally use once.",
    ],
    [
      "before buying something you’ll barely use, see if your community already has it.",
      "borrow what you need. give it back when you’re done.",
      "what would you like to borrow?",
    ],
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

      <div
        key={beat}
        className="animate-in fade-in space-y-4 overflow-y-auto duration-200"
      >
        {lines.map((line, i) => (
          <p
            key={line}
            className="font-black lowercase leading-[1.02] tracking-[-0.04em]"
            style={{
              /* THE EXAMPLES ARE LONG BY DESIGN — the type breathes down for
                 them instead of spilling off the screen. */
              fontSize: i === 0 ? "8.4vw" : size(line),
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
