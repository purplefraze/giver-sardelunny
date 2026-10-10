import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { GIVE_TYPES, type GiveType } from "@/data/give-lexicon";
import { haptics } from "@/lib/haptics";
import { conversation } from "@/intelligence/voice-conversation";
import { shareCoordinator } from "@/intelligence/share-live";
import { voiceCapture } from "@/intelligence/voice-capture";
import { canGoLive, fundTargetOf, photoReminder, type VoiceFields } from "@/intelligence/voice-flow";
import { NOUN } from "@/intelligence/voice-session";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { pickedAnswerTime } from "./answer-time";
import { toDateOnly, parseDateOnly } from "@/lib/date-only";
import { CTX_LABEL, FIELDS_OF, privatePlaces, publicExtras, publicPlace } from "@/intelligence/contextual-needs";

/**
 * THE EDITABLE PREVIEW, framed by the unfolded G. One compact block, top to
 * bottom. Edits win over later voice. Only "Share with communi-g" posts.
 */
export function VoiceReview({ onDone, onSeeInCommunity }: { onDone: () => void; onSeeInCommunity: (itemId: string | null) => void }) {
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [problem, setProblem] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(()=>{setAnswer("");},[c.session?.draftId,c.session?.asking,c.session?.prompt]);
  useSyncExternalStore(shareCoordinator.subscribe, shareCoordinator.version, shareCoordinator.version);
  /* One local record per draft: a retry re-confirms it, never re-creates it. */
  const [liveId, setLiveId] = useState<string | null>(null);
  /** BACK: mic stops now; the draft stays; the G folds back to the same seat. */
  const back = () => {
    conversation.stopLocked();
    haptics.selection();
    const frame = document.querySelector<HTMLElement>("[data-voice-frame]");
    if (frame) frame.dispatchEvent(new Event("giver:fold"));
    else conversation.closeForm();
  };
  const s = c.session;
  if (!s?.action || (!c.form && s.stage !== "live")) return null;
  const action = s.action;
  const f = s.fields;
  const noun = NOUN[action];
  const service = f.context === "lesson" || f.context === "service";
  const guided=!c.inspected && s.stage!=="review";
  const temporal=!!c.timePending || s.asking==="when" || ["ctx:day","ctx:date","ctx:window","ctx:pickupTime"].includes(s.asking??"");

  if (s.stage === "live") {
    return (
      <div className="gv-sheet" data-voice-live="">
        <p className="gv-title">your {noun} is live</p>
        <div className="gv-taps gv-taps-row">
          <Button variant="ghost" type="button" className="gv-tap gv-tap-strong" onClick={() => onSeeInCommunity(liveId)}>see it in communi-g</Button>
          <Button variant="ghost" type="button" className="gv-tap" onClick={onDone}>done</Button>
        </div>
      </div>
    );
  }

  const field = (key: keyof VoiceFields, label: string, placeholder = "") => (
    <label className="gv-field">
      <span>{label}</span>
      {key === "what" || key === "title" || key === "note" || key === "want" ? <textarea rows={key === "note" ? 2 : 2} value={String(f[key] ?? "")} placeholder={placeholder} maxLength={key === "note" ? 100 : 60} onChange={e => conversation.edit(key, e.target.value)} /> : <input value={String(f[key] ?? "")} placeholder={placeholder} inputMode={key === "amount" ? "decimal" : undefined} maxLength={80} onChange={e => conversation.edit(key, e.target.value)} />}
    </label>
  );

  const share = async (skipPhoto = false) => {
    setProblem(null);
    /* Everything the Share is about, captured NOW — before any await. */
    const input = { draftId: s.draftId, action, fields: f, photo: c.photo, pin: c.pin };
    if (!canGoLive(action, f)) {
      haptics.warning();
      setProblem(f.what.trim().length < 2 ? "what is it?" : action === "fund" ? "how much are you raising? enter a goal, like 1200." : action === "give" && !f.kind ? "what kind of give is it?" : action === "trade" ? "what would you like for it?" : "where is it?");
      return;
    }
    if (!skipPhoto && photoReminder(action, f.kind, !!c.photo)) {
      setRemind(true);
      return;
    }
    setRemind(false);
    setBusy(true);
    const out = await shareCoordinator.share(input);
    const here = conversation.currentDraftId() === input.draftId;
    if (here) setBusy(false);
    if (out.kind === "busy" || out.kind === "ended") return;
    if (out.kind === "invalid" || out.kind === "refused") { if (here) { haptics.warning(); setProblem(out.say); } return; }
    if (out.kind === "failed") { if (out.visible) { haptics.warning(); setProblem("couldn't save just now. your draft is kept — tap share to try again."); } return; }
    if (out.placement === "shown") { setLiveId(out.id); haptics.light(); }
  };

  const listening = c.mode !== "off" && v.state !== "error" && v.state !== "unsupported";
  const noMic = v.state === "unsupported" ? "voice isn't available here — type into the fields." : v.state === "error" ? (v.error ?? "listening stopped. type instead, or try again.") : null;
  const ask = s.stage === "talk" || s.stage === "anything" ? s.prompt : null;

  return (
    <form className="gv-form" data-voice-review={action} data-listening={listening ? "1" : "0"} onSubmit={(e) => {
      e.preventDefault();
      /* Only the Share button itself submits — never Enter in a field. */
      const by = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
      if(guided){if(answer.trim()){conversation.answer(answer);setAnswer("");}return;}
      if (by?.dataset["share"] === "1") void share();
    }}>
      <div className="gv-scroll">
      <div className="gv-sheet">
      <Button variant="ghost" type="button" className="gv-back sr-only focus:not-sr-only" aria-label="return to the Living G (keeps your draft)" onClick={back}>return to the G</Button>
      {guided ? <section className="gv-guided" data-guided-intake="">
        <p className="g-meta">your {noun}</p>
        <h1 className="gv-question">{c.timePending?.question || ask || ({give:"what would you like to give?",wish:"what are you wishing for?",borrow:"what would you like to borrow?",lend:"what can you lend?",trade:"what would you like to trade?",fund:"what are you raising funds for?"}[action])}</h1>
        <label className="gv-field"><span className="sr-only">your answer</span><textarea aria-label="your answer" rows={2} value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(answer.trim()){conversation.answer(answer);setAnswer("");}}}} /></label>
        {listening && v.transcript?<p className="gv-heard" aria-live="polite">{v.transcript}</p>:null}
        {s.choices?.length?<div className="gv-answer-choices">{s.choices.map(choice=><Button variant="ghost" type="button" key={choice} onClick={()=>conversation.answer(choice)}>{choice}</Button>)}</div>:null}
        {temporal ? <div className="gv-date-answer">
          <Popover><PopoverTrigger asChild><Button variant="ghost" type="button" aria-label="choose a collection or availability date"><CalendarDays />{date||"choose a date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 pointer-events-auto"><Calendar mode="single" selected={parseDateOnly(date)??undefined} onSelect={d=>{if(d)setDate(toDateOnly(d));}} className="pointer-events-auto" /></PopoverContent></Popover>
          <label className="gv-field"><span>time (optional)</span><input type="time" aria-label="availability time" value={time} onChange={e=>setTime(e.target.value)} /></label>
          {date?<><p className="g-body">{pickedAnswerTime(date,time)?.label}</p><Button variant="ghost" type="button" onClick={()=>{const value=pickedAnswerTime(date,time);if(value){conversation.setTiming(value);setDate("");setTime("");}}}>use this date{time?" and time":""}</Button></>:null}
        </div>:null}
        <div className="gv-answer-actions"><Button variant="ghost" type="button" disabled={!answer.trim()} onClick={()=>{conversation.answer(answer);setAnswer("");}}>Next →</Button><Button variant="ghost" type="button" onClick={()=>conversation.inspect()}>review draft</Button></div>
        {c.understanding?<p className="g-meta" role="status">understanding…</p>:null}
        {c.understandingError?<p className="g-meta" role="status">{c.understandingError}</p>:null}
      </section> : <>
      <p className="gv-title">your {noun}</p>
      {ask || listening || v.transcript ? (
        <div className="gv-live" aria-live="polite" data-form-prompt="">
          {ask ? <p className="gv-ask">{ask}</p> : null}
          {listening && v.transcript ? <p className="gv-heard" data-form-heard="">{v.transcript}</p> : null}
        </div>
      ) : null}
      <div className="gv-fields">
        {field("title","listing title")}
        {field("what", service || action === "trade" ? "offer" : action === "fund" ? "cause" : action === "borrow" ? "need" : "what")}
        {action === "trade" ? field("want", "for") : null}
        {action === "fund" ? field("amount", "raising", "amount") : null}
        {action === "give" ? <label className="gv-field"><span>category</span><select aria-label="category" value={f.kind ?? ""} onChange={e => conversation.edit("kind", e.target.value)}><option value="">choose category</option>{GIVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label> : null}
        {!service && action !== "wish" && action !== "fund" ? field("where", "where", "an area is fine") : null}
        {f.context
          ? FIELDS_OF[f.context]
              .filter((k) => k !== "flexible" && k !== "subject" && !(service && k === "day" && f.ctx.recurrence?.startsWith("every")) && (!service || !["level", "window", "lessonDuration", "date"].includes(k) || !!f.ctx[k as keyof typeof f.ctx] || (k === "date" && f.ctx.recurrence === "one-off")))
              .map((k) => (
                <label key={k} className="gv-field">
                  <span>{CTX_LABEL[k]}</span>
                  <input
                    value={(f.ctx as Record<string, string | undefined>)[k] ?? ""}
                    type={service && k === "date" ? "date" : "text"}
                    maxLength={80}
                    placeholder={k === "pickup" || k === "dropoff" || k === "deliveryArea" ? "an area is fine" : ""}
                    onChange={(e) => conversation.editCtx(k, e.target.value)}
                  />
                </label>
              ))
          : action !== "trade"
            ? field("when", "when", action === "give" ? "e.g. tuesday" : "")
            : null}
        {(action === "borrow" || action === "lend") && !f.context ? field("duration", "how long", "e.g. a week") : null}
        {!service && (action === "give" || action === "lend" || action === "trade") ? field("condition", "condition") : null}
        {field("note", "details", "optional")}
        <div className="gv-field">
          <span>photo</span>
          {c.photo ? (
            <span className="gv-photo">
              <img src={c.photo.url} alt="your photo" />
              <Button variant="ghost" type="button" className="gv-tap" onClick={() => conversation.removePhoto()}>remove</Button>
            </span>
          ) : (
            <Button variant="ghost" type="button" className="gv-tap" onClick={() => void conversation.addPhoto()}>+ add a photo</Button>
          )}
        </div>
      </div>
      {remind ? (
        <div className="gv-remind" role="alert">
          <p>a photo helps people say yes.</p>
          <div className="gv-taps gv-taps-row">
            <Button variant="ghost" type="button" className="gv-tap gv-tap-strong" onClick={() => void conversation.addPhoto()}>add photo</Button>
            <Button variant="ghost" type="button" className="gv-tap" onClick={() => void share(true)}>continue without</Button>
          </div>
        </div>
      ) : null}
      {problem ? <p className="gv-problem" role="alert">{problem}</p> : null}
      <div className="gv-taps gv-actions">
        <Button variant="ghost" type="submit" data-share="1" className="gv-share" disabled={busy || shareCoordinator.isPending(s.draftId)}>Share with communi-g</Button>
        <Button variant="ghost" type="button" className="gv-tap" onClick={onDone}>discard</Button>
      </div>
      {!canGoLive(action,f)||s.stage==="talk"?<Button variant="ghost" type="button" onClick={()=>conversation.continueQuestions()}>continue questions</Button>:null}
      </>}
      {noMic ? <p className="gv-problem" role="status">{noMic}</p> : null}
      </div>
      </div>
      <div className="gv-rec-dock">
        <Button variant="ghost"
          type="button"
          className="gv-rec"
          data-form-record={listening ? "stop" : "record"}
          aria-pressed={listening}
          aria-label={listening ? "stop recording" : "record into this form"}
          onClick={() => {
            /* Synchronous from the tap (Safari activation). Next tap stops. */
            if (listening) { haptics.selection(); conversation.stopLocked(); }
            else { haptics.light(); conversation.recordInForm(); }
          }}
        >
          <span className="gv-rec-dot" aria-hidden="true" />
          <span className="gv-rec-word">{listening ? "stop" : "record"}</span>
        </Button>
      </div>
    </form>
  );
}
