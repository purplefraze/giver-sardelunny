/**
 * THE GIVE FLOW'S FIRST RUN — one PERSISTED flag, like intro-seen.ts.
 *
 * The very first time someone opens "give something" it offers help:
 * "stuck on what you can give? tap for suggestions". Seeing it is the flag:
 * it is written the moment the flow opens (the prompt stays for that visit),
 * so reopening the app or the flow never shows it again.
 */
const KEY = "giver.give-firstrun.v1";

export const giveFirstRunStore = {
  /** True once the first-run help has been shown. */
  seen(): boolean {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return true;
    }
  },
  markSeen() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* a flag is not worth failing over */
    }
  },
};
