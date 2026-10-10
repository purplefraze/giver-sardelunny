import type { GiveType } from "@/data/give-lexicon";
import type { Item, ItemDetails, BorrowSide } from "@/data/items";
import type { Pin } from "@/data/give-pins";
import type { GiverAction } from "@/intelligence/action-draft";
import { canGoLive, fundTargetOf, type VoiceFields } from "@/intelligence/voice-flow";
import { privatePlaces, publicExtras, publicPlace } from "@/intelligence/contextual-needs";
import { collectionLocationSchema, coarseCollectionPin } from "@/lib/collection-location";

/**
 * THE ONE SHARE ORCHESTRATION for the Living G form (used by VoiceReview).
 *
 * Every Share is keyed by the draft's stable `draftId`, captured synchronously
 * at the tap — never by whichever seat or draft is on screen when an await
 * resolves. Per draft it owns: the one record id (attached the instant
 * addItem succeeds, before any other await), an in-flight flag (a reopened
 * form or a double tap cannot create or reserve again), and the latest public
 * payload, rebuilt in full for both create and retry.
 */

export type SharePhoto = { file: File; url: string } | null;
export type ShareInput = { draftId: string; action: GiverAction; fields: VoiceFields; photo: SharePhoto; pin: Pin | null };
export type ShareOutcome =
  | { kind: "invalid"; say: string }
  | { kind: "busy" }
  | { kind: "ended" }
  | { kind: "refused"; say: string }
  | { kind: "failed"; id: string; visible: boolean }
  | { kind: "live"; id: string; placement: "shown" | "retired" | "gone" };

type AddResult = { ok: boolean; reason?: string; say?: string; id?: string };
export type ShareDeps = {
  ensureLiveSession: () => Promise<"live" | "ended" | "none">;
  addItem: (
    category: "give" | "trade" | "borrow" | "wish",
    text: string,
    parts: { offer: string; want: string } | undefined,
    note: string | undefined,
    extra: { side?: BorrowSide; details?: ItemDetails },
  ) => AddResult;
  getItem: (id: string) => Item | undefined;
  patchItem: (id: string, fields: Partial<Omit<Item, "id" | "ownerId" | "type">>, remove?: readonly ("note" | "offer" | "want" | "photos" | "details")[]) => void;
  savePin: (id: string, pin: Pin) => void;
  removePin: (id: string) => void;
  savePrivatePlaces: (id: string, exact: Record<string, string> | null) => void;
  /** Give photos: prepared + uploaded; returns the public url/path or null. */
  uploadGivePhoto: (id: string, file: File) => Promise<{ url: string; path: string } | null>;
  confirmItemSaved: (id: string) => Promise<string | null>;
  pullItems: () => Promise<unknown>;
  giveMeta: (kind: GiveType) => { topic: string; expiresAt: string };
  conversation: { currentDraftId: () => string | null; finishDraft: (draftId: string) => "shown" | "retired" | "gone" };
};

export type Payload = {
  category: "give" | "trade" | "borrow" | "wish";
  text: string;
  parts?: { offer: string; want: string };
  note?: string;
  side?: BorrowSide;
  details: ItemDetails;
};

/** The mode's COMPLETE latest public payload — the same for create and retry. */
export function buildPayload(action: GiverAction, f: VoiceFields, giveMeta: ShareDeps["giveMeta"]): Payload | null {
  const service = f.context === "lesson" || f.context === "service";
  const extras: Record<string, string> = {};
  if (f.kind) extras["kind"] = f.kind;
  if (f.condition.trim()) extras["condition"] = f.condition.trim();
  if (f.when.trim() && !f.context) extras["when"] = f.when.trim();
  if (f.context) Object.assign(extras, publicExtras(f.ctx));
  if (f.duration.trim()) extras["how long"] = f.duration.trim();
  const where = service ? (f.ctx.format === "online" ? "online" : publicExtras(f.ctx)["area"] ?? "") : f.where.trim() ? publicPlace(f.where.trim()) : "";
  const details: ItemDetails = { ...(where ? { where } : {}), ...(Object.keys(extras).length ? { extras } : {}), ...(f.timing?.date?{date:f.timing.date}:{}), ...(f.timing?.time?{startTime:f.timing.time,time:f.timing.time}:{}), ...(f.timing?.recurrence?{cadence:f.timing.recurrence}:{}) };
  const text = (f.title || f.what).trim();
  const note = f.note.trim() || undefined;
  const base = { text, ...(note ? { note } : {}) };
  if (action === "give") {
    const m = giveMeta(f.kind as GiveType);
    details.topic = m.topic;
    details.expiresAt = m.expiresAt;
    return { category: "give", ...base, details };
  }
  if (action === "trade") return { category: "trade", ...base, parts: { offer: f.what.trim(), want: f.want.trim() }, details };
  if (action === "borrow" || action === "lend") return { category: "borrow", ...base, side: action, details };
  if (action === "fund") {
    const target = fundTargetOf(f);
    if (target === null) return null;
    details.fundTarget = target;
  }
  return { category: "wish", ...base, details };
}

