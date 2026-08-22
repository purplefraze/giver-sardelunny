/**
 * THE ACCOUNT RULES — ONE PLACE, USED EVERYWHERE.
 *
 * Giver keeps its expressive profile (photo, about, by day, by night) entirely
 * optional, but an ACCOUNT has a small number of real requirements: a handle,
 * a date of birth and a password. These rules are declared once here so that no
 * screen ever invents its own version of "is this person allowed to publish".
 *
 * The password is never a profile value. It is salted and hashed before it is
 * stored, and the plain text never leaves the field it was typed into.
 */

import { MEMBERS } from "@/data/giver";

/* ------------------------------- HANDLES --------------------------------- */

/** @handle, normalised: lowercase, no spaces, no punctuation but . _ - */
export function normaliseHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 20);
}

/** How a handle is displayed anywhere in Giver. */
export const displayHandle = (raw: string) =>
  raw ? `@${normaliseHandle(raw)}` : "";

const RESERVED = new Set([
  "giver",
  "admin",
  "support",
  "help",
  "sparks",
  "sparkles",
  "community",
  "communig",
  "me",
  "you",
]);

/** Handles already in use by the people who are on Giver. */
const TAKEN = new Set(
  MEMBERS.map((m) => normaliseHandle(m.username)).filter(Boolean),
);

export type HandleCheck =
  | { state: "empty" }
  | { state: "short" }
  | { state: "taken" }
  | { state: "free" };

/**
 * AVAILABILITY IS ASKED, NOT ASSUMED. Asynchronous by design, so the same call
 * can later ask a server without a single screen changing.
 */
export async function checkHandle(raw: string): Promise<HandleCheck> {
  const handle = normaliseHandle(raw);
  if (!handle) return { state: "empty" };
  if (handle.length < 3) return { state: "short" };
  /* A tiny pause keeps the feedback honest: it is a check, not a guess. */
  await new Promise((r) => setTimeout(r, 220));
  if (RESERVED.has(handle) || TAKEN.has(handle)) return { state: "taken" };
  return { state: "free" };
}

export const HANDLE_MESSAGE: Record<HandleCheck["state"], string> = {
  empty: "",
  short: "a little longer, please",
  taken: "that one is taken — try another",
  free: "yours",
};

/* -------------------------------- AGE ------------------------------------ */

/**
 * WHOLE YEARS FROM A REAL DATE OF BIRTH. Nobody is ever asked their age.
 * The dob is a calendar day, so it is read at local midnight — never as a UTC
 * timestamp, which would move the day for half the planet.
 */
export function ageFrom(birthday: string | null | undefined): number | null {
  const dob = parseDateOnly(birthday);
  if (!dob) return null;
  const age = yearsBetween(dob, new Date());
  return age < 0 || age > 120 ? null : age;
}

export const ADULT_AGE = 18;

export const isAdult = (birthday: string | null | undefined) => {
  const age = ageFrom(birthday);
  return age !== null && age >= ADULT_AGE;
};

/** THE ONE STORED SHAPE OF A DOB: "YYYY-MM-DD", exactly the day chosen. */
export const normaliseBirthday = normaliseDateOnly;

/** BIRTHDAY, SHOWN BESIDE ITS OWN LABEL. Short, human, never a long string. */
export function birthdayLabel(birthday: string | null | undefined): string {
  return formatDateOnly(birthday);
}

/* ------------------------------ PASSWORDS -------------------------------- */

export const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "8 characters or more", test: (v) => v.length >= 8 },
  { label: "one uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "one lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "one special symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordStrongEnough = (v: string) =>
  PASSWORD_RULES.every((rule) => rule.test(v));

/**
 * A PASSWORD IS NEVER STORED. It is salted, hashed and forgotten — the stored
 * value can verify a later attempt and can never be read back.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await digestWith(plain, salt);
  return `${hex(salt)}:${digest}`;
}

export async function verifyPassword(plain: string, stored: string) {
  const [saltHex, digest] = stored.split(":");
  if (!saltHex || !digest) return false;
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? [],
  );
  return (await digestWith(plain, salt)) === digest;
}

async function digestWith(plain: string, salt: Uint8Array) {
  const bytes = new TextEncoder().encode(plain);
  const joined = new Uint8Array(salt.length + bytes.length);
  joined.set(salt, 0);
  joined.set(bytes, salt.length);
  const buffer = await crypto.subtle.digest("SHA-256", joined);
  return hex(new Uint8Array(buffer));
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/* ----------------------------- ELIGIBILITY ------------------------------- */

export type AccountFacts = {
  username: string;
  birthday: string;
  passwordSet: boolean;
};

export type Eligibility =
  | { ok: true }
  | { ok: false; reason: "handle" | "birthday" | "underage" | "password"; say: string };

/**
 * THE ONE GATE. A give only ever becomes real when the account behind it is
 * complete and the person is 18 or older. Nothing here ever touches a draft:
 * the answer is only ever "not yet", never "gone".
 */
export function publishEligibility(facts: AccountFacts): Eligibility {
  if (!normaliseHandle(facts.username) || normaliseHandle(facts.username) === "you")
    return {
      ok: false,
      reason: "handle",
      say: "choose your username in my g first — your give is safe here.",
    };
  if (!facts.birthday)
    return {
      ok: false,
      reason: "birthday",
      say: "add your birthday in my g to publish this — everything you’ve typed is saved.",
    };
  if (!isAdult(facts.birthday))
    return {
      ok: false,
      reason: "underage",
      say: `giver needs you to be ${ADULT_AGE} or older to publish a give. your give stays here, unpublished.`,
    };
  if (!facts.passwordSet)
    return {
      ok: false,
      reason: "password",
      say: "set a password in my g to publish this — your give is saved.",
    };
  return { ok: true };
}
