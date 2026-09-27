import { useState } from "react";
import type { Category } from "@/data/my-profile";
import { CATEGORY_PLURAL } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";
import { GMark } from "@/components/living-g/GMark";
import { SendArrow } from "@/components/forms/UnifiedForm";

/**
 * GIVER TALKING TO YOU — the first-time explanation of one activity world.
 *
 * Fast by design: a few short beats, each a single tap away. No word-by-word
 * animation, no holds, no blank screens. It is introductory UI ONLY and never
 * touches items, community content or the profile.
 *
 * The SAME screen serves the voluntary help area (`help`), where it explains
 * and then simply closes — it never sets a first-time flag and never pushes
 * anyone into a form.
 */

export type IntroTopic = Category | "fund" | "sparks";

/**
 * WISH + FUND — two pages each, one idea per page: a headline and at most two
 * short lines, set like their stills (/workspace/giver-onboarding): the G top
 * left, a light heading in the seat colour, charcoal lines, a quiet page count
 * and the seat's send circle. Copy verbatim from current-wish-copy.md. A wish
 * "holds" its sparks (reserved, not spent — see my-profile.ts); no vault.
 */
const PAGES: Partial<Record<IntroTopic, { h: string; lines: string[] }[]>> = {
  wish: [
    {
      h: "wish for anything.",
      lines: [
        "a ride, a ladder, a guitar lesson, a birthday cake.",
        "big or small, your community has your back.",
      ],
    },
    {
      h: "three wishes at a time.",
      lines: ["each one holds 10 sparks.", "the one at the top gets seen most. drag to reorder."],
    },
  ],
  fund: [
    {
      h: "fund a bigger wish.",
      lines: [
        "for wishes that can’t be given directly, like dental work, tuition or care at home.",
        "anyone can put in any amount.",
      ],
    },
    {
      h: "it all goes through giver.",
      lines: ["never person to person.", "giver keeps a small share."],
    },
  ],
};

const BEATS: Record<Exclude<IntroTopic, "wish" | "fund">, string[][]> = {

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
    [
      "there is no limit on giving.",
      "so… what have you got to give?",
    ],
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
      "no sparks needed. just a good trade.",
      "you can have 3 trades going at a time.",
    ],
    ["what are you offering? and what would you like in return?"],
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
      "you can have 3 things you’re looking to borrow at a time.",
      "what would you like to borrow?",
    ],
  ],
  sparks: [
    [
      "sparks are recognition.",
      "not money. not points. not payment between people.",
      "giver gives you sparks when you are generous.",
    ],
    [
      "every give that reaches another giver: +10 sparks. ✨",
      "every wish of someone else’s you grant: +10 sparks. ✨",
      "every wish you make costs 10 sparks.",
      "so generosity is what lets you ask.",
    ],
  ],
};
/** One idea per line, sized by how much of it there is. */
const size = (line: string) =>
  line.length > 170 ? "3.9vw" : line.length > 90 ? "4.5vw" : "5.2vw";



export function WorldIntro({
  category,
  onDone,
  help = false,
}: {
  category: IntroTopic;
  onDone: () => void;
  /** Opened voluntarily from help: explain, then simply close. */
  help?: boolean;
}) {
  const [beat, setBeat] = useState(0);
  const pages = PAGES[category];
  if (pages) return <PagedIntro pages={pages} category={category} onDone={onDone} beat={beat} setBeat={setBeat} />;
  const beats = BEATS[category as Exclude<IntroTopic, "wish" | "fund">];
  const lines = beats[beat] ?? [];
  const last = beat === beats.length - 1;
  const colour =
    category === "sparks" ? "var(--giver-me)" : `var(--me-${category})`;

  const next = () => {
    buzz();
    if (last) onDone();
    else setBeat(beat + 1);
  };

  return (
    <button
      type="button"
      onClick={next}
      data-world={category === "sparks" ? "profile" : category}
      className="g-page relative flex h-full w-full flex-col justify-center pb-24 pt-16 text-left"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <span
        className="absolute left-7 top-6 g-heading"
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


      <span className="absolute inset-x-7 bottom-10 g-meta">
        {!last
          ? "tap to continue"
          : help || category === "sparks"
            ? "tap to close"
            : `tap for my ${CATEGORY_PLURAL[category as Category]}`}
      </span>
    </button>
  );
}

/** THE TWO-PAGE INTRO (wish, fund) — the whole screen is one tap forward. */
function PagedIntro({
  pages,
  category,
  onDone,
  beat,
  setBeat,
}: {
  pages: { h: string; lines: string[] }[];
  category: IntroTopic;
  onDone: () => void;
  beat: number;
  setBeat: (n: number) => void;
}) {
  const page = pages[beat] ?? pages[0]!;
  const last = beat >= pages.length - 1;
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
      className="g-form uf-screen block h-full w-full text-left"
      aria-label={last ? "continue" : "next"}
    >
      <span className="uf-g" aria-hidden="true">
        <GMark colour="var(--form-seat)" height={32} />
      </span>
      <div key={beat} className="animate-in fade-in duration-200">
        <h1 className="uf-heading">{page.h}</h1>
        {page.lines.map((line, i) => (
          <p key={line} className="uf-intro-line" style={{ marginTop: i === 0 ? 34 : 14 }}>
            {line}
          </p>
        ))}
      </div>
      <span className="uf-count">
        {beat + 1} / {pages.length}
      </span>
      <span className="uf-send" aria-hidden="true">
        <SendArrow />
      </span>
    </button>
  );
}
