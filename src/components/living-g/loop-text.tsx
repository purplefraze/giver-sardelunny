import type { Anchor, RegionKey } from "./LivingG";
import {
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
  layoutStack,
  loopOrigin,
  wrapLines,
  wrapWidth,
} from "./loop-layout";
import { LOOP_FIXED_SIZE } from "./type-scale";

/**
 * Words that live ENTIRELY inside a loop's negative space, at the loop's FIXED
 * type token. The Living G never adapts to the content, and the content never
 * resizes itself: a phrase that is too long wraps (and warns in dev), so a
 * "message" always reads with exactly the same weight as any other message in
 * that loop, on every screen.
 */

type Block = { text: string; role: "message" | "label" };

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
  const max = wrapWidth(region);
  const blocks: Block[] = [
    ...(kicker ? [{ text: kicker, role: "label" as const }] : []),
    ...lines.map((text) => ({ text, role: "message" as const })),
  ];

  const gap = token.message * 0.1;
  const rows = blocks.flatMap((block, i) =>
    wrapLines(block.text, token[block.role], max, block.role).map((text, j) => ({
      text,
      size: token[block.role],
      role: block.role,
      gap: i === 0 && j === 0 ? 0 : gap,
    })),
  );

  const { rows: placed, fits } = layoutStack(rows, region);
  if (import.meta.env.DEV && !fits) {
    console.warn(
      `[living-g] copy does not fit the ${region} loop at its fixed size — shorten or re-break the lines:`,
      [kicker, ...lines].filter(Boolean).join(" / "),
    );
  }

  const origin = loopOrigin(region, lift);

  return (
    <>
      {placed.map((row, i) => (
        <text
          key={`${row.text}-${i}`}
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
          }}
        >
          {row.text}
        </text>
      ))}
    </>
  );
}
