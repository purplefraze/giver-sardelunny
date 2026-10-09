import { useState, useSyncExternalStore } from "react";
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
import { canGoLive, photoReminder, type VoiceFields } from "@/intelligence/voice-flow";
import { NOUN } from "@/intelligence/voice-session";
import { CTX_LABEL, FIELDS_OF, privatePlaces, publicExtras } from "@/intelligence/contextual-needs";

/**
 * THE EDITABLE PREVIEW, framed by the unfolded G. One compact block, top to
 * bottom. Edits win over later voice. Only "Share with the community" posts.
 */
export function VoiceReview({ onDone, onSeeInCommunity }: { onDone: () => void; onSeeInCommunity: (itemId: string | null) => void }) {
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [problem, setProblem] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  /* One local record per draft: a retry re-confirms it, never re-creates it. */
  const created = useRef<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const s = c.session;
  if (!s?.action || (s.stage !== "review" && s.stage !== "live")) return null;
  const action = s.action;
  const f = s.fields;
  const noun = NOUN[action];

  if (s.stage === "live") {
    return (
      <div className="gv-sheet" data-voice-live="">
        <p className="gv-title">your {noun} is live</p>
        <div className="gv-taps gv-taps-row">
          <button type="button" className="gv-tap gv-tap-strong" onClick={() => onSeeInCommunity(liveId)}>see it in communi-g</button>
          <button type="button" className="gv-tap" onClick={onDone}>done</button>
        </div>
      </div>
    );
  }

  const field = (key: keyof VoiceFields, label: string, placeholder = "") => (
    <label className="gv-field">
      <span>{label}</span>
      <input
        value={String(f[key] ?? "")}
        placeholder={placeholder}
        maxLength={key === "note" ? 100 : 60}
        inputMode={key === "amount" ? "numeric" : undefined}
        onChange={(e) => conversation.edit(key, e.target.value)}
      />
    </label>
  );

  const share = async (skipPhoto = false) => {
    setProblem(null);
    if (!canGoLive(action, f)) {
      haptics.warning();
      setProblem(f.what.trim().length < 2 ? "what is it?" : action === "give" && !f.kind ? "what kind of give is it?" : action === "trade" ? "what would you like for it?" : "where is it?");
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
      ...(f.where.trim() ? { where: f.where.trim() } : {}),
      ...(Object.keys(extras).length ? { extras } : {}),
    };
    const note = f.note.trim() || undefined;
    let id = created.current;
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
        const cents = Math.round(Number(f.amount.replace(/[^0-9.]/g, "")) * 100);
        if (action === "fund" && cents > 0) details.fundTarget = cents;
        result = myProfileStore.addItem("wish", f.what.trim(), undefined, note, { details });
      }
      if (!result.ok || !result.id) {
        setBusy(false);
        haptics.warning();
        setProblem(result.reason === "account" ? (result.say ?? "finish your account in my g to share this.") : (result.say ?? "this couldn't be shared right now."));
        return;
      }
      const id = result.id;
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
      created.current = id;
    } else itemsStore.patch(id, { published: true });
    /* LIVE ONLY AFTER THE SERVER HAS IT. A failed save keeps the draft here,
       hides the local copy, and offers the same button again. */
    const saved = await confirmItemSaved(id);
    if (!saved) {
      itemsStore.patch(id, { published: false });
      setBusy(false);
      haptics.warning();
      setProblem("couldn't save just now. your draft is kept — tap share to try again.");
      return;
    }
    void pullItems().catch(() => {});
    setLiveId(id);
    setBusy(false);
    haptics.light();
    conversation.live();
  };

  const listening = c.mode !== "off";

  return (
    <form className="gv-sheet" data-voice-review={action} onSubmit={(e) => { e.preventDefault(); void share(); }}>
      <p className="gv-title">your {noun}</p>
      <div className="gv-fields">
        {field("what", action === "trade" ? "offering" : "what")}
        {action === "trade" ? field("want", "for") : null}
        {action === "fund" ? field("amount", "raising", "amount") : null}
        {action === "give" ? (
          <div className="gv-field">
            <span>kind</span>
            <div className="gv-chips">
              {GIVE_TYPES.map((t) => (
                <button key={t} type="button" aria-pressed={f.kind === t} className="gv-chip" onClick={() => conversation.edit("kind", t)}>{t}</button>
              ))}
            </div>
          </div>
        ) : null}
        {action !== "wish" && action !== "fund" ? field("where", "where", "area or street") : null}
        {f.context
          ? FIELDS_OF[f.context]
              .filter((k) => k !== "flexible")
              .map((k) => (
                <label key={k} className="gv-field">
                  <span>{CTX_LABEL[k]}</span>
                  <input
                    value={(f.ctx as Record<string, string | undefined>)[k] ?? ""}
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
        {action === "give" || action === "lend" || action === "trade" ? field("condition", "condition") : null}
        {field("note", "anything else")}
        <div className="gv-field">
          <span>photo</span>
          {c.photo ? (
            <span className="gv-photo">
              <img src={c.photo.url} alt="your photo" />
              <button type="button" className="gv-tap" onClick={() => conversation.removePhoto()}>remove</button>
            </span>
          ) : (
            <button type="button" className="gv-tap" onClick={() => void conversation.addPhoto()}>+ add a photo</button>
          )}
        </div>
      </div>
      <div className="gv-taps gv-taps-row">
        <button
          type="button"
          className="gv-tap"
          aria-pressed={listening}
          onClick={() => (listening ? conversation.stopLocked() : (conversation.press(), conversation.release("keep")))}
        >
          {listening ? "stop listening" : "say more"}
        </button>
        {v.state === "listening" && v.transcript ? <span className="gv-heard-inline">{v.transcript}</span> : null}
      </div>
      {remind ? (
        <div className="gv-remind" role="alert">
          <p>a photo helps people say yes.</p>
          <div className="gv-taps gv-taps-row">
            <button type="button" className="gv-tap gv-tap-strong" onClick={() => void conversation.addPhoto()}>add photo</button>
            <button type="button" className="gv-tap" onClick={() => void share(true)}>continue without</button>
          </div>
        </div>
      ) : null}
      {problem ? <p className="gv-problem" role="alert">{problem}</p> : null}
      <div className="gv-taps gv-taps-row">
        <button type="submit" className="gv-share" disabled={busy}>Share with the community</button>
        <button type="button" className="gv-tap" onClick={onDone}>cancel</button>
      </div>
    </form>
  );
}
