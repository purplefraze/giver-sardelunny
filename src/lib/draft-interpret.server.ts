import { createLovableAiGatewayRunIdFetch } from "./ai-run-id.server.ts";
import { validateDraftSuggestion, type DraftReading } from "@/intelligence/draft-understanding";
import type { VoiceFields } from "@/intelligence/voice-flow";
import type { GiverAction } from "@/intelligence/action-draft";
/** Stream the existing model's grounded suggestion; no writes or tools. */
export async function interpretOrdinaryDraft(data:{action:GiverAction;fields:VoiceFields;said:string[]},key:string,model:string):Promise<{reading:DraftReading|null;error:string|null}> {
  const gateway=createLovableAiGatewayRunIdFetch();
  const properties={subject:{type:["string","null"]},title:{type:["string","null"]},category:{type:["string","null"],enum:["a thing","clothes","food","time","a skill","a hand",null]},want:{type:["string","null"]},amount:{type:["string","null"]}};
  const res=await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Lovable-API-Key":key,"X-Lovable-AIG-SDK":"fetch"},body:JSON.stringify({
    model,store:false,stream:true,reasoning:{effort:"low",summary:"auto"},include:["reasoning.encrypted_content"],
    input:[{role:"system",content:"Read Giver's selected-mode draft. Extract subject and Trade want using ONLY contiguous words the user said, without intent/disposal phrases. Preserve specificity (box of records). Incomplete lead phrases have null subject. Suggest one concise mode-appropriate public title, no invented condition/delivery/location/date/quantity. Infer category only grounded by the given subject. Amount only if said. Never switch selected mode, publish or claim anything was saved."},{role:"user",content:JSON.stringify(data)}],
    text:{format:{type:"json_schema",name:"giver_draft",strict:true,schema:{type:"object",additionalProperties:false,required:Object.keys(properties),properties}}}
  })});
  if(!res.ok){const body=await res.text();console.error(`Giver draft interpretation [${res.status}]: ${body}`);return {reading:null,error:`understanding is unavailable (${res.status}). you can keep typing or review your draft.`};}
  if(!res.body)return {reading:null,error:"no understanding returned. you can keep typing."};
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer="",out="",failure=false;
  for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let i:number;while((i=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(!line.startsWith("data:"))continue;try{const e=JSON.parse(line.slice(5)) as {type?:string;delta?:string};if(e.type==="response.output_text.delta")out+=e.delta??"";if(e.type==="response.failed"||e.type?.startsWith("response.refusal"))failure=true;}catch{/* incomplete SSE */}}}
  if(failure||!out)return {reading:null,error:"No suggestion available. Your draft is kept."};
  try{return {reading:validateDraftSuggestion(JSON.parse(out),data.action,data.fields,data.said),error:null};}catch{return {reading:null,error:"Suggestion could not be understood. Your draft is kept."};}
}