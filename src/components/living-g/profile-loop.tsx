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
  PROFILE_FILL,
  PROFILE_SAFE_INSET,
  PROFILE_STEPS,
  PROFILE_TYPE,
  PROFILE_WRAP_FACTOR,
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
  /**
   * COLOUR = MEANING. Real Wish / Give / Trade / Borrow content carries its
   * world's colour token so the type of activity is readable at a glance.
   * Generic profile copy leaves this unset and keeps the world's ink.
   */
  fill?: string;
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

/** Which fixed profile token each role reads from. */
const AS_TOKEN: Record<LoopRole, "answer" | "label" | "detail"> = {
  primary: "answer",
  secondary: "label",
  tertiary: "detail",
};

/**
 * How wide a line may run before wrapping, per loop. The bottom loop's stack is
 * tall, so its lines sit where the circle is already narrowing: they wrap early
 * rather than reach for the widest chord.
 */
const WRAP_FACTOR: Record<RegionKey, number> = {
  top: PROFILE_WRAP_FACTOR,
  middle: PROFILE_WRAP_FACTOR,
  bottom: 1.42,
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
  const token = PROFILE_TYPE[region];
  const inset = PROFILE_SAFE_INSET[region];
  const origin = loopOrigin(region, lift);

  const fill = PROFILE_FILL[region];

  /**
   * VERTICAL BREATHING ROOM. The bottom loop carries three label+answer pairs,
   * so the whole group is held to a smaller share of the loop's height, well
   * clear of the S-curve above and the stroke below.
   */
  const height = region === "bottom" ? 1.72 : 1.8;

  const build = (step: number) => {
    const max = wrapWidth(region, WRAP_FACTOR[region], inset) * fill;
    const gap = token.answer * step * 0.06;
    const lead = token.answer * step * 0.24;
    return blocks.flatMap((block, i) => {
      const key = block.role ?? "primary";
      const role = AS_ROLE[key];
      const size = Math.max(
        LOOP_MIN_SIZE,
        Math.round(token[AS_TOKEN[key]] * step),
      );
      return wrapLines(block.text, size, max, role).map((text, j) => ({
        text,
        size,
        role,
        gap: i === 0 && j === 0 ? 0 : j === 0 && block.lead ? lead : gap,
        ...(block.fill ? { fill: block.fill } : {}),
      }));
    });
  };

  // ONE scale for the whole stack, stepped down only inside the allowed flex.
  // The stack is measured against the loop's TRUE negative space (fill), so a
  // long phrase uses the wide middle of the circle instead of shrinking
  // everything around it.
  let placed = layoutStack(build(1), region, inset, fill, height);
  for (const step of PROFILE_STEPS) {
    placed = layoutStack(build(step), region, inset, fill, height);
    if (placed.fits) break;
  }


  return (
    <>
      {placed.rows.map((row, i) => (
        <text
          /* Position-keyed: one row per slot, never a reused stale node. */
          key={`${region}-row-${i}`}
          x={origin.x}
          y={origin.y + row.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={row.fill ?? LOOP_TEXT_FILL}
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
