import { describe, expect, test } from "bun:test";
import { hear, startSession, type VoiceSession } from "../src/intelligence/voice-session";
import { canGoLive } from "../src/intelligence/voice-flow";
import { nextNeed, publicExtras, validateModel, type Ctx } from "../src/intelligence/contextual-needs";
import { communityFilterOf, CG_FILTERS } from "../src/intelligence/community-filter";
import { profileAreaOf } from "../src/intelligence/profile-areas";
import { isEcho } from "../src/intelligence/voice-session";

/**
 * BROAD CONVERSATION REGRESSION — local, deterministic, free. Generated
 * wording permutations over every intent. These prove the RULES only: not the
 * microphone, not Safari, not the live model (see tests/live-followup.md).
 */
const talk = (...lines: string[]) => lines.reduce<VoiceSession>((s, l) => hear(s, l), startSession());
const pickIntent = (s: VoiceSession, want: RegExp) => {
  if (s.action || !s.choices.length) return s;
  const c = s.choices.find((x) => want.test(x));
  return c ? hear(s, c) : s;
};
const asked = (s: VoiceSession) => String(s.asking ?? "");

const THINGS = ["sofa", "fridge", "bike", "drill", "ladder", "pram", "kettle", "desk", "lawnmower", "guitar", "tent", "microwave"];

/* ---------- intent routing: every action, many wordings ---------- */
const INTENT: [string, RegExp, ((x: string) => string)[]][] = [
  ["give", /give|giv/, [
    (x) => `i'm giving away a ${x}`,
    (x) => `i'm getting rid of my ${x}`,
    (x) => `free ${x} to a good home`,
    (x) => `i have a spare ${x} to give away`,
  ]],
  ["borrow", /borrow/, [
    (x) => `can i borrow a ${x}`,
    (x) => `i need to borrow a ${x}`,
    (x) => `could someone lend me a ${x}`,
  ]],
  ["lend", /lend/, [
    (x) => `i can lend my ${x}`,
    (x) => `happy to lend out my ${x}`,
    (x) => `my ${x} is free to borrow`,
  ]],
  ["wish", /keep|wish/, [
    (x) => `i wish i had a ${x}`,
    (x) => `i'd love a ${x} to keep`,
  ]],
];

describe("intent routing across wordings", () => {
  for (const [action, choose, forms] of INTENT)
    for (const f of forms)
      for (const x of THINGS) {
        const line = f(x);
        test(`${action}: "${line}"`, () => {
          const s = pickIntent(talk(line), choose);
          expect(s.action).toBe(action as never);
          expect(s.fields.what).toContain(x);
          expect(asked(s)).not.toBe("what");
          expect(s.stage).not.toBe("live");
        });
      }

  const TRADES: [string, string, string][] = [
    ["swap my bike for a guitar", "bike", "guitar"],
    ["i'll trade my drill for a ladder", "drill", "ladder"],
    ["trade my desk for a kettle", "desk", "kettle"],
    ["happy to swap a tent for a pram", "tent", "pram"],
  ];
  for (const [line, offer, want] of TRADES)
    test(`trade: "${line}" keeps offer and want, asks neither`, () => {
      const s = talk(line);
      expect(s.action).toBe("trade");
      expect(s.fields.what).toContain(offer);
      expect(s.fields.want).toContain(want);
      expect(["what", "want"]).not.toContain(asked(s));
    });

  test("trade without a want asks only for the want", () => {
    const s = talk("i want to trade my guitar");
    expect(s.action).toBe("trade");
    expect(asked(s)).toBe("want");
  });

  for (const [line, amount] of [
    ["i'm raising £200 for the food bank", "200"],
    ["fundraising 500 pounds for the community garden", "500"],
    ["can you help fund 50 for school trips", "50"],
  ] as const)
    test(`fund: "${line}" keeps the amount`, () => {
      const s = talk(line);
      expect(s.action).toBe("fund");
      expect(s.fields.amount).toBe(amount);
      expect(asked(s)).not.toBe("amount");
    });

  test("fund without an amount asks for it", () => {
    const s = talk("i'm raising money for the food bank");
    expect(s.action).toBe("fund");
    expect(asked(s)).toBe("amount");
  });

  for (const line of ["hello", "um", "what's the weather", "banana"])
    test(`unknown "${line}" asks, invents nothing`, () => {
      const s = talk(line);
      expect(s.action).toBeNull();
      expect(s.asking).toBe("intent");
      expect(s.fields.what).toBe("");
    });
});

