import { askLocation } from "@/data/my-location";
import type { Pin } from "@/data/give-pins";
import { pickImages, readImage, shrinkImage } from "@/lib/pick-image";
import { voiceCapture } from "@/intelligence/voice-capture";
import { editField, hear, isEcho, nextAsk, startSession, sessionForSeat, type VoiceSession } from "@/intelligence/voice-session";
import { followUp, interpretDraft } from "@/lib/followup.functions";
import type { VoiceFields } from "@/intelligence/voice-flow";
import type { GiverAction } from "@/intelligence/action-draft";
import { contextOf } from "@/intelligence/contextual-needs";
import { inferGiveType } from "@/data/give-lexicon";
import { listingTitle, validateDraftSuggestion } from "./draft-understanding";
import { readAnswerTime, type AnswerTime } from "./answer-time";

/**
 * THE ONE VOICE CONVERSATION — lives while the G stays intact.
 * Main toggle tap starts/stops hands-free listening; "off" keeps the draft.
 * The legacy hold adapter is only for the existing profile/review controls.
 * Listening pauses while Giver speaks. On the G, reaching review stops it;
 * inside the unfolded form only an explicit record tap starts or stops it.
 * Nothing here publishes.
 */
export type MicMode = "off" | "hold" | "locked";

export type Conversation = {
  session: VoiceSession | null;
  mode: MicMode;
  photo: { file: File; url: string } | null;
  pin: Pin | null;
  picking: boolean;
  /** The unfolded editable form is showing (manual-first or voice-to-review). */
  form: boolean;
  /** Fields the person typed; voice and the model never overwrite them. */
  edited: string[];
  inspected?: boolean;
  understanding?: boolean;
  understandingError?: string | null;
  timePending?: {raw:string;question:string;choices:string[]} | null;
};

const BLANK = { photo: null, pin: null, picking: false, form: false, edited: [] as string[], inspected:false, understanding:false, understandingError:null, timePending:null };
let snap: Conversation = { session: null, mode: "off", ...BLANK };
const subs = new Set<() => void>();
let spokenPrompt = "";
let revision = 0;
const parked = new Map<string, Conversation>();
let currentSeat = "";
let wired = false;

const set = (next: Partial<Conversation>) => {
  if (next.session !== undefined) revision++;
  snap = { ...snap, ...next };
  subs.forEach((f) => f());
};

const mark = (k: string) => (snap.edited.includes(k) ? snap.edited : [...snap.edited, k]);
/** The person's typed values survive any later voice turn. */
function keepEdits(before: VoiceSession, after: VoiceSession): VoiceSession {
  if (!snap.edited.length || before.action !== after.action) return after;
  const fields = { ...after.fields, ctx: { ...after.fields.ctx } } as VoiceFields;
  for (const k of snap.edited) {
    if (k.startsWith("ctx:")) { const c = k.slice(4) as keyof VoiceFields["ctx"]; (fields.ctx as Record<string, unknown>)[c] = before.fields.ctx[c]; }
    else (fields as Record<string, unknown>)[k] = before.fields[k as keyof VoiceFields];
  }
  if (snap.edited.includes("what") && before.fields.context) fields.context = before.fields.context;
  return { ...after, fields };
}

const speakIfNew = () => {
  const s = snap.session;
  /* Inside the form the question is on screen, never spoken (no self-capture). */
  if (!s || snap.form || snap.mode === "off" || snap.mode === "hold" || s.stage === "review" || s.stage === "live") return;
  if (s.prompt === spokenPrompt) return;
  spokenPrompt = s.prompt;
  voiceCapture.speak(s.prompt, () => {
    if (snap.mode === "locked" && !snap.picking && voiceCapture.get().state === "idle" && snap.session?.stage !== "review" && snap.session?.stage !== "live") voiceCapture.start();
  });
};

