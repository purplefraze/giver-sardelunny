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
import { startConnectionsSync } from "@/data/cloud/connections-sync";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";

let booted = false;
let lastPushed = "";
let restoredForUser: string | null = null;

/** MY OWN WORDS, ONE AUTHOR. The local profile stays the source; this mirrors. */
function mirrorMyProfile() {
  const s = sessionStore.get();
  if (!s.profile) return;
  const p = myProfileStore.get();

  /*
   * CLOUD FIRST ON A FRESH PHONE. A newly signed-in browser has no local image;
   * it must restore the person's already-hosted photo before the local-author
   * mirror runs. Without this guard, the first scheduled mirror wrote null over
   * the cloud photo and made a successful upload appear not to stick.
   */
  if (s.userId && restoredForUser !== s.userId) {
    restoredForUser = s.userId;
    const hasLocalIdentity = p.built && normaliseHandle(p.username) !== "you";
    if (!hasLocalIdentity) {
      myProfileStore.patch({
        username: s.profile.handle ? `@${s.profile.handle}` : p.username,
        photo: s.profile.photo_url ?? null,
        aboutMe: s.profile.about,
        byDay: s.profile.by_day,
        byNight: s.profile.by_night,
        weekend: s.profile.weekend,
        gender: s.profile.gender,
        birthday: s.profile.birthday ?? "",
        answers: (s.profile.answers ?? {}) as Record<string, string>,
        sparks: s.profile.sparks,
        sparkles: s.profile.sparkles,
        built: true,
      });
      return;
    }
  }
  /* THE @NAME IS CHOSEN ONCE, AT THE DOOR. The stand-in "@you" never overwrites it. */
  const local = normaliseHandle(p.username);
  const chosen = local && local !== "you" ? local : (s.profile.handle ?? s.profile.name);
  const fields = {
    handle: chosen,
    name: chosen,
    photo_url: p.photo ?? s.profile.photo_url ?? null,
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
  void sessionStore.saveProfile(fields).then(() => directoryStore.reload()).catch(() => {
    lastPushed = "";
  });
}

export function bootCloud() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  sessionStore.start();
  directoryStore.start();
  startItemsSync();
  startMessaging();
  startNotifications();
  startConnectionsSync();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(mirrorMyProfile, 900);
  };
  myProfileStore.subscribe(schedule);
  sessionStore.subscribe(schedule);
  schedule();
}