/* ---------- known details are never re-asked ---------- */
describe("details already said are not asked again", () => {
  const PLACES = ["leith", "portobello", "morningside", "the meadows"];
  const TIMES = ["tomorrow", "saturday", "this weekend", "after 6pm"];
  for (const x of THINGS.slice(0, 6))
    for (const p of PLACES)
      for (const t of TIMES) {
        const line = `i'm giving away a ${x} in ${p} ${t}`;
        test(`give "${line}"`, () => {
          const s = talk(line);
          expect(s.action).toBe("give");
          expect(s.fields.where).toContain(p.replace(/^the /, ""));
          expect(s.fields.when).not.toBe("");
          expect(["what", "where", "when"]).not.toContain(asked(s));
        });
      }
});

/* ---------- borrow / lend duration ---------- */
describe("borrowing and lending ask how long", () => {
  test("borrow without a duration asks for it after when", () => {
    let s = talk("can i borrow a ladder");
    expect(asked(s)).toBe("when");
    s = hear(s, "saturday");
    expect(asked(s)).toBe("duration");
    s = hear(s, "just for the day");
    expect(s.fields.duration).toContain("day");
    expect(s.stage).toBe("review");
  });
  for (const d of ["for a week", "for two days", "until sunday", "back by friday", "for the weekend"])
    test(`borrow with "${d}" doesn't ask duration`, () => {
      const s = talk(`can i borrow a drill on saturday ${d}`);
      expect(s.fields.duration).not.toBe("");
      expect(asked(s)).not.toBe("duration");
    });
  test("lend asks how long they can keep it", () => {
    let s = talk("i can lend my tent in leith from friday");
    expect(asked(s)).toBe("duration");
    expect(s.prompt).toMatch(/how long/);
    s = hear(s, "a week");
    expect(s.fields.duration).toBe("a week");
  });
});

/* ---------- rides ---------- */
const PICK = ["leith", "portobello", "stockbridge", "the old town"];
const DROP = ["the airport", "the station", "the hospital", "waverley"];
const DAY = ["friday", "tomorrow", "saturday", "next monday"];
const TIME = ["9am", "6:30pm", "10:15am"];
const RIDE_FORMS: ((p: string, d: string, day: string, t: string) => string)[] = [
  (p, d, day, t) => `i need a ride from ${p} to ${d} on ${day} at ${t}`,
  (p, d, day, t) => `can someone give me a lift to ${d} from ${p} ${day} at ${t}`,
  (p, d, day, t) => `${day} at ${t} i need a ride from ${p} to ${d}`,
  (p, d, day, t) => `could i get a lift from ${p} to ${d}, ${day}, pick up at ${t}`,
];
describe("rides — every order and wording", () => {
  let n = 0;
  for (const form of RIDE_FORMS)
    for (const p of PICK)
      for (const d of DROP) {
        const day = DAY[n % DAY.length]!;
        const t = TIME[n++ % TIME.length]!;
        const line = form(p, d, day, t);
        test(`"${line}"`, () => {
          const s = talk(line);
          expect(s.action).toBe("wish");
          expect(s.fields.ctx).toMatchObject({ pickup: p, dropoff: d, date: day, pickupTime: t });
          /* Only an airport trip still needs one more thing: luggage. */
          expect(s.asking).toBe(d === "the airport" ? "ctx:luggage" : null);
        });
      }

  test("one answer can carry several details", () => {
    let s = talk("i need a ride");
    s = hear(s, "from leith to the airport");
    expect(s.fields.ctx).toMatchObject({ pickup: "leith", dropoff: "the airport" });
    expect(asked(s)).toBe("ctx:date");
    s = hear(s, "friday at 5pm");
    expect(s.fields.ctx).toMatchObject({ date: "friday", pickupTime: "5pm" });
    expect(asked(s)).toBe("ctx:luggage");
  });

  for (const [said, flight] of [
    ["my flight leaves at 9pm", "9pm"],
    ["my flight's at 7:45am", "7:45am"],
    ["the train departs at 6pm", "6pm"],
  ] as const)
    test(`departure "${said}" is not the pickup time`, () => {
      const s = talk(`i need a ride from leith to the airport on friday, ${said}`);
      expect(s.fields.ctx.flightTime).toBe(flight);
      expect(s.fields.ctx.pickupTime).toBeUndefined();
      expect(asked(s)).toBe("ctx:pickupTime");
    });

  for (const h of ["7", "8", "11"])
    test(`bare "${h}" is clarified, not guessed`, () => {
      const s = talk(`i need a ride from leith to the station on friday at ${h}`);
      expect(s.fields.ctx.pickupTime).toBeUndefined();
      expect(s.prompt).toContain("morning or the evening");
    });

  for (const fix of ["actually 10am", "no, make it 10am", "sorry, i meant 10am", "change it to 10am"])
    test(`correction "${fix}" replaces the time`, () => {
      const s = hear(talk("i need a ride from leith to the station on friday at 9am"), fix);
      expect(s.fields.ctx.pickupTime).toBe("10am");
      expect(s.fields.ctx.date).toBe("friday");
    });
  test("negated day is replaced", () => {
    const s = hear(talk("i need a ride from leith to the station on friday at 9am"), "no, not friday, saturday");
    expect(s.fields.ctx.date).toBe("saturday");
  });
  for (const typo of ["i need a lift", "need a ride pls", "can somone give me a lift", "i need a rdie to the airport"])
    test(`paraphrase/typo "${typo}" is a ride`, () => {
      const s = talk(typo);
      expect(s.action).toBe("wish");
      expect(s.fields.context).toBe("ride");
    });
});

