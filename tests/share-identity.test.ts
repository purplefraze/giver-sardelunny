import { beforeEach, describe, expect, mock, test } from "bun:test";

/* Isolated: no model, no location, no network, no writes. The real
   conversation store + the real share coordinator, with every outside
   dependency (auth, addItem/reservation, photo upload, server confirm) mocked. */
mock.module("@/lib/followup.functions", () => ({ interpretDraft:async()=>({reading:null,error:null}), followUp: async () => ({ source: "rules", ctx: {} }) }));
mock.module("@/data/my-location", () => ({ askLocation: async () => ({ ok: false }) }));

const { conversation } = await import("../src/intelligence/voice-conversation");
const { createShareCoordinator } = await import("../src/intelligence/share-coordinator");
import type { Item } from "../src/data/items";

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
const defer = <T,>(): Deferred<T> => { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise((r) => setTimeout(r, 0));

let items: Map<string, Item>;
let addCalls: number;
let reservations: number;
let seq: number;
let auth: Deferred<"live" | "ended" | "none"> | null;
let upload: Deferred<{ url: string; path: string } | null> | null;
let confirm: (id: string) => Promise<string | null>;
let pins: Map<string, unknown>;

const coord = () => createShareCoordinator({
  ensureLiveSession: () => (auth ? auth.promise : Promise.resolve("live")),
  addItem: (category, text, parts, note, extra) => {
    addCalls++;
    if (category === "wish") reservations++;
    const id = `item-${++seq}`;
    items.set(id, { id, ownerId: "me", type: category, text, ...(parts ?? {}), ...(note ? { note } : {}), ...(extra.side ? { side: extra.side } : {}), ...(extra.details ? { details: extra.details } : {}), status: "active", priority: 0, published: true, createdAt: 0, updatedAt: 0, boostCount: 0 } as Item);
    return { ok: true, id };
  },
  getItem: (id) => items.get(id),
  patchItem: (id, fields, remove = []) => {
    const cur = items.get(id); if (!cur) return;
    const next = { ...cur, ...fields } as Item;
    for (const k of remove) delete (next as Record<string, unknown>)[k];
    items.set(id, next);
  },
  savePin: (id, pin) => { pins.set(id, pin); },
  removePin: (id) => { pins.delete(id); },
  savePrivatePlaces: () => {},
  uploadGivePhoto: () => (upload ? upload.promise : Promise.resolve({ url: "https://x/p.jpg", path: "p.jpg" })),
  confirmItemSaved: (id) => confirm(id),
  pullItems: async () => {},
  giveMeta: () => ({ topic: "objects", expiresAt: "2026-11-01T00:00:00.000Z" }),
  conversation,
});

const inputOf = () => {
  const c = conversation.get();
  return { draftId: c.session!.draftId, action: c.session!.action!, fields: c.session!.fields, photo: c.photo, pin: c.pin };
};
const fillTrade = () => { conversation.openForm("trade"); conversation.edit("what", "a bike"); conversation.edit("want", "a guitar"); conversation.edit("where", "leith"); };

beforeEach(() => {
  items = new Map(); addCalls = 0; reservations = 0; seq = 0; auth = null; upload = null; pins = new Map();
  confirm = async (id) => id;
  conversation.close();
});

describe("failed save → fold → reopen → edit → retry", () => {
  test("Trade: same record, latest offer/want/where, cleared note removed", async () => {
    const sc = coord();
    fillTrade(); conversation.edit("note", "barely used");
    confirm = async () => null;
    const first = await sc.share(inputOf());
    expect(first.kind).toBe("failed");
    const id = (first as { id: string }).id;
    expect(items.get(id)!.published).toBe(false);
    conversation.closeForm();
    conversation.openForm("trade");
    conversation.edit("want", "a drum kit");
    conversation.edit("what", "a red bike");
    conversation.edit("note", "");
    conversation.edit("where", "");
    confirm = async (i) => i;
    const second = await sc.share(inputOf());
    expect(second).toMatchObject({ kind: "live", id });
    expect(addCalls).toBe(1);
    const it = items.get(id)!;
    expect(it.text).toBe("Offering to trade: red bike");
    expect(it.offer).toBe("a red bike");
    expect(it.want).toBe("a drum kit");
    expect(it.note).toBeUndefined();
    expect(it.details?.where).toBeUndefined();
    expect(it.published).toBe(true);
  });

  test("Fund: edited goal reaches the same record on retry", async () => {
    const sc = coord();
    conversation.openForm("fund"); conversation.edit("what", "new dentures"); conversation.edit("amount", "1500");
    confirm = async () => null;
    const first = await sc.share(inputOf());
    const id = (first as { id: string }).id;
    expect(items.get(id)!.details?.fundTarget).toBe(150000);
    conversation.closeForm(); conversation.openForm("fund");
    conversation.edit("amount", "900");
    confirm = async (i) => i;
    const second = await sc.share(inputOf());
    expect(second).toMatchObject({ kind: "live", id });
    expect(items.get(id)!.details?.fundTarget).toBe(90000);
    expect(addCalls).toBe(1);
    expect(reservations).toBe(1);
  });

  test("Wish: three failed retries, one addItem, one reservation", async () => {
    const sc = coord();
    conversation.openForm("wish"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    confirm = async () => null;
    for (let i = 0; i < 3; i++) { await sc.share(inputOf()); conversation.closeForm(); conversation.openForm("wish"); }
    confirm = async (i) => i;
    expect((await sc.share(inputOf())).kind).toBe("live");
    expect(addCalls).toBe(1);
    expect(reservations).toBe(1);
  });
});

describe("pending Share while the form folds/reopens", () => {
  test("double tap / reopen during pending auth: busy, never a second create", async () => {
    const sc = coord();
    conversation.openForm("wish"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    auth = defer();
    const p1 = sc.share(inputOf());
    expect(sc.isPending(conversation.currentDraftId())).toBe(true);
    conversation.closeForm(); conversation.openForm("wish");
    expect((await sc.share(inputOf())).kind).toBe("busy");
    auth.resolve("live");
    expect((await p1).kind).toBe("live");
    expect(addCalls).toBe(1);
  });

  test("record id attaches before the photo upload; reopen during upload cannot create again", async () => {
    const sc = coord();
    conversation.openForm("give"); conversation.edit("what", "a lamp"); conversation.edit("kind", "objects"); conversation.edit("where", "leith");
    const input = { ...inputOf(), photo: { file: new File(["x"], "x.jpg"), url: "data:x" } };
    upload = defer();
    const p1 = sc.share(input);
    await tick(); await tick();
    expect(addCalls).toBe(1);
    expect(sc.recordOf(input.draftId)).toBe("item-1");
    conversation.closeForm(); conversation.openForm("give");
    expect((await sc.share(input)).kind).toBe("busy");
    upload.resolve({ url: "https://x/p.jpg", path: "p.jpg" });
    const out = await p1;
    expect(out.kind).toBe("live");
    expect(addCalls).toBe(1);
    expect(items.get("item-1")!.photos).toEqual(["https://x/p.jpg"]);
  });

  test("auth pending, then mode switch: the old draft's post never attaches to the new seat", async () => {
    const sc = coord();
    conversation.openForm("wish"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    const wishDraft = conversation.currentDraftId()!;
    auth = defer();
    const p1 = sc.share(inputOf());
    conversation.closeForm(); conversation.openForm("give");
    const giveDraft = conversation.currentDraftId()!;
    confirm = async () => null;
    auth.resolve("live");
    const out = await p1;
    expect(out).toMatchObject({ kind: "failed", visible: false });
    expect(items.get("item-1")!.published).toBe(false);
    expect(sc.recordOf(giveDraft)).toBe(null);
    expect(sc.recordOf(wishDraft)).toBe("item-1");
    expect(conversation.get().session?.action).toBe("give");
  });
});

describe("late completions are scoped to their own draft", () => {
  test("late success after a mode switch retires the parked draft; current draft untouched", async () => {
    const sc = coord();
    conversation.openForm("wish"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    const gate = defer<string | null>(); confirm = () => gate.promise;
    const p1 = sc.share(inputOf());
    await tick();
    conversation.closeForm(); conversation.openForm("give"); conversation.edit("what", "a lamp");
    gate.resolve("cloud-1");
    expect(await p1).toMatchObject({ kind: "live", placement: "retired" });
    const c = conversation.get();
    expect(c.session?.action).toBe("give");
    expect(c.session?.fields.what).toBe("a lamp");
    expect(c.session?.stage).not.toBe("live");
    conversation.closeForm(); conversation.openForm("wish");
    expect(conversation.get().session?.fields.what).toBe("");
  });

  test("late success after folding keeps the person on the G (no forced reopen)", async () => {
    const sc = coord();
    conversation.openForm("lend"); conversation.edit("what", "a drill"); conversation.edit("where", "leith");
    const gate = defer<string | null>(); confirm = () => gate.promise;
    const p1 = sc.share(inputOf());
    await tick();
    conversation.closeForm();
    gate.resolve("cloud-1");
    expect(await p1).toMatchObject({ kind: "live", placement: "retired" });
    const c = conversation.get();
    expect(c.form).toBe(false);
    expect(c.session?.stage).not.toBe("live");
    expect(c.session?.action).toBe("lend");
    expect(c.session?.fields.what).toBe("");
  });

  test("late failure after a new draft on the same seat: record hidden, new draft untouched", async () => {
    const sc = coord();
    conversation.openForm("wish"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    const gate = defer<string | null>(); confirm = () => gate.promise;
    const p1 = sc.share(inputOf());
    await tick();
    conversation.close();
    conversation.openForm("wish");
    const fresh = conversation.currentDraftId();
    gate.resolve(null);
    expect(await p1).toMatchObject({ kind: "failed", visible: false });
    expect(items.get("item-1")!.published).toBe(false);
    expect(conversation.currentDraftId()).toBe(fresh);
    expect(sc.recordOf(fresh!)).toBe(null);
  });

  test("success with the form open shows live; pinch from live returns to the G with a fresh draft", async () => {
    const sc = coord();
    conversation.openForm("borrow"); conversation.edit("what", "a ladder"); conversation.edit("where", "leith");
    expect(await sc.share(inputOf())).toMatchObject({ kind: "live", placement: "shown" });
    expect(conversation.get().session?.stage).toBe("live");
    conversation.closeForm();
    const c = conversation.get();
    expect(c.form).toBe(false);
    expect(c.session?.action).toBe("borrow");
    expect(c.session?.fields.what).toBe("");
    expect(await sc.share(inputOf())).toMatchObject({ kind: "invalid" });
    expect(addCalls).toBe(1);
  });
});
