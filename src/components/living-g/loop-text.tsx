import type { Anchor, RegionKey } from "./LivingG";
import { LOOP_SAFE_RADIUS } from "./g-path";
import {
  LOOP_IDEAL_RATIO,
  LOOP_MIN_SIZE,
  LOOP_ROLE_SIZE,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
} from "./type-scale";

/**
 * Reusable rule: text lives ENTIRELY inside a loop's negative space, as large
 * as the safe inscribed circle comfortably allows. The Living G never adapts to
 * the content — the content is composed for the circle.
 *
 * Sizes come from the shared type scale (type-scale.ts): a "message" here has
 * the same visual weight as an "action" word on any other Living G screen.
 */

/** Average glyph width of the bold display face, as a share of font size. */
const WIDTH: Record<"message" | "label", number> = {
  message: 0.58,
  label: 0.72,
};

type Block = { text: string; role: "message" | "label" };

function widthOf(text: string, size: number, role: "message" | "label") {
  return text.length * size * WIDTH[role];
}

/** Greedy wrap of one string into lines that fit `max` px at `size`. */
function wrap(text: string, size: number, max: number, role: "message" | "label") {
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

type Row = { text: string; size: number; role: "message" | "label"; y: number };

function fit(blocks: Block[], radius: number, ideal: number): Row[] {
  // The loop must never render empty: we keep the tightest composition seen as
  // a fallback if nothing fits the safe circle perfectly.
  let fallback: Row[] = [];
  for (let base = ideal; base >= LOOP_MIN_SIZE; base -= 0.5) {
    const max = radius * 1.78;
    const sizeOf = (role: "message" | "label") =>
      Math.max(
        LOOP_MIN_SIZE,
        base * (role === "label" ? LOOP_ROLE_SIZE.label : LOOP_ROLE_SIZE.message),
      );

    // ONE scale per composition: every message line in this loop shares the
    // single size that lets the widest phrase fit. Never one big line next to
    // one small line.
    let factor = 1;
    for (const block of blocks) {
      const full = sizeOf(block.role);
      const need = widthOf(block.text, full, block.role);
      if (need > max) factor = Math.min(factor, Math.max(0.6, max / need));
    }

    const rows: { text: string; size: number; role: "message" | "label" }[] = [];
    let wrapped = false;
    for (const block of blocks) {
      const size = Math.max(LOOP_MIN_SIZE, sizeOf(block.role) * factor);
      // A given line is already a deliberate phrase: keep it on ONE line
      // whenever the shared scale allows it.
      if (widthOf(block.text, size, block.role) <= max) {
        rows.push({ text: block.text, size, role: block.role });
        continue;
      }
      wrapped = true;
      for (const text of wrap(block.text, size, max, block.role)) {
        rows.push({ text, size, role: block.role });
      }
    }


    const gap = base * 0.1;
    const total =
      rows.reduce((sum, row) => sum + row.size * 1.02, 0) + gap * (rows.length - 1);

    let y = -total / 2;
    const placed: Row[] = [];
    // A supplied line is a deliberate phrase: a composition only counts as a
    // fit when no phrase had to break.
    let ok = total <= radius * 1.84 && !wrapped;
    for (const row of rows) {
      const centre = y + (row.size * 1.02) / 2;
      const allowed = halfChord(radius, Math.abs(centre) + row.size * 0.56) * 2;
      if (widthOf(row.text, row.size, row.role) > allowed) ok = false;
      placed.push({ ...row, y: centre });
      y += row.size * 1.02 + gap;
    }
    fallback = placed;
    if (ok) return placed;
  }
  return fallback;
}

/**
 * Render text safely inside a loop.
 * `region` selects the loop's safe radius; nothing here can move or resize the G.
 */
export function loopText({
  anchor,
  region,
  kicker,
  lines,
  lift = 0,
}: {
  anchor: Anchor;
  region: RegionKey;
  kicker?: string;
  lines: string[];
  /** Optional upward nudge so a fingertip never covers the words. */
  lift?: number;
}) {
  const radius = LOOP_SAFE_RADIUS[region];
  const blocks: Block[] = [
    ...(kicker ? [{ text: kicker, role: "label" as const }] : []),
    ...lines.map((text) => ({ text, role: "message" as const })),
  ];
  const rows = fit(blocks, radius, Math.round(radius * LOOP_IDEAL_RATIO));
  const dy = -Math.min(lift, Math.max(0, radius * 0.18));

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
