/**
 * ONE type scale for everything that lives inside a Living G loop.
 *
 * Sizes are expressed as ratios of the loop's safe inscribed radius, so the
 * same role reads with the same visual weight in every loop, on every screen.
 * Never hand-pick a font size on a page: pick a ROLE.
 *
 *   action  — primary loop action word ("give", "wish", "grant", "discover")
 *   message — primary loop message ("50 sparks are yours")
 *   label   — secondary label above an answer ("by day", "giving")
 *   detail  — supporting detail ("+1 more", "this tuesday")
 */
export type LoopTypeRole = "action" | "message" | "label" | "detail";

/** Ideal starting size for the primary roles, as a share of the safe radius. */
export const LOOP_IDEAL_RATIO = 0.56;

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
export const LOOP_MIN_SIZE = 11;
