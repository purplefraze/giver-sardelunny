import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * UNDERSTAND — one pipeline for every Giver action.
 * Returns a draft. Does not publish, message, spend Sparks, or contact anyone.
 * Unknown actions are dropped. The client binder remains the fallback.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY =
  Deno.env.get("LOVABLE_AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = Deno.env.get("LOVABLE_AI_MODEL") ?? "google/gemini-3.8-flash";

const ACTIONS = ["give", "wish", "borrow", "lend", "trade", "fund"] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ fallback: true }, 405);

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ fallback: true, reason: "no gateway key" });

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.slice(0, 500) : "";
  } catch {
    return json({ fallback: true }, 400);
  }
  if (!text.trim()) return json({ fallback: true }, 400);

  const gateway = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You translate one human sentence into a Giver draft. Reply with JSON only. " +
            'Shape: {"action":"give|wish|borrow|lend|trade|fund|null","confidence":0,"entities":{"item":null,"category":null,"condition":null,"location":null,"availability":null,"date":null,"duration":null,"offer":null,"want":null,"amountCents":null,"quantity":null},"clarification":null} ' +
            "confidence is 0 to 1. amountCents is integer cents or null. " +
            "If they have a thing but do not say give, lend, or trade, action is null and clarification asks what they want to do. " +
            "lend me means borrow. someone can borrow means lend. fund is a wish with a money target, not a new type. " +
            "Do not invent condition, address, age, or ownership. Do not publish. category must be one of: a thing, clothes, food, time, a skill, a hand, or null.",
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!gateway.ok) return json({ fallback: true });

  const payload = await gateway.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return json({ fallback: true });

  try {
    const parsed = JSON.parse(content.replace(/^```json\s*|```$/g, "").trim());
    const action = ACTIONS.includes(parsed.action) ? parsed.action : null;
    return json({
      draft: {
        action,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        entities: parsed.entities ?? {},
        clarification: parsed.clarification ?? null,
        source: "model",
      },
    });
  } catch {
    return json({ fallback: true });
  }
});
