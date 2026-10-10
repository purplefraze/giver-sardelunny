import { parseDateOnly, toDateOnly, formatDateOnly } from "@/lib/date-only";
export type AnswerTime={date?:string;time?:string;recurrence?:string;label:string};
export type TimeReading={value:AnswerTime|null;question:string|null;choices:string[]};
const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
/** Date arithmetic is calendar-local (DST safe); now is injected in tests. */
export function readAnswerTime(raw:string,now=new Date()):TimeReading {
  const s=raw.toLowerCase().trim();let date:string|undefined,time:string|undefined,recurrence:string|undefined;
  const weekday=DAYS.find(d=>s.includes(d));
  if(weekday&&!/\b(this|next|every|each|weekly|once)\b/.test(s))return {value:null,question:`this ${weekday} or every ${weekday}?`,choices:[`this ${weekday}`,`every ${weekday}`]};
  const clock=s.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const bare=s.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/);
  if(!clock&&bare&&Number(bare[1])<=12)return {value:null,question:`${bare[1]}am or ${bare[1]}pm?`,choices:[`${bare[1]}${bare[2]?`:${bare[2]}`:""}am`,`${bare[1]}${bare[2]?`:${bare[2]}`:""}pm`]};
  if(clock){const n=Number(clock[1]),m=Number(clock[2]??0);if(n>=1&&n<=12&&m<60)time=`${String(n%12+(clock[3]==="pm"?12:0)).padStart(2,"0")}:${String(m).padStart(2,"0")}`;}
  const iso=s.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if(iso&&parseDateOnly(iso))date=iso;
  if(/\b(today|tomorrow)\b/.test(s)){const d=new Date(now);d.setDate(d.getDate()+(/tomorrow/.test(s)?1:0));date=toDateOnly(d);}
  if(weekday){if(/\b(every|each|weekly)\b/.test(s))recurrence=`every ${weekday}`;else{const d=new Date(now);let delta=(DAYS.indexOf(weekday)-d.getDay()+7)%7;if(/next/.test(s))delta=delta||7;d.setDate(d.getDate()+delta);date=toDateOnly(d);recurrence="one-off";}}
  const flexible=/\b(flexible|any ?time|whenever|arrange with (?:the )?recipient)\b/.test(s);
  if(!date&&!time&&!recurrence&&!flexible)return {value:null,question:null,choices:[]};
  const label=flexible?s:[date?formatDateOnly(date):recurrence??"",time?`${Number(time.slice(0,2))%12||12}${time.slice(3)==="00"?"":`:${time.slice(3)}`}${Number(time.slice(0,2))<12?"am":"pm"}`:""].filter(Boolean).join(", ");
  return {value:{...(date?{date}:{}),...(time?{time}:{}),...(recurrence?{recurrence}:{}),label},question:null,choices:[]};
}
export function pickedAnswerTime(date:string,time:string):AnswerTime|null {
  if(!parseDateOnly(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||"00:00"))return null;
  return {date,...(time?{time}:{}),recurrence:"one-off",label:`${formatDateOnly(date)}${time?`, ${time}`:""}`};
}