import { useEffect, useState } from "react";
import {
  GIVE_TYPES, back, canSubmit, choose, current, editFromReview, giveDef, isSubmitted, loadGiveDraft,
  reviewComplete, saveGiveDraft, screenCode, setAnswer, share, skip, start, steps, submit, valueOf,
  type GiveState, type GiveType,
} from "@/intelligence/give-journey";

/**
 * Approved Give journeys (Figma 131:2) inside the canonical VoiceEnclosure G.
 * Local draft only — "share with communi-g" reaches the ready state without
 * publishing anything in this preview.
 */
export function GiveJourney({ onExit, initial }: { onExit: () => void; initial?: GiveState }) {
  const [st, setSt] = useState<GiveState>(() => initial ?? loadGiveDraft(typeof window === "undefined" ? undefined : window.localStorage));
  const [picker, setPicker] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => { if (!initial) saveGiveDraft(window.localStorage, st); }, [st, initial]);
  useEffect(() => setPicker(false), [st.step, st.screen]);

  const c = current(st);
  const goBack = () => { if (picker) return setPicker(false); const p = back(st); if (p) setSt(p); else onExit(); };
  const value = c ? valueOf(st, c.id) : "";

  return (
    <div className="wj gj" data-give-journey="" data-give-screen={st.screen} data-give-code={screenCode(st, picker)} data-give-type={st.type ?? ""}>
      <h1 className="wj-heading gj-heading">give</h1>

      {st.screen === "chooser" || st.screen === "selected" ? (
        <>
          <label className="wj-question" htmlFor="gj-type">what would you like to give?</label>
          <div className="wj-select-wrap">
            <select id="gj-type" className="wj-field wj-select" value={st.type ?? ""} onChange={(e) => setSt((s) => choose(s, e.target.value as GiveType))}>
              <option value="" disabled>choose type</option>
              {GIVE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            <span className="wj-caret" aria-hidden="true">▾</span>
          </div>
        </>
      ) : null}

      {c ? (
        <>
          <p className="gj-code" aria-hidden="true">{giveDef(st.type!).label}</p>
          <label className="wj-question" htmlFor="gj-answer">{c.question}</label>
          {picker && c.picker === "date" ? (
            <input id="gj-answer" className="wj-field" type="date" value={value} onChange={(e) => setSt((s) => setAnswer(s, e.target.value))} />
          ) : picker && c.picker === "photo" ? (
            <input id="gj-answer" className="wj-field" type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              setPhotoUrl(URL.createObjectURL(f)); setSt((s) => setAnswer(s, f.name));
            }} />
          ) : (
            <input
              id="gj-answer" key={`${st.type}-${c.id}`} className={`wj-field${isSubmitted(st, c.id) ? " gj-submitted" : ""}`}
              type="text" placeholder="tap to type" autoComplete="off" value={value}
              onChange={(e) => setSt((s) => setAnswer(s, e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSt(submit); } }}
            />
          )}
          {c.picker === "photo" && photoUrl && value ? <img className="gj-thumb" src={photoUrl} alt="selected photo" /> : null}
          {c.picker && !picker ? <button type="button" className="wj-action gj-picker" onClick={() => setPicker(true)}>{c.picker === "photo" ? "choose photo" : c.picker === "date" ? "choose date" : `choose ${c.picker}`}</button> : null}
        </>
      ) : null}

      {st.screen === "review" ? (
        <div className="gj-review" data-give-review="">
          <p className="wj-question">review your give</p>
          <dl className="gj-list">
            {steps(st).map((x) => (
              <button type="button" key={x.id} className="gj-row" onClick={() => setSt((s) => editFromReview(s, x.id))}>
                <dt>{x.question}</dt>
                <dd>{valueOf(st, x.id) || (x.optional ? "skipped" : "needed")}</dd>
              </button>
            ))}
          </dl>
        </div>
      ) : null}

      {st.screen === "ready" ? (
        <>
          <p className="wj-question" data-give-ready="">your give is ready for communi-g.</p>
          <p className="wj-note">preview only — nothing has been shared.</p>
        </>
      ) : null}

      <div className="wj-actions">
        <button type="button" className="wj-action" onClick={goBack}>{st.screen === "ready" ? "done" : "back"}</button>
        {st.screen === "selected" ? <button type="button" className="wj-action" onClick={() => setSt(start)}>continue →</button> : null}
        {c?.optional && !value ? <button type="button" className="wj-action" onClick={() => setSt(skip)}>skip</button> : null}
        {c && canSubmit(st) ? <button type="button" className="wj-action" onClick={() => setSt(submit)}>giver →</button> : null}
        {st.screen === "review" && reviewComplete(st) ? <button type="button" className="wj-action" onClick={() => setSt(share)}>share with communi-g</button> : null}
      </div>
    </div>
  );
}
