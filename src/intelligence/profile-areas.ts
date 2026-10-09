/**
 * MY G PROFILE LOOP — the eight areas, clockwise from 12:00, and the one
 * voice reader that sends words to the same area touch reaches. Pure.
 */
export const PROFILE_AREAS = [
  { id: "bio", word: "bio", at: 0, ask: "What would you like people to know about you?" },
  { id: "photo", word: "photo", at: 45, ask: "Would you like to add or change your profile photo?" },
  { id: "reputation", word: "reputation", at: 90, ask: "Would you like to see your community reputation?" },
  { id: "chats", word: "chats", at: 135, ask: "Who would you like to message?" },
  { id: "myg", word: "my g", at: 180, ask: "" },
  { id: "sparks", word: "sparks", at: 225, ask: "Would you like to check your Sparks or see their history?" },
  { id: "activity", word: "activity", at: 270, ask: "Would you like to see your current or past activity?" },
  { id: "settings", word: "settings", at: 315, ask: "What would you like to change?" },
] as const;

export type ProfileAreaId = (typeof PROFILE_AREAS)[number]["id"];

export const areaById = (id: ProfileAreaId) => PROFILE_AREAS.find((a) => a.id === id)!;

const RULES: [RegExp, ProfileAreaId][] = [
  [/\b(?:profile )?(?:photo|picture|pic|avatar)\b/, "photo"],
  [/\b(?:bio|about me|my profile|update my profile|edit my profile|username)\b/, "bio"],
  [/\b(?:reputation|thanks|compliments?|my wall|notes about me)\b/, "reputation"],
  [/\b(?:chats?|messages?|conversations?|inbox)\b/, "chats"],
  [/\b(?:sparks?|sparkles?|balance|ledger)\b/, "sparks"],
  [/\b(?:my|past|current|old) (?:gives?|wishes|wish|trades?|borrows?|lends?|funds?|activity|activities|posts?)\b|\bactivity\b/, "activity"],
  [/\b(?:settings?|privacy|password|account|security|sign out|log out)\b/, "settings"],
];

/** Only clear navigation phrasing ("show", "open", "change", "check"…) or "my …". */
const NAV = /\b(?:show|open|see|check|change|update|edit|go to|take me to|view|my)\b/;

export function profileAreaOf(raw: string): ProfileAreaId | null {
  const t = raw.toLowerCase().replace(/[’]/g, "'");
  if (!NAV.test(t)) return null;
  for (const [re, id] of RULES) if (re.test(t)) return id;
  return null;
}

/** "my past gives" → which list Activity opens on. */
export const activityTenseOf = (raw: string): "current" | "past" =>
  /\b(?:past|old|previous|completed|finished)\b/i.test(raw) ? "past" : "current";
