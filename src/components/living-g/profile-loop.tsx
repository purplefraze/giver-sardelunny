import type { Anchor, RegionKey } from "./LivingG";
import {
  LOOP_MIN_SIZE,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
  layoutStack,
  loopOrigin,
  wrapLines,
  wrapWidth,
} from "./loop-layout";
import {
  LOOP_FIXED_SIZE,
  LOOP_PROFILE_FLEX,
  LOOP_ROLE_SIZE,
  type LoopTypeRole,
} from "./type-scale";

/**
 * Profile typography for the Living G loops — SAME engine, SAME tokens and SAME
 * centring as every other in-loop word (loop-layout.ts). The only difference is
 * grammar: a typed stack of blocks with visual groups.
 *
 * Profiles carry variable, user-entered content, so the whole stack may step
 * DOWN from the loop's fixed size inside LOOP_PROFILE_FLEX — one scale for the
 * whole composition, never per line, and never above the token.
 *
 * Roles map onto the shared type scale:
 *   primary   -> message  ("chemistry teacher")
 *   secondary -> label    ("by day", "giving")
 *   tertiary  -> detail   ("+1 more", "this tuesday")
 */

export type LoopRole = "primary" | "secondary" | "tertiary";

export type LoopBlock = {
  text: string;
  role?: LoopRole;
  /** Start a new visual group — extra breathing room above this block. */
  lead?: boolean;
};

/** Short-form fields only: longer answers belong on the deeper Profile page. */
export const LOOP_FIELD_MAX = 26;

export function clampField(text: string) {
  const t = text.trim();
  return t.length <= LOOP_FIELD_MAX ? t : `${t.slice(0, LOOP_FIELD_MAX - 1).trimEnd()}…`;
}

const AS_ROLE: Record<LoopRole, LoopTypeRole> = {
  primary: "message",
  secondary: "label",
  tertiary: "detail",
};

export function profileLoop({
  region,
  blocks,
  lift = 0,
}: {
  /** Accepted for API compatibility; centring always uses the loop centre. */
  anchor?: Anchor;
  region: RegionKey;
  blocks: LoopBlock[];
  lift?: number;
}) {
  const token = LOOP_FIXED_SIZE[region];
  const max = wrapWidth(region);
  const origin = loopOrigin(region, lift);

  const build = (scale: number) => {
    const gap = token.message * scale * 0.06;
    const lead = token.message * scale * 0.24;
    return blocks.flatMap((block, i) => {
      const role = AS_ROLE[block.role ?? "primary"];
      const size = Math.max(
        LOOP_MIN_SIZE,
        Math.round(token.message * scale * LOOP_ROLE_SIZE[role]),
      );
      return wrapLines(block.text, size, max, role).map((text, j) => ({
        text,
        size,
        role,
        gap: i === 0 && j === 0 ? 0 : j === 0 && block.lead ? lead : gap,
      }));
    });
  };

  // ONE scale for the whole stack, stepped down only inside the allowed flex.
  let placed = layoutStack(build(LOOP_PROFILE_FLEX.max), region);
  if (!placed.fits) {
    for (let s = LOOP_PROFILE_FLEX.max - 0.02; s >= LOOP_PROFILE_FLEX.min; s -= 0.02) {
      const next = layoutStack(build(s), region);
      placed = next;
      if (next.fits) break;
    }
  }

  return (
    <>
      {placed.rows.map((row, i) => (
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
