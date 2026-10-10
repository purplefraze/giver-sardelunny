import { describe, expect, mock, test } from "bun:test";

/* Isolated: no model, no location, no network, no writes. */
mock.module("@/lib/followup.functions", () => ({ interpretDraft:async()=>({reading:null,error:null}), followUp: async () => ({ source: "rules", ctx: {} }) }));
mock.module("@/data/my-location", () => ({ askLocation: async () => ({ ok: false }) }));

const { conversation } = await import("../src/intelligence/voice-conversation");
const { canGoLive, fundTargetOf, EMPTY_FIELDS } = await import("../src/intelligence/voice-flow");

const fund = (amount: string) => ({ ...EMPTY_FIELDS, what: "dentures for my gran", amount });

describe("manual Fund needs a valid goal before any record", () => {
  test("blank goal blocks share", () => expect(canGoLive("fund", fund(""))).toBe(false));
  test("zero / words block share", () => {
    expect(canGoLive("fund", fund("0"))).toBe(false);
    expect(canGoLive("fund", fund("lots"))).toBe(false);
  });
  test("over the existing target limit blocks share", () => expect(fundTargetOf(fund("1000000"))).toBe(null));
  test("1200 is a valid goal in cents", () => {
    expect(canGoLive("fund", fund("1200"))).toBe(true);
    expect(fundTargetOf(fund("1200"))).toBe(120000);
  });
});

describe("typed titles get grounded context in every mode", () => {
  test("typed lesson Give infers a skill", () => {
    conversation.close();
    conversation.openForm("give");
    conversation.edit("what", "guitar lessons");
    expect(conversation.get().session?.fields.kind).toBe("a skill");
  });
  test("typed lesson Trade uses lesson context", () => {
    conversation.close();
    conversation.openForm("trade");
    conversation.edit("what", "guitar lessons");
    expect(conversation.get().session?.fields.context).toBe("lesson");
  });
  test("title changed to a physical item drops lesson context and inferred kind", () => {
    conversation.close();
    conversation.openForm("give");
    conversation.edit("what", "guitar lessons");
    conversation.edit("what", "a wooden chair");
    const f = conversation.get().session!.fields;
    expect(f.context).toBe(null);
    expect(f.kind).toBe("a thing");
  });
});
