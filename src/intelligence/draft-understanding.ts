import { z } from "zod";
import { GIVE_TYPES, inferGiveType } from "@/data/give-lexicon";
import type { GiverAction } from "./action-draft";
import { incompleteLead, itemOf } from "./lead-intent";
import type { VoiceFields } from "./voice-flow";

export const DraftSuggestion = z.object({
  subject: z.string().max(80).nullable(),
  title: z.string().max(100).nullable(),
  category: z.enum(GIVE_TYPES as [typeof GIVE_TYPES[number], ...typeof GIVE_TYPES[number][]]).nullable(),
  want: z.string().max(80).nullable(),
  amount: z.string().max(20).nullable(),
}).strict();
export type DraftReading = z.infer<typeof DraftSuggestion>;
const words = (s:string):string[] => s.toLowerCase().replace(/[’]/g,"'").match(/[a-z0-9]+/g) ?? [];
const grounded = (s:string,said:string) => words(s).every(w=>words(said).includes(w));
export function listingTitle(action:GiverAction, subject:string):string {
  const clean=subject.replace(/^(?:a|an|the)\s+/i,"").trim();
  if(!clean||incompleteLead(clean))return "";
  const prefix={give:"Giving away",wish:"Looking for",borrow:"Looking to borrow",lend:"Available to lend:",trade:"Offering to trade:",fund:"Raising funds for"}[action];
  return `${prefix} ${clean}`;
}
/** Model is a grounded second reading, never an authority over user facts. */
export function validateDraftSuggestion(value:unknown,action:GiverAction,f:VoiceFields,said:readonly string[]):DraftReading|null {
  const parsed=DraftSuggestion.safeParse(value);if(!parsed.success)return null;
  const v=parsed.data,text=said.join(" ");
  if(v.subject&&(!grounded(v.subject,text)||incompleteLead(v.subject)||itemOf(v.subject.toLowerCase())!==v.subject.toLowerCase().trim()))return null;
  if(v.want&&!grounded(v.want,text))return null;
  if(v.amount&&!grounded(v.amount,text))return null;
  const subject=f.what||v.subject||"";
  if(v.category&&v.category!==(inferGiveType(subject)||v.category))return null;
  // Unknown categories need explicit grounded service/item evidence, not guesses.
  if(v.category&&!inferGiveType(subject)&&!grounded(v.category,text))v.category=null;
  const allowed=`${text} ${listingTitle(action,subject)} up for grabs giving away available to lend offering to trade looking for looking to borrow raising funds`;
  if(v.title&&(!grounded(v.title,allowed)||!grounded(v.title,`${subject} ${listingTitle(action,subject)} up for grabs`)))v.title=null;
  return v;
}