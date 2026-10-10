import { beforeEach,expect,mock,test } from "bun:test";
import { readAnswerTime,pickedAnswerTime } from "../src/intelligence/answer-time";
import { listingTitle,validateDraftSuggestion } from "../src/intelligence/draft-understanding";
import { EMPTY_FIELDS } from "../src/intelligence/voice-flow";
let resolveReading:((v:unknown)=>void)|undefined;
mock.module("@/lib/followup.functions",()=>({followUp:async()=>({source:"rules",ctx:{}}),interpretDraft:()=>new Promise(resolve=>{resolveReading=resolve;})}));
mock.module("@/data/my-location",()=>({askLocation:async()=>({ok:false})}));
const {conversation}=await import("../src/intelligence/voice-conversation");
const {buildPayload}=await import("../src/intelligence/share-coordinator");
beforeEach(()=>conversation.close());
test("whole and fragmented ordinary Give keep subject, category and no invented place/date",()=>{
  for(const lines of [["I would like to give a table"],["I would like to give","A table"],["I'd like to give a table"]]){
    conversation.close();conversation.openForm("give");for(const line of lines)conversation.type(line);
    const f=conversation.get().session?.fields;
    expect(f?.what).toBe("table");expect(f?.kind).toBe("a thing");expect(f?.title).toBe("Giving away table");expect(f?.where).toBe("");expect(f?.when).toBe("");
  }
});
test("disposal phrasing preserves box of records specificity",()=>{
  conversation.openForm("give");conversation.type("I'm getting rid of a box of records");
  expect(conversation.get().session?.fields.what).toBe("box of records");expect(conversation.get().session?.fields.title).toBe("Giving away box of records");
});
test("unfinished lead never completes subject",()=>{
  conversation.openForm("give");conversation.type("I would like to give");expect(conversation.get().session?.fields.what).toBe("");expect(conversation.get().session?.asking).toBe("what");
});
test("six selected modes keep one draft, no mic and no live stage before Share",()=>{
  for(const mode of ["give","wish","borrow","lend","trade","fund"]){conversation.close();conversation.openForm(mode);const id=conversation.currentDraftId();conversation.answer(mode==="fund"?"raising funds for a garden":"a table");expect(conversation.get().mode).toBe("off");expect(conversation.get().session?.action).toBe(mode);expect(conversation.get().session?.stage).not.toBe("live");conversation.closeForm();conversation.openForm(mode);expect(conversation.currentDraftId()).toBe(id);expect(conversation.get().session?.fields.what).not.toBe("");}
});
test("multi-detail item skips supplied area, date and condition",()=>{
  conversation.openForm("give");conversation.type("I'd like to give a table tomorrow in Leith, good condition");
  const s=conversation.get().session;expect(s?.fields.where).toBe("leith");expect(s?.fields.timing?.date).toBeTruthy();expect(s?.fields.condition).toBe("good condition");expect(s?.stage).toBe("review");
});
test("lesson needs meeting and recurrence, never physical condition",()=>{
  conversation.openForm("give");conversation.answer("guitar lessons");expect(conversation.get().session?.fields.kind).toBe("a skill");conversation.answer("online");conversation.type("Tuesday");expect(conversation.get().session?.prompt).toMatch(/this tuesday or every tuesday/i);conversation.type("every Tuesday");expect(conversation.get().session?.fields.timing?.recurrence).toBe("every tuesday");expect(conversation.get().session?.fields.condition).toBe("");
});
test("local-calendar tomorrow and bare weekday/hour ambiguity",()=>{
  const now=new Date(2026,9,10,23,50);
  expect(readAnswerTime("tomorrow 7pm",now).value).toMatchObject({date:"2026-10-11",time:"19:00"});
  expect(readAnswerTime("Tuesday",now).question).toBe("this tuesday or every tuesday?");
  expect(readAnswerTime("this Tuesday at 7",now).question).toBe("7am or 7pm?");
  expect(readAnswerTime("this Tuesday 7pm",now).value).toMatchObject({date:"2026-10-13",time:"19:00",recurrence:"one-off"});
  expect(readAnswerTime("every Tuesday 7pm",now).value).toMatchObject({recurrence:"every tuesday",time:"19:00"});
});
test("picked date/time reaches real production payload",()=>{
  conversation.openForm("give");conversation.answer("a table");conversation.answer("in Leith");const time=pickedAnswerTime("2026-10-13","19:00");if(!time)throw new Error("invalid date");conversation.setTiming(time);
  const s=conversation.get().session;if(!s?.action)throw new Error("no action");
  const payload=buildPayload(s.action,s.fields,()=>({topic:"objects",expiresAt:"2026-10-17"}));
  expect(payload?.details).toMatchObject({date:"2026-10-13",startTime:"19:00",cadence:"one-off"});expect(s.fields.when).toContain("13 october 2026");
});
test("schema/grounding reject invented delivery and preserve title/category edits against late result",async()=>{
  const valid={subject:"table",title:"Table up for grabs",category:"a thing",want:null,amount:null};
  expect(validateDraftSuggestion({...valid,subject:"mahogany table"},"give",EMPTY_FIELDS,["a table"])).toBeNull();
  expect(validateDraftSuggestion({...valid,title:"table with free delivery"},"give",EMPTY_FIELDS,["a table"])?.title).toBeNull();
  conversation.openForm("give");conversation.type("a table");const resolve=resolveReading;conversation.edit("title","My table");conversation.edit("kind","time");resolve?.({reading:valid,error:null});await new Promise(r=>setTimeout(r,0));expect(conversation.get().session?.fields.title).toBe("My table");expect(conversation.get().session?.fields.kind).toBe("time");
});
test("late interpretation cannot change a new same-seat draft",async()=>{
  conversation.openForm("give");conversation.type("a table");const resolve=resolveReading;const old=conversation.currentDraftId();conversation.close();conversation.openForm("give");resolve?.({reading:{subject:"table",title:"Table up for grabs",category:"a thing",want:null,amount:null},error:null});await new Promise(r=>setTimeout(r,0));expect(conversation.currentDraftId()).not.toBe(old);expect(conversation.get().session?.fields.what).toBe("");
});