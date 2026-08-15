import { LOOP_SAFE_RADIUS } from "./g-path";

/**
 * ONE universal typography scale for everything that lives inside a Living G
 * loop. A role has ONE fixed size per loop — it is NEVER recalculated from the
 * copy. Long copy wraps; it never shrinks. Never hand-pick a font size on a
 * page: pick a ROLE.
 *
 *   action  — primary loop action word ("give", "wish", "grant", "borrow")
 *   message — primary loop message ("50 sparks are yours")
 *   label   — secondary label above an answer ("by day", "giving")
 *   detail  — supporting detail ("+1 more", "this tuesday")
 */
export type LoopTypeRole = "action" | "message" | "label" | "detail";

export type LoopRegion = "top" | "middle" | "bottom";

/**
 * Fixed primary size per loop, as a share of that loop's safe radius. The
 * middle and bottom loops share ONE ratio, so a primary message reads with the
 * same relationship to its loop everywhere. The small top loop only ever holds
 * one or two short words, so it carries its own larger ratio.
 */
export const LOOP_PRIMARY_RATIO: Record<LoopRegion, number> = {
  top: 0.55,
  middle: 0.5,
  bottom: 0.72,
};

/**
 * The ONLY sizing freedom in the system: a phrase that cannot fit its loop at
 * the fixed token steps DOWN through these discrete stops (never per line,
 * never continuously, never up). Hero words keep step 1 and own the loop.
 */
export const LOOP_SIZE_STEPS = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.54, 0.48, 0.42] as const;


/** Kept for reference: the old "ideal" starting point of the removed fitter. */
export const LOOP_IDEAL_RATIO = 0.66;

/**
 * ONE scale for primary loop ACTION words, per loop, so "give" and "borrow"
 * always carry the same weight wherever they appear.
 */
export const LOOP_ACTION_RATIO = 0.54;

/**
 * PROFILE SAFE AREA — profile copy is variable and user-entered, so it lives
 * inside an explicit INSET of the loop's safe circle. Generous padding from the
 * coloured stroke; no profile line may ever cross it or the S-curve.
 */
export const PROFILE_SAFE_INSET: Record<LoopRegion, number> = {
  top: 0.8,
  middle: 0.86,
  bottom: 0.86,
};

/** How wide a profile line may run inside its safe area, as a share of radius. */
export const PROFILE_WRAP_FACTOR = 1.3;

/**
 * THE fixed profile type scale, in px. EVERY profile uses these exact tokens —
 * never a per-person size. Deliberate line breaks in the copy do the fitting.
 *
 *   answer  — the primary answer ("chemistry teacher", "science")
 *   label   — the smaller label above it ("by day", "currently offering")
 *   detail  — the medium supporting line ("+1 more", "this tuesday")
 */
export const PROFILE_TYPE: Record<
  LoopRegion,
  { answer: number; label: number; detail: number }
> = {
  top: { answer: 20, label: 11, detail: 15 },
  middle: { answer: 26, label: 13, detail: 19 },
  bottom: { answer: 40, label: 17, detail: 27 },
};

/**
 * The ONLY freedom left: if a profile still overflows its safe area, the WHOLE
 * stack steps down through these few stops together — never per line, never up.
 */
export const PROFILE_STEPS = [1, 0.94, 0.88, 0.82] as const;

/** Kept for compatibility with earlier profile layout code. */
export const LOOP_PROFILE_FLEX = { min: 0.82, max: 1 } as const;

/** Size of each role relative to the composed primary size. */
export const LOOP_ROLE_SIZE: Record<LoopTypeRole, number> = {
  action: 1,
  message: 1,
  label: 0.34,
  detail: 0.52,
};

/** Tracking + presence per role. Lowercase everywhere — no caps for emphasis. */
export const LOOP_ROLE_STYLE: Record<
  LoopTypeRole,
  { tracking: string; opacity: number }
> = {
  action: { tracking: "-0.045em", opacity: 1 },
  message: { tracking: "-0.045em", opacity: 1 },
  label: { tracking: "0.14em", opacity: 0.55 },
  detail: { tracking: "-0.01em", opacity: 0.72 },
};

/** The one in-loop text colour: the loop colour's complement, from tokens. */
export const LOOP_TEXT_FILL = "var(--world-text)";

/** Minimum readable size before we wrap instead of shrinking further. */
export const LOOP_MIN_SIZE = 13;

/**
 * THE fixed type token: one size per loop, per role. Computed once, at module
 * load, from locked constants — never from the copy being rendered.
 */
export const LOOP_FIXED_SIZE: Record<LoopRegion, Record<LoopTypeRole, number>> = {
  top: sizes("top"),
  middle: sizes("middle"),
  bottom: sizes("bottom"),
};

function sizes(region: LoopRegion): Record<LoopTypeRole, number> {
  const primary = Math.round(LOOP_SAFE_RADIUS[region] * LOOP_PRIMARY_RATIO[region]);
  const of = (role: LoopTypeRole) =>
    Math.max(LOOP_MIN_SIZE, Math.round(primary * LOOP_ROLE_SIZE[role]));
  return {
    action: of("action"),
    message: of("message"),
    label: of("label"),
    detail: of("detail"),
  };
}
