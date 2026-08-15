import type { Anchor, RegionKey } from "./LivingG";
import { LOOP_SAFE_RADIUS } from "./g-path";
import {
  LOOP_IDEAL_RATIO,
  LOOP_MIN_SIZE,
  LOOP_ROLE_SIZE,
  LOOP_PROFILE_FLEX,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
} from "./type-scale";

/**
 * The reusable profile typography system for the Living G loops.
 *
 * Content is composed FOR the circle: a stack of typed blocks is scaled up as
 * large as the loop's safe inscribed circle allows, with logical phrases kept
 * intact wherever they fit. The G never adapts to the content.
 *
 * Roles map onto the shared Living G type scale (type-scale.ts):
 *   primary   -> primary loop message / action
 *   secondary -> small label above an answer ("by day", "giving")
 *   tertiary  -> supporting detail ("+1 more", "this tuesday")
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

/** Average glyph width of the bold display face, as a share of font size. */
const WIDTH_RATIO: Record<LoopRole, number> = {
  primary: 0.58,
  secondary: 0.72, // tracked-out label
  tertiary: 0.58,
};

const SIZE_RATIO: Record<LoopRole, number> = {
  primary: LOOP_ROLE_SIZE.message,
  secondary: LOOP_ROLE_SIZE.label,
  tertiary: LOOP_ROLE_SIZE.detail,
};

const STYLE: Record<LoopRole, { opacity: number; tracking: string }> = {
  primary: LOOP_ROLE_STYLE.message,
  secondary: LOOP_ROLE_STYLE.label,
  tertiary: LOOP_ROLE_STYLE.detail,
};

function widthOf(text: string, size: number, role: LoopRole) {
  return text.length * size * WIDTH_RATIO[role];
}

/** Greedy wrap, only used when a phrase cannot stay on one line. */
function wrap(text: string, size: number, max: number, role: LoopRole) {
  if (widthOf(text, size, role) <= max) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, size, role) <= max || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Half-chord of the safe circle at vertical distance `dy` from its centre. */
function halfChord(r: number, dy: number) {
  const inner = r * r - dy * dy;
  return inner <= 0 ? 0 : Math.sqrt(inner);
}

type Row = { text: string; size: number; role: LoopRole; y: number };

function compose(blocks: LoopBlock[], radius: number, ideal: number): Row[] {
  // Profiles flex inside a controlled range of the ideal primary size, but the
  // loop must NEVER render empty: if the preferred range cannot hold the
  // content we keep stepping down and, in the very worst case, return the
  // smallest readable composition rather than nothing.
  const start = ideal * LOOP_PROFILE_FLEX.max;
  let fallback: Row[] = [];
  for (let base = start; base >= LOOP_MIN_SIZE; base -= 0.5) {
    const rows: { text: string; size: number; role: LoopRole; lead: boolean }[] = [];
    for (const block of blocks) {
      const role = block.role ?? "primary";
      const full = Math.max(LOOP_MIN_SIZE, base * SIZE_RATIO[role]);
      const max = radius * 1.72;
      // A logical phrase stays on ONE line, condensed a little if needed,
      // before we ever allow it to break.
      let size = full;
      let lines = [block.text];
      let single = false;
      for (const f of [1, 0.94, 0.88, 0.82, 0.76]) {
        const s = Math.max(LOOP_MIN_SIZE, full * f);
        if (widthOf(block.text, s, role) <= max) {
          size = s;
          single = true;
          break;
        }
      }
      if (!single) {
        // Otherwise keep the break count as low as possible: shrink until the
        // phrase reads on two lines rather than stacking word by word.
        size = full;
        lines = wrap(block.text, full, max, role);
        if (lines.length > 2) {
          for (let f = 0.96; f >= 0.5; f -= 0.03) {
            const s = Math.max(LOOP_MIN_SIZE, full * f);
            const candidate = wrap(block.text, s, max, role);
            if (candidate.length <= 2) {
              size = s;
              lines = candidate;
              break;
            }
          }
        }
      }
      lines.forEach((text, i) =>
        rows.push({ text, size, role, lead: i === 0 && !!block.lead }),
      );
    }

    const gap = base * 0.06;
    const lead = base * 0.24;
    const total = rows.reduce(
      (sum, row, i) => sum + row.size * 1.02 + (i === 0 ? 0 : row.lead ? lead : gap),
      0,
    );

    let y = -total / 2;
    const placed: Row[] = [];
    let ok = total <= radius * 1.94;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      if (i > 0) y += row.lead ? lead : gap;
      const centre = y + (row.size * 1.02) / 2;
      const allowed = halfChord(radius, Math.abs(centre) + row.size * 0.46) * 2;
      if (widthOf(row.text, row.size, row.role) > allowed) ok = false;
      placed.push({ text: row.text, size: row.size, role: row.role, y: centre });
      y += row.size * 1.02;
    }
    // Always remember the tightest composition we have seen, so a loop can
    // never come out blank.
    fallback = placed;
    if (ok) return placed;
  }
  return fallback;
}

/** Render a typed block stack safely inside a loop's negative space. */
export function profileLoop({
  anchor,
  region,
  blocks,
  lift = 0,
}: {
  anchor: Anchor;
  region: RegionKey;
  blocks: LoopBlock[];
  lift?: number;
}) {
  const radius = LOOP_SAFE_RADIUS[region];
  const rows = compose(blocks, radius, Math.round(radius * LOOP_IDEAL_RATIO));
  const dy = -Math.min(lift, Math.max(0, radius * 0.14));

  return (
    <>
      {rows.map((row, i) => (
        <text
          key={`${row.text}-${i}`}
          x={anchor.x}
          y={anchor.y + row.y + dy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={LOOP_TEXT_FILL}
          className="font-black lowercase"
          style={{
            fontSize: row.size,
            letterSpacing: STYLE[row.role].tracking,
            opacity: STYLE[row.role].opacity,
          }}
        >
          {row.text}
        </text>
      ))}
    </>
  );
}
