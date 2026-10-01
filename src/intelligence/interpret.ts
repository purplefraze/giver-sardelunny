import type { ActionDraft, GiverAction } from "@/intelligence/action-draft";
import { emptyEntities, isAction, missingOf, suggestedOf } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared pipeline. One function, every action.
 * Gateway down, or a dirty payload: the deterministic binder answers.
 * This never publishes.
 */

export type InterpretInput = {
  text: string;
  /** Later: voice transcript, photo note. Same draft either way. */
  source?: "text" | "voice" | "photo";
};

const sanitise = (raw: unknown, fallback: ActionDraft): ActionDraft => {
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const action = isAction(row.action) ? row.action : null;
  const confidence =
    typeof row.confidence === "number" && row.confidence >= 0 && row.confidence <= 1
      ? row.confidence
      : fallback.confidence;
  const src = (row.entities ?? {}) as Record<string, unknown>;
  const entities = emptyEntities();
  const str = (k: keyof typeof entities) =>
    typeof src[k] === "string" && (src[k] as string).trim() ? (src[k] as string).trim() : null;
  entities.item = str("item");
  entities.category = str("category");
  entities.condition = str("condition");
  entities.location = str("location");
  entities.availability = str("availability");
  entities.date = str("date");
  entities.duration = str("duration");
  entities.offer = str("offer");
  entities.want = str("want");
  entities.quantity = str("quantity");
  entities.amountCents =
    typeof src.amountCents === "number" && Number.isInteger(src.amountCents)
      ? src.amountCents
      : null;
  const clarification =
    row.clarification &&
    typeof row.clarification === "object" &&
    typeof (row.clarification as { ask?: unknown }).ask === "string"
      ? {
          ask: (row.clarification as { ask: string }).ask,
          choices: Array.isArray((row.clarification as { choices?: unknown }).choices)
            ? ((row.clarification as { choices: unknown[] }).choices.filter(
                (c) => typeof c === "string",
              ) as string[])
            : [],
        }
      : null;
  const act = action as GiverAction | null;
  return {
    action: act,
    confidence,
    entities,
    missingRequired: act ? missingOf(act, entities) : [],
    suggested: act ? suggestedOf(act, entities) : [],
    clarification,
    source: "model",
  };
};

export const interpret = async (input: InterpretInput): Promise<ActionDraft> => {
  const fallback = bindUtterance(input.text);
  const text = input.text.trim();
  if (!text) return fallback;
  try {
    const { data, error } = await supabase.functions.invoke("interpret-action", {
      body: { text, source: input.source ?? "text" },
    });
    if (error || !data || (data as { fallback?: boolean }).fallback) return fallback;
    return sanitise((data as { draft?: unknown }).draft ?? data, fallback);
  } catch {
    return fallback;
  }
};
