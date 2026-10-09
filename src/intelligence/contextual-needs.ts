/**
 * CONTEXTUAL FOLLOW-UP NEEDS — pure rules (no DOM, no network, no write).
 *
 * Some requests can't be fulfilled without specific details: a ride needs a
 * pickup, a destination, a day AND a pickup time; groceries need to know
 * whether someone shops or collects. Everything else (a plant, a ladder) stays
 * lightweight — no schedule questionnaire.
 *
 * Rules: ONE question at a time; never re-ask what was said; corrections
 * ("actually 8pm") overwrite; an hour without am/pm is clarified; a flight
 * time is never mistaken for the pickup time; "flexible" is respected; nothing
 * is invented — every value is words the person actually said.
 *
 * These rules are also the honest FALLBACK whenever the model is unavailable.
 */
export type ContextKind = "ride" | "groceries";
export type CtxKey =
  | "pickup" | "dropoff" | "date" | "pickupTime" | "flightTime" | "luggage" | "passengers" | "accessibility"
  | "mode" | "list" | "store" | "deliveryArea" | "day" | "window" | "flexible" | "__ambig";
export type Ctx = { [K in CtxKey]?: string };
type Loose = Record<string, string | undefined>;

export const RIDE_FIELDS = ["pickup", "dropoff", "date", "pickupTime", "flightTime", "luggage", "passengers", "accessibility"] as const;
export const GROCERY_FIELDS = ["mode", "list", "store", "deliveryArea", "day", "window", "flexible"] as const;
export const FIELDS_OF: Record<ContextKind, readonly string[]> = { ride: RIDE_FIELDS, groceries: GROCERY_FIELDS };

const RIDE = /\b(ride|lift|drive me|pick me up|airport run|carpool|car pool|take me to|drop me (?:off )?at)\b/;
const GROCERY = /\b(groceries|grocery|supermarket|food shop(?:ping)?|weekly shop|my shopping|the shopping|click and collect)\b/;

export function contextOf(text: string): ContextKind | null {
  const t = text.toLowerCase();
  if (RIDE.test(t)) return "ride";
  if (GROCERY.test(t)) return "groceries";
  return null;
}

const CORRECTION = /^(?:actually|no[,.!]?\s|nope|sorry|wait|change (?:it|that)|make it|instead|i meant|correction)\b/;
const FLEX = /\b(flexible|any ?time|whenever|no rush|not fussed|doesn'?t matter|any day)\b/;
const DATE =
  /\b(today|tonight|tomorrow(?: (?:morning|afternoon|evening|night))?|(?:this|next) (?:mon|tues|wednes|thurs|fri|satur|sun)day|tues|tues|wednes|thurs|fri|satur|sun)day|this weekend|next weekend|next week|(?:the )?\d{1,2}(?:st|nd|rd|th)(?: of [a-z]+)?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?)\b/;
const TIME = /\b(?:(at|by|around|about|for|@)\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|in the morning|in the afternoon|in the evening|at night|o'?clock)?\b|\b(noon|midday|midnight)\b/g;
const FLIGHT_BEFORE = /(flight|plane|depart(?:s|ure)?|leaves|takes off|boarding|train leaves|my train)[^.,;]{0,22}$/;
const STOP = /\s+(?:on|at|by|around|this|next|tomorrow|today|tonight|for|before|after|and then|then|because|my flight|flight)\b.*$/;
const VERB_AFTER_TO = /^(?:pick|get|buy|collect|go|be|do|help|take|see|make|have|drop|shop|bring)\b/;

const clean = (s: string) =>
  s
    .replace(STOP, "")
    .replace(/^(?:the\s+)?/, (m) => m)
    .replace(/[.,!?;]+$/, "")
    .trim();

const PRECISE = /\b\d+[a-z]?\s+[a-z][a-z' -]*\b(?:st|street|rd|road|ave|avenue|lane|ln|drive|dr|court|ct|place|pl|way|blvd|boulevard|crescent|cres|terrace|close)\b|^\s*\d+\s+[a-z]/i;
/** A precise address (house number + street) must never reach the public feed. */
export const isPrecise = (s: string) => PRECISE.test(s);
/** What the public post may show for a place the person gave. */
export const publicPlace = (s: string) => (isPrecise(s) ? "exact spot shared after you connect" : s);

type Hour = { text: string; ambiguous: boolean; flight: boolean };

function times(lower: string): Hour[] {
  const out: Hour[] = [];
  TIME.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TIME.exec(lower))) {
    const before = lower.slice(0, m.index);
    const flight = FLIGHT_BEFORE.test(before);
    if (m[5]) {
      out.push({ text: m[5] === "midday" ? "noon" : m[5], ambiguous: false, flight });
      continue;
    }
    const prep = m[1];
    const h = Number(m[2]);
    const min = m[3];
    const suf = m[4];
    /* A bare number is only a time with a preposition, minutes or a suffix. */
    if (!prep && !min && !suf) continue;
    /* "the 12th" / "2 bags" / "for 3 people" are not times. */
    const after = lower.slice(m.index + m[0].length);
    if (/^\s*(?:st|nd|rd|th|bags?|people|passengers?|of us|suitcases?|kids?|items?|mins?|minutes?|hours?)\b/.test(after)) continue;
    if (prep === "for" && !suf && !min) continue;
    if (h > 23) continue;
    const mm = min ? `:${min}` : "";
    if (suf && /a\.?m|morning/.test(suf)) out.push({ text: `${h}${mm}am`, ambiguous: false, flight });
    else if (suf && /p\.?m|afternoon|evening|night/.test(suf)) out.push({ text: `${h}${mm}pm`, ambiguous: false, flight });
    else if (h === 0 || h > 12) out.push({ text: `${h}${mm || ":00"}`, ambiguous: false, flight });
    else out.push({ text: `${h}${mm}`, ambiguous: true, flight });
  }
  return out;
}