/* ---------- groceries ---------- */
describe("groceries", () => {
  const SHOP = ["can someone do my shopping", "i need someone to do my food shopping", "could anyone get my groceries for me"];
  for (const line of SHOP)
    test(`shopping "${line}" asks for the list`, () => {
      const s = talk(line);
      expect(s.fields.context).toBe("groceries");
      expect(asked(s)).toBe("ctx:list");
    });
  const COLLECT = ["can someone collect my click and collect order from tesco", "could someone pick up my groceries from tesco", "need my grocery order collected from asda"];
  for (const line of COLLECT)
    test(`collection "${line}" never asks for a list`, () => {
      const s = talk(line);
      expect(s.fields.ctx.mode).toBe("collection");
      expect(s.fields.ctx.store).toBeTruthy();
      expect(asked(s)).not.toBe("ctx:list");
      expect(asked(s)).not.toBe("ctx:store");
    });
  for (const flex of ["any time is fine", "whenever", "no rush", "i'm flexible"])
    test(`"${flex}" skips day and time`, () => {
      let s = talk("can someone do my shopping");
      s = hear(s, "milk and bread");
      s = hear(s, `deliver to leith, ${flex}`);
      expect(s.stage).toBe("review");
      expect(s.fields.ctx.window).toBeUndefined();
    });
  test("shopping answers out of order land in the right fields", () => {
    const s = talk("can someone do my shopping on saturday morning, deliver to leith, just milk and eggs");
    expect(s.fields.ctx.deliveryArea).toContain("leith");
    expect(s.fields.ctx.day).toBe("saturday");
    expect(s.fields.ctx.list).toContain("milk");
    expect(asked(s)).not.toBe("ctx:list");
  });
});

/* ---------- services vs things ---------- */
describe("services vs tangible", () => {
  for (const line of ["i can walk your dog", "i'm offering free maths tutoring", "i can help with your garden"])
    test(`service "${line}" asks when you're free, not collection`, () => {
      const s = pickIntent(talk(line), /giv|offer/);
      expect(s.action).toBe("give");
      expect(s.prompt).not.toMatch(/collect/);
    });
  for (const line of ["i'd love a monstera plant to keep", "i wish i had a desk lamp"])
    test(`object wish "${line}" gets no ride or shopping questions`, () => {
      const s = talk(line);
      expect(s.fields.context).toBeNull();
      expect(asked(s)).not.toMatch(/^ctx:/);
    });
});