const advance = (words: string) => {
  if (!snap.session) return;
  if (isEcho(words, spokenPrompt)) return;
  const before = snap.session;
  const pending=snap.timePending;
  let input=words;
  if(pending) {
    const day=pending.raw.match(/\b(?:sun|mon|tues|wednes|thurs|fri|satur)day\b/i)?.[0];
    input=day && /\b(this|next|every)\b/i.test(words) ? pending.raw.replace(day,words) : pending.raw.replace(/\bat\s+\d{1,2}(?::\d{2})?\b/i,words);
  }
  let after = keepEdits(before, hear(before, input));
  if(after.action && after.fields.what && !snap.edited.includes("title")) after={...after,fields:{...after.fields,title:listingTitle(after.action,after.fields.what)}};
  if(/^(?:actually|i meant|instead)\b/i.test(input)&&!snap.edited.includes("what")&&after.action){
    const correction=input.replace(/^(?:actually|i meant|instead)\s*/i,"");
    if(inferGiveType(correction)&&!contextOf(correction))after={...after,fields:{...after.fields,what:correction.replace(/^(?:a|an|the)\s+/i,""),kind:after.action==="give"&&!snap.edited.includes("kind")?inferGiveType(correction):after.fields.kind,title:!snap.edited.includes("title")?listingTitle(after.action,correction):after.fields.title??""}};
  }
  const isTime=(!after.fields.context||after.fields.context==="lesson"||after.fields.context==="service")&&(before.asking==="when"||pending||/\b(today|tomorrow|tuesday|wednesday|thursday|friday|saturday|sunday|monday|at \d)\b/i.test(input));
  if(isTime&&!snap.edited.includes("when")) {
    const reading=readAnswerTime(input);
    if(reading.question) {set({timePending:{raw:input,question:reading.question,choices:reading.choices},session:{...after,stage:"talk",asking:"when",prompt:reading.question,choices:reading.choices}});void refine();return;}
    if(reading.value) {
      const value=reading.value,service=after.fields.context==="lesson"||after.fields.context==="service";
      const ctx={...after.fields.ctx,...(value.date?{date:value.date}:{}),...(value.time?{window:value.time}:{}),...(value.recurrence?{recurrence:value.recurrence}:{}),day:value.label};delete ctx.__weekday;delete ctx.__ambig;
      after={...after,fields:{...after.fields,timing:value,when:value.label,...(service?{ctx}:{})}};
    }
    set({timePending:null});
  }
  set({ session: after.action && after.stage !== "live" ? nextAsk(after) : after });
  if (snap.session?.stage === "review" && !snap.form) { set({ mode: "off" }); voiceCapture.stop(); return; }
  void locate();
  void refine();
  if (snap.mode === "locked") speakIfNew();
};

/**
 * THE MODEL'S SECOND READ. The rule question is already on screen; the model
 * (whole conversation + draft) may fill details the rules missed, and may
 * phrase the next question. Its answer only applies if nothing new was said
 * meanwhile, only fills EMPTY details, and never saves or shares anything.
 * Any failure leaves the rule question standing.
 */
async function refine() {
  const s = snap.session;
  const kind = s?.fields.context;
  if (!s?.action || s.stage === "live") return;
  if(!kind) {
    const turn=revision,draft=s.draftId;
    set({understanding:true,understandingError:null});
    try {
      const result=await interpretDraft({data:{action:s.action,fields:s.fields,said:s.said.slice(-30)}});
      const cur=snap.session;
      if(!cur||cur.draftId!==draft||revision!==turn)return;
      const v=result.reading?validateDraftSuggestion(result.reading,cur.action??s.action,cur.fields,cur.said):null;
      let fields={...cur.fields};
      if(v){if(!fields.what&&v.subject&&!snap.edited.includes("what"))fields.what=v.subject;if(v.title&&!snap.edited.includes("title"))fields.title=v.title;if(v.category&&!snap.edited.includes("kind"))fields.kind=v.category;if(v.want&&!fields.want&&!snap.edited.includes("want"))fields.want=v.want;if(v.amount&&!fields.amount&&!snap.edited.includes("amount"))fields.amount=v.amount;}
      const next=nextAsk({...cur,fields});
      set({understanding:false,understandingError:result.error,session:snap.timePending?{...next,prompt:snap.timePending.question,asking:"when",choices:snap.timePending.choices,stage:"talk"}:next});
    }catch {if(snap.session?.draftId===draft&&revision===turn)set({understanding:false,understandingError:"You can keep typing or review your draft."});}
    return;
  }
  if (s.stage !== "talk" && s.stage !== "anything") return;
  const turn = revision;
  let r: Awaited<ReturnType<typeof followUp>>;
  try {
    r = await followUp({ data: { kind, ctx: s.fields.ctx as Record<string, string>, said: s.said } });
  } catch {
    return;
  }
  const cur = snap.session;
  if (!cur || revision !== turn || cur.fields.context !== kind || r.source !== "model") return;
  const ctx = { ...cur.fields.ctx } as Record<string, string | undefined>;
  for (const [k, v] of Object.entries(r.ctx)) if (v && !ctx[k] && !snap.edited.includes(`ctx:${k}`)) ctx[k] = v;
  let next = nextAsk({ ...cur, fields: { ...cur.fields, ctx } });
  const unspoken = cur.prompt !== spokenPrompt;
  if (r.ask && r.field && next.asking === `ctx:${r.field}` && (unspoken || next.asking !== cur.asking)) next = { ...next, prompt: r.ask };
  if (next.asking === cur.asking && next.prompt === cur.prompt && JSON.stringify(ctx) === JSON.stringify(cur.fields.ctx)) return;
  set({ session: next });
  if (next.stage === "review" && !snap.form) { set({mode:"off"}); voiceCapture.stop(); }
  else if (snap.mode === "locked") speakIfNew();
}