const INVALID = (action: GiverAction, f: VoiceFields) =>
  f.what.trim().length < 2 ? "what is it?" : action === "fund" ? "how much are you raising? enter a goal, like 1200." : action === "give" && !f.kind ? "what kind of give is it?" : action === "trade" ? "what would you like for it?" : "where is it?";

type DraftRecord = { id: string; photoUrl: string | null; kind: string | null };

export function createShareCoordinator(deps: ShareDeps) {
  const records = new Map<string, DraftRecord>();
  const inflight = new Set<string>();
  const subs = new Set<() => void>();
  let version = 0;
  const bump = () => { version++; subs.forEach((f) => f()); };

  const applyPrivate = (id: string, input: ShareInput) => {
    const collection = collectionLocationSchema.safeParse(input.fields.collectionLocation);
    const pin = input.action === "give" ? (collection.success ? coarseCollectionPin(collection.data.pin) : null) : input.pin;
    if (pin) deps.savePin(id, pin); else deps.removePin(id);
    const exact = privatePlaces(input.fields.ctx);
    deps.savePrivatePlaces(id, Object.keys(exact).length ? exact : null);
  };

  const applyPhoto = async (rec: DraftRecord, input: ShareInput, payload: Payload) => {
    const url = input.photo?.url ?? null;
    if (url === rec.photoUrl) return;
    if (!input.photo) { deps.patchItem(rec.id, { details: payload.details }, ["photos"]); rec.photoUrl = null; return; }
    if (input.action === "give") {
      const up = await deps.uploadGivePhoto(rec.id, input.photo.file);
      if (!up) return;
      const cur = deps.getItem(rec.id);
      deps.patchItem(rec.id, { photos: [up.url], details: { ...(cur?.details ?? payload.details), photoPath: up.path } });
    } else deps.patchItem(rec.id, { photos: [input.photo.url] });
    rec.photoUrl = url;
  };

  return {
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    version: () => version,
    isPending: (draftId: string | null | undefined) => !!draftId && inflight.has(draftId),
    recordOf: (draftId: string) => records.get(draftId)?.id ?? null,

    async share(input: ShareInput): Promise<ShareOutcome> {
      const { draftId, action, fields } = input;
      if (inflight.has(draftId)) return { kind: "busy" };
      if (!canGoLive(action, fields)) return { kind: "invalid", say: INVALID(action, fields) };
      const payload = buildPayload(action, fields, deps.giveMeta);
      if (!payload) return { kind: "invalid", say: "how much are you raising? enter a goal, like 1200." };
      /* Claimed before the first await: no second create/reservation for this draft. */
      inflight.add(draftId); bump();
      const visible = () => deps.conversation.currentDraftId() === draftId;
      const release = () => { inflight.delete(draftId); bump(); };
      try {
        if ((await deps.ensureLiveSession()) === "ended") { release(); return { kind: "ended" }; }
        let rec = records.get(draftId);
        if (rec && !deps.getItem(rec.id)) { records.delete(draftId); rec = undefined; }
        if (rec) {
          const cur = deps.getItem(rec.id);
          const keep: ItemDetails = {};
          if (cur?.details?.photoPath && rec.photoUrl === (input.photo?.url ?? null)) keep.photoPath = cur.details.photoPath;
          if (payload.category === "give" && cur?.details?.expiresAt && rec.kind === (fields.kind ?? null)) keep.expiresAt = cur.details.expiresAt;
          const details = { ...payload.details, ...keep };
          const remove: ("note" | "offer" | "want")[] = [];
          if (!payload.note) remove.push("note");
          if (!payload.parts) remove.push("offer", "want");
          deps.patchItem(rec.id, {
            text: payload.text,
            ...(payload.note ? { note: payload.note } : {}),
            ...(payload.parts ? { offer: payload.parts.offer, want: payload.parts.want } : {}),
            ...(payload.side ? { side: payload.side } : {}),
            details,
            published: true,
          }, remove);
          rec.kind = fields.kind ?? null;
        } else {
          const result = deps.addItem(payload.category, payload.text, payload.parts, payload.note, { ...(payload.side ? { side: payload.side } : {}), details: payload.details });
          if (!result.ok || !result.id) {
            release();
            return { kind: "refused", say: result.reason === "account" ? (result.say ?? "finish your account in my g to share this.") : (result.say ?? "this couldn't be shared right now.") };
          }
          rec = { id: result.id, photoUrl: null, kind: fields.kind ?? null };
          records.set(draftId, rec);
        }
        applyPrivate(rec.id, input);
        await applyPhoto(rec, input, payload);
        const saved = await deps.confirmItemSaved(rec.id);
        if (!saved) {
          /* Hidden regardless of what's on screen now; same record for the retry. */
          deps.patchItem(rec.id, { published: false });
          release();
          return { kind: "failed", id: rec.id, visible: visible() };
        }
        void deps.pullItems().catch(() => {});
        records.delete(draftId);
        release();
        return { kind: "live", id: rec.id, placement: deps.conversation.finishDraft(draftId) };
      } catch {
        const rec = records.get(draftId);
        if (rec) deps.patchItem(rec.id, { published: false });
        release();
        return rec ? { kind: "failed", id: rec.id, visible: visible() } : { kind: "refused", say: "this couldn't be shared right now." };
      }
    },
  };
}