const resolveHalf = (hour: string, lower: string): string | null => {
  if (/\b(am|a\.m\.|morning)\b/.test(lower)) return `${hour}am`;
  if (/\b(pm|p\.m\.|evening|night|afternoon|tonight)\b/.test(lower)) return `${hour}pm`;
  return null;
};

/** Pull places out of one utterance. */
function places(lower: string) {
  const r: { from?: string; to?: string } = {};
  const fromTo = lower.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=[.,!?;]|$)/);
  if (fromTo) {
    r.from = clean(fromTo[1] ?? "");
    r.to = clean(fromTo[2] ?? "");
    return r;
  }
  const pick = lower.match(/\bpick(?:ed)?\s*(?:me\s+)?up\s+(?:from|at|in|near)\s+(.+?)(?=[.,!?;]|$)/);
  if (pick && !/^\d/.test(pick[1] ?? "")) r.from = clean(pick[1] ?? "");
  const from = !r.from ? lower.match(/\bfrom\s+(?!\d)(.+?)(?=[.,!?;]|$)/) : null;
  if (from) r.from = clean(from[1] ?? "");
  const drop = lower.match(/\bdrop(?:ped)?\s*(?:me\s+)?(?:off\s+)?(?:at|in)\s+(.+?)(?=[.,!?;]|$)/);
  if (drop) r.to = clean(drop[1] ?? "");
  if (!r.to) {
    const to = lower.match(/\b(?:to|into)\s+(?!\d)(.+?)(?=[.,!?;]|$)/);
    if (to && !VERB_AFTER_TO.test(to[1] ?? "")) r.to = clean(to[1] ?? "");
  }
  for (const k of ["from", "to"] as const) if (r[k] !== undefined && r[k]!.length < 2) delete r[k];
  return r;
}

