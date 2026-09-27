/**
 * THE OPENING IS OWED — a one-shot flag, so the post-sign-in opening
 * (LaunchScreen) plays on paths that land on the wheel WITHOUT passing through
 * Onboarding.tsx:
 *   - the /auth route's magic-link success (it marks onboarding complete and
 *     navigates to "/")
 *   - a magic link sent from /auth and opened in a new tab while this device
 *     already counts as onboarded
 *   - the dev "skip / complete" path, which skips the magic link entirely
 * "auth" is taken only once a session is READY (the opening is post-auth), so
 * a link that was sent but never clicked cannot play it while signed out.
 * "skip" (dev path — no magic link by design) plays once the session answers,
 * signed in or not. Onboarding.tsx plays the opening inline and clears it.
 */
export type OpeningOwed = "auth" | "skip";
const KEY = "giver.opening.pending.v1";

export function requestOpening(kind: OpeningOwed = "auth") {
  try {
    window.localStorage.setItem(KEY, kind);
  } catch {
    /* private mode: the opening simply doesn't replay */
  }
}

export function openingPending(): OpeningOwed | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "auth" || v === "skip" ? v : null;
  } catch {
    return null;
  }
}

export function clearOpening() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}