async function locate() {
  const s = snap.session;
  if (!s?.wantsLocation || snap.pin) return;
  const turn = revision;
  const r = await askLocation();
  const cur = snap.session;
  if (!cur || turn !== revision) return;
  if (r.ok) {
    set({ pin: r.pin, session: { ...cur, fields: { ...cur.fields, where: cur.fields.where || "near my current location" } } });
  } else {
    set({
      session: { ...cur, wantsLocation: false, asking: "where", prompt: "location isn't allowed here. say the area instead, or type it." },
    });
  }
}

function wire() {
  if (wired) return;
  wired = true;
  voiceCapture.onFinal(advance);
  /* Hands-free: when the browser ends a recognition segment on its own,
     carry on listening only in an active hands-free draft. Explicit stop sets mode off. */
  voiceCapture.subscribe(() => {
    const v = voiceCapture.get();
    const may = () => snap.mode === "locked" && !snap.picking && !!snap.session && snap.session.stage !== "live" && (snap.form || snap.session.stage !== "review");
    if (v.state === "idle" && may()) {
      queueMicrotask(() => {
        if (voiceCapture.get().state === "idle" && may()) voiceCapture.start();
      });
    }
    if ((v.state === "error" || v.state === "unsupported") && snap.mode !== "off") set({ mode: "off" });
  });
}