const ANSWER_PREFIX = /^(?:um+|uh+|so|well|ok(?:ay)?|it'?s|it is|that'?s|at|from|to|on|the shop is|i'?m at|i'?m in|i'?m going to)\s+/;
const answerText = (raw: string) => {
  let t = raw.trim().replace(/[.!?]+$/, "");
  for (let i = 0; i < 3; i++) t = t.replace(ANSWER_PREFIX, "");
  return t.trim();
};

const put = (ctx: Ctx, key: string, value: string | undefined, force: boolean) => {
  if (!value) return;
  const c = ctx as Loose;
  if (force || !c[key]) c[key] = value;
};

/**
 * One utterance → updated context. `asking` is the field the last question
 * was about, so a bare answer ("Leith") lands there and nowhere else.
 */
export function extractCtx(kind: ContextKind, raw: string, prev: Ctx, asking: string | null = null): Ctx {
  const lower = raw.toLowerCase().trim();
  const ctx: Ctx = { ...prev };
  const force = CORRECTION.test(lower);
  const filled = new Set<string>();
  const set = (k: string, v: string | undefined) => {
    if (!v) return;
    const before = (ctx as Loose)[k];
    put(ctx, k, v, force);
    if ((ctx as Loose)[k] !== before) filled.add(k);
    else if (before === v) filled.add(k);
  };

  /* A pending "7 — morning or evening?" is resolved first. */
  if (ctx.__ambig) {
    const [hour, field] = ctx.__ambig.split("|");
    const fixed = hour && field ? resolveHalf(hour, lower) : null;
    if (fixed && field) {
      (ctx as Loose)[field] = fixed;
      delete ctx.__ambig;
      filled.add(field);
    }
  }

  const date = lower.match(DATE)?.[1];
  const hours = times(lower);
  const flexible = FLEX.test(lower);

  if (kind === "ride") {
    const p = places(lower);
    set("pickup", p.from);
    set("dropoff", p.to);
    if (/\bairport\b/.test(lower) && !ctx.dropoff && !p.from) set("dropoff", "the airport");
    set("date", date);
    for (const h of hours) {
      const field = h.flight ? "flightTime" : "pickupTime";
      if (h.ambiguous) {
        const fixed = resolveHalf(h.text, lower.replace(DATE, ""));
        if (fixed) set(field, fixed);
        else if (force || !(ctx as Loose)[field]) {
          ctx.__ambig = `${h.text}|${field}`;
          filled.add(field);
        }
      } else set(field, h.text);
    }
    if (flexible && (asking === "ctx:pickupTime" || /\btime\b/.test(lower))) set("pickupTime", "flexible");
    const bags = lower.match(/\b(\d+|one|two|three|four|a few|no)\s+(?:bags?|suitcases?|luggage)\b/);
    if (bags) set("luggage", bags[0]);
    const people = lower.match(/\b(\d+|two|three|four|five) (?:people|passengers|of us)\b|\bme and (?:my )?[a-z]+\b/);
    if (people) set("passengers", people[0]);
    const access = lower.match(/\b(wheelchair|walker|mobility|step-free|car seat|guide dog)\b[^.,;]*/);
    if (access) set("accessibility", access[0].trim());
  } else {
    if (/\b(click and collect|collect(?:ion)?|pick up (?:my|an|the) order|already ordered|order(?:ed)? online)\b/.test(lower)) set("mode", "collection");
    else if (/\b(do (?:my|the) shopping|shop for me|go shopping|buy|get (?:me )?(?:some|a few)|pick up some|shopping list)\b/.test(lower)) set("mode", "shopping");
    else if (asking === "ctx:mode") {
      if (/\bcollect|order\b/.test(lower)) set("mode", "collection");
      else if (/\bshop/.test(lower)) set("mode", "shopping");
    }
    const list = lower.match(/\b(?:list(?: is)?:?|need|buy|get(?: me)?)\s+((?:some\s+)?[a-z ]+(?:,\s*[a-z ]+)+(?:,?\s*and\s+[a-z ]+)?)/);
    if (list) set("list", list[1]?.trim());
    const store = lower.match(/\bfrom\s+((?:the\s+)?[a-z0-9'&-]+(?:\s+[a-z0-9'&-]+){0,3})(?=[.,!?;]|\s+(?:and|on|at|by|to|for)\b|$)/);
    if (store && (ctx.mode === "collection" || asking === "ctx:store")) set("store", store[1]);
    const to = lower.match(/\b(?:deliver(?:ed)?|drop(?:ped)?(?: it)?(?: off)?|bring(?: it)?)\s+(?:to|in|at)\s+(.+?)(?=[.,!?;]|$)/);
    if (to) set("deliveryArea", clean(to[1] ?? ""));
    set("day", date);
    if (flexible) set("flexible", "yes");
    const window = lower.match(/\b(between \d{1,2}(?::\d{2})?\s*(?:am|pm)? and \d{1,2}(?::\d{2})?\s*(?:am|pm)?|(?:before|after|by) \d{1,2}(?::\d{2})?\s*(?:am|pm)?|in the (?:morning|afternoon|evening)|(?:morning|afternoon|evening))\b/);
    if (window) set("window", window[1]);
    else if (hours.length && hours[0] && !hours[0].ambiguous) set("window", hours[0].text);
  }

  /* A bare answer to the question that was asked fills that field. */
  if (asking?.startsWith("ctx:")) {
    const field = asking.slice(4);
    if (!filled.has(field) && !(ctx.__ambig ?? "").endsWith(`|${field}`)) {
      const ans = answerText(raw);
      if (field === "pickupTime" && flexible) ctx.pickupTime = "flexible";
      else if (field === "window" && flexible) {
        ctx.window = "flexible";
        ctx.flexible = "yes";
      } else if ((field === "luggage" || field === "passengers") && /^(?:no|none|nope|just me|nothing)\b/.test(ans.toLowerCase())) (ctx as Loose)[field] = "none";
      else if (field === "mode") {
        /* An unclear answer to shop-or-collect is not guessed. */
      } else if (ans.length >= 1) (ctx as Loose)[field] = ans;
    }
  }
  return ctx;
}

export type Need = { field: string; ask: string };

