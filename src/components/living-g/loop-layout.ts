import { LOOP_CENTRE, LOOP_SAFE_RADIUS } from "./g-path";
import {
  LOOP_MIN_SIZE,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
  type LoopRegion,
  type LoopTypeRole,
} from "./type-scale";

/**
 * ONE layout engine for every word that lives inside a Living G loop.
 *
 * Two rules, and they are the whole system:
 *   1. SIZE IS A TOKEN. It comes from type-scale.ts and never from the copy.
 *      Copy that is too long WRAPS; it is never resized to fit.
 *   2. CENTRING IS ONE SYSTEM. Every stack is optically centred on the measured
 *      centre of its own loop's negative space (LOOP_CENTRE) — never on the
 *      page, the SVG, or the interaction anchors.
 */

export { LOOP_TEXT_FILL, LOOP_ROLE_STYLE };

/** Average glyph width of the bold display face, as a share of font size. */
export const WIDTH_RATIO: Record<LoopTypeRole, number> = {
  action: 0.58,
  message: 0.58,
  label: 0.84, // the wide 0.26em tracked label
  detail: 0.58,
};


/** Narrow glyphs, so a phrase like "started..." is not measured as if it were all o's. */
const NARROW: Record<string, number> = {
  " ": 0.28,
  ".": 0.3,
  ",": 0.3,
  "'": 0.24,
  "!": 0.3,
  "?": 0.5,
  i: 0.3,
  j: 0.3,
  l: 0.3,
  t: 0.4,
  f: 0.36,
  r: 0.42,
  s: 0.52,
  1: 0.4,
};

export function widthOf(text: string, size: number, role: LoopTypeRole) {
  const base = WIDTH_RATIO[role];
  let ratio = 0;
  for (const ch of text) ratio += NARROW[ch] ?? base;
  return ratio * size;
}


/** Widest line a loop will accept before wrapping. */
export function wrapWidth(region: LoopRegion, factor = 2.02, inset = 1) {
  return LOOP_SAFE_RADIUS[region] * inset * factor;
}

/** Half-chord of the safe circle at vertical distance `dy` from its centre. */
export function halfChord(r: number, dy: number) {
  const inner = r * r - dy * dy;
  return inner <= 0 ? 0 : Math.sqrt(inner);
}

/** Greedy wrap of one phrase into lines that fit `max` px at `size`. */
export function wrapLines(text: string, size: number, max: number, role: LoopTypeRole) {
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
  return balance(lines, size, max, role);
}

/**
 * A greedy wrap leaves the last line short ("no weekends allowed" -> "no
 * weekends" / "allowed"). When moving a word down makes the two lines more
 * even AND still fits, prefer the balanced break — never an orphan.
 */
function balance(lines: string[], size: number, max: number, role: LoopTypeRole) {
  if (lines.length !== 2) return lines;
  const words = lines[0]!.split(" ");
  if (words.length < 2) return lines;
  const first = words.slice(0, -1).join(" ");
  const second = `${words[words.length - 1]} ${lines[1]}`;
  if (widthOf(second, size, role) > max) return lines;
  const before = Math.abs(widthOf(lines[0]!, size, role) - widthOf(lines[1]!, size, role));
  const after = Math.abs(widthOf(first, size, role) - widthOf(second, size, role));
  return after < before ? [first, second] : lines;
}


export type LaidOutRow = {
  text: string;
  size: number;
  role: LoopTypeRole;
  /** Vertical offset from the loop's optical centre. */
  y: number;
  /** Optional per-row colour override (activity content carries its world colour). */
  fill?: string;
};

type StackRow = {
  text: string;
  size: number;
  role: LoopTypeRole;
  gap?: number;
  fill?: string;
};

/**
 * Centre a stack of rows on the loop's optical centre and report whether every
 * row still clears the safe circle. Nothing here changes a row's size.
 */
export function layoutStack(
  rows: StackRow[],
  region: LoopRegion,
  /** Inset of the loop's safe circle this stack must stay inside. */
  inset = 1,
  /**
   * How much WIDER than the safe circle the loop's real negative space is at
   * this stack's height. The safe circle is deliberately conservative; poster
   * type is allowed to use the loop's true width.
   */
  fill = 1,
  /**
   * How much of the safe circle's DIAMETER the stack's total height may use.
   * Below 2 it leaves breathing room above and below the whole group.
   */
  heightFactor = 1.9,
): { rows: LaidOutRow[]; fits: boolean } {
  const radius = LOOP_SAFE_RADIUS[region] * inset;
  const total = rows.reduce(
    (sum, row, i) => sum + row.size * 1.02 + (i === 0 ? 0 : (row.gap ?? 0)),
    0,
  );

  let y = -total / 2;
  const placed: LaidOutRow[] = [];
  let fits = total <= radius * heightFactor;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (i > 0) y += row.gap ?? 0;
    const centre = y + (row.size * 1.02) / 2;
    // Lowercase display type only reaches ~0.36 of its font size above and
    // below the optical centre line, so the chord is measured at the real ink
    // height — not the full line box. This is what lets a word FILL its loop.
    const allowed = halfChord(radius, Math.abs(centre) + row.size * 0.36) * 2 * fill;
    if (widthOf(row.text, row.size, row.role) > allowed) fits = false;
    placed.push({
      text: row.text,
      size: row.size,
      role: row.role,
      y: centre,
      ...(row.fill ? { fill: row.fill } : {}),
    });
    y += row.size * 1.02;
  }
  return { rows: placed, fits };
}

/**
 * The single centring coordinate for in-loop copy, with an optional upward
 * nudge so a fingertip never covers the words.
 */
export function loopOrigin(region: LoopRegion, lift = 0) {
  const centre = LOOP_CENTRE[region];
  const dy = -Math.min(lift, Math.max(0, LOOP_SAFE_RADIUS[region] * 0.14));
  return { x: centre.x, y: centre.y + dy };
}

export { LOOP_MIN_SIZE };
