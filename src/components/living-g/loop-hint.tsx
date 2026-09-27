import type { RegionKey } from "./LivingG";
import { loopOrigin, wrapLines, wrapWidth } from "./loop-layout";
import {
  ACTION_LINE_HEIGHT,
  ACTION_SIZE,
  ACTION_WRAP_FACTOR,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
} from "./type-scale";
import { LOOP_SAFE_RADIUS } from "./g-path";

/** How long a toggle hint lives: fade in, hold, fade out. */
export const LOOP_HINT_MS = 1800;

/**
 * ONE TYPE SIZE FOR EVERY LOOP LINE — hints and the communi-g ticker alike.
 * The middle loop's action token is the target; the bottom loop uses the same
 * size (its own, larger token is deliberately not used here).
 */
export const LOOP_LINE_SIZE = ACTION_SIZE.middle;
const LINE_BOX = LOOP_LINE_SIZE * ACTION_LINE_HEIGHT;

/**
 * How many lines a loop can hold at LOOP_LINE_SIZE while staying well inside
 * its safe circle (70% of the diameter). Derived from LOOP_SAFE_RADIUS, so the
 * rule is identical for every loop and every seat — no per-seat one-offs.
 */
const maxLines = (region: RegionKey) =>
  Math.max(1, Math.floor((LOOP_SAFE_RADIUS[region] * 2 * 0.7) / LINE_BOX));

/**
 * THE SHARED LOOP LAYOUT. Lowercased, wrapped at the loop's own width, capped
 * at maxLines (the last kept line is ellipsised), and centred on the loop's
 * true centre (LOOP_CENTRE via loopOrigin with NO lift) — the block's middle
 * sits on the circle's middle, so copy is optically centred, never high.
 */
function LoopLines({
  region,
  text,
  fill = LOOP_TEXT_FILL,
}: {
  region: RegionKey;
  text: string;
  fill?: string;
}) {
  const clean = text.trim().toLowerCase();
  if (!clean) return null;
  /* A no-break space (U+00A0) keeps a phrase like "+15 more" together:
     it is shielded from the wrapper, then restored. */
  let lines = wrapLines(
    clean.replace(/\u00a0/g, "\ue000"),
    LOOP_LINE_SIZE,
    wrapWidth(region, ACTION_WRAP_FACTOR),
    "action",
  ).map((line) => line.replace(/\ue000/g, "\u00a0"));
  const cap = maxLines(region);
  if (lines.length > cap) {
    lines = lines.slice(0, cap);
    lines[cap - 1] = `${lines[cap - 1]!.replace(/…$/, "")}…`;
  }
  if (lines.length === 0) return null;
  const origin = loopOrigin(region, 0);

  return (
    <text
      x={origin.x}
      y={origin.y - ((lines.length - 1) * LINE_BOX) / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={fill}
      className="font-black lowercase"
      style={{
        fontFamily: "var(--giver-font)",
        fontSize: LOOP_LINE_SIZE,
        letterSpacing: LOOP_ROLE_STYLE.action.tracking,
        textTransform: "lowercase",
      }}
    >
      {lines.map((line, i) => (
        <tspan key={line + i} x={origin.x} dy={i === 0 ? 0 : LINE_BOX}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * A FAINT, SELF-DISSOLVING LOOP HINT (~1.8s one-shot CSS fade,
 * `.giver-loop-hint` in styles.css). `nonce` keys the group so every new
 * toggle use remounts it and the fade replays from the start.
 */
export function loopHint(region: RegionKey, label: string, nonce: number | string = 0) {
  if (!label) return null;
  return (
    <g
      key={`hint-${region}-${nonce}`}
      className="giver-loop-hint"
      style={{ animationDuration: `${LOOP_HINT_MS}ms` }}
    >
      <LoopLines region={region} text={label} />
    </g>
  );
}

/**
 * THE TICKER LINE — the existing loop content (my latest / the communi-g
 * latest), set with exactly the same type rules as a hint: same size,
 * lowercase, centred, one tidy wrapped line. Static (no fade).
 */
export function loopLine(region: RegionKey, text: string, fill?: string) {
  if (!text) return null;
  return (
    <g pointerEvents="none">
      <LoopLines region={region} text={text} {...(fill ? { fill } : {})} />
    </g>
  );
}
