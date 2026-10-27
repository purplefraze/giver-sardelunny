import { afterEach, describe, expect, test } from "bun:test";
import { hear, isEcho, startSession, stripEcho, type VoiceSession } from "../src/intelligence/voice-session";
import { POST_SPEECH_GUARD_MS, voiceCapture } from "../src/intelligence/voice-capture";

/**
 * VOICE ECHO REGRESSION (Oct 26). The recogniser heard Giver's own question
 * plus the answer in one segment, and the question's words were written into
 * the draft ("online or in person? tuesday evening" -> format "in person").
 */

const FORMAT_Q = "online or in person?";
const PICKUP_Q = "where should they pick you up? an area is fine.";

const askingFormat = (): VoiceSession => {
  const s = hear(startSession(), "i'd like to give guitar lessons");
  expect(s.prompt).toBe(FORMAT_Q);
  return s;
};
const askingPickup = (): VoiceSession => {
  let s = hear(startSession(), "i need a ride to the airport");
  for (let i = 0; i < 5 && s.prompt !== PICKUP_Q; i++) s = hear(s, "friday at 6");
  expect(s.prompt).toBe(PICKUP_Q);
  return s;
};

describe("stripEcho keeps only the person's words", () => {
  test("question + answer in one segment: the question is removed", () => {
    expect(stripEcho("online or in person? tuesday evening", [FORMAT_Q])).toBe("tuesday evening");
    expect(stripEcho("Online or in person tuesday evening", [FORMAT_Q])).toBe("tuesday evening");
  });
  test("ride pickup: the full two-sentence question is removed", () => {
    expect(stripEcho("where should they pick you up? an area is fine. tuesday evening", [PICKUP_Q])).toBe("tuesday evening");
  });
  test("an echo of the EARLIER question (after the model rephrased) is caught", () => {
    const spoken = ["what day works best for the lesson?", FORMAT_Q];
    expect(stripEcho("online or in person? online", spoken)).toBe("online");
    expect(stripEcho("what day works best tuesday", spoken)).toBe("tuesday");
  });
  test("a pure echo leaves nothing", () => {
    expect(stripEcho(FORMAT_Q, [FORMAT_Q])).toBe("");
    expect(stripEcho("where should they pick you up an area is fine", [PICKUP_Q])).toBe("");
  });
  test("a pure answer is untouched", () => {
    expect(stripEcho("tuesday evening", [FORMAT_Q])).toBe("tuesday evening");
    expect(stripEcho("leith", [PICKUP_Q])).toBe("leith");
  });
  test("an answer that legitimately repeats a word from the question stays", () => {
    expect(stripEcho("in person", [FORMAT_Q])).toBe("in person");
    expect(stripEcho("online", [FORMAT_Q])).toBe("online");
    expect(stripEcho("pick me up in leith", [PICKUP_Q])).toBe("pick me up in leith");
    expect(stripEcho("an area near leith is fine", [PICKUP_Q])).toBe("an area near leith is fine");
  });
  test("isEcho still drops a whole echoed question", () => {
    expect(isEcho("online or in person", FORMAT_Q)).toBe(true);
  });
});

describe("drafts never take words from Giver's question", () => {
  test("format is not set to 'in person' from the echoed question", () => {
    const s = askingFormat();
    expect(hear(s, "online or in person? tuesday evening").fields.ctx.format).toBe("in person"); // the bug, raw
    const fixed = hear(s, stripEcho("online or in person? tuesday evening", [FORMAT_Q]));
    expect(fixed.fields.ctx.format).toBeUndefined();
    expect(fixed.fields.ctx.day).toBe("tuesday");
  });
  test("pickup holds the answer, not the question", () => {
    const s = askingPickup();
    const fixed = hear(s, stripEcho("where should they pick you up? an area is fine. tuesday evening", [PICKUP_Q]));
    expect(String(fixed.fields.ctx.pickup ?? "")).not.toContain("where should");
  });
  test("a real 'in person' answer still sets the format", () => {
    expect(hear(askingFormat(), stripEcho("in person", [FORMAT_Q])).fields.ctx.format).toBe("in person");
  });
});

/* ---------- the mic stays closed while Giver speaks, plus a tail guard ---------- */
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  voiceCapture.cancel();
  Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});
const speakingRig = () => {
  const timers: { fn: () => void; ms: number }[] = [];
  let utterance: { onend?: () => void } | null = null;
  const synth = { speaking: true, cancel() {}, speak(u: { onend?: () => void }) { utterance = u; } };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { speechSynthesis: synth, setTimeout: (fn: () => void, ms: number) => (timers.push({ fn, ms }), timers.length) },
  });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: class { onend?: () => void; onerror?: () => void; rate = 1; constructor(public text: string) {} },
  });
  const run = () => { const t = timers.splice(0); t.forEach((x) => x.fn()); return t; };
  return { synth, timers, run, end: () => (utterance as { onend?: () => void } | null)?.onend?.() };
};

describe("speech tail guard", () => {
  test("after speech ends the mic waits about 500ms before reopening", () => {
    const rig = speakingRig();
    let reopened = 0;
    voiceCapture.speak(FORMAT_Q, () => reopened++);
    rig.run(); // the fixed fallback timer fires while still speaking
    rig.synth.speaking = false;
    rig.end();
    expect(reopened).toBe(0);
    expect(voiceCapture.get().state).toBe("speaking");
    const guard = rig.timers.find((t) => t.ms === POST_SPEECH_GUARD_MS);
    expect(guard).toBeDefined();
    expect(POST_SPEECH_GUARD_MS).toBeGreaterThanOrEqual(400);
    rig.run();
    expect(reopened).toBe(1);
    expect(voiceCapture.get().state).toBe("idle");
  });
  test("the fallback timer never reopens the mic while speech is still playing", () => {
    const rig = speakingRig();
    let reopened = 0;
    voiceCapture.speak(PICKUP_Q, () => reopened++);
    for (let i = 0; i < 5; i++) rig.run(); // fallback keeps re-checking
    expect(reopened).toBe(0);
    expect(voiceCapture.get().state).toBe("speaking");
    rig.synth.speaking = false;
    rig.run(); // fallback sees speech over -> guard scheduled
    expect(reopened).toBe(0);
    rig.run(); // guard passes
    expect(reopened).toBe(1);
  });
  test("cancel during the tail guard drops the reopen", () => {
    const rig = speakingRig();
    let reopened = 0;
    voiceCapture.speak(FORMAT_Q, () => reopened++);
    rig.synth.speaking = false;
    rig.end();
    voiceCapture.cancel();
    rig.run();
    expect(reopened).toBe(0);
  });
});
