/**
 * DEVICE NOTICES — ASKED FOR ONCE, AT A MOMENT THAT EARNS IT.
 *
 * Giver never opens with a permission box. The question is only ever asked
 * straight after a person has done something real (published to communi-g, or
 * agreed something happened), so the ask has an obvious reason. If the answer
 * is no, or the device has no notifications at all, everything else carries on
 * exactly as before — nothing here may ever break an interaction.
 */

const ASKED = "giver.notify.asked.v1";

const supported = () => typeof window !== "undefined" && "Notification" in window;

/** Has this person already been asked, or already answered? */
export function notifyDecided(): boolean {
  if (!supported()) return true;
  if (Notification.permission !== "default") return true;
  try {
    return window.localStorage.getItem(ASKED) === "yes";
  } catch {
    return false;
  }
}

/**
 * ASK, ONCE, FROM A GESTURE. Must be called inside the handler of a real touch
 * so the browser accepts it. Resolves to whether notices are allowed.
 */
export async function askToNotify(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    window.localStorage.setItem(ASKED, "yes");
  } catch {
    /* asking is still worth it */
  }
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** A SHORT NOTICE. Silent no-op wherever notices are not allowed. */
export function notify(body: string, title = "giver") {
  if (!supported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* never let a notice break the app */
  }
}
