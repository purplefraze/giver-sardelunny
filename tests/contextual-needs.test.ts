import { describe, expect, test } from "bun:test";
import { hear, startSession, type VoiceSession } from "../src/intelligence/voice-session";
import { extractCtx, nextNeed, publicExtras, validateModel } from "../src/intelligence/contextual-needs";

const talk = (...lines: string[]) => lines.reduce<VoiceSession>((s, l) => hear(s, l), startSession());

describe("ride wish", () => {
  test("a bare ride asks pickup, then drop-off, then day, then time — one at a time", () => {
    let s = talk("i need a ride");
    expect(s.action).toBe("wish");
    expect(s.asking).toBe("ctx:pickup");
    s = hear(s, "leith");
    expect(s.fields.ctx.pickup).toBe("leith");
    expect(s.asking).toBe("ctx:dropoff");
    s = hear(s, "the train station");
    expect(s.asking).toBe("ctx:date");
    s = hear(s, "friday");
    expect(s.asking).toBe("ctx:pickupTime");
    s = hear(s, "9am");
    expect(s.fields.ctx).toMatchObject({ pickup: "leith", dropoff: "the train station", date: "friday", pickupTime: "9am" });
    expect(s.stage).toBe("anything");
  });

  test("a fully specified ride is not re-asked", () => {
    const s = talk("i need a ride from leith to the station on friday at 9am");
    expect(s.fields.ctx).toMatchObject({ pickup: "leith", dropoff: "the station", date: "friday", pickupTime: "9am" });
    expect(s.asking).toBeNull();
    expect(s.stage).toBe("anything");
  });

  test("day and time said separately are both kept", () => {
    const s = talk("i need a lift from portobello to the station", "tomorrow", "6:30pm");
    expect(s.fields.ctx.date).toBe("tomorrow");
    expect(s.fields.ctx.pickupTime).toBe("6:30pm");
  });

  test("an ambiguous 7 is clarified, and a flight time is not the pickup time", () => {
    let s = talk("i need a ride from leith to the airport on saturday, my flight leaves at 7");
    expect(s.fields.ctx.pickupTime).toBeUndefined();
    expect(s.prompt).toBe("7 in the morning or the evening?");
    s = hear(s, "evening");
    expect(s.fields.ctx.flightTime).toBe("7pm");
    expect(s.asking).toBe("ctx:pickupTime");
    expect(s.prompt).toContain("flight's at 7pm");
    s = hear(s, "4:30pm");
    expect(s.fields.ctx.pickupTime).toBe("4:30pm");
    expect(s.asking).toBe("ctx:luggage");
  });

  test("a correction overwrites", () => {
    let s = talk("i need a ride from leith to the station on friday at 9am");
    s = hear(s, "actually make it 10am");
    expect(s.fields.ctx.pickupTime).toBe("10am");
  });
});

describe("groceries wish", () => {
  test("flexible timing is not forced into an exact time", () => {
    let s = talk("i need someone to do my shopping");
    expect(s.asking).toBe("ctx:list");
    s = hear(s, "milk, eggs and bread");
    expect(s.asking).toBe("ctx:deliveryArea");
    s = hear(s, "deliver to morningside, any time is fine");
    expect(s.fields.ctx.flexible).toBe("yes");
    expect(s.stage).toBe("anything");
  });
  test("collection asks for the shop, not a list", () => {
    let s = talk("can someone help with my groceries");
    expect(s.asking).toBe("ctx:mode");
    s = hear(s, "collect an order i placed online");
    expect(s.fields.ctx.mode).toBe("collection");
    expect(s.asking).toBe("ctx:store");
  });
});

describe("lightweight wishes", () => {
  test("a plant wish gets no transport schedule questions", () => {
    let s = talk("i need a monstera plant");
    if (!s.action && s.choices.length) s = hear(s, s.choices.find((c) => /keep/i.test(c)) ?? "find one to keep");
    expect(s.action).toBe("wish");
    expect(s.fields.context).toBeNull();
    expect(String(s.asking ?? "")).not.toMatch(/^ctx:/);
  });
});

describe("model output is validated", () => {
  const said = "i need a ride from leith to the airport";
  const ctx = extractCtx("ride", said, {});
  test("an invented value is dropped and the next rule question stands", () => {
    const r = validateModel("ride", ctx, said, { field: "date", question: "what day?", updates: { date: "monday", pickupTime: "5pm" } })!;
    expect(r.ctx.date).toBeUndefined();
    expect(r.ctx.pickupTime).toBeUndefined();
    expect(r.need?.field).toBe("date");
  });
  test("a question about the wrong field falls back to the rule", () => {
    const r = validateModel("ride", ctx, said, { field: "luggage", question: "any bags?", updates: {} })!;
    expect(r.need).toEqual(nextNeed("ride", ctx));
  });
  test("a question claiming it posted is refused", () => {
    const r = validateModel("ride", ctx, said, { field: "date", question: "i've posted it — what day?", updates: {} })!;
    expect(r.need?.ask).toBe("what day do you need the ride?");
  });
});

describe("no accidental publish, private places", () => {
  test("finishing the questions never makes anything live", () => {
    const s = talk("i need a ride from leith to the station on friday at 9am", "that's it");
    expect(s.stage).toBe("ready");
    expect(s.stage).not.toBe("live");
  });
  test("a precise address never reaches the public extras", () => {
    const pub = publicExtras({ pickup: "14 ferry road", dropoff: "the airport" });
    expect(pub["pickup"]).not.toContain("14");
    expect(pub["drop-off"]).toBe("the airport");
  });
});