export const conversation = {
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  get: () => snap,
  getServer: () => snap,

  selectSeat(seat: string) {
    if (seat === currentSeat) return;
    if (snap.session && currentSeat) parked.set(currentSeat, snap);
    currentSeat = seat;
    spokenPrompt = "";
    set({ ...(parked.get(seat) ?? { session:sessionForSeat(seat), ...BLANK }), mode:"off" });
    voiceCapture.cancel();
  },
  toggle(seat: string) {
    wire();
    if (snap.mode !== "off") { conversation.stopLocked(); return; }
    if (!snap.session || currentSeat !== seat) conversation.selectSeat(seat);
    if (snap.session?.stage === "live" || (snap.session?.stage === "review" && !snap.form)) return;
    set({ mode: "locked" });
    voiceCapture.start();
  },
  /** Legacy profile/review adapter. Finger down on the record button. Synchronous (Safari activation). */
  press(seed: GiverAction | null = null) {
    wire();
    if (!snap.session) {
      spokenPrompt = "";
      set({ session: startSession(seed) });
    }
    set({ mode: "hold" });
    voiceCapture.start();
  },
  /** Release: "keep" locks hands-free, "stop" ends this recording only. */
  release(outcome: "stop" | "keep") {
    if (outcome === "keep") {
      set({ mode: "locked" });
      return;
    }
    set({ mode: "off" });
    voiceCapture.stop();
  },
  /** The toggle hold was cancelled / lost capture: stop cleanly, keep the draft. */
  abortHold() {
    set({ mode: "off" });
    voiceCapture.stop();
  },
  /** Tap on the locked button. The draft stays. */
  stopLocked() {
    set({ mode: "off" });
    voiceCapture.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  },
  /** Typing works everywhere (fallback + permission recovery). */
  type(words: string) {
    wire();
    if (!snap.session) set({ session: startSession() });
    advance(words);
    speakIfNew();
  },
  choose(words: string) {
    conversation.type(words);
  },
  /** Editing a contextual detail in the preview (the person's edit wins). */
  editCtx(field: string, value: string) {
    const s = snap.session;
    if (s) set({ edited: mark(`ctx:${field}`), session: { ...s, asking: s.asking === "seed" ? null : s.asking, fields: { ...s.fields, ctx: { ...s.fields.ctx, [field]: value } } } });
  },
  edit(field: keyof VoiceFields, value: string) {
    const s = snap.session;
    if (!s) return;
    let next = editField(s, field, value);
    if(field==="when"){const fields={...next.fields};delete fields.timing;next={...next,fields};}
    /* A typed title gets the same grounded context as voice, in every mode;
       a title that turns back into a physical thing drops stale lesson labels. */
    if (field === "what" && !snap.edited.includes("context")) {
      const k = contextOf(value);
      const svc = k === "lesson" || k === "service";
      const was = next.fields.context === "lesson" || next.fields.context === "service";
      if (svc) next = { ...next, fields: { ...next.fields, context: k } };
      else if (was) next = { ...next, fields: { ...next.fields, context: null, ctx: {} } };
      if (s.action === "give" && !snap.edited.includes("kind")) {
        next = { ...next, fields: { ...next.fields, kind: svc ? (k === "lesson" ? "a skill" : "a hand") : inferGiveType(value) } };
      }
    }
    const kind = next.fields.context;
    if (field === "what" && (kind === "lesson" || kind === "service") && !snap.edited.includes("ctx:subject"))
      next = { ...next, fields: { ...next.fields, ctx: { ...next.fields.ctx, subject: value.trim() } } };
    if (next.asking === "seed") next = { ...next, asking: null };
    if(field==="what"&&next.action&&!snap.edited.includes("title"))next={...next,fields:{...next.fields,title:listingTitle(next.action,value)}};
    /* The on-screen question follows what's actually still missing. */
    if (snap.form && next.action && (next.stage === "talk" || next.stage === "anything")) next = nextAsk(next);
    set({ edited: mark(field), session: next });
  },
  /** Deliberate typed answer advances once; typing alone never advances. */
  answer(words:string) {
    const before=snap.session;
    if(!before||!words.trim())return;
    conversation.type(words);
    const after=snap.session;
    if(!after)return;
    const changed=(Object.keys(after.fields) as (keyof VoiceFields)[]).filter(k=>!["title","ctx","context","when","timing"].includes(k)&&after.fields[k]!==before.fields[k]);
    const ctxChanged=Object.keys(after.fields.ctx).filter(k=>!k.startsWith("__")&&after.fields.ctx[k as keyof VoiceFields["ctx"]]!==before.fields.ctx[k as keyof VoiceFields["ctx"]]).map(k=>`ctx:${k}`);
    set({edited:[...new Set([...snap.edited,...changed,...ctxChanged])]});
  },
  inspect() { conversation.stopLocked();set({inspected:true}); },
  continueQuestions() {const s=snap.session;if(s?.action)set({inspected:false,session:nextAsk(s)});},
  setTiming(value:AnswerTime) {
    const s=snap.session;if(!s?.action)return;
    const service=s.fields.context==="lesson"||s.fields.context==="service";
    const fields={...s.fields,timing:value,when:value.label,...(service?{ctx:{...s.fields.ctx,...(value.date?{date:value.date}:{}),day:value.label,...(value.time?{window:value.time}:{}),...(value.recurrence?{recurrence:value.recurrence}:{})}}:{})};
    delete fields.ctx.__weekday;delete fields.ctx.__ambig;
    set({timePending:null,edited:mark("when"),session:nextAsk({...s,fields})});
  },
  /**
   * MIDDLE-LOOP TAP: the selected mode's editable form, now — no recording
   * first. Reuses that seat's parked draft, otherwise a fresh empty one.
   * Never listens on its own; never saves.
   */
  openForm(seat: string) {
    if (!(["give", "wish", "trade", "borrow", "lend", "fund"] as const).includes(seat as GiverAction)) return;
    if (currentSeat !== seat || !snap.session) conversation.selectSeat(seat);
    if (!snap.session?.action) set({ session: sessionForSeat(seat) });
    set({ form: true, ...(snap.session?.stage!=="review"&&!snap.timePending?{session:nextAsk(snap.session as VoiceSession)}:{}) });
  },
  /** The form's own bottom record button: same draft, same capture. */
  recordInForm() {
    wire();
    if (!snap.form || !snap.session || snap.session.stage === "live") return;
    if (snap.mode !== "off") { conversation.stopLocked(); return; }
    set({ mode: "locked" });
    voiceCapture.start();
  },
  /** Back to the Living G: listening stops, the unshared draft stays parked. */
  closeForm() {
    voiceCapture.stop();
    const s = snap.session;
    /* A shared draft is finished: fold to the G on the same seat with a fresh draft, so reopening can never repost it. */
    if (s?.stage === "live") { parked.delete(currentSeat); set({ ...BLANK, form: false, mode: "off", session: sessionForSeat(currentSeat) }); return; }
    set({ form: false, mode: "off", ...(s && s.stage === "review" ? { session: { ...s, stage: "talk", asking: null, prompt: "add a detail, or tap the middle to see your draft" } } : {}) });
  },
  useLocation() {
    const s = snap.session;
    if (!s) return;
    set({ session: { ...s, wantsLocation: true } });
    void locate();
  },
  /** PLUS in the middle loop: pause listening, pick, come back to the same G. */
  async addPhoto() {
    const resume = snap.mode === "locked";
    set({ picking: true });
    voiceCapture.cancel();
    const [file] = await pickImages();
    let photo = snap.photo;
    if (file) {
      const raw = await readImage(file);
      if (raw) photo = { file, url: await shrinkImage(raw) };
    }
    const s = snap.session;
    set({
      picking: false,
      photo,
      ...(s && photo ? { session: { ...s, wantsPhoto: false, prompt: s.prompt } } : {}),
    });
    if (resume) voiceCapture.start();
  },
  removePhoto() {
    set({ photo: null });
  },
  resume() {
    const s=snap.session; if (!s || s.stage === "live") return;
    set({ mode:"off",session:{...s,stage:"talk",asking:null,prompt:"add a detail, or review when ready"} });
    voiceCapture.prepare();
  },
  review() {
    const s = snap.session;
    if (!s?.action) return;
    if (snap.form) { if (s.stage !== "review") set({ session: { ...s, stage: "review" } }); return; }
    set({ mode: "off", form: true, session: { ...s, stage: "review" } });
    voiceCapture.cancel();
  },
  /** The draft on screen now (Share callbacks compare against it). */
  currentDraftId: (): string | null => snap.session?.draftId ?? null,
  /**
   * The server confirmed THIS draft's post. On screen with its form open: show
   * "live". Folded to the G: retire it there (fresh draft, form stays closed).
   * Parked on another seat: retire the parked copy. Never touches another draft.
   */
  finishDraft(draftId: string): "shown" | "retired" | "gone" {
    if (snap.session?.draftId === draftId) {
      if (snap.form) { conversation.live(); return "shown"; }
      set({ ...BLANK, mode: "off", session: sessionForSeat(currentSeat) });
      return "retired";
    }
    for (const [seat, p] of parked) if (p.session?.draftId === draftId) { parked.delete(seat); return "retired"; }
    return "gone";
  },
  live() {
    const s = snap.session;
    if (s) set({ mode: "off", session: { ...s, stage: "live" } });
    voiceCapture.cancel();
  },
  close() {
    voiceCapture.cancel();
    spokenPrompt = "";
    parked.delete(currentSeat); currentSeat = "";
    set({ session: null, mode: "off", ...BLANK });
  },
};
