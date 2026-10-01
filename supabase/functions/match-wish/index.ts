/**
 * MATCH A WISH TO OPEN COMMUNITY OFFERS via Lovable AI Gateway.
 * Called only from the app. LOVABLE_API_KEY stays on the function.
 * Returns ids that exist in the offer set. Never invents an offer.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY =
  Deno.env.get("LOVABLE_AI_GATEWAY_URL") ??
  "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = Deno.env.get("LOVABLE_AI_MODEL") ?? "google/gemini-3.8-flash";
const CAP = 40;
const MAX_OUT = 5;

type Offer = {
  id: string;
  type: string;
  side: string | null;
  text: string;
  offer: string | null;
  want: string | null;
  note: string | null;
  distance_km: number | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const isOffer = (row: Offer) =>
  row.type === "give" ||
  row.type === "trade" ||
  (row.type === "borrow" && row.side === "lend");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("LOVABLE_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ error: "backend not ready" }, 500);

  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "sign in to match a wish" }, 401);

  let wish = "";
  try {
    const body = await req.json();
    wish = String(body?.wish ?? "").trim().slice(0, 80);
  } catch {
    return json({ error: "wish text required" }, 400);
  }
  if (!wish) return json({ error: "wish text required" }, 400);

  const { data, error } = await supabase
    .from("items")
    .select("id, owner_id, type, side, text, offer, want, note, distance_km, status, published")
    .eq("published", true)
    .eq("status", "active")
    .neq("owner_id", userData.user.id)
    .limit(200);
  if (error) return json({ error: "could not read offers" }, 500);

  const offers = ((data ?? []) as Offer[]).filter(isOffer).slice(0, CAP);
  if (!offers.length) return json({ matches: [] });
  if (!key) return json({ error: "matching is quiet right now", matches: [] }, 503);

  const catalogue = offers.map((o) => ({
    id: o.id,
    kind: o.type === "borrow" ? "lend" : o.type,
    text: o.text,
    offer: o.offer,
    note: o.note,
    distanceKm: o.distance_km,
  }));

  const gateway = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You match a community wish to existing offers. Kindness is the currency. " +
            "Reply with JSON only: {\"matches\":[{\"itemId\":\"\",\"why\":\"\",\"fit\":0}]} " +
            "Up to 5. why is one short lowercase line. fit is 0 to 1. " +
            "Use only itemId values from the catalogue. If none fit, matches is []. " +
            "Never invent an offer.",
        },
        {
          role: "user",
          content: JSON.stringify({ wish, catalogue }),
        },
      ],
    }),
  });

  if (gateway.status === 429) return json({ error: "matching is busy, try again", matches: [] }, 429);
  if (gateway.status === 402) return json({ error: "matching is quiet right now", matches: [] }, 402);
  if (!gateway.ok) return json({ error: "matching is quiet right now", matches: [] }, 502);

  const payload = await gateway.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let parsed: { matches?: { itemId?: string; why?: string; fit?: number }[] } = {};
  try {
    parsed = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : "{}");
  } catch {
    parsed = {};
  }

  const known = new Map(offers.map((o) => [o.id, o]));
  const matches = (parsed.matches ?? [])
    .filter((m) => m.itemId && known.has(m.itemId))
    .slice(0, MAX_OUT)
    .map((m) => {
      const o = known.get(m.itemId!)!;
      return {
        itemId: o.id,
        text: o.text,
        kind: o.type === "borrow" ? "lend" : o.type,
        why: String(m.why ?? "").trim().slice(0, 90).toLowerCase(),
        fit: Math.max(0, Math.min(1, Number(m.fit) || 0)),
      };
    })
    .sort((a, b) => b.fit - a.fit);

  return json({ matches });
});
