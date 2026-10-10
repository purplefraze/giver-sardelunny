import { askLocation } from "@/data/my-location";
import type { Pin } from "@/data/give-pins";
import { pickImages, readImage, shrinkImage } from "@/lib/pick-image";
import { voiceCapture } from "@/intelligence/voice-capture";
import { editField, hear, isEcho, nextAsk, startSession, sessionForSeat, type VoiceSession } from "@/intelligence/voice-session";
import { followUp } from "@/lib/followup.functions";
import type { VoiceFields } from "@/intelligence/voice-flow";
import type { GiverAction } from "@/intelligence/action-draft";

/**
 * THE ONE VOICE CONVERSATION — lives while the G stays intact.
 * Mic mode: "hold" records until release; "locked" stays hands-free across
 * answers (listening pauses while Giver speaks); "off" keeps the draft.
 * Nothing here publishes.
 */
export type MicMode = "off" | "hold" | "locked";

export type Conversation = {
  session: VoiceSession | null;
  mode: MicMode;
  photo: { file: File; url: string } | null;
  pin: Pin | null;
  picking: boolean;
};

let snap: Conversation = { session: null, mode: "off", photo: null, pin: null, picking: false };
const subs = new Set<() => void>();
let spokenPrompt = "";
let revision = 0;
const parked = new Map<string, VoiceSession>();
let currentSeat = "";
let wired = false;

const set = (next: Partial<Conversation>) => {
  if (next.session !== undefined) revision++;
  snap = { ...snap, ...next };
  subs.forEach((f) => f());
};

const speakIfNew = () => {
  const s = snap.session;
  if (!s || snap.mode === "off" || snap.mode === "hold" || s.stage === "review" || s.stage === "live") return;
  if (s.prompt === spokenPrompt) return;
  spokenPrompt = s.prompt;
  voiceCapture.speak(s.prompt, () => {
    if (snap.mode === "locked" && !snap.picking && snap.session?.stage !== "review" && snap.session?.stage !== "live") voiceCapture.start();
  });
};

const advance = (words: string) => {
  if (!snap.session) return;
  if (isEcho(words, spokenPrompt)) return;
  set({ session: hear(snap.session, words) });
  if (snap.session?.stage === "review") { set({ mode: "off" }); voiceCapture.stop(); return; }
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
  if (!s || !kind || (s.stage !== "talk" && s.stage !== "anything")) return;
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
  for (const [k, v] of Object.entries(r.ctx)) if (v && !ctx[k]) ctx[k] = v;
  let next = nextAsk({ ...cur, fields: { ...cur.fields, ctx } });
  const unspoken = cur.prompt !== spokenPrompt;
  if (r.ask && r.field && next.asking === `ctx:${r.field}` && (unspoken || next.asking !== cur.asking)) next = { ...next, prompt: r.ask };
  if (next.asking === cur.asking && next.prompt === cur.prompt && JSON.stringify(ctx) === JSON.stringify(cur.fields.ctx)) return;
  set({ session: next });
  if (snap.mode === "locked") speakIfNew();
}

async function locate() {
  const s = snap.session;
  if (!s?.wantsLocation || snap.pin) return;
  const r = await askLocation();
  const cur = snap.session;
  if (!cur) return;
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
     carry on listening. A hold release has already set mode to "off". */
  voiceCapture.subscribe(() => {
    const v = voiceCapture.get();
    if (v.state === "idle" && snap.mode === "locked" && !snap.picking && snap.session && snap.session.stage !== "review" && snap.session.stage !== "live") {
      queueMicrotask(() => {
        if (voiceCapture.get().state === "idle" && snap.mode === "locked" && snap.session?.stage !== "review" && snap.session?.stage !== "live") voiceCapture.start();
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
    if (snap.session && currentSeat) parked.set(currentSeat, snap.session);
    currentSeat = seat;
    spokenPrompt = "";
    set({ mode: "off", session: parked.get(seat) ?? sessionForSeat(seat) });
    voiceCapture.cancel();
  },
  toggle(seat: string) {
    wire();
    if (snap.mode !== "off") { conversation.stopLocked(); return; }
    if (!snap.session || currentSeat !== seat) conversation.selectSeat(seat);
    if (snap.session?.stage === "review" || snap.session?.stage === "live") return;
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
    if (s) set({ session: { ...s, fields: { ...s.fields, ctx: { ...s.fields.ctx, [field]: value } } } });
  },
  edit(field: keyof VoiceFields, value: string) {
    if (snap.session) set({ session: editField(snap.session, field, value) });
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
  review() {
    const s = snap.session;
    if (!s?.action) return;
    set({ mode: "off", session: { ...s, stage: "review" } });
    voiceCapture.cancel();
  },
  live() {
    const s = snap.session;
    if (s) set({ session: { ...s, stage: "live" } });
  },
  close() {
    voiceCapture.cancel();
    spokenPrompt = "";
    parked.delete(currentSeat); currentSeat = "";
    set({ session: null, mode: "off", photo: null, pin: null, picking: false });
  },
};
