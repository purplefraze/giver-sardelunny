/**
 * GIVE GUIDED JOURNEY — Figma page 131:2 (source payload 1/2, Nov 11 2026).
 * Wording copied from the 09-{A..G}-NN-Q node names (lowercased per the
 * project's lowercase-label rule). Picker kinds come from the 09-*-P nodes.
 * Pure state: no network, no publish, no Sparks.
 */
export type GiveType = "item" | "food" | "skill" | "time" | "space" | "experience" | "other";
export type PickerKind = "area" | "date" | "photo" | "format" | "handoff";
export type GiveStep = { id: string; code: string; question: string; picker?: PickerKind; optional?: boolean };

const s = (code: string, id: string, question: string, extra: Partial<GiveStep> = {}): GiveStep => ({ code, id, question, ...extra });
const notes = (code: string, q = "anything else someone should know?") => s(code, "notes", q, { optional: true });
const photo = (code: string) => s(code, "photo", "would you like to add a photo?", { picker: "photo", optional: true });

export const GIVE_TYPES: readonly { type: GiveType; letter: string; label: string; steps: readonly GiveStep[] }[] = [
  { type: "item", letter: "A", label: "item", steps: [
    s("09-A-01", "what", "what would you like to give?"),
    s("09-A-02", "detail", "what type of ladder is it, and how tall?"),
    s("09-A-03", "condition", "what condition is it in?"),
    notes("09-A-04"),
    s("09-A-05", "where", "where can it be collected?", { picker: "area" }),
    s("09-A-06", "when", "when is it available?", { picker: "date" }),
    photo("09-A-07"),
  ] },
  { type: "food", letter: "B", label: "food", steps: [
    s("09-B-01", "what", "what food would you like to give?"),
    s("09-B-02", "amount", "how much is available?"),
    s("09-B-03", "handoff", "how will someone receive it?", { picker: "handoff" }),
    s("09-B-04", "where", "where can it be collected?", { picker: "area" }),
    s("09-B-05", "when", "when will it be ready?", { picker: "date" }),
    notes("09-B-06"),
    photo("09-B-07"),
  ] },
  { type: "skill", letter: "C", label: "skill or lesson", steps: [
    s("09-C-01", "what", "what skill or lesson would you like to give?"),
    s("09-C-02", "who", "who is it for?"),
    s("09-C-03", "length", "how long is the lesson?"),
    s("09-C-04", "format", "how will it take place?", { picker: "format" }),
    s("09-C-05", "where", "where will it take place?", { picker: "area" }),
    s("09-C-06", "when", "when are you available?", { picker: "date" }),
    notes("09-C-07"),
    photo("09-C-08"),
  ] },
  { type: "time", letter: "D", label: "time or help", steps: [
    s("09-D-01", "what", "what would you like to help with?"),
    s("09-D-02", "time", "how much time can you give?"),
    s("09-D-03", "format", "how will you help?", { picker: "format" }),
    s("09-D-04", "where", "where can you help?", { picker: "area" }),
    s("09-D-05", "when", "when are you available?", { picker: "date" }),
    notes("09-D-06", "anything needed to make this work?"),
    photo("09-D-07"),
  ] },
  { type: "space", letter: "E", label: "space or resource", steps: [
    s("09-E-01", "what", "what space or resource can you offer?"),
    s("09-E-02", "use", "what can it be used for?"),
    s("09-E-03", "length", "for how long?"),
    s("09-E-04", "where", "where is it?", { picker: "area" }),
    s("09-E-05", "when", "when is it available?", { picker: "date" }),
    notes("09-E-06", "any limits someone should know?"),
    photo("09-E-07"),
  ] },
  { type: "experience", letter: "F", label: "experience or invitation", steps: [
    s("09-F-01", "what", "what experience would you like to share?"),
    s("09-F-02", "people", "how many people can join?"),
    s("09-F-03", "length", "how long will it last?"),
    s("09-F-04", "format", "how will people join?", { picker: "format" }),
    s("09-F-05", "where", "where will you meet?", { picker: "area" }),
    s("09-F-06", "when", "when will it happen?", { picker: "date" }),
    notes("09-F-07"),
    photo("09-F-08"),
  ] },
  { type: "other", letter: "G", label: "other", steps: [
    s("09-G-01", "what", "what would you like to give?"),
    s("09-G-02", "how", "how would someone receive or take part in it?"),
    s("09-G-03", "place", "does it need a place?", { picker: "format" }),
    s("09-G-04", "where", "where would it happen?", { picker: "area" }),
    s("09-G-05", "when", "when would it be available?", { picker: "date" }),
    notes("09-G-06"),
    photo("09-G-07"),
  ] },
];

