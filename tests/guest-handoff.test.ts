import { expect, test } from "bun:test";
import { conversation } from "../src/intelligence/voice-conversation";
import { setHandoffStorage, signInRequested, takeGuestDraft, GUEST_DRAFT_KEY } from "../src/intelligence/guest-handoff";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

test("a guest's blocked draft survives sign-in and reopens at review", async () => {
  const s = mem(); setHandoffStorage(s);
  conversation.openForm("trade");
  conversation.edit("title", "vintage film camera");
  conversation.edit("want", "a bike lock");
  const { signInToShare } = await import("../src/intelligence/guest-handoff");
  signInToShare();
  expect(signInRequested()).toBe(true);
  expect(s.m.get(GUEST_DRAFT_KEY)).toContain("vintage film camera");
  conversation.close();
  const d = takeGuestDraft();
  expect(d?.seat).toBe("trade");
  conversation.importDraft(d!);
  expect(conversation.get().form).toBe(true);
  expect(conversation.get().session?.stage).toBe("review");
  expect(conversation.get().session?.fields.title).toBe("vintage film camera");
  expect(signInRequested()).toBe(false);
  expect(takeGuestDraft()).toBeNull();
  setHandoffStorage(undefined);
});
