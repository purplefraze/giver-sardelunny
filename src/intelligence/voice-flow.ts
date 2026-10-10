import type { GiveType } from "@/data/give-lexicon";
import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";
import { contextOf, extractCtx, type ContextKind, type Ctx } from "@/intelligence/contextual-needs";

/**
 * THE IN-G VOICE SEQUENCE — pure rules only (no DOM, no network, no write).
 * record → words in the bottom loop → reading in the middle loop → toggle
 * glides to the seat → the G unfolds into the frame → compact form.
 * Recording stopping never publishes; the form's own confirmation does.
 */

/** Each action's real seat on the live eight-seat map. */
export const SEAT_OF_ACTION: Record<GiverAction, "give" | "wish" | "trade" | "borrow" | "lend" | "fund"> = {
  give: "give",
  wish: "wish",
  trade: "trade",
  borrow: "borrow",
  lend: "lend",
  fund: "fund",
};

export type VoiceFields = {
  what: string;
  want: string;
  kind: GiveType | null;
  when: string;
  where: string;
  note: string;
  condition: string;
  amount: string;
  /** Borrow/lend: how long ("for a week", "back by friday"). */
  duration: string;
  /** Request-specific details (a ride's pickup/drop-off/day/time…). */
  context: ContextKind | null;
  ctx: Ctx;
};

export const EMPTY_FIELDS: VoiceFields = {
  what: "",
  want: "",
  kind: null,
  when: "",
  where: "",
  note: "",
  condition: "",
  amount: "",
  duration: "",
  context: null,
  ctx: {},
};

const WHERE = /\b(?:in|at|near|around|on)\s+((?:the\s+)?[a-z0-9'][a-z0-9' -]{1,40}?)(?=[.,!?]|\s+(?:on|at|from|after|before|by|this|next|tomorrow|today|tonight|(?:mon|tues|wednes|thurs|fri|satur|sun)day|weekend)\b|$)/;
const WHEN =
  /\b(today|tonight|tomorrow(?: (?:morning|afternoon|evening|night))?|this (?:morning|afternoon|evening|weekend|week)|next (?:week|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:on )?(?:mon|tues|wednes|thurs|fri|satur|sun)day(?: (?:morning|afternoon|evening))?|(?:after|before|by|from|at) \d{1,2}(?::\d{2})?\s?(?:am|pm)?|\d{1,2}(?::\d{2})?\s?(?:am|pm)|any ?time|whenever|weekends?|evenings?|mornings?)\b/;
const TIME_WORD = /\b(today|tonight|tomorrow|week|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening)\b/;

const DURATION =
  /\b(for (?:a|an|one|two|three|four|five|six|\d+|the|a few|a couple of) ?(?:hours?|days?|nights?|weeks?|weekends?|months?|afternoon|morning|evening)|for the (?:day|weekend|week|night|afternoon)|(?:until|till|back by|return(?:ed)? by) (?:next )?[a-z0-9]+)\b/;
const durationOf = (lower: string) => lower.match(DURATION)?.[1] ?? "";

const money = (cents: number | null) => (cents == null ? "" : String(Math.round(cents / 100)));

/** First words → fields. Only what the words actually say; nothing invented. */
export function fieldsFromDraft(draft: ActionDraft, raw: string): VoiceFields {
  const e = draft.entities;
  const lower = raw.toLowerCase();
  const whereM = lower.match(WHERE);
  const whereText = e.location ?? (whereM && !TIME_WORD.test(whereM[1] ?? "") ? (whereM[1] ?? "").trim() : "");
  const whenM = lower.match(WHEN);
  const detected = contextOf(raw);
  const context = detected === "lesson" || detected === "service" || draft.action === "wish" || draft.action === "borrow" ? detected : null;
  const ctx = context ? extractCtx(context, raw, {}) : {};
  const service = context === "lesson" || context === "service";
  return {
    ...EMPTY_FIELDS,
    context,
    ctx,
    what: service && ctx.subject ? `${draft.action === "wish" || draft.action === "borrow" ? "Seeking" : "Offering"} ${ctx.subject}` : draft.action === "trade" ? (e.offer ?? e.item ?? "") : (context === "ride" ? "a ride" : context === "groceries" ? "help with groceries" : (e.item ?? "")),
    want: draft.action === "trade" ? (e.want ?? "") : "",
    kind: service ? context === "lesson" ? "a skill" : "a hand" : (e.category as GiveType | null) ?? null,
    when: e.availability ?? e.date ?? (whenM ? whenM[1] ?? "" : ""),
    where: service ? ctx.format === "online" ? "online" : ctx.area ?? "" : whereText,
    condition: service ? "" : e.condition ?? "",
    amount: draft.action === "fund" ? money(e.amountCents) : "",
    duration: draft.action === "borrow" || draft.action === "lend" ? durationOf(lower) : "",
  };
}

