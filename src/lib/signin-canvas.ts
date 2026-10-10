export type SignInCanvas = { width: number; height: number };

/** Keyboard contraction is not a new artwork canvas; width change is a real resize. */
export function signInCanvasSize(previous: SignInCanvas, next: SignInCanvas): SignInCanvas {
  if (next.width <= 0 || next.height <= 0) return previous;
  if (Math.abs(next.width - previous.width) > 1 || previous.height <= 0) return next;
  return { width: next.width, height: Math.max(previous.height, next.height) };
}