const isAirport = (ctx: Ctx) => /\b(airport|flight|terminal)\b/.test(`${ctx.dropoff ?? ""} ${ctx.pickup ?? ""}`) || !!ctx.flightTime;

/** The ONE next question this request still needs, or null. */
export function nextNeed(kind: ContextKind, ctx: Ctx): Need | null {
  if (ctx.__ambig) {
    const [hour, field] = ctx.__ambig.split("|");
    return { field: field ?? "pickupTime", ask: `${hour} in the morning or the evening?` };
  }
  if (kind === "ride") {
    if (!ctx.pickup) return { field: "pickup", ask: "where should they pick you up? an area is fine." };
    if (!ctx.dropoff) return { field: "dropoff", ask: "where are you going?" };
    if (!ctx.date) return { field: "date", ask: "what day do you need the ride?" };
    if (!ctx.pickupTime)
      return ctx.flightTime
        ? { field: "pickupTime", ask: `your flight's at ${ctx.flightTime}. what time should they pick you up?` }
        : { field: "pickupTime", ask: "what time should they pick you up?" };
    if (isAirport(ctx) && !ctx.luggage) return { field: "luggage", ask: "any luggage?" };
    return null;
  }
  if (!ctx.mode) return { field: "mode", ask: "should someone do the shopping, or collect an order you've placed?" };
  if (ctx.mode === "shopping" && !ctx.list) return { field: "list", ask: "what's on your list?" };
  if (ctx.mode === "collection" && !ctx.store) return { field: "store", ask: "which shop is the order at?" };
  if (!ctx.deliveryArea) return { field: "deliveryArea", ask: "where should it be dropped off? an area is fine." };
  if (ctx.flexible === "yes") return null;
  if (!ctx.day) return { field: "day", ask: "what day works?" };
  if (!ctx.window) return { field: "window", ask: "any time window, or are you flexible?" };
  return null;
}

/** Human labels for review and the public post (no private addresses). */
export const CTX_LABEL: Record<string, string> = {
  pickup: "pickup",
  dropoff: "drop-off",
  date: "day",
  pickupTime: "pickup time",
  flightTime: "flight",
  luggage: "luggage",
  passengers: "travelling",
  accessibility: "access needs",
  mode: "shop or collect",
  list: "list",
  store: "shop",
  deliveryArea: "drop-off area",
  day: "day",
  window: "time",
  flexible: "flexible",
};

/** Public extras for a posted item: precise places replaced, internals dropped. */
export function publicExtras(ctx: Ctx): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (k.startsWith("__") || !v) continue;
    const label = CTX_LABEL[k];
    if (!label) continue;
    out[label] = k === "pickup" || k === "dropoff" || k === "deliveryArea" ? publicPlace(v) : v;
  }
  return out;
}

/** Precise places, kept only on the owner's device. */
export function privatePlaces(ctx: Ctx): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["pickup", "dropoff", "deliveryArea"] as const) { const v = ctx[k]; if (v && isPrecise(v)) out[k] = v; }
  return out;
}

/**
 * MODEL OUTPUT VALIDATION. A model may only (a) ask about a field this kind
 * actually has and that is still open, and (b) fill a field with words that
 * appear in what the person said. Anything else is dropped.
 */
export function validateModel(
  kind: ContextKind,
  ctx: Ctx,
  transcript: string,
  out: { question?: unknown; field?: unknown; updates?: unknown },
): { ctx: Ctx; need: Need | null } | null {
  const allowed = FIELDS_OF[kind];
  const said = transcript.toLowerCase();
  const next: Ctx = { ...ctx };
  if (out.updates && typeof out.updates === "object") {
    for (const [k, v] of Object.entries(out.updates as Record<string, unknown>)) {
      if (!allowed.includes(k) || typeof v !== "string") continue;
      const value = v.trim();
      if (!value || value.length > 120) continue;
      const words = value.toLowerCase().replace(/[^a-z0-9: ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^(the|and|for|pm|am)$/.test(w));
      const grounded = k === "flexible" ? FLEX.test(said) : words.length > 0 && words.every((w) => said.includes(w.replace(/(am|pm)$/, "")));
      if (grounded) (next as Loose)[k] = value;
    }
  }
  const rule = nextNeed(kind, next);
  if (!rule) return { ctx: next, need: null };
  const q = typeof out.question === "string" ? out.question.trim() : "";
  const f = typeof out.field === "string" ? out.field : "";
  /* The model may phrase the question, but only for the field the rules say is next. */
  if (q && f === rule.field && q.length <= 120 && q.endsWith("?") && !/\b(posted|shared|sent|published|live)\b/i.test(q)) {
    return { ctx: next, need: { field: f, ask: q.toLowerCase() } };
  }
  return { ctx: next, need: rule };
}
