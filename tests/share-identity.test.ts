import { describe, expect, mock, test } from "bun:test";

/* Isolated: no model, no location, no network, no writes. */
mock.module("@/lib/followup.functions", () => ({ followUp: async () => ({ source: "rules", ctx: {} }) }));
mock.module("@/data/my-location", () => ({ askLocation: async () => ({ ok: false }) }));

const { conversation } = await import("../src/intelligence/voice-conversation");

describe("one record per draft across fold, reopen and seat switches", () => {
  test("failed save → fold → reopen keeps the same record id", () => {
    conversation.close();
    conversation.openForm("wish");
    conversation.edit("what", "a ladder");
    conversation.attachRecord(conversation.seat(), "rec-1");
    conversation.closeForm();
    expect(conversation.get().form).toBe(false);
    conversation.openForm("wish");
    expect(conversation.get().session?.recordId).toBe("rec-1");
    conversation.edit("what", "a tall ladder");
    expect(conversation.get().session?.recordId).toBe("rec-1");
  });

  test("record id survives a parked seat switch and belongs only to its seat", () => {
    conversation.close();
    conversation.openForm("wish");
    conversation.attachRecord("wish", "rec-w");
    conversation.closeForm();
    conversation.openForm("give");
    expect(conversation.get().session?.recordId).toBeUndefined();
    conversation.openForm("wish");
    expect(conversation.get().session?.recordId).toBe("rec-w");
  });

  test("late completion for a parked seat never makes the current draft live", () => {
    conversation.close();
    conversation.openForm("wish");
    conversation.attachRecord("wish", "rec-late");
    conversation.closeForm();
    conversation.openForm("give");
    expect(conversation.confirmLive("wish", "rec-late")).toBe(false);
    expect(conversation.get().session?.action).toBe("give");
    expect(conversation.get().session?.stage).not.toBe("live");
    conversation.openForm("wish");
    expect(conversation.get().session?.recordId).toBeUndefined();
  });

  test("late attach to a parked seat lands on that seat, not the current one", () => {
    conversation.close();
    conversation.openForm("wish");
    conversation.closeForm();
    conversation.openForm("trade");
    conversation.attachRecord("wish", "rec-p");
    expect(conversation.get().session?.recordId).toBeUndefined();
    conversation.openForm("wish");
    expect(conversation.get().session?.recordId).toBe("rec-p");
  });
});

describe("pinch from a successful share", () => {
  test("folds to the G on the same seat and retires the shared draft", () => {
    conversation.close();
    conversation.openForm("lend");
    conversation.edit("what", "a drill");
    conversation.attachRecord("lend", "rec-ok");
    expect(conversation.confirmLive("lend", "rec-ok")).toBe(true);
    expect(conversation.get().session?.stage).toBe("live");
    conversation.closeForm();
    const c = conversation.get();
    expect(c.form).toBe(false);
    expect(c.session?.stage).not.toBe("live");
    expect(c.session?.action).toBe("lend");
    expect(c.session?.recordId).toBeUndefined();
    expect(c.session?.fields.what).toBe("");
    expect(c.mode).toBe("off");
  });
});
