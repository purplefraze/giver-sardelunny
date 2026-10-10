import { afterEach, expect, test } from "bun:test";
import { voiceCapture } from "../src/intelligence/voice-capture";
type Result = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
class Recognition {
  static instances: Recognition[] = [];
  constructor() { Recognition.instances.push(this); }
  lang = ""; continuous = false; interimResults = false;
  onresult: ((e: Result) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start() {} stop() {} abort() {}
  words(text: string) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); }
}
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const setup = () => { Recognition.instances = []; Object.defineProperty(globalThis, "window", { configurable: true, value: { SpeechRecognition: Recognition } }); };
afterEach(() => { voiceCapture.cancel(); if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window"); });
test("aborted recognition cannot corrupt a new listening session", () => {
  setup(); voiceCapture.start(); const old = Recognition.instances[0]; voiceCapture.cancel(); voiceCapture.start(); const active = Recognition.instances[1];
  if (!old || !active) throw new Error("two recognizers required");
  old.words("stale words"); old.onerror?.({ error: "not-allowed" }); old.onend?.();
  expect(voiceCapture.get().state).toBe("listening"); expect(voiceCapture.get().transcript).toBe("");
  active.words("a fridge"); expect(voiceCapture.get().transcript).toBe("a fridge");
});
test("stop finishes while permission errors remain available for typing", () => {
  setup(); voiceCapture.start(); const r = Recognition.instances[0]; if (!r) throw new Error("recognizer required");
  voiceCapture.stop(); expect(voiceCapture.get().state).toBe("processing"); r.onend?.(); expect(voiceCapture.get().state).toBe("idle");
  voiceCapture.start(); const next = Recognition.instances[1]; if (!next) throw new Error("recognizer required");
  next.onerror?.({ error: "not-allowed" }); next.onend?.(); expect(voiceCapture.get().state).toBe("error"); expect(voiceCapture.get().error).toContain("type instead");
});
test("interim words stay raw and final subscribers receive them after transcript update",()=>{
  setup();voiceCapture.start();const r=Recognition.instances[0];if(!r) throw new Error("recognizer required");
  r.onresult?.({resultIndex:0,results:[Object.assign([{transcript:"I'd like to give some guitar lessons"}],{isFinal:false})]});
  expect(voiceCapture.get().transcript).toBe("I'd like to give some guitar lessons");
  let atFinal="";const off=voiceCapture.onFinal(()=>{atFinal=voiceCapture.get().transcript;});r.words("I'd like to give some guitar lessons");off();expect(atFinal).toBe("I'd like to give some guitar lessons");
});
test("cancelled speech cannot run its stale restart callback",()=>{
  setup();let utterance:{onend?:()=>void}|null=null;let restarts=0;
  const win=globalThis.window as unknown as {speechSynthesis:unknown;setTimeout:()=>number};win.setTimeout=()=>0;win.speechSynthesis={cancel(){},speak(u: {onend?:()=>void}){utterance=u}};
  Object.defineProperty(globalThis,"SpeechSynthesisUtterance",{configurable:true,value:class {onend?:()=>void;onerror?:()=>void;rate=1;constructor(public text:string){}}});
  voiceCapture.speak("online or in person?",()=>restarts++);voiceCapture.cancel();(utterance as {onend?:()=>void}|null)?.onend?.();expect(restarts).toBe(0);Reflect.deleteProperty(globalThis,"SpeechSynthesisUtterance");
});
