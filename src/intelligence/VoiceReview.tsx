import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { GIVE_TYPES, type GiveType } from "@/data/give-lexicon";
import { defaultExpiry, expiresAt } from "@/data/give-when";
import { savePin } from "@/data/give-pins";
import { itemsStore, type ItemDetails } from "@/data/items";
import { myProfileStore } from "@/data/my-profile";
import { ensureLiveSession } from "@/data/cloud/session";
import { confirmItemSaved, pullItems } from "@/data/cloud/items-sync";
import { prepareGivePhoto, uploadGivePhoto } from "@/lib/give-photo";
import { haptics } from "@/lib/haptics";
import { TOPIC_OF } from "@/components/give/GiveFlow";
import { conversation } from "@/intelligence/voice-conversation";
import { voiceCapture } from "@/intelligence/voice-capture";
import { canGoLive, fundTargetOf, photoReminder, type VoiceFields } from "@/intelligence/voice-flow";
import { NOUN } from "@/intelligence/voice-session";
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
  /* One local record per draft: a retry re-confirms it, never re-creates it. */
  const [liveId, setLiveId] = useState<string | null>(null);
  const folding = useRef(false);
  /** BACK: mic stops now; the draft stays; the G folds back to the same seat. */
  const back = () => {
    if (folding.current) return;
    folding.current = true;
    conversation.stopLocked();
    haptics.selection();
    const frame = document.querySelector<HTMLElement>("[data-voice-frame]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (frame && !reduced) {
      frame.dataset["folding"] = "1";
      setTimeout(() => conversation.closeForm(), 280);
    } else conversation.closeForm();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && conversation.get().form) { e.preventDefault(); back(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = c.session;
  if (!s?.action || (!c.form && s.stage !== "live")) return null;
  const action = s.action;
  const f = s.fields;
  const noun = NOUN[action];
  const service = f.context === "lesson" || f.context === "service";

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
      {key === "what" || key === "note" || key === "want" ? <textarea rows={key === "note" ? 2 : 2} value={String(f[key] ?? "")} placeholder={placeholder} maxLength={key === "note" ? 100 : 60} onChange={e => conversation.edit(key, e.target.value)} /> : <input value={String(f[key] ?? "")} placeholder={placeholder} inputMode={key === "amount" ? "decimal" : undefined} maxLength={80} onChange={e => conversation.edit(key, e.target.value)} />}
    </label>
  );

  const share = async (skipPhoto = false) => {
    setProblem(null);
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
    if ((await ensureLiveSession()) === "ended") {
      setBusy(false);
      return;
    }
    const extras: Record<string, string> = {};
    if (f.kind) extras["kind"] = f.kind;
    if (f.condition.trim()) extras["condition"] = f.condition.trim();
    if (f.when.trim() && !f.context) extras["when"] = f.when.trim();
    /* Request-specific details travel with the post; precise addresses never do. */
    if (f.context) Object.assign(extras, publicExtras(f.ctx));
    if (f.duration.trim()) extras["how long"] = f.duration.trim();
    const details: ItemDetails = {
      ...(service ? { where: f.ctx.format === "online" ? "online" : publicExtras(f.ctx)["area"] ?? "" } : f.where.trim() ? { where: publicPlace(f.where.trim()) } : {}),
      ...(Object.keys(extras).length ? { extras } : {}),
    };
    const note = f.note.trim() || undefined;
    const seatAt = conversation.seat();
    let id = s.recordId ?? null;
    if (id && !itemsStore.get().items.find((it) => it.id === id)) id = null;
    if (!id) {
      let result: ReturnType<typeof myProfileStore.addItem>;
      if (action === "give") {
        const kind = f.kind as GiveType;
        details.topic = TOPIC_OF[kind];
        details.expiresAt = expiresAt(defaultExpiry(kind), null).toISOString();
        result = myProfileStore.addItem("give", f.what.trim(), undefined, note, { details });
      } else if (action === "trade") {
        result = myProfileStore.addItem("trade", f.what.trim(), { offer: f.what.trim(), want: f.want.trim() }, note, { details });
      } else if (action === "borrow" || action === "lend") {
        result = myProfileStore.addItem("borrow", f.what.trim(), undefined, note, { side: action, details });
      } else {
        if (action === "fund") {
          const target = fundTargetOf(f);
          /* Never a Wish fallback: an invalid goal creates no record at all. */
          if (target === null) { setBusy(false); setProblem("how much are you raising? enter a goal, like 1200."); return; }
          details.fundTarget = target;
        }
        result = myProfileStore.addItem("wish", f.what.trim(), undefined, note, { details });
      }
      if (!result.ok || !result.id) {
        setBusy(false);
        haptics.warning();
        setProblem(result.reason === "account" ? (result.say ?? "finish your account in my g to share this.") : (result.say ?? "this couldn't be shared right now."));
        return;
      }
      id = result.id;
      if (c.pin) savePin(id, c.pin);
      const exact = privatePlaces(f.ctx);
      if (Object.keys(exact).length) {
        try {
          localStorage.setItem(`giver.private-places.${id}`, JSON.stringify(exact));
        } catch {
          /* storage unavailable — the public post already hides the address */
        }
      }
      if (c.photo) {
        if (action === "give") {
          const prep = await prepareGivePhoto(c.photo.file);
          const up = prep.ok ? await uploadGivePhoto(id, prep.photo) : null;
          if (up) itemsStore.patch(id, { photos: [up.url], details: { ...details, photoPath: up.path } });
        } else itemsStore.addPhoto(id, c.photo.url);
      }
      conversation.attachRecord(seatAt, id);
    } else itemsStore.patch(id, { text: f.what.trim(), ...(note ? { note } : {}), details: { ...(itemsStore.get().items.find((it) => it.id === id)?.details ?? {}), ...details }, published: true });
    if (!id) return;
    /* LIVE ONLY AFTER THE SERVER HAS IT. A failed save keeps the draft here,
       hides the local copy, and offers the same button again. */
    const saved = await confirmItemSaved(id);
    if (!saved) {
      if (conversation.seat() !== seatAt) return;
      itemsStore.patch(id, { published: false });
      setBusy(false);
      haptics.warning();
      setProblem("couldn't save just now. your draft is kept — tap share to try again.");
      return;
    }
    void pullItems().catch(() => {});
    if (!conversation.confirmLive(seatAt, id)) return;
    setLiveId(id);
    setBusy(false);
    haptics.light();
  };

  const listening = c.mode !== "off" && v.state !== "error" && v.state !== "unsupported";
  const noMic = v.state === "unsupported" ? "voice isn't available here — type into the fields." : v.state === "error" ? (v.error ?? "listening stopped. type instead, or try again.") : null;
  const ask = s.stage === "talk" || s.stage === "anything" ? s.prompt : null;

  return (
    <form className="gv-sheet gv-form" data-voice-review={action} data-listening={listening ? "1" : "0"} onSubmit={(e) => {
      e.preventDefault();
      /* Only the Share button itself submits — never Enter in a field. */
      const by = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
      if (by?.dataset["share"] === "1") void share();
    }}>
      <Button variant="ghost" type="button" className="gv-back sr-only focus:not-sr-only" aria-label="return to the Living G (keeps your draft)" onClick={back}>return to the G</Button>
      <p className="gv-title">your {noun}</p>
      {ask || listening || v.transcript ? (
        <div className="gv-live" aria-live="polite" data-form-prompt="">
          {ask ? <p className="gv-ask">{ask}</p> : null}
          {listening && v.transcript ? <p className="gv-heard" data-form-heard="">{v.transcript}</p> : null}
        </div>
      ) : null}
      <div className="gv-fields">
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
      <div className="gv-taps gv-taps-row">
        <Button variant="ghost" type="submit" data-share="1" className="gv-share" disabled={busy}>Share with communi-g</Button>
        <Button variant="ghost" type="button" className="gv-tap" onClick={onDone}>discard</Button>
      </div>
      {noMic ? <p className="gv-problem" role="status">{noMic}</p> : null}
      <div className="gv-rec-clear" aria-hidden="true" />
      <div className="gv-rec-dock">
        <button
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
        </button>
      </div>
    </form>
  );
}
