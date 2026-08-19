import { useEffect, useState } from "react";
import type { Anchor, RegionKey } from "./LivingG";
import {
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
  layoutStack,
  loopOrigin,
  type LaidOutRow,
  wrapLines,
  wrapWidth,
} from "./loop-layout";
import { LOOP_FILL, LOOP_FIXED_SIZE, LOOP_SIZE_STEPS } from "./type-scale";

/**
 * Words that live ENTIRELY inside a loop's negative space, at the loop's FIXED
 * type token — poster typography inside the loop, never UI copy inside a
 * component. A phrase that cannot fit wraps first, and only then steps DOWN
 * through the small allowed set of discrete stops. Single hero words ("giver")
 * therefore always render at the full bottom-loop hero token.
 *
 * WORDS BEGIN WHERE THEY WILL END. The layout is ALWAYS computed from the
 * COMPLETE final composition (`plan`), never from the words revealed so far, so
 * nothing reflows as a phrase arrives: every line is placed at its final resting
 * coordinates from the first frame and only its OPACITY changes.
 */

type Block = { text: string; role: "message" | "label" };

/**
 * Word fade: complete words, opacity only, G stationary. Slow and soft — a word
 * should feel like it is gently arriving, never popping in.
 */
export const LOOP_WORD_MS = 260;

/** A gentle, almost linear-out curve. No overshoot, no snap. */
export const LOOP_WORD_EASE = "cubic-bezier(0.32, 0, 0.24, 1)";

export function loopText({
  region,
  kicker,
  lines,
  plan,
  scale = 1,
  lift = 0,
  hero = false,
}: {
  /** Accepted for API compatibility; centring always uses the loop centre. */
  anchor?: Anchor;
  region: RegionKey;
  kicker?: string;
  /** The lines revealed so far. */
  lines: string[];
  /** The COMPLETE final composition this loop is building toward. */
  plan?: string[];
  /** Deliberate emphasis for a single transitional beat (e.g. "so..."). */
  scale?: number;
  /** Optional upward nudge so a fingertip never covers the words. */
  lift?: number;
  /** First line is the hero ("50"); the rest support it at detail size. */
  hero?: boolean;
}) {
  const token = LOOP_FIXED_SIZE[region];
  const full = plan && plan.length >= lines.length ? plan : lines;
  const blocks: Block[] = [
    ...(kicker ? [{ text: kicker, role: "label" as const }] : []),
    ...full.map((text, i) => ({
      text,
      role: (hero && i > 0 ? "detail" : "message") as Block["role"],
    })),
  ];
  const kickerRows = kicker ? 1 : 0;

  const build = (step: number) => {
    const max = wrapWidth(region, 2.02 * LOOP_FILL[region]);
    // A hero composition ("50" / "for you" / "to wish with") gives its lead line
    // real graphic weight: the numeral dominates, the support reads under it. A
    // longer lead ("and 50") takes a smaller lead so the support lines are not
    // starved when the whole stack steps down.
    const lead = blocks[kickerRows]?.text.length ?? 0;
    const HERO_LEAD = lead <= 3 ? 1.6 : 1.22;

    const rows = blocks.flatMap((block, i) => {
      const isLead = hero && i === kickerRows;
      // Support lines never fall below a readable floor when the stack steps
      // down for a wide lead — the hero shrinks, the support holds.
      const size = isLead
        ? token[block.role] * step * scale * HERO_LEAD
        : hero
          ? Math.max(token[block.role] * step * scale, token[block.role] * 0.78)
          : token[block.role] * step * scale;

      return wrapLines(block.text, size, max, block.role).map((text, j) => ({
        text,
        size,
        role: block.role,
        gap: i === 0 && j === 0 ? 0 : token.message * step * scale * 0.06,
        // Which line of the composition this row belongs to.
        src: i,
      }));
    });

    return {
      laid: layoutStack(rows, region, 1, LOOP_FILL[region]),
      src: rows.map((r) => r.src),
    };
  };

  let built = build(1);
  for (const step of LOOP_SIZE_STEPS) {
    built = build(step);
    if (built.laid.fits) break;
  }

  if (import.meta.env.DEV && !built.laid.fits) {
    console.warn(
      `[living-g] copy does not fit the ${region} loop even at the smallest allowed step — re-break the lines:`,
      [kicker, ...full].filter(Boolean).join(" / "),
    );
  }

  const origin = loopOrigin(region, lift);
  const revealed = kickerRows + lines.length;

  return (
    <>
      {built.laid.rows.map((row, i) => (
        <LoopRow
          // Keyed by position, so nothing remounts (and so nothing jumps)
          // when the next word of the same composition arrives.
          key={`${region}-${full.join("|")}-${i}-${row.text}`}
          row={row}
          x={origin.x}
          y={origin.y + row.y}
          shown={(built.src[i] ?? 0) < revealed}
        />
      ))}
    </>
  );
}

/**
 * ONE line of in-loop copy. It always MOUNTS invisible and is raised on the next
 * frame, so a phrase can never appear before its fade — the mount frame itself
 * used to be the flash.
 */
function LoopRow({
  row,
  x,
  y,
  shown,
}: {
  row: LaidOutRow;
  x: number;
  y: number;
  shown: boolean;
}) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={LOOP_TEXT_FILL}
      className="font-black lowercase"
      style={{
        fontSize: row.size,
        letterSpacing: LOOP_ROLE_STYLE[row.role].tracking,
        opacity: live && shown ? LOOP_ROLE_STYLE[row.role].opacity : 0,
        transition: `opacity ${LOOP_WORD_MS}ms ${LOOP_WORD_EASE}`,
      }}
    >
      {/* One unbroken word. A question mark is part of the word — never a
          separately positioned tspan, which is what used to detach it. */}
      {row.text}
    </text>
  );
}

