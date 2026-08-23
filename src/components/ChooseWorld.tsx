import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import type { Category } from "@/data/my-profile";
import type { BorrowSide } from "@/data/items";
import {
  INTENTS,
  INTENT_COLOUR,
  INTENT_FOLLOW_UP,
  INTENT_WORDS,
  TRADE_EXCHANGE,
  type Intent,
} from "@/data/intents";
import { buzz } from "@/lib/haptics";

/**
 * AN EMPTY MIDDLE LOOP ASKS A QUESTION — AND ONLY ONE AT A TIME.
 *
 * Three doors, not five categories: looking for something, having something to
 * offer, or wanting to trade. Whichever is touched, giver asks the single
 * follow-up it needs to know whether that is a wish or a borrow, a give or a
 * lend — and the person never meets the word "taxonomy".
 */
export function ChooseWorld({
  onChoose,
  onCancel,
}: {
  onChoose: (category: Category, side?: BorrowSide) => void;
  onCancel: () => void;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const follow = intent ? INTENT_FOLLOW_UP[intent] : null;

  return (
    <div
      data-world="profile"
      className="g-page g-page-bottom relative flex h-full w-full flex-col justify-center"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow
        onClick={() => {
          if (intent) setIntent(null);
          else onCancel();
        }}
        label={intent ? "back" : "back to my g"}
      />

      {follow ? (
        <>
          <h1 className="g-display">{follow.ask}</h1>
          <div className="mt-12 flex flex-col items-start gap-5">
            {follow.choices.map((choice) => (
              <button
                key={choice.say}
                type="button"
                onClick={() => {
                  buzz();
                  onChoose(choice.exchange.category, choice.exchange.side);
                }}
                className="g-display text-left"
                style={{ color: choice.colour }}
              >
                {choice.say}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="g-display">what would you like to do?</h1>
          <div className="mt-12 flex flex-col items-start gap-5">
            {INTENTS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  buzz();
                  if (INTENT_FOLLOW_UP[option]) setIntent(option);
                  else onChoose(TRADE_EXCHANGE.category);
                }}
                className="g-display text-left"
                style={{ color: INTENT_COLOUR[option] }}
              >
                {INTENT_WORDS[option]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
