import { useEffect, useState } from "react";
import {
  WISH_TYPES, back, canContinue, chooseType, answer, currentStep, loadWishDraft, next, saveWishDraft,
  type WishJourneyState, type WishType,
} from "@/intelligence/wish-journey";

/**
 * Approved Figma Wish journey (427:2096 entry, 429:2100 item, 429:2998 food).
 * Rendered inside the existing canonical VoiceEnclosure G. Phase 1: item and
 * food question steps only; never shares, never writes to the cloud.
 */
export function WishJourney({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<WishJourneyState>(() =>
    loadWishDraft(typeof window === "undefined" ? undefined : window.localStorage),
  );
  useEffect(() => { saveWishDraft(window.localStorage, state); }, [state]);

  const step = currentStep(state);
  const typeDef = state.type ? WISH_TYPES.find((t) => t.type === state.type) : null;
  const value = state.type && step ? state.answers[state.type]?.[step.id] ?? "" : "";

  const goBack = () => {
    const prev = back(state);
    if (prev) setState(prev);
    else onExit();
  };
  const goNext = () => setState((s) => next(s));

  return (
    <div className="wj" data-wish-journey="" data-wish-step={state.done ? "done" : step?.id ?? "entry"} data-wish-type={state.type ?? ""}>
      <h1 className="wj-heading">wish</h1>
      {state.done ? (
        <>
          <p className="wj-question">your answers are kept.</p>
          <p className="wj-note" data-wish-pending="">photo, review and share arrive in the next preview pass. nothing has been shared.</p>
        </>
      ) : step === null ? (
        <>
          <label className="wj-question" htmlFor="wj-type">what are you wishing for?</label>
          <div className="wj-select-wrap">
            <select
              id="wj-type"
              className="wj-field wj-select"
              value={state.type ?? ""}
              onChange={(e) => setState((s) => chooseType(s, e.target.value as WishType))}
            >
              <option value="" disabled>choose type</option>
              {WISH_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.active ? t.label : `${t.label} — coming in next preview pass`}</option>
              ))}
            </select>
            <span className="wj-caret" aria-hidden="true">▾</span>
          </div>
          {typeDef && !typeDef.active ? <p className="wj-note" data-wish-coming="">{typeDef.label} is coming in the next preview pass.</p> : null}
        </>
      ) : (
        <>
          <label className="wj-question" htmlFor="wj-answer">{step.question}</label>
          <input
            id="wj-answer"
            key={`${state.type}-${step.id}`}
            className="wj-field"
            type="text"
            placeholder="tap to type"
            autoComplete="off"
            value={value}
            onChange={(e) => setState((s) => answer(s, e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goNext(); } }}
          />
        </>
      )}
      <div className="wj-actions">
        <button type="button" className="wj-action" onClick={goBack}>back</button>
        {!state.done && canContinue(state) ? (
          <button type="button" className="wj-action" onClick={goNext}>continue →</button>
        ) : null}
      </div>
    </div>
  );
}
