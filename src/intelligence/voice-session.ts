import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { bindUtterance, resolveChoice } from "@/intelligence/bind";
import { EMPTY_FIELDS, fieldsFromDraft, mergeFollowUp, missingAsks, type VoiceFields } from "@/intelligence/voice-flow";
import { routeVoice } from "@/intelligence/voice-router";
import { leadIntent } from "@/intelligence/lead-intent";
import { contextOf, extractCtx, nextNeed } from "@/intelligence/contextual-needs";
import { communityFilterOf, type CgSelection } from "@/intelligence/community-filter";
import { profileAreaOf, type ProfileAreaId } from "@/intelligence/profile-areas";

/**
 * THE CONVERSATION INSIDE THE G — pure rules (no DOM, no network, no write).
 * Each recognised segment advances the draft. The middle loop shows ONE short
 * question; details already said are never asked again; nothing is invented.
 * Only choosing review leaves the talk; only Share makes anything live.
 */
export type VoiceStage = "talk" | "anything" | "ready" | "review" | "live";

export type VoiceSession = {
  routeSeat?: "giver" | "map";
  stage: VoiceStage;
  action: GiverAction | null;
  fields: VoiceFields;
  /** The one question currently in the middle loop. */
  prompt: string;
  /** Which field the question is waiting on (so "here" → location). */
  asking: keyof VoiceFields | "intent" | "seed" | `ctx:${string}` | null;
  /** Everything said this session, in order (the model reads the whole talk). */
  said: string[];
  choices: readonly string[];
  pending: ActionDraft | null;
  /** Last words heard (shown in the bottom loop between segments). */
  heard: string;
  wantsPhoto: boolean;
  /** The person asked to use their current location for "where". */
  wantsLocation: boolean;
  /** "show me ladders" — a search, not a draft. */
  search: string | null;
  /** "show my chats" — go to a My G area, not a draft. */
  profile: ProfileAreaId | null;
  /** "show community borrows" — the lower loop on that filter. */
  community: CgSelection | null;
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

/** The selected toggle seat's own first question (no "which mode?" detour). */
export const SEED_OPENING: Record<GiverAction, string> = {
  give: "give something",
  wish: "make a wish",
  trade: "make a trade",
  borrow: "what do you need to borrow?",
  lend: "what are you lending?",
  fund: "what needs funding?",
};

export const startSession = (seed: GiverAction | null = null): VoiceSession => ({
  stage: "talk",
  action: seed,
  fields: { ...EMPTY_FIELDS },
  prompt: seed ? SEED_OPENING[seed] : OPENING,
  asking: seed ? "seed" : "intent",
  said: [],
  choices: [],
  pending: null,
  heard: "",
  wantsPhoto: false,
  wantsLocation: false,
  search: null,
  profile: null,
  community: null,
});

export function sessionForSeat(seat: string): VoiceSession {
  if (seat === "giver" || seat === "map") return { ...startSession(), routeSeat: seat, prompt: seat === "giver" ? "what would you like to update?" : "what are you looking for?" };
  return startSession((["give", "wish", "trade", "borrow", "lend", "fund"] as const).find(a => a === seat) ?? null);
}

const PHOTO = /\b(just a photo|add (?:a )?(?:photo|picture|pic)|take (?:a )?(?:photo|picture)|(?:a |with a )?photo of it)\b/;
const HERE = /\b(?:my )?(?:current )?location\b|\bwhere i am\b|\bright here\b|^here\b/;
const DONE = /^(?:no|nope|nah|nothing(?: else)?|that'?s (?:it|all)|done|all good|i'?m done|no thanks?|that'?s everything)\b/;
const YES = /^(?:yes|yeah|yep|sure|ok(?:ay)?|review|let'?s review|go ahead|ready)\b/;
const NOT_YET = /^(?:not yet|wait|hold on|one more)\b/;

const CANCEL = /^(?:cancel|never ?mind|forget (?:it|that)|start (?:again|over)|scrap (?:it|that)|clear (?:it|that))\b/;

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
/** The recogniser picked up Giver's own spoken question — ignore it. */
export function isEcho(heard: string, spoken: string): boolean {
  const h = norm(heard);
  const p = norm(spoken);
  if (!h || !p) return false;
  return h === p || (h.length >= 12 && p.includes(h));
}

export const readyAsk = (a: GiverAction) => `ready to review your ${NOUN[a]}?`;

/**
 * After any change: the next NECESSARY question. Once someone could act on
 * it, stop asking — straight to the editable review (no "anything else?" loop).
 */
export function nextAsk(s: VoiceSession): VoiceSession {
  if (!s.action) return s;
  const kind = s.fields.context;
  const need = kind ? nextNeed(kind, s.fields.ctx) : null;
  if (need) return { ...s, stage: "talk", prompt: need.ask, asking: `ctx:${need.field}`, choices: need.field === "recurrence" ? ["this Tuesday", "every Tuesday"].map(x => x.replace("Tuesday", s.fields.ctx.day ?? "Tuesday")) : [] };
  const open = missingAsks(s.action, s.fields).find((q) => !(q.field === "where" && s.wantsLocation));
  if (open) return { ...s, stage: "talk", prompt: open.ask, asking: open.field, choices: [] };
  return { ...s, stage: "review", prompt: `here's your ${NOUN[s.action]}. edit anything, then share.`, asking: null, choices: [] };
}

/** One recognised segment (or typed line) → the next state. */
export function hear(s: VoiceSession, raw: string): VoiceSession {
  const text = raw.trim();
  if (!text || s.stage === "live") return s;
  const said = [...s.said, text];
  const withCtx = (f: VoiceFields, asking: string | null) =>
    f.context ? { ...f, ctx: extractCtx(f.context, text, f.ctx, asking) } : f;
  /* Follow-up voice in the preview fills only what is still empty (corrections overwrite context). */
  if (s.stage === "review")
    return s.action ? { ...s, said, heard: text, fields: withCtx(mergeFollowUp(s.action, s.fields, text), null) } : s;
  const lower = text.toLowerCase();
  let next: VoiceSession = { ...s, said, heard: text };
  if (CANCEL.test(lower)) return { ...startSession(), said, heard: text, prompt: `ok, cleared. ${OPENING}` };

  if (PHOTO.test(lower)) {
    next.wantsPhoto = true;
    if (/^just a photo\b/.test(lower) || lower.replace(PHOTO, "").trim().length < 3) {
      return { ...next, prompt: next.action ? "tap the plus to add your photo." : "tap the plus to add a photo. what is it?" };
    }
  }

  if (s.stage === "ready") {
    if (YES.test(lower)) return { ...next, stage: "review" };
    if (NOT_YET.test(lower) || (DONE.test(lower) && lower.split(/\s+/).length <= 3)) return { ...next, stage: "anything", prompt: "what would you like to add?" };
  }

  if (s.routeSeat === "giver") {
    const area = profileAreaOf(text);
    return { ...next, profile: area ?? "bio", action: null };
  }
  if (s.routeSeat === "map") return { ...next, community: communityFilterOf(text, true) ?? "everything", search: text, action: null };
  if (/^(?:actually|no[, ]|instead|i meant|change)/i.test(text)) {
    const intent = leadIntent(text.replace(/^(?:actually|no[, ]+|instead|i meant|change)\s*/i, ""));
    if (intent?.action && intent.action !== s.action) return nextAsk({ ...next, action: intent.action, fields: fieldsFromDraft(intent, text) });
  }

  /* SEEDED by the toggle seat: the first answer is that mode's draft, unless
     it clearly names another intent or a profile/community/search request. */
  if (s.asking === "seed" && s.action) {
    const lead = ["ride", "groceries"].includes(contextOf(text) ?? "") ? null : leadIntent(text);
    if (lead?.action) return nextAsk({ ...next, action: lead.action, fields: fieldsFromDraft(lead, text), pending: null });
    const area = profileAreaOf(text);
    if (area) return { ...next, profile: area };
    const cg = communityFilterOf(text);
    if (cg) return { ...next, community: cg };
    const route = routeVoice(text);
    if (route.intent === "search") return { ...next, search: route.search.term };
    const d = route.draft;
    const ctxWish = ["ride", "groceries"].includes(contextOf(text) ?? "") && (s.action === "wish" || s.action === "borrow");
    const action = ctxWish ? "wish" : s.action;
    const fields = fieldsFromDraft({ ...d, action, clarification: null }, text);
    if (!fields.what && action !== "fund" && !fields.context) fields.what = text.replace(/^(?:a|an|my|some)\s+/i, "") ;
    return nextAsk({ ...next, action, fields, pending: null });
  }

  if (!next.action) {
    if (s.pending?.clarification) {
      const pick = s.pending.clarification.choices.find((c) => lower.includes(c.toLowerCase()));
      const resolved = pick ? resolveChoice(s.pending, pick) : null;
      if (resolved?.action) {
        return nextAsk({ ...next, action: resolved.action, fields: fieldsFromDraft(resolved, s.heard || text), pending: null });
      }
    }
    const lead = ["ride", "groceries"].includes(contextOf(text) ?? "") ? null : leadIntent(text);
    if (lead?.action) return nextAsk({ ...next, action: lead.action, fields: fieldsFromDraft(lead, text), pending: null });
    const area = profileAreaOf(text);
    if (area) return { ...next, profile: area };
    const cg = communityFilterOf(text);
    if (cg) return { ...next, community: cg };
    const route = routeVoice(text);
    if (route.intent === "search") return { ...next, search: route.search.term };
    const draft = route.draft;
    /* A ride or groceries request is a Wish — no "wish or borrow?" detour. */
    if (["ride", "groceries"].includes(contextOf(text) ?? "") && (draft.action === "wish" || draft.action === "borrow" || !draft.action)) {
      const asWish = { ...draft, action: "wish" as const, clarification: null };
      return nextAsk({ ...next, action: "wish", fields: fieldsFromDraft(asWish, text), pending: null });
    }
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

  /* "no" alone is done; "no, make it 10am" is a correction. */
  if (s.stage === "anything" && DONE.test(lower) && lower.split(/\s+/).length <= 3 && !/\d|day\b/.test(lower)) {
    return { ...next, stage: "ready", prompt: readyAsk(next.action), asking: null };
  }

  /* A contextual answer lands in its field; it never spills into the note. */
  if (next.fields.context && typeof s.asking === "string" && s.asking.startsWith("ctx:")) {
    return nextAsk({ ...next, fields: withCtx(s.fields, s.asking) });
  }

  if (s.asking === "where" && HERE.test(lower)) {
    return nextAsk({ ...next, wantsLocation: true });
  }

  if (s.stage === "anything") {
    const fields = withCtx(mergeFollowUp(next.action, s.fields, text), null);
    if (fields.context && nextNeed(fields.context, fields.ctx)) return nextAsk({ ...next, fields });
    return { ...next, fields, prompt: "anything else?", stage: "anything" };
  }

  return nextAsk({ ...next, fields: withCtx(mergeFollowUp(next.action, s.fields, text), null) });
}

/** The person's own edit in the preview always wins. */
export const editField = (s: VoiceSession, field: keyof VoiceFields, value: string): VoiceSession => ({
  ...s,
  fields: { ...s.fields, [field]: value } as VoiceFields,
});
