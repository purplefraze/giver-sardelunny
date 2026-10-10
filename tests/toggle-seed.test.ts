import { describe, expect, test } from "bun:test";
import { hear, startSession } from "@/intelligence/voice-session";

describe("hold on the toggle seeds the selected mode", () => {
  test("Give seat skips the 'which mode?' question", () => {
    const s = startSession("give");
    expect(s.action).toBe("give");
    expect(s.asking).toBe("seed");
  });
  test("Give seat: 'a fridge' becomes a give draft about a fridge", () => {
    const s = hear(startSession("give"), "a fridge");
    expect(s.action).toBe("give");
    expect(s.fields.what).toContain("fridge");
  });
  test("Wish seat: a ride asks pickup next", () => {
    const s = hear(startSession("wish"), "a ride to the airport");
    expect(s.action).toBe("wish");
    expect(s.asking).toBe("ctx:pickup");
  });
  test("a profile request still routes from a seeded seat", () => {
    expect(hear(startSession("trade"), "show my chats").profile).toBe("chats");
  });
  test("a seeded session never goes live on its own", () => {
    let s = startSession("borrow");
    for (const w of ["a ladder", "for two days", "tomorrow", "in leith"]) s = hear(s, w);
    expect(s.stage).not.toBe("live");
  });
});
