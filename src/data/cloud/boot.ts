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
import { startWallSync } from "@/data/cloud/wall-sync";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import type { Json } from "@/integrations/supabase/types";

let booted = false;
let lastPushed = "";
let restoredForUser: string | null = null;
let currencyRestoredForUser: string | null = null;

function asStringRecord(value: Json | null | undefined): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function asReserved(value: Json | null | undefined): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function asRewarded(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * CURRENCY COMES FROM THE SERVER ON SIGN-IN. A cleared phone must not re-seed
 * over a real balance, and a second browser must see the same sparks.
 */
function restoreCurrencyFromCloud() {
  const s = sessionStore.get();
  if (!s.userId || !s.profile) return;
  if (currencyRestoredForUser === s.userId) return;
  currencyRestoredForUser = s.userId;
  myProfileStore.patch({
    sparks: s.profile.sparks,
    sparkles: s.profile.sparkles,
    reserved: asReserved(s.profile.reserved),
    sparksSeeded: Boolean(s.profile.sparks_seeded) || s.profile.sparks > 0,
    rewarded: asRewarded(s.profile.rewarded),
  });
}

/** MY OWN WORDS, ONE AUTHOR. The local profile stays the source; this mirrors. */
function mirrorMyProfile() {
  const s = sessionStore.get();
  if (!s.profile) {
    /* Signed out: allow a later sign-in to restore currency again. */
    if (!s.userId) {
      restoredForUser = null;
      currencyRestoredForUser = null;
    }
    return;
  }
  const p = myProfileStore.get();

  /* SPARKS FIRST — before any identity mirror can race a seed write. */
  restoreCurrencyFromCloud();

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
        answers: asStringRecord(s.profile.answers),
        built: true,
      });
      /* Currency already restored above; wait for the next tick to push. */
      return;
    }
  }

  /* Re-read after any restore patches. */
  const latest = myProfileStore.get();
  /* THE @NAME IS CHOSEN ONCE, AT THE DOOR. The stand-in "@you" never overwrites it. */
  const local = normaliseHandle(latest.username);
  const chosen = local && local !== "you" ? local : (s.profile.handle ?? s.profile.name);
  const identity = {
    handle: chosen,
    name: chosen,
    photo_url: latest.photo ?? s.profile.photo_url ?? null,
    about: latest.aboutMe ?? "",
    by_day: latest.byDay ?? "",
    by_night: latest.byNight ?? "",
    weekend: latest.weekend ?? "",
    gender: latest.gender ?? "",
    birthday: latest.birthday ? latest.birthday : null,
    answers: latest.answers ?? {},
  };
  /* CURRENCY — write on earn / spend / seed so the next login matches. */
  const currency = {
    sparks: latest.sparks,
    sparkles: latest.sparkles,
    reserved: latest.reserved,
    sparks_seeded: latest.sparksSeeded,
    rewarded: latest.rewarded,
  };
  const fields = { ...identity, ...currency };
  const signature = JSON.stringify(fields);
  if (signature === lastPushed) return;
  lastPushed = signature;
  void sessionStore
    .saveProfile(fields)
    .then(() => directoryStore.reload())
    .catch(async () => {
      /*
        Migration not applied yet: still persist sparks/sparkles (already on
        profiles) so balances survive logins without the companion columns.
      */
      try {
        await sessionStore.saveProfile({
          ...identity,
          sparks: latest.sparks,
          sparkles: latest.sparkles,
        });
        await directoryStore.reload();
      } catch {
        lastPushed = "";
      }
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
  startWallSync();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(mirrorMyProfile, 900);
  };
  myProfileStore.subscribe(schedule);
  sessionStore.subscribe(schedule);
  schedule();
}
