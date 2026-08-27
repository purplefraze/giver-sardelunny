/**
 * ONE PLACE THAT TURNS THE SHARED DEV BACKEND ON.
 *
 * Called once from the root route. Everything it starts is additive: with no
 * session, Giver behaves exactly as the local prototype always has.
 */

import { sessionStore } from "@/data/cloud/session";
import { directoryStore } from "@/data/cloud/directory";
import { startItemsSync } from "@/data/cloud/items-sync";
import { startMessaging } from "@/data/cloud/messaging";
import { startNotifications } from "@/data/cloud/notifications";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";

let booted = false;
let lastPushed = "";

/** MY OWN WORDS, ONE AUTHOR. The local profile stays the source; this mirrors. */
function mirrorMyProfile() {
  const s = sessionStore.get();
  if (!s.profile) return;
  const p = myProfileStore.get();
  const fields = {
    handle: normaliseHandle(p.username) || s.profile.handle,
    name: normaliseHandle(p.username) || s.profile.name,
    photo_url: p.photo ?? null,
    about: p.aboutMe ?? "",
    by_day: p.byDay ?? "",
    by_night: p.byNight ?? "",
    weekend: p.weekend ?? "",
    gender: p.gender ?? "",
    birthday: p.birthday ? p.birthday : null,
    answers: p.answers ?? {},
  };
  const signature = JSON.stringify(fields);
  if (signature === lastPushed) return;
  lastPushed = signature;
  void sessionStore.saveProfile(fields).then(() => directoryStore.reload());
}

export function bootCloud() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  sessionStore.start();
  directoryStore.start();
  startItemsSync();
  startMessaging();
  startNotifications();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(mirrorMyProfile, 900);
  };
  myProfileStore.subscribe(schedule);
  sessionStore.subscribe(schedule);
  schedule();
}