/** screen: chooser (09 dropdown) → selected (09-X-00) → question (Q/S/P per step) → review (15-X) → ready. */
export type GiveScreen = "chooser" | "selected" | "question" | "review" | "ready";
export type GiveState = {
  screen: GiveScreen;
  type: GiveType | null;
  step: number;
  /** Answers per type so switching branch never loses input. */
  answers: Partial<Record<GiveType, Record<string, string>>>;
  /** Step ids the person has submitted (S state: answer turns green). */
  submitted: Partial<Record<GiveType, string[]>>;
  /** True while editing from review: submitting returns to review. */
  fromReview: boolean;
};
export const EMPTY_GIVE: GiveState = { screen: "chooser", type: null, step: 0, answers: {}, submitted: {}, fromReview: false };

export const giveDef = (t: GiveType) => GIVE_TYPES.find((d) => d.type === t)!;
export const steps = (st: GiveState) => (st.type ? giveDef(st.type).steps : []);
export const current = (st: GiveState): GiveStep | null => (st.screen === "question" ? steps(st)[st.step] ?? null : null);
export const valueOf = (st: GiveState, id: string) => (st.type ? st.answers[st.type]?.[id] ?? "" : "");
export const isSubmitted = (st: GiveState, id: string) => !!st.type && (st.submitted[st.type] ?? []).includes(id);
/** Screen code matching the Figma frame naming, e.g. 09-C-03-Q / -S / -P, 15-C. */
export function screenCode(st: GiveState, pickerOpen = false): string {
  if (!st.type) return "09";
  const L = giveDef(st.type).letter;
  if (st.screen === "selected") return `09-${L}-00`;
  if (st.screen === "review" || st.screen === "ready") return `15-${L}`;
  const c = current(st)!;
  return `${c.code}-${pickerOpen ? "P" : isSubmitted(st, c.id) ? "S" : "Q"}`;
}

export const choose = (st: GiveState, type: GiveType): GiveState => ({ ...st, type, screen: "selected", step: 0, fromReview: false });
export const start = (st: GiveState): GiveState => (st.type ? { ...st, screen: "question", step: 0 } : st);

export function setAnswer(st: GiveState, value: string): GiveState {
  const c = current(st);
  if (!st.type || !c) return st;
  const prev = st.answers[st.type] ?? {};
  const sub = (st.submitted[st.type] ?? []).filter((id) => id !== c.id); // editing returns to black until submitted
  return { ...st, answers: { ...st.answers, [st.type]: { ...prev, [c.id]: value } }, submitted: { ...st.submitted, [st.type]: sub } };
}

const advance = (st: GiveState): GiveState => {
  if (st.fromReview || st.step >= steps(st).length - 1) return { ...st, screen: "review", fromReview: false };
  return { ...st, step: st.step + 1 };
};

/** Submit (Q → S → next). Required steps need a non-empty answer. */
export function submit(st: GiveState): GiveState {
  const c = current(st);
  if (!st.type || !c) return st;
  if (!valueOf(st, c.id).trim()) return st;
  const sub = Array.from(new Set([...(st.submitted[st.type] ?? []), c.id]));
  return advance({ ...st, submitted: { ...st.submitted, [st.type]: sub } });
}
export function skip(st: GiveState): GiveState {
  const c = current(st);
  if (!c?.optional) return st;
  return advance(st);
}
export const canSubmit = (st: GiveState) => { const c = current(st); return !!c && valueOf(st, c.id).trim().length > 0; };

export function editFromReview(st: GiveState, id: string): GiveState {
  const i = steps(st).findIndex((x) => x.id === id);
  return i < 0 ? st : { ...st, screen: "question", step: i, fromReview: true };
}
/** Review is shareable once every required step has an answer. */
export const reviewComplete = (st: GiveState) => steps(st).every((x) => x.optional || valueOf(st, x.id).trim());
/** Preview only: ready never publishes, writes or spends. */
export const share = (st: GiveState): GiveState => (st.screen === "review" && reviewComplete(st) ? { ...st, screen: "ready" } : st);

/** Back keeps every answer. Returns null to exit to the loop. */
export function back(st: GiveState): GiveState | null {
  switch (st.screen) {
    case "chooser": return null;
    case "selected": return { ...st, screen: "chooser" };
    case "question":
      if (st.fromReview) return { ...st, screen: "review", fromReview: false };
      return st.step > 0 ? { ...st, step: st.step - 1 } : { ...st, screen: "selected" };
    case "review": return { ...st, screen: "question", step: steps(st).length - 1 };
    case "ready": return null;
  }
}

export const GIVE_DRAFT_KEY = "giver:give-journey:v1";
export function loadGiveDraft(storage: Pick<Storage, "getItem"> | undefined): GiveState {
  try {
    const v = JSON.parse(storage?.getItem(GIVE_DRAFT_KEY) ?? "null") as GiveState | null;
    if (!v || typeof v.step !== "number" || v.screen === "ready") return EMPTY_GIVE;
    return { ...EMPTY_GIVE, ...v };
  } catch { return EMPTY_GIVE; }
}
export function saveGiveDraft(storage: Pick<Storage, "setItem" | "removeItem"> | undefined, st: GiveState): void {
  try { if (st.screen === "ready") storage?.removeItem(GIVE_DRAFT_KEY); else storage?.setItem(GIVE_DRAFT_KEY, JSON.stringify(st)); } catch { /* keep in memory */ }
}