/** The short natural question for each still-empty field, in form order. */
export function missingAsks(action: GiverAction, f: VoiceFields): { field: keyof VoiceFields; ask: string }[] {
  const out: { field: keyof VoiceFields; ask: string }[] = [];
  const service = f.context === "lesson" || f.context === "service";
  const tangible = f.kind === "a thing" || f.kind === "clothes" || f.kind === "food" || f.kind === null;
  if (!f.what.trim()) out.push({ field: "what", ask: action === "give" ? "what are you giving?" : "what is it?" });
  if (action === "trade" && !f.want.trim()) out.push({ field: "want", ask: "what would you like for it?" });
  if (action === "fund" && !f.amount.trim()) out.push({ field: "amount", ask: "how much are you raising?" });
  if (!service && (action === "give" || action === "lend") && !f.where.trim()) out.push({ field: "where", ask: action === "give" ? (tangible ? "where can someone collect it?" : "where are you based? an area is fine.") : "where is it?" });
  if (!service && action === "give" && !f.when.trim())
    out.push({ field: "when", ask: tangible ? "when?" : "when are you free?" });
  if (!service && (action === "borrow" || action === "lend") && !f.when.trim())
    out.push({ field: "when", ask: action === "borrow" ? "when do you need it?" : "when is it free to borrow?" });
  if ((action === "borrow" || action === "lend") && !f.context && !f.duration.trim())
    out.push({ field: "duration", ask: action === "borrow" ? "how long do you need it for?" : "how long can they keep it?" });
  return out;
}

/** Required to go live — mirrors the existing forms' minimums. */
export function canGoLive(action: GiverAction, f: VoiceFields): boolean {
  if (f.what.trim().length < 2) return false;
  if (action === "give") return f.kind !== null && (f.context === "lesson" || f.context === "service" ? f.ctx.format === "online" || !!f.ctx.area : f.where.trim().length > 0);
  if (action === "trade") return f.want.trim().length > 0;
  return true;
}

/**
 * FOLLOW-UP WORDS merge into the draft. Never overwrites something already
 * there (the person's own edits win). Recognised time/place go to when/where;
 * anything else answers the first open question, or joins the description.
 */
export function mergeFollowUp(action: GiverAction, f: VoiceFields, raw: string): VoiceFields {
  const text = raw.trim();
  if (!text) return f;
  const lower = text.toLowerCase();
  const next = { ...f };
  let used = false;
  const dur = action === "borrow" || action === "lend" ? durationOf(lower) : "";
  if (dur && !next.duration.trim()) {
    next.duration = dur;
    used = true;
  }
  const whenM = lower.replace(DURATION, " ").match(WHEN);
  if (whenM && !next.when.trim()) {
    next.when = whenM[1] ?? "";
    used = true;
  }
  const whereM = lower.match(WHERE);
  if (whereM && !TIME_WORD.test(whereM[1] ?? "") && !next.where.trim()) {
    next.where = (whereM[1] ?? "").trim();
    used = true;
  }
  const b = bindUtterance(text);
  if (b.entities.condition && !next.condition.trim()) {
    next.condition = b.entities.condition;
    used = true;
  }
  if (used) return next;
  const open = missingAsks(action, f)[0];
  if (open && open.field !== "kind") {
    (next as Record<string, unknown>)[open.field] = text;
    return next;
  }
  next.note = next.note.trim() ? `${next.note.trim()} ${text}` : text;
  return next;
}

/** Ask for a picture before going live? Only for tangible offers without one. */
export function photoReminder(action: GiverAction, kind: GiveType | null, hasPhoto: boolean): boolean {
  if (hasPhoto) return false;
  if (action === "give") return kind === null || kind === "a thing" || kind === "clothes" || kind === "food";
  return action === "lend" || action === "trade";
}
