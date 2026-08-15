import type { Anchor, RegionKey } from "./LivingG";
import { LOOP_SAFE_RADIUS } from "./g-path";

/**
 * The reusable profile typography system for the Living G loops.
 *
 * Content is composed FOR the circle: a stack of typed blocks
 * (PRIMARY / SECONDARY label / TERTIARY detail) is scaled up as large as the
 * loop's safe inscribed circle allows, with logical phrases kept intact
 * wherever they fit. The G never adapts to the content.
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
  primary: 0.62,
  secondary: 0.74, // tracked-out label
  tertiary: 0.62,
};

const SIZE_RATIO: Record<LoopRole, number> = {
  primary: 1,
  secondary: 0.44,
  tertiary: 0.62,
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
  for (let base = ideal; base >= 9; base -= 0.5) {
    const rows: { text: string; size: number; role: LoopRole; lead: boolean }[] = [];
    for (const block of blocks) {
      const role = block.role ?? "primary";
      const full = Math.max(8, base * SIZE_RATIO[role]);
      const max = radius * 1.66;
      // A logical phrase stays on ONE line, condensed a little if needed,
      // before we ever allow it to break.
      let size = full;
      let lines = [block.text];
      let single = false;
      for (const f of [1, 0.94, 0.88, 0.82, 0.76]) {
        const s = Math.max(8, full * f);
        if (widthOf(block.text, s, role) <= max) {
          size = s;
          single = true;
          break;
        }
      }
      if (!single) {
        size = full;
        lines = wrap(block.text, full, max, role);
      }
      lines.forEach((text, i) =>
        rows.push({ text, size, role, lead: i === 0 && !!block.lead }),
      );
    }

    const gap = base * 0.12;
    const lead = base * 0.4;
    const total = rows.reduce(
      (sum, row, i) => sum + row.size * 1.04 + (i === 0 ? 0 : row.lead ? lead : gap),
      0,
    );
    if (total > radius * 1.86) continue;

    let y = -total / 2;
    const placed: Row[] = [];
    let ok = true;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      if (i > 0) y += row.lead ? lead : gap;
      const centre = y + (row.size * 1.04) / 2;
      const allowed = halfChord(radius, Math.abs(centre) + row.size * 0.52) * 2;
      if (widthOf(row.text, row.size, row.role) > allowed) {
        ok = false;
        break;
      }
      placed.push({ text: row.text, size: row.size, role: row.role, y: centre });
      y += row.size * 1.04;
    }
    if (ok) return placed;
  }
  return [];
}

const STYLE: Record<LoopRole, { opacity: number; tracking: string }> = {
  primary: { opacity: 0.95, tracking: "-0.035em" },
  secondary: { opacity: 0.5, tracking: "0.18em" },
  tertiary: { opacity: 0.68, tracking: "0.02em" },
};

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
  const rows = compose(blocks, radius, Math.round(radius * 0.42));
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
          fill="var(--world-ink)"
          className="font-black uppercase"
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
