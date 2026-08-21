import { gType } from "./g-type";
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
import { BOTTOM_LOOP_INTERIOR } from "./g-path";
import { widthOf } from "./loop-layout";

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
  bottom: 2.2,
};

type ProfileRow = {
  text: string;
  size: number;
  role: LoopTypeRole;
  gap: number;
  fill?: string;
};

/** Width of the real lower-loop opening at a row's painted vertical extent. */
function bottomWidth(y: number, size: number) {
  const { ry, rx, inset } = BOTTOM_LOOP_INTERIOR;
  const safeRx = rx - inset;
  const safeRy = ry - inset;
  const edge = Math.abs(y) + size * 0.36;
  if (edge >= safeRy) return 0;
  return 2 * safeRx * Math.sqrt(1 - (edge * edge) / (safeRy * safeRy));
}

/**
 * Shape-aware lower-loop fitter. Wrapping happens first; rows are then placed
 * against the ellipse chord at their own height. Only the role that overflows
 * steps down, so a tracked label cannot make the primary answer tiny.
 */
function layoutBottom(
  build: (scales: Record<LoopRole, number>) => ProfileRow[],
  cap: Record<LoopRole, number> = { primary: 1, secondary: 1, tertiary: 1 },
) {
  const scales: Record<LoopRole, number> = { ...cap };
  let rows: ProfileRow[] = [];
  let placed: ReturnType<typeof layoutStack>["rows"] = [];

  for (let attempt = 0; attempt < PROFILE_STEPS.length * 3; attempt += 1) {
    rows = build(scales);
    const total = rows.reduce(
      (sum, row, i) => sum + row.size * 0.9 + (i ? row.gap : 0),
      0,
    );
    let cursor = -total / 2;
    placed = rows.map((row, i) => {
      if (i) cursor += row.gap;
      const y = cursor + row.size * 0.45;
      cursor += row.size * 0.9;
      return { text: row.text, size: row.size, role: row.role, y, ...(row.fill ? { fill: row.fill } : {}) };
    });

    const verticalFits = total <= (BOTTOM_LOOP_INTERIOR.ry - BOTTOM_LOOP_INTERIOR.inset) * 2;
    const overflow = placed.findIndex(
      (row) => widthOf(row.text, row.size, row.role) > bottomWidth(row.y, row.size),
    );
    if (verticalFits && overflow === -1) break;

    const failingRole: LoopRole = !verticalFits
      ? "primary"
      : rows[overflow]?.role === "label"
        ? "secondary"
        : rows[overflow]?.role === "detail"
          ? "tertiary"
          : "primary";
    const current = scales[failingRole];
    const next = PROFILE_STEPS.find((step) => step < current - 0.001);
    if (next === undefined) break;
    scales[failingRole] = next;
  }

  return { rows: placed, scales };
}

/**
 * VERTICAL BREATHING ROOM. The bottom loop carries three label+answer pairs, so
 * the whole group is held to a smaller share of the loop's height, well clear of
 * the S-curve above and the stroke below.
 */
const LOOP_HEIGHT = (region: RegionKey) => (region === "bottom" ? 1.92 : 1.8);

/** The row builder for one loop's stack — shared by every profile, everywhere. */
function makeBuild(region: RegionKey, blocks: LoopBlock[]) {
  const token = PROFILE_TYPE[region];
  const inset = PROFILE_SAFE_INSET[region];
  const fill = PROFILE_FILL[region];

  return (stepOrScales: number | Record<LoopRole, number>) => {
    const max = wrapWidth(region, WRAP_FACTOR[region], inset) * fill;
    const scaleFor = (role: LoopRole) =>
      typeof stepOrScales === "number" ? stepOrScales : stepOrScales[role];
    const primaryScale = scaleFor("primary");
    /* BREATHING ROOM IS PART OF THE TYPOGRAPHY. A label sits close to the
       answer it introduces; each label+answer PAIR is separated by real air. */
    const gap = token.answer * primaryScale * (region === "bottom" ? 0.1 : 0.16);
    const lead = token.answer * primaryScale * (region === "bottom" ? 0.34 : 0.42);
    return blocks.flatMap((block, i) => {
      const key = block.role ?? "primary";
      const step = scaleFor(key);
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
}

/**
 * GIULIA IS THE MASTER REFERENCE. Her lower-loop stack decides the LARGEST size
 * any personal-profile stack may use: a shorter answer is never allowed to grow
 * into the spare room. Longer copy may still step DOWN from here, never up — so
 * every profile reads as one locked design system holding different words.
 */
const REFERENCE_BOTTOM: LoopBlock[] = [
  { text: "by day", role: "secondary" },
  { text: "chemistry teacher", role: "primary" },
  { text: "by night", role: "secondary", lead: true },
  { text: "choir soprano", role: "primary" },
  { text: "weekends", role: "secondary", lead: true },
  { text: "long bike rides", role: "primary" },
];

let referenceCap: Record<LoopRole, number> | null = null;

function bottomCap() {
  if (!referenceCap) {
    referenceCap = layoutBottom(makeBuild("bottom", REFERENCE_BOTTOM)).scales;
  }
  return referenceCap;
}

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
  const inset = PROFILE_SAFE_INSET[region];
  const origin = loopOrigin(region, lift);
  const fill = PROFILE_FILL[region];
  const height = LOOP_HEIGHT(region);
  const build = makeBuild(region, blocks);

  // ONE scale for the whole stack, stepped down only inside the allowed flex.
  // The stack is measured against the loop's TRUE negative space (fill), so a
  // long phrase uses the wide middle of the circle instead of shrinking
  // everything around it.
  let placed = layoutStack(build(1), region, inset, fill, height);
  let bottomScales: Record<LoopRole, number> | null = null;
  if (region === "bottom") {
    const result = layoutBottom(build, bottomCap());
    placed = { rows: result.rows, fits: true };
    bottomScales = result.scales;
  } else {
    for (const step of PROFILE_STEPS) {
      placed = layoutStack(build(step), region, inset, fill, height);
      if (placed.fits) break;
    }
  }




  return (
    <g
      data-profile-loop={region}
      {...(region === "bottom"
        ? {
            "data-interior": `${BOTTOM_LOOP_INTERIOR.rx * 2}x${BOTTOM_LOOP_INTERIOR.ry * 2}`,
            "data-safe-inset": BOTTOM_LOOP_INTERIOR.inset,
            "data-usable": `${(BOTTOM_LOOP_INTERIOR.rx - BOTTOM_LOOP_INTERIOR.inset) * 2}x${(BOTTOM_LOOP_INTERIOR.ry - BOTTOM_LOOP_INTERIOR.inset) * 2}`,
            "data-scales": JSON.stringify(bottomScales),
          }
        : {})}
    >
      {placed.rows.map((row, i) => (
        <text
          /* Position-keyed: one row per slot, never a reused stale node. */
          key={`${region}-row-${i}`}
          x={origin.x}
          y={origin.y + row.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={row.fill ?? LOOP_TEXT_FILL}
          className="lowercase"
          style={{
            ...gType(
              row.role === "label" ? "label" : "statement",
              row.size,
              LOOP_ROLE_STYLE[row.role].opacity,
            ),
          }}
        >

          {row.text}
        </text>
      ))}
    </g>
  );
}
