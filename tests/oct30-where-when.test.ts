import { beforeEach,expect,mock,test } from "bun:test";
import { readAnswerTime,pickedAnswerTime } from "../src/intelligence/answer-time";
import { listingTitle,validateDraftSuggestion } from "../src/intelligence/draft-understanding";
import { EMPTY_FIELDS } from "../src/intelligence/voice-flow";
let resolveReading:((v:unknown)=>void)|undefined;
mock.module("@/lib/followup.functions",()=>({followUp:async()=>({source:"rules",ctx:{}}),interpretDraft:()=>new Promise(resolve=>{resolveReading=resolve;})}));
mock.module("@/data/my-location",()=>({askLocation:async()=>({ok:false})}));
const {conversation}=await import("../src/intelligence/voice-conversation");
const {buildPayload}=await import("../src/intelligence/share-coordinator");
beforeEach(()=>{for(const seat of ["give","wish","borrow","lend","trade","fund"]){conversation.selectSeat(seat);conversation.close();}});
import { readFileSync } from "node:fs";
import { whereResolved } from "../src/lib/where-options";
import { collectionLabelSchema } from "../src/lib/collection-location";

/* ITEM 3 (Casper, Oct 30): "yonge and dundas" showed in the "when can it be
   collected?" box. The where answer must never carry into the date question. */
test("item 3: the where answer does not leak into the when question (give and lend)", () => {
  for (const action of ["give", "lend"] as const) {
    conversation.close(); conversation.openForm(action);
    conversation.answer("a ladder");
    expect(conversation.get().session?.asking).toBe("where");
    const whereKey = [conversation.get().session?.asking, conversation.get().session?.prompt].join("|");
    conversation.answer("yonge and dundas");
    const s = conversation.get().session;
    expect(s?.asking).toBe("when");
    /* VoiceReview clears its answer box when this key changes. */
    expect([s?.asking, s?.prompt].join("|")).not.toBe(whereKey);
    expect(s?.fields.when ?? "").not.toMatch(/yonge|dundas/i);
    expect(s?.fields.timing?.label ?? "").not.toMatch(/yonge|dundas/i);
  }
});
test("item 3: VoiceReview resets the shared answer box on every new question", () => {
  const src = readFileSync(new URL("../src/intelligence/VoiceReview.tsx", import.meta.url), "utf8");
  expect(src).toMatch(/useEffect\(\(\)=>\{setAnswer\(""\);\},\[c\.session\?\.draftId,c\.session\?\.asking,c\.session\?\.prompt\]\)/);
});
/* ITEM 4: "the moon" is not a place. */
test("item 4: off-earth words are refused as a collection area", () => {
  for (const w of ["the moon", "Moon", "on the sun", "outer space"]) expect(collectionLabelSchema.safeParse(w).success).toBe(false);
  for (const w of ["yonge and dundas, toronto", "Sunnyside, Toronto", "Moonbeam Ave"]) expect(collectionLabelSchema.safeParse(w).success).toBe(true);
});
test("item 4: a typed or heard where without a picked pin cannot be shared", () => {
  expect(whereResolved("", null)).toBe(true);
  expect(whereResolved("the moon", null)).toBe(false);
  expect(whereResolved("yonge and dundas", null)).toBe(false);
  expect(whereResolved("the moon", { lat: 43.65, lng: -79.38 })).toBe(false);
  expect(whereResolved("yonge st & dundas st, toronto", { lat: 43.65, lng: -79.38 })).toBe(true);
});
