import { askLocation } from "@/data/my-location";
import type { Pin } from "@/data/give-pins";
import { pickImages, readImage, shrinkImage } from "@/lib/pick-image";
import { voiceCapture } from "@/intelligence/voice-capture";
import { editField, hear, startSession, type VoiceSession } from "@/intelligence/voice-session";
import type { VoiceFields } from "@/intelligence/voice-flow";

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
let wired = false;

const set = (next: Partial<Conversation>) => {
  snap = { ...snap, ...next };
  subs.forEach((f) => f());
};

const speakIfNew = () => {
  const s = snap.session;
  if (!s || snap.mode === "hold" || s.stage === "review" || s.stage === "live") return;
  if (s.prompt === spokenPrompt) return;
  spokenPrompt = s.prompt;
  voiceCapture.speak(s.prompt, () => {
    if (snap.mode === "locked" && !snap.picking) voiceCapture.start();
  });
};

const advance = (words: string) => {
  if (!snap.session) return;
  set({ session: hear(snap.session, words) });
  void locate();
  if (snap.mode === "locked") speakIfNew();
};

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
    if (v.state === "idle" && snap.mode === "off") speakIfNew();
    if (v.state === "idle" && snap.mode === "locked" && !snap.picking && snap.session) {
      queueMicrotask(() => {
        if (voiceCapture.get().state === "idle" && snap.mode === "locked") voiceCapture.start();
      });
    }
    if (v.state === "error" && snap.mode !== "off") set({ mode: "off" });
  });
}

export const conversation = {
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  get: () => snap,
  getServer: () => snap,

  /** Finger down on the record button. Synchronous (Safari activation). */
  press() {
    wire();
    if (!snap.session) {
      spokenPrompt = "";
      set({ session: startSession() });
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
  /** Tap on the locked button. The draft stays. */
  stopLocked() {
    set({ mode: "off" });
    voiceCapture.stop();
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
      ...(s && photo ? { session: { ...s, wantsPhoto: false, prompt: s.stage === "talk" ? s.prompt : "anything else?" } } : {}),
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
    set({ session: null, mode: "off", photo: null, pin: null, picking: false });
  },
};
