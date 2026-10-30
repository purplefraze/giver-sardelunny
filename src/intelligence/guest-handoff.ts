import { conversation } from "@/intelligence/voice-conversation";
import { leaveGuest } from "@/data/cloud/session";

/**
 * GUEST -> SIGN-IN HANDOFF. A guest who tries to share keeps their draft:
 * it is written to localStorage (so an email link opened in another tab still
 * finds it), the guest is left, the existing email/code sign-in shows, and
 * once a real session is ready the same draft reopens at review.
 * A photo (a File) cannot be stored and must be added again.
 */
export const GUEST_DRAFT_KEY = "giver.guest-draft.v1";
const REQUEST_KEY = "giver.sign-in-requested.v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
let store: Store | undefined;
const ls = (): Store | null => {
  if (store) return store;
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
};
/** Tests only. */
export function setHandoffStorage(s: Store | undefined) { store = s; }

/** The guest asked to sign in (from the landing or a blocked share). */
export function signInRequested(): boolean {
  try { return ls()?.getItem(REQUEST_KEY) === "1"; } catch { return false; }
}
export function clearSignInRequest() {
  try { ls()?.removeItem(REQUEST_KEY); } catch { /* storage unavailable */ }
}

/** Blocked share -> keep the draft, leave the guest, show the sign-in. */
export function signInToShare() {
  const d = conversation.exportDraft();
  try {
    if (d) ls()?.setItem(GUEST_DRAFT_KEY, JSON.stringify(d));
    ls()?.setItem(REQUEST_KEY, "1");
  } catch { /* storage unavailable: the in-memory draft still survives a code sign-in */ }
  conversation.closeForm();
  leaveGuest();
}

/** After a real sign-in: the saved guest draft, once (then it is removed). */
export function takeGuestDraft(): ReturnType<typeof conversation.exportDraft> {
  try {
    const raw = ls()?.getItem(GUEST_DRAFT_KEY);
    ls()?.removeItem(GUEST_DRAFT_KEY);
    clearSignInRequest();
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d.seat === "string" && d.session ? d : null;
  } catch { return null; }
}
