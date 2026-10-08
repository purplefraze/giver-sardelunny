/**
 * VOICE CAPTURE — one shared listener for the Living G microphone.
 *
 * Uses the browser's own speech recognition (webkitSpeechRecognition on
 * Safari/Chrome). No audio is recorded, stored or sent by Giver; the browser's
 * speech service performs recognition. Where that service does not exist the
 * state is "unsupported" and the person types instead. Nothing is ever faked.
 *
 * start() must be called synchronously from the tap (Safari user activation).
 */

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error" | "unsupported";

export type VoiceSnapshot = {
  state: VoiceState;
  /** Final words so far plus the live interim tail. */
  transcript: string;
  error: string | null;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const voiceSupported = () => ctor() !== null;

const ERRORS: Record<string, string> = {
  "not-allowed": "the microphone isn't allowed. you can allow it in your browser settings, or type instead.",
  "service-not-allowed": "speech isn't available here. type instead.",
  "audio-capture": "no microphone was found. type instead.",
  network: "speech needs a connection right now. type instead.",
  "no-speech": "i didn't hear anything. tap to try again, or type.",
};

let snap: VoiceSnapshot = { state: "idle", transcript: "", error: null };
let rec: Recognition | null = null;
let finalText = "";
let cancelled = false;
const subs = new Set<() => void>();
const finals = new Set<(words: string) => void>();

const set = (next: Partial<VoiceSnapshot>) => {
  snap = { ...snap, ...next };
  subs.forEach((f) => f());
};

export const voiceCapture = {
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  get: () => snap,
  getServer: () => snap,

  /** Opening intake is not consent to transmit audio to a browser service. */
  prepare() {
    voiceCapture.cancel();
    set({ state: voiceSupported() ? "idle" : "unsupported" });
  },

  /** Call directly from the tap handler. */
  start() {
    const C = ctor();
    if (!C) {
      set({ state: "unsupported", transcript: "", error: null });
      return;
    }
    try {
      const previous = rec;
      rec = null;
      previous?.abort();
    } catch {
      /* already stopped */
    }
    finalText = "";
    cancelled = false;
    const r = new C();
    r.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      if (rec !== r || cancelled) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        const words = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalText = `${finalText} ${words}`.trim();
          if (words.trim()) finals.forEach((f) => f(words.trim()));
        }
        else interim += words;
      }
      set({ transcript: `${finalText} ${interim}`.replace(/\s+/g, " ").trim() });
    };
    r.onerror = (e) => {
      if (rec !== r || cancelled || e.error === "aborted") return;
      set({ state: "error", error: ERRORS[e.error] ?? "listening stopped. type instead, or try again." });
    };
    r.onend = () => {
      if (rec !== r) return;
      rec = null;
      if (cancelled) return;
      if (snap.state === "error") return;
      set({ state: "idle" });
    };
    rec = r;
    set({ state: "listening", transcript: "", error: null });
    try {
      r.start();
    } catch {
      rec = null;
      set({ state: "error", error: "listening couldn't start. type instead, or try again." });
    }
  },

  /** Finish listening and keep the words. */
  stop() {
    if (!rec) return;
    set({ state: "processing" });
    try {
      rec.stop();
    } catch {
      rec = null;
      set({ state: "idle" });
    }
  },

  /** Each finished recognition segment, as it lands. */
  onFinal(f: (words: string) => void) {
    finals.add(f);
    return () => finals.delete(f);
  },

  /**
   * GIVER SPEAKS ITS QUESTION. Listening pauses first so Giver never records
   * itself; `after` runs when speech ends (or at once without speech output).
   */
  speak(text: string, after: () => void) {
    const r = rec;
    rec = null;
    try {
      r?.abort();
    } catch {
      /* fine */
    }
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      set({ state: "idle" });
      after();
      return;
    }
    set({ state: "speaking" });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (snap.state === "speaking") set({ state: "idle" });
      after();
    };
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      window.setTimeout(finish, 1200 + text.length * 90);
    } catch {
      finish();
    }
  },

  /** Throw the listening away. */
  cancel() {
    cancelled = true;
    try {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    } catch {
      /* fine */
    }
    const r = rec;
    rec = null;
    try {
      r?.abort();
    } catch {
      /* fine */
    }
    set({ state: "idle", transcript: "", error: null });
  },
};
