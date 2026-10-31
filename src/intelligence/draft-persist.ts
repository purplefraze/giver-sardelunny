/**
 * anna pass2 #3 — unshared voice/form drafts survive a reload.
 * One localStorage entry per seat/form (action). Cleared on a successful share
 * or an explicit discard. Photos are NOT persisted (they are in-memory files).
 */
import type { Pin } from "@/data/give-pins";
import type { VoiceSession } from "@/intelligence/voice-session";

export const DRAFT_KEY_PREFIX = "giver.voice-draft.v1.";
const ACTIONS = ["give", "wish", "trade", "borrow", "lend", "fund"] as const;
export type PersistedDraft = { session: VoiceSession; edited: string[]; pin: Pin | null; savedAt: number };

let override: Storage | null | undefined;
/** Tests only: swap the storage backend (undefined = the browser's localStorage). */
export function setDraftStorage(s: Storage | null | undefined): void { override = s; }
const store = (): Storage | null => { if (override !== undefined) return override; try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } };
const isAction = (a: unknown): a is (typeof ACTIONS)[number] => typeof a === "string" && (ACTIONS as readonly string[]).includes(a);

/** True when the draft holds something the person would miss. */
export function hasContent(s: VoiceSession | null | undefined): boolean {
  if (!s?.action || s.stage === "live") return false;
  const f = s.fields as unknown as Record<string, unknown>;
  return ["what", "title", "want", "amount", "note", "where", "when", "duration", "condition"].some(k => typeof f[k] === "string" && (f[k] as string).trim().length > 0)
    || Object.values((s.fields.ctx ?? {}) as Record<string, unknown>).some(v => typeof v === "string" && v.trim().length > 0);
}

export function saveDraft(s: VoiceSession | null | undefined, edited: string[], pin: Pin | null): void {
  const ls = store(); if (!ls || !s || !isAction(s.action)) return;
  if (s.stage === "live") { clearDraft(s.action); return; }
  if (!hasContent(s)) return;
  try { ls.setItem(DRAFT_KEY_PREFIX + s.action, JSON.stringify({ session: s, edited, pin, savedAt: Date.now() } satisfies PersistedDraft)); } catch { /* quota / private mode */ }
}

export function loadDraft(action: string): PersistedDraft | null {
  const ls = store(); if (!ls || !isAction(action)) return null;
  try {
    const raw = ls.getItem(DRAFT_KEY_PREFIX + action); if (!raw) return null;
    const d = JSON.parse(raw) as PersistedDraft;
    if (!d?.session || d.session.action !== action || typeof d.session.draftId !== "string" || !d.session.fields || d.session.stage === "live") { ls.removeItem(DRAFT_KEY_PREFIX + action); return null; }
    return { session: d.session, edited: Array.isArray(d.edited) ? d.edited.filter(k => typeof k === "string") : [], pin: d.pin ?? null, savedAt: Number(d.savedAt) || 0 };
  } catch { return null; }
}

export function clearDraft(action: string | null | undefined): void {
  const ls = store(); if (!ls || !isAction(action)) return;
  try { ls.removeItem(DRAFT_KEY_PREFIX + action); } catch { /* ignore */ }
}
