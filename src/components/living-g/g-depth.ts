import { G_ANCHORS, LIVING_G_FRAME } from "./g-path";

/**
 * THE SPATIAL CAMERA — the one place that knows what "deeper" means.
 *
 * Giver has no pages. There is ONE Living G, and every destination is a deeper
 * state of it. This module owns the camera vocabulary shared by every depth:
 * which part of the G we moved toward, how far the artwork unfurls, how the
 * level behind is pushed back, and how long the movement takes. Going back is
 * the exact same numbers, run in reverse.
 */

/** Which part of the G the camera travels toward. */
export type GAnchorKey = "top" | "middle" | "bottom";

/** One destination in the depth hierarchy. */
export type GDepthSlot = {
  /** Stable identity of the destination (never the content's own key). */
  id: string;
  open: boolean;
  /** The region of the G the camera moves into. */
  anchor?: GAnchorKey;
  /** Whose G this is — colour always comes from the world token. */
  world?: string;
  children: React.ReactNode;
};

export const CAMERA = {
  /**
   * How far the artwork unfurls per depth. Chosen so the anchored loop's rim
   * leaves the left and right edges while its arcs stay visible top and bottom:
   * the G becomes the border of the screen instead of vanishing off it.
   */
  unfurl: 2.62,
  /** How much a level is pushed further away for each level opened above it. */
  push: 0.16,
  /** How much of the world's own paper veils a level that is no longer active. */
  veil: 0.26,
  openMs: 760,
  closeMs: 520,
  /** Breathing, not sliding: an organic ease with a whisper of overshoot. */
  openEase: "cubic-bezier(0.16, 1.02, 0.24, 1)",
  closeEase: "cubic-bezier(0.5, 0, 0.72, 0.32)",
} as const;

const RING = {
  top: G_ANCHORS.smallRing,
  middle: G_ANCHORS.upperRing,
  bottom: G_ANCHORS.lowerRing,
} as const;

/**
 * The pressed loop stays exactly where it is; the G grows around it — so the
 * transform origin is that loop's own centre, in percentages of the frame.
 */
export function anchorOrigin(anchor: GAnchorKey = "middle") {
  const ring = RING[anchor];
  return {
    x: ((ring.x - LIVING_G_FRAME.x) / LIVING_G_FRAME.width) * 100,
    y: ((ring.y - LIVING_G_FRAME.y) / LIVING_G_FRAME.height) * 100,
  };
}

/**
 * The G's own arcs frame the content, a little more tightly at every depth, so
 * depth is felt as well as seen. Safe-area insets make sure a notch or a
 * gesture bar can never sit on top of what is inside.
 */
export function levelInset(depth: number) {
  const step = Math.min(Math.max(depth - 1, 0), 3);
  const y = (3.2 + step * 0.7).toFixed(2);
  const x = (5.4 + step * 0.9).toFixed(2);
  return {
    top: `max(${y}%, env(safe-area-inset-top))`,
    bottom: `max(${y}%, env(safe-area-inset-bottom))`,
    left: `max(${x}%, env(safe-area-inset-left))`,
    right: `max(${x}%, env(safe-area-inset-right))`,
  };
}

/**
 * PINCH OUT = ZOOM OUT ONE DEPTH. Deliberate on purpose: a small pinch simply
 * lets go and settles back where it was.
 */
export const PINCH = {
  /** Fingers must spread this much before a depth is left behind. */
  ratio: 1.32,
  /** How far the level retreats while the fingers are still travelling. */
  retreat: 0.12,
} as const;

/** True while the person is typing or working a real control — never hijack. */
export function isEditingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
}
