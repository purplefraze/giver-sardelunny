import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FIELDS_OF, nextNeed, validateModel, type ContextKind, type Ctx } from "@/intelligence/contextual-needs";
import { interpretOrdinaryDraft } from "./draft-interpret.server";
import type { VoiceFields } from "@/intelligence/voice-flow";

/**
 * CONTEXTUAL FOLLOW-UP through the Lovable AI Gateway. The model reads the
 * whole conversation + structured draft and may (a) fill details the rules
 * missed and (b) phrase the one next question. Its output is validated by the
 * same pure rules: ungrounded values and wrong-field questions are dropped.
 * It can never save, message or publish — it only returns a suggestion.
 */
export const FOLLOWUP_MODEL = "openai/gpt-6-astra";

const Input = z.object({
  kind: z.enum(["ride", "groceries", "lesson", "service"]),
  ctx: z.record(z.string(), z.string()),
  said: z.array(z.string().max(400)).max(30),
});

const SYSTEM = `You help Giver, a neighbourly sharing app, ask ONE short follow-up question for any Give, Wish, Trade, Borrow, Lend or Fund.
Rules:
- Read the whole conversation and the known details. Fill a detail in "updates" ONLY with words the person actually said; otherwise null. Never guess.
- Lessons/services use subject, format (online/in person), area, availability, recurrence and optional level/duration. Never ask collection or condition. A bare weekday is ambiguous, never invent a date or recurrence. Never force optional level or duration.
- A flight/train departure time is "flightTime", never "pickupTime".
- An hour without am/pm is ambiguous: leave it null.
- If the person corrects something ("actually 8pm"), use the corrected value.
- "question" asks only about "next_field", in under 14 words, lowercase, ending with "?". Never say anything was posted, sent or saved.
- Never ask for an exact street address; an area is enough.`;

function schemaFor(kind: ContextKind) {
  const props: Record<string, unknown> = {};
  for (const f of FIELDS_OF[kind]) props[f] = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    required: ["question", "field", "updates"],
    properties: {
      question: { type: "string" },
      field: { type: "string" },
      updates: { type: "object", additionalProperties: false, required: [...FIELDS_OF[kind]], properties: props },
    },
  };
}

export type FollowUp = { ctx: Ctx; field: string | null; ask: string | null; source: "model" | "rules"; reason?: string };

export const followUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<FollowUp> => {
    const kind = data.kind as ContextKind;
    const ctx = data.ctx as Ctx;
    const rules = (reason: string): FollowUp => {
      const n = nextNeed(kind, ctx);
      return { ctx, field: n?.field ?? null, ask: n?.ask ?? null, source: "rules", reason };
    };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return rules("not configured");
    const rule = nextNeed(kind, ctx);
    const known = Object.fromEntries(Object.entries(ctx).filter(([k]) => !k.startsWith("__")));
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: FOLLOWUP_MODEL,
          instructions: SYSTEM,
          input: JSON.stringify({ kind, said: data.said, known, next_field: rule?.field ?? null }),
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: "followup", strict: true, schema: schemaFor(kind) } },
        }),
      });
      if (!res.ok) { const body = await res.text(); console.error(`AI follow-up [${res.status}]: ${body}`); return rules(`gateway ${res.status}: ${body}`); }
      if (!res.body) return rules("empty stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let out = "";
      let refused = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          try {
            const e = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string };
            if (e.type === "response.output_text.delta" && e.delta) out += e.delta;
            if (e.type === "response.refusal.delta" || e.type === "response.failed") refused = true;
          } catch {
            /* partial or non-JSON frame */
          }
        }
      }
      if (refused || !out) return rules("no answer");
      const parsed = JSON.parse(out) as { question?: string; field?: string; updates?: Record<string, string | null> };
      const updates = Object.fromEntries(Object.entries(parsed.updates ?? {}).filter(([, v]) => typeof v === "string" && v));
      const v = validateModel(kind, ctx, data.said.join(" \n "), { ...parsed, updates });
      if (!v) return rules("invalid");
      return { ctx: v.ctx, field: v.need?.field ?? null, ask: v.need?.ask ?? null, source: "model" };
    } catch {
      return rules("unreachable");
    }
  });

/** Ordinary objects use the same configured model and authenticated boundary. */
export const interpretDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ action: z.enum(["give","wish","trade","borrow","lend","fund"]), fields: z.custom<VoiceFields>((v)=>!!v&&typeof v==="object"&&"what" in v&&typeof v.what==="string"), said:z.array(z.string().max(400)).max(30) }).parse(d))
  .handler(async ({data}) => {
    const key=process.env["LOVABLE_API_KEY"];
    if(!key)return {reading:null,error:"understanding is unavailable. you can keep typing or review your draft."};
    try{return await interpretOrdinaryDraft(data,key,FOLLOWUP_MODEL);}catch{return {reading:null,error:"Understanding is unavailable. Your draft is kept."};}
  });
