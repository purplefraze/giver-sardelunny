import type { Anchor, RegionKey } from "./LivingG";
import {
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
  layoutStack,
  loopOrigin,
  wrapLines,
  wrapWidth,
} from "./loop-layout";
import { LOOP_FIXED_SIZE, LOOP_SIZE_STEPS } from "./type-scale";

/**
 * Words that live ENTIRELY inside a loop's negative space, at the loop's FIXED
 * type token — poster typography inside the loop, never UI copy inside a
 * component. A phrase that cannot fit wraps first, and only then steps DOWN
 * through the small allowed set of discrete stops. Single hero words ("giver")
 * therefore always render at the full bottom-loop hero token.
 */

type Block = { text: string; role: "message" | "label" };

/**
 * Word fade: complete words, opacity only, G stationary. Slow and soft — a word
 * should feel like it is gently arriving, never popping in.
 */
export const LOOP_WORD_MS = 780;

/** A gentle, almost linear-out curve. No overshoot, no snap. */
export const LOOP_WORD_EASE = "cubic-bezier(0.32, 0, 0.24, 1)";

export function loopText({
  region,
  kicker,
  lines,
  lift = 0,
}: {
  /** Accepted for API compatibility; centring always uses the loop centre. */
  anchor?: Anchor;
  region: RegionKey;
  kicker?: string;
  lines: string[];
  /** Optional upward nudge so a fingertip never covers the words. */
  lift?: number;
}) {
  const token = LOOP_FIXED_SIZE[region];
  const blocks: Block[] = [
    ...(kicker ? [{ text: kicker, role: "label" as const }] : []),
    ...lines.map((text) => ({ text, role: "message" as const })),
  ];

  const build = (step: number) => {
    const max = wrapWidth(region) * 1;
    const rows = blocks.flatMap((block, i) =>
      wrapLines(block.text, token[block.role] * step, max, block.role).map(
        (text, j) => ({
          text,
          size: token[block.role] * step,
          role: block.role,
          gap: i === 0 && j === 0 ? 0 : token.message * step * 0.06,
        }),
      ),
    );
    return layoutStack(rows, region);
  };

  let laid = build(1);
  for (const step of LOOP_SIZE_STEPS) {
    laid = build(step);
    if (laid.fits) break;
  }

  if (import.meta.env.DEV && !laid.fits) {
    console.warn(
      `[living-g] copy does not fit the ${region} loop even at the smallest allowed step — re-break the lines:`,
      [kicker, ...lines].filter(Boolean).join(" / "),
    );
  }

  const origin = loopOrigin(region, lift);

  return (
    <>
      {laid.rows.map((row, i) => (
        <text
          // Keyed by the word itself, so an arriving word fades in on its own
          // while the words already on screen hold perfectly still.
          key={`${region}-${row.text}-${i}`}
          x={origin.x}
          y={origin.y + row.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={LOOP_TEXT_FILL}
          className="font-black lowercase"
          style={{
            fontSize: row.size,
            letterSpacing: LOOP_ROLE_STYLE[row.role].tracking,
            opacity: LOOP_ROLE_STYLE[row.role].opacity,
            animation: `g-fade ${LOOP_WORD_MS}ms ${LOOP_WORD_EASE} both`,
          }}
        >
          {row.text}
        </text>
      ))}
    </>
  );
}
