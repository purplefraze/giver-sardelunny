import type { Anchor, RegionKey } from "./LivingG";
import { LOOP_SAFE_RADIUS } from "./g-path";

/**
 * Reusable rule: text lives ENTIRELY inside a loop's negative space.
 * The Living G never adapts to the content — the content is wrapped and, if
 * still too wide or tall, scaled down until it fits inside the loop's safe
 * inscribed circle with breathing room.
 */

/** Average glyph width for the bold display face, as a share of font size. */
const CAP_WIDTH = 0.6;
const WIDE_WIDTH = 0.66;

type Block = { text: string; weight?: "kicker" | "body" };

function widthOf(text: string, size: number, upper: boolean) {
  return text.length * size * (upper ? WIDE_WIDTH : CAP_WIDTH);
}

/** Greedy wrap of one string into lines that fit `max` px at `size`. */
function wrap(text: string, size: number, max: number, upper: boolean) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, size, upper) <= max || !line) line = next;
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

type Fitted = { size: number; rows: { text: string; size: number; y: number }[] };

/**
 * Fits a stack of blocks inside the loop. Tries the ideal size first and steps
 * down until every wrapped row sits inside the safe circle vertically AND
 * horizontally at its own height.
 */
function fit(blocks: Block[], radius: number, ideal: number): Fitted {
  for (let size = ideal; size >= 10; size -= 1) {
    const kickerSize = Math.max(9, Math.round(size * 0.62));
    const rows: { text: string; size: number }[] = [];
    let ok = true;

    for (const block of blocks) {
      const isKicker = block.weight === "kicker";
      const s = isKicker ? kickerSize : size;
      // Wrap against the widest usable width, then verify per-row below.
      const lines = wrap(block.text, s, radius * 1.72, true);
      for (const text of lines) rows.push({ text, size: s });
    }

    const gap = size * 0.26;
    const total =
      rows.reduce((sum, row) => sum + row.size * 1.06, 0) + gap * (rows.length - 1);
    if (total > radius * 1.85) continue;

    let y = -total / 2;
    const placed: { text: string; size: number; y: number }[] = [];
    for (const row of rows) {
      const centre = y + (row.size * 1.06) / 2;
      const allowed = halfChord(radius, Math.abs(centre) + row.size * 0.5) * 2;
      if (widthOf(row.text, row.size, true) > allowed) {
        ok = false;
        break;
      }
      placed.push({ text: row.text, size: row.size, y: centre });
      y += row.size * 1.06 + gap;
    }

    if (ok) return { size, rows: placed };
  }
  return { size: 10, rows: [] };
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
    ...(kicker ? [{ text: kicker, weight: "kicker" as const }] : []),
    ...lines.map((text) => ({ text })),
  ];
  const ideal = Math.round(radius * 0.24) + 8;
  const fitted = fit(blocks, radius, ideal);
  const maxLift = Math.max(0, radius * 0.18);
  const dy = -Math.min(lift, maxLift);

  return (
    <>
      {fitted.rows.map((row, i) => (
        <text
          key={`${row.text}-${i}`}
          x={anchor.x}
          y={anchor.y + row.y + dy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--world-ink)"
          className="font-black uppercase"
          style={{
            fontSize: row.size,
            letterSpacing: row.size < fitted.size ? "0.14em" : "-0.03em",
            opacity: row.size < fitted.size ? 0.55 : 0.9,
          }}
        >
          {row.text}
        </text>
      ))}
    </>
  );
}
