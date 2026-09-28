/**
 * THE FIRST-GIVE EMAIL CHECK IS GONE.
 *
 * It sent a signed-in person a fresh sign-in email (signInWithOtp) before
 * their first give went live, and saved that give with published:false until
 * they answered it. A signed-in person's gives now post straight away.
 *
 * Gives already held back on this device by the old check are released once
 * here (published:true), so nothing stays invisible waiting for an email.
 */
import { ME_ID, itemsStore } from "./items";

const OLD_KEY = "giver.first-give-verified.v1";
const RELEASED_KEY = "giver.first-give-released.v1";

export function releaseHeldGives() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(RELEASED_KEY)) return;
    for (const i of itemsStore.get().items) {
      if (i.ownerId === ME_ID && i.type === "give" && i.status === "active" && !i.published) {
        itemsStore.patch(i.id, { published: true });
      }
    }
    window.localStorage.setItem(RELEASED_KEY, String(Date.now()));
    window.localStorage.removeItem(OLD_KEY);
  } catch {
    /* quiet */
  }
}
