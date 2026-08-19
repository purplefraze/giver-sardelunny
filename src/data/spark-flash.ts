/**
 * THE REWARD MOMENT — one short line, never a screen.
 *
 * Generosity that reaches a completed state says "+10 sparks ✨" and gets out
 * of the way. This is a tiny store so any part of the app can raise the moment
 * without prop-drilling, and so it can never stack into a queue of interruptions.
 */

let message: string | null = null;
let token = 0;
const listeners = new Set<() => void>();

export type SparkFlash = { message: string | null; token: number };

let snapshot: SparkFlash = { message: null, token: 0 };
const SERVER: SparkFlash = { message: null, token: 0 };

function emit() {
  snapshot = { message, token };
  for (const l of listeners) l();
}

export const sparkFlashStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): SparkFlash {
    return snapshot;
  },
  getServer(): SparkFlash {
    return SERVER;
  },
  show(next: string) {
    message = next;
    token += 1;
    emit();
  },
  clear() {
    if (message === null) return;
    message = null;
    emit();
  },
};
