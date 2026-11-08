/**
 * WISH GUIDED JOURNEY ENGINE — Figma handoff phase 1 (Nov 8 2026).
 * Question sequences copied from approved Wish page 424:2136 node names.
 * Only `item` and `food` are ACTIVE in this preview pass; the other five are
 * defined but not routed. Pure state: no network, no publish, no Sparks.
 */

export type WishType = "item" | "food" | "skill" | "time" | "space" | "experience" | "other";

export type WishStep = {
  id: string;
  question: string;
  /** Skip this step when the predicate is true for the current answers. */
  skipIf?: (answers: Record<string, string>) => boolean;
};

const isOnline = (key: string) => (a: Record<string, string>) => /online|digital|remote/i.test(a[key] ?? "");

export const WISH_TYPES: readonly { type: WishType; label: string; active: boolean; steps: readonly WishStep[] }[] = [
  {
    type: "item", label: "item", active: true, steps: [
      { id: "what", question: "what item are you wishing for?" },
      { id: "size", question: "what size would work?" },
      { id: "condition", question: "what condition would you accept?" },
      { id: "receive", question: "how could you receive it?" },
      { id: "where", question: "where could you receive it?" },
      { id: "when", question: "when would it help to have it?" },
    ],
  },
  {
    type: "food", label: "food", active: true, steps: [
      { id: "what", question: "what food are you wishing for?" },
      { id: "kind", question: "what kind of food would help?" },
      { id: "dietary", question: "any allergies or dietary needs?" },
      { id: "people", question: "how many people need food?" },
      { id: "receive", question: "how could you receive it?" },
      { id: "where", question: "where could you receive it?" },
      { id: "when", question: "when would it help?" },
    ],
  },
  {
    type: "skill", label: "skill or lesson", active: false, steps: [
      { id: "what", question: "what skill or lesson are you wishing for?" },
      { id: "format", question: "how would you prefer to learn?" },
      { id: "length", question: "how long would be helpful?" },
      { id: "level", question: "what level or goal should they know?" },
      { id: "where", question: "where would an in-person lesson work?", skipIf: isOnline("format") },
      { id: "when", question: "when could you meet?" },
    ],
  },
  {
    type: "time", label: "time or help", active: false, steps: [
      { id: "what", question: "what help are you wishing for?" },
      { id: "time", question: "how much time would help?" },
      { id: "inperson", question: "does it need to happen in person?" },
      { id: "where", question: "where would the help happen?", skipIf: (a) => /^no\b|remote|online/i.test(a["inperson"] ?? "") },
      { id: "when", question: "when would help be useful?" },
      { id: "safety", question: "any important safety or access needs?" },
    ],
  },
  {
    type: "space", label: "space or resource", active: false, steps: [
      { id: "what", question: "what space or resource do you wish for?" },
      { id: "use", question: "what would you use it for?" },
      { id: "people", question: "how many people need access?" },
      { id: "physical", question: "physical space or digital resource?" },
      { id: "where", question: "where would it be useful?", skipIf: isOnline("physical") },
      { id: "when", question: "when and for how long?" },
      { id: "access", question: "any access requirements?" },
    ],
  },
  {
    type: "experience", label: "experience", active: false, steps: [
      { id: "what", question: "what experience do you wish for?" },
      { id: "kind", question: "what kind of experience?" },
      { id: "people", question: "how many would attend?" },
      { id: "format", question: "online or in person?" },
      { id: "where", question: "where would it work?", skipIf: isOnline("format") },
      { id: "when", question: "when would you prefer?" },
    ],
  },
  {
    type: "other", label: "other", active: false, steps: [
      { id: "what", question: "what are you wishing for?" },
      { id: "how", question: "how could someone grant this wish?" },
      { id: "where", question: "where could it happen?" },
      { id: "when", question: "when would it help?" },
      { id: "notes", question: "anything important to know?" },
    ],
  },
];

export type WishJourneyState = {
  type: WishType | null;
  /** Index into visibleSteps(); -1 = the type-selection entry screen. */
  step: number;
  /** Answers keyed per type so switching types never loses typed input. */
  answers: Partial<Record<WishType, Record<string, string>>>;
  /** True once the last question is passed (phase 1 end: no review/share yet). */
  done: boolean;
};

export const EMPTY_WISH: WishJourneyState = { type: null, step: -1, answers: {}, done: false };

export const wishDef = (type: WishType) => WISH_TYPES.find((t) => t.type === type)!;

export function visibleSteps(state: WishJourneyState): WishStep[] {
  if (!state.type) return [];
  const a = state.answers[state.type] ?? {};
  return wishDef(state.type).steps.filter((s) => !s.skipIf?.(a));
}

export function currentStep(state: WishJourneyState): WishStep | null {
  return state.step < 0 ? null : visibleSteps(state)[state.step] ?? null;
}

export function chooseType(state: WishJourneyState, type: WishType): WishJourneyState {
  return { ...state, type, done: false };
}

export function answer(state: WishJourneyState, value: string): WishJourneyState {
  const step = currentStep(state);
  if (!state.type || !step) return state;
  const prev = state.answers[state.type] ?? {};
  return { ...state, answers: { ...state.answers, [state.type]: { ...prev, [step.id]: value } } };
}

/** Continue is allowed only from an active type, and with a non-empty answer on question screens. */
export function canContinue(state: WishJourneyState): boolean {
  if (!state.type || !wishDef(state.type).active) return false;
  if (state.step < 0) return true;
  const step = currentStep(state);
  return !!step && (state.answers[state.type]?.[step.id] ?? "").trim().length > 0;
}

export function next(state: WishJourneyState): WishJourneyState {
  if (!canContinue(state)) return state;
  const last = visibleSteps(state).length - 1;
  if (state.step >= last) return { ...state, done: true };
  return { ...state, step: state.step + 1 };
}

/** Back: from done → last question; question → previous; first question → entry. Entry back returns null (exit). */
export function back(state: WishJourneyState): WishJourneyState | null {
  if (state.done) return { ...state, done: false };
  if (state.step < 0) return null;
  return { ...state, step: state.step - 1 };
}

/* Local preview-only draft persistence (browser storage, never the cloud). */
export const WISH_DRAFT_KEY = "giver:wish-journey:v1";

export function loadWishDraft(storage: Pick<Storage, "getItem"> | undefined): WishJourneyState {
  try {
    const raw = storage?.getItem(WISH_DRAFT_KEY);
    if (!raw) return EMPTY_WISH;
    const v = JSON.parse(raw) as WishJourneyState;
    if (typeof v !== "object" || v === null || typeof v.step !== "number") return EMPTY_WISH;
    return { ...EMPTY_WISH, ...v };
  } catch {
    return EMPTY_WISH;
  }
}

export function saveWishDraft(storage: Pick<Storage, "setItem"> | undefined, state: WishJourneyState): void {
  try { storage?.setItem(WISH_DRAFT_KEY, JSON.stringify(state)); } catch { /* storage full/blocked: keep in memory */ }
}
