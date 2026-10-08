import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { bindUtterance, resolveChoice } from "@/intelligence/bind";
import { EMPTY_FIELDS, fieldsFromDraft, mergeFollowUp, missingAsks, type VoiceFields } from "@/intelligence/voice-flow";
import { routeVoice } from "@/intelligence/voice-router";

/**
 * THE CONVERSATION INSIDE THE G — pure rules (no DOM, no network, no write).
 * Each recognised segment advances the draft. The middle loop shows ONE short
 * question; details already said are never asked again; nothing is invented.
 * Only choosing review leaves the talk; only Share makes anything live.
 */
export type VoiceStage = "talk" | "anything" | "ready" | "review" | "live";

export type VoiceSession = {
  stage: VoiceStage;
  action: GiverAction | null;
  fields: VoiceFields;
  /** The one question currently in the middle loop. */
  prompt: string;
  /** Which field the question is waiting on (so "here" → location). */
  asking: keyof VoiceFields | "intent" | null;
  choices: readonly string[];
  pending: ActionDraft | null;
  /** Last words heard (shown in the bottom loop between segments). */
  heard: string;
  wantsPhoto: boolean;
  /** The person asked to use their current location for "where". */
  wantsLocation: boolean;
  /** "show me ladders" — a search, not a draft. */
  search: string | null;
};

export const NOUN: Record<GiverAction, string> = {
  give: "Give",
  wish: "Wish",
  trade: "Trade",
  borrow: "Borrow",
  lend: "Lend",
  fund: "Fund",
};

export const OPENING = "what would you like to share, or ask for?";

export const startSession = (): VoiceSession => ({
  stage: "talk",
  action: null,
  fields: { ...EMPTY_FIELDS },
  prompt: OPENING,
  asking: "intent",
  choices: [],
  pending: null,
  heard: "",
  wantsPhoto: false,
  wantsLocation: false,
  search: null,
});

const PHOTO = /\b(just a photo|add (?:a )?(?:photo|picture|pic)|take (?:a )?(?:photo|picture)|(?:a |with a )?photo of it)\b/;
const HERE = /\b(?:my )?(?:current )?location\b|\bwhere i am\b|\bright here\b|^here\b/;
const DONE = /^(?:no|nope|nah|nothing(?: else)?|that'?s (?:it|all)|done|all good|i'?m done|no thanks?|that'?s everything)\b/;
const YES = /^(?:yes|yeah|yep|sure|ok(?:ay)?|review|let'?s review|go ahead|ready)\b/;
const NOT_YET = /^(?:not yet|wait|hold on|one more)\b/;

export const readyAsk = (a: GiverAction) => `ready to review your ${NOUN[a]}?`;

/** After any change: the next open question, else "anything else?". */
export function nextAsk(s: VoiceSession): VoiceSession {
  if (!s.action) return s;
  const open = missingAsks(s.action, s.fields).find((q) => !(q.field === "where" && s.wantsLocation));
  if (open) return { ...s, stage: "talk", prompt: open.ask, asking: open.field, choices: [] };
  return { ...s, stage: "anything", prompt: "anything else you'd like to add?", asking: null, choices: [] };
}

/** One recognised segment (or typed line) → the next state. */
export function hear(s: VoiceSession, raw: string): VoiceSession {
  const text = raw.trim();
  if (!text || s.stage === "review" || s.stage === "live") return s;
  const lower = text.toLowerCase();
  let next: VoiceSession = { ...s, heard: text };

  if (PHOTO.test(lower)) {
    next.wantsPhoto = true;
    if (/^just a photo\b/.test(lower) || lower.replace(PHOTO, "").trim().length < 3) {
      return { ...next, prompt: next.action ? "tap the plus to add your photo." : "tap the plus to add a photo. what is it?" };
    }
  }

  if (s.stage === "ready") {
    if (YES.test(lower)) return { ...next, stage: "review" };
    if (NOT_YET.test(lower) || DONE.test(lower)) return { ...next, stage: "anything", prompt: "what would you like to add?" };
  }

  if (!next.action) {
    if (s.pending?.clarification) {
      const pick = s.pending.clarification.choices.find((c) => lower.includes(c.toLowerCase()));
      const resolved = pick ? resolveChoice(s.pending, pick) : null;
      if (resolved?.action) {
        return nextAsk({ ...next, action: resolved.action, fields: fieldsFromDraft(resolved, s.heard || text), pending: null });
      }
    }
    const route = routeVoice(text);
    if (route.intent === "search") return { ...next, search: route.search.term };
    const draft = route.draft;
    if (route.intent !== "clarify" && draft.action) {
      return nextAsk({ ...next, action: draft.action, fields: fieldsFromDraft(draft, text), pending: null });
    }
    const c = draft.clarification ?? bindUtterance(text).clarification;
    return {
      ...next,
      pending: c ? draft : null,
      prompt: c?.ask ?? "is that something you're giving, or something you need?",
      asking: "intent",
      choices: c?.choices ?? [],
    };
  }

  if (s.stage === "anything" && DONE.test(lower)) {
    return { ...next, stage: "ready", prompt: readyAsk(next.action), asking: null };
  }

  if (s.asking === "where" && HERE.test(lower)) {
    return nextAsk({ ...next, wantsLocation: true });
  }

  if (s.stage === "anything") {
    return { ...next, fields: mergeFollowUp(next.action, s.fields, text), prompt: "anything else?", stage: "anything" };
  }

  return nextAsk({ ...next, fields: mergeFollowUp(next.action, s.fields, text) });
}

/** The person's own edit in the preview always wins. */
export const editField = (s: VoiceSession, field: keyof VoiceFields, value: string): VoiceSession => ({
  ...s,
  fields: { ...s.fields, [field]: value } as VoiceFields,
});