/* ---------- cross-seat routing ---------- */
describe("voice reaches the same places touch does", () => {
  const AREAS: [string, string][] = [
    ["update my profile", "bio"], ["change my bio", "bio"], ["edit my username", "bio"],
    ["change my photo", "photo"], ["update my profile picture", "photo"],
    ["show my reputation", "reputation"], ["see my compliments", "reputation"],
    ["show my chats", "chats"], ["open my messages", "chats"],
    ["check my sparks", "sparks"], ["show my balance", "sparks"],
    ["show my past gives", "activity"], ["see my current wishes", "activity"], ["show my activity", "activity"],
    ["open settings", "settings"], ["change my password", "settings"], ["sign out", "settings"],
  ];
  for (const [line, area] of AREAS)
    test(`"${line}" → ${area}`, () => {
      expect(profileAreaOf(line)).toBe(area as never);
      expect(talk(line).profile).toBe(area as never);
      expect(talk(line).action).toBeNull();
    });
  for (const { value, word } of CG_FILTERS) {
    if (value === "mine") continue;
    for (const f of [(w: string) => `show community ${w}`, (w: string) => `community ${w} please`])
      test(`"${f(word)}" → ${value}`, () => {
        expect(communityFilterOf(f(word))).toBe(value);
        expect(talk(f(word)).community).toBe(value);
      });
  }
  test("my community posts → mine", () => expect(communityFilterOf("show my posts in the community")).toBe("mine"));
  for (const line of ["i'm giving away a sofa", "can i borrow a drill", "i need a ride"])
    test(`creation "${line}" never changes the community filter`, () => expect(communityFilterOf(line, true)).toBeNull());
  for (const line of ["show me ladders", "find a fridge", "is anyone giving away a bike"])
    test(`search "${line}" searches, creates nothing`, () => {
      const s = talk(line);
      expect(s.search).toBeTruthy();
      expect(s.action).toBeNull();
    });
});

/* ---------- cancel, resume, echo, review-before-share ---------- */
describe("conversation safety", () => {
  for (const c of ["cancel", "never mind", "start again", "forget it"])
    test(`"${c}" clears the draft and asks afresh`, () => {
      const s = hear(talk("i'm giving away a sofa in leith"), c);
      expect(s.action).toBeNull();
      expect(s.fields.what).toBe("");
      expect(s.asking).toBe("intent");
      const r = hear(s, "can i borrow a drill");
      expect(r.action).toBe("borrow");
    });
  test("the app's own question heard back is ignored", () => {
    const s = talk("i need a ride");
    expect(isEcho(s.prompt, s.prompt)).toBe(true);
    expect(isEcho("where should they pick you up", "where should they pick you up?")).toBe(true);
    expect(isEcho("leith", "where should they pick you up?")).toBe(false);
  });
  test("denied location leaves the where question for the area", () => {
    const s = hear(talk("i'm giving away a sofa"), "use my location");
    expect(s.wantsLocation).toBe(true);
    expect(s.fields.where).toBe("");
  });

  /* Generated random-ish sequences: nothing ever becomes live by talking. */
  const BITS = ["yes", "no", "done", "review", "share it", "post it now", "publish", "send it", "that's it", "ok", "leith", "tomorrow", "a sofa", "actually saturday"];
  const STARTS = ["i'm giving away a sofa", "i need a ride", "can i borrow a drill", "swap my bike for a guitar", "raising £100 for books", "can someone do my shopping"];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 60; i++) {
    const lines = [STARTS[i % STARTS.length]!, ...Array.from({ length: 6 }, () => BITS[Math.floor(rnd() * BITS.length)]!)];
    test(`sequence ${i}: never live, review only after asking`, () => {
      let s = startSession();
      for (const l of lines) {
        const before = s.stage;
        s = hear(s, l);
        expect(s.stage).not.toBe("live");
        if (s.stage === "review") expect(["ready", "review"]).toContain(before);
      }
    });
  }
  test("a ride is reviewable but sharing still needs the explicit button", () => {
    const s = talk("i need a ride from leith to the station on friday at 9am", "no", "yes");
    expect(s.stage).toBe("review");
    expect(canGoLive("wish", s.fields)).toBe(true);
  });
});

/* ---------- privacy + model validation ---------- */
describe("privacy and model guard", () => {
  for (const addr of ["12 leith walk", "flat 3, 45 easter road", "eh6 8rg", "221b baker street"])
    test(`precise "${addr}" never reaches the public post`, () => {
      const pub = JSON.stringify(publicExtras({ pickup: addr, dropoff: "the airport" }));
      expect(pub).not.toContain(addr);
    });
  const said = "i need a ride to the airport on friday";
  const ctx: Ctx = { dropoff: "the airport", date: "friday" };
  test("ungrounded model values are dropped", () => {
    const v = validateModel("ride", ctx, said, { field: "pickup", question: "where from?", updates: { pickup: "leith" } });
    expect(v?.ctx.pickup).toBeUndefined();
  });
  test("model may not overwrite fields outside its kind", () => {
    const v = validateModel("ride", ctx, said, { field: "pickup", question: "where from?", updates: { list: "friday" } as never });
    expect((v?.ctx as Record<string, string>)?.list).toBeUndefined();
  });
  test("unparseable model output → rule question", () => {
    expect(validateModel("ride", ctx, said, null as never)).toBeNull();
    expect(nextNeed("ride", ctx)?.field).toBe("pickup");
  });
});
