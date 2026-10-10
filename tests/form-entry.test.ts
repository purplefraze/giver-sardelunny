import { describe, expect, mock, test } from "bun:test";

/* Isolated: no model, no location, no network, no writes. */
let modelReply: Record<string, unknown> = { source: "rules", ctx: {} };
mock.module("@/lib/followup.functions", () => ({ followUp: async () => modelReply }));
mock.module("@/data/my-location", () => ({ askLocation: async () => ({ ok: false }) }));

const { conversation } = await import("../src/intelligence/voice-conversation");
const { voiceCapture } = await import("../src/intelligence/voice-capture");

const MODES = ["give", "wish", "trade", "borrow", "lend", "fund"] as const;

describe("middle-loop tap opens the mode's form at once", () => {
  for (const m of MODES) {
    test(`${m}: fresh empty draft, form shown, no mic`, () => {
      conversation.close();
      conversation.openForm(m);
      const c = conversation.get();
      expect(c.form).toBe(true);
      expect(c.session?.action).toBe(m);
      expect(c.session?.fields.what).toBe("");
      expect(c.mode).toBe("off");
      expect(c.session?.stage).not.toBe("live");
    });
  }
  test("profile and map seats never seed a form", () => {
    conversation.close();
    conversation.openForm("giver");
    conversation.openForm("map");
    expect(conversation.get().form).toBe(false);
    expect(conversation.get().session?.action ?? null).toBe(null);
  });
});

describe("typing and voice edit the same draft", () => {
  test("typed guitar lesson uses lesson labels, not condition", () => {
    conversation.close();
    conversation.openForm("give");
    conversation.edit("what", "guitar lessons");
    expect(conversation.get().session?.fields.context).toBe("lesson");
  });
  test("later speech never overwrites a typed field", () => {
    conversation.close();
    conversation.openForm("give");
    conversation.edit("what", "a blue sofa");
    conversation.type("a red armchair in leith");
    expect(conversation.get().session?.fields.what).toBe("a blue sofa");
    expect(conversation.get().form).toBe(true);
  });
  test("stale model answer cannot fill a field the person typed", async () => {
    conversation.close();
    conversation.openForm("wish");
    modelReply = { source: "model", ctx: { pickup: "invented airport" }, ask: null, field: null };
    conversation.type("i need a ride to the airport");
    conversation.editCtx("pickup", "near the park");
    await new Promise((r) => setTimeout(r, 0));
    expect(conversation.get().session?.fields.ctx.pickup).toBe("near the park");
    modelReply = { source: "rules", ctx: {} };
  });
  test("back to the G keeps the draft; reopening restores it; other seats don't mix", () => {
    conversation.close();
    conversation.openForm("trade");
    conversation.edit("what", "my camera");
    conversation.closeForm();
    expect(conversation.get().form).toBe(false);
    conversation.selectSeat("give");
    conversation.openForm("give");
    expect(conversation.get().session?.action).toBe("give");
    expect(conversation.get().session?.fields.what).toBe("");
    conversation.closeForm();
    conversation.openForm("trade");
    expect(conversation.get().session?.fields.what).toBe("my camera");
  });
  test("speaking 'share' in the form never makes it live", () => {
    conversation.close();
    conversation.openForm("give");
    conversation.type("a kettle in leith");
    conversation.type("share it now");
    expect(conversation.get().session?.stage).not.toBe("live");
  });
});

describe("form recorder", () => {
  test("unsupported recognition falls back to typing: mic turns off, form stays", () => {
    conversation.close();
    conversation.openForm("borrow");
    conversation.recordInForm();
    const v = voiceCapture.get().state;
    if (v === "unsupported" || v === "error") expect(conversation.get().mode).toBe("off");
    expect(conversation.get().form).toBe(true);
    conversation.recordInForm();
    conversation.closeForm();
    expect(conversation.get().mode).toBe("off");
  });
  test("recording outside an open form is refused", () => {
    conversation.close();
    conversation.recordInForm();
    expect(conversation.get().mode).toBe("off");
  });
});
