import { describe, expect, test } from "bun:test";
import { RECORD_AFFORDANCE_MS } from "@/components/living-g/EarSelector";
import { hear, startSession, sessionForSeat } from "@/intelligence/voice-session";

describe("the toggle seeds the selected mode", () => {
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

test("all six initial prompts match the current seat",()=>{
  const expected={give:"give something",wish:"make a wish",lend:"what are you lending?",borrow:"what do you need to borrow?",trade:"make a trade",fund:"what needs funding?"};
  for(const [seat,prompt] of Object.entries(expected)) expect(startSession(seat as keyof typeof expected).prompt).toBe(prompt);
});

test("landing record affordance waits 1.8 seconds",()=>expect(RECORD_AFFORDANCE_MS).toBe(1800));
test("profile and community seats never seed a Wish",()=>{expect(hear(sessionForSeat("giver"),"change my bio").profile).toBe("bio");expect(hear(sessionForSeat("map"),"show community borrows").community).toBe("borrow");expect(hear(sessionForSeat("map"),"a ladder").action).toBeNull();});
