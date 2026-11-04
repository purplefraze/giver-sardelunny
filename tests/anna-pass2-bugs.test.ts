import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/* Minimal localStorage for the draft-persistence checks. */
const mem = new Map<string, string>();
const shim = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
} as Storage;

const { EMPTY_FIELDS, canGoLive, looksLikeWords, whyNotLive } = await import("../src/intelligence/voice-flow");
const { DRAFT_KEY_PREFIX, clearDraft, loadDraft, saveDraft, setDraftStorage } = await import("../src/intelligence/draft-persist");
const { sessionForSeat } = await import("../src/intelligence/voice-session");
const { conversation } = await import("../src/intelligence/voice-conversation");
const { UNDERSTANDING_UNAVAILABLE } = await import("../src/lib/understanding-copy");
const { FUND_TRUST_PLACEHOLDERS } = await import("../src/intelligence/fund-trust-placeholders");
const { clampRowInset } = await import("../src/components/community/PerimeterToggle");
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

beforeEach(() => { mem.clear(); setDraftStorage(shim); });
/* Don't leak the shim (or a saved draft) into other test files sharing this process. */
afterEach(() => { conversation.close(); mem.clear(); setDraftStorage(undefined); });

// #1 validation
test("#1 empty and keyboard-mash drafts cannot go live; real words can", () => {
  expect(canGoLive("wish", { ...EMPTY_FIELDS })).toBe(false);
  for (const bad of ["zzzz 123", "asdfgh", "aaaa", "123 456", "!!"]) expect(canGoLive("wish", { ...EMPTY_FIELDS, what: bad })).toBe(false);
  expect(looksLikeWords("a ride to the airport")).toBe(true);
  expect(looksLikeWords("tv")).toBe(true);
  expect(canGoLive("wish", { ...EMPTY_FIELDS, what: "a ride to the airport" })).toBe(true);
  expect(whyNotLive("wish", { ...EMPTY_FIELDS, what: "zzzz" })).toMatch(/doesn't look like words/);
});
test("#1 fund amount must be a number: 'banana' is refused with a plain hint", () => {
  const f = { ...EMPTY_FIELDS, what: "new roof for the hall", amount: "banana" };
  expect(canGoLive("fund", f)).toBe(false);
  expect(whyNotLive("fund", f)).toBe("enter the goal as a number, like 1200.");
  expect(canGoLive("fund", { ...f, amount: "1200" })).toBe(true);
});
test("#1 share button is disabled until the draft can go live", () => {
  expect(src("src/intelligence/VoiceReview.tsx")).toMatch(/disabled=\{busy \|\| shareCoordinator\.isPending\(s\.draftId\) \|\| !canGoLive\(action, f\)\}>share with communi-g/);
});

// #2 error copy + placeholders
test("#2 the unclear 'understanding is unavailable' copy is gone everywhere", () => {
  for (const p of ["src/lib/followup.functions.ts", "src/lib/draft-interpret.server.ts", "src/intelligence/voice-conversation.ts"]) expect(src(p)).not.toContain("understanding is unavailable");
  expect(UNDERSTANDING_UNAVAILABLE).toMatch(/nothing is lost/);
  expect(UNDERSTANDING_UNAVAILABLE).not.toMatch(/\d{3}/);
});
test("#2 fund trust slots are placeholders flagged for frazer's approval, with no policy", () => {
  expect(FUND_TRUST_PLACEHOLDERS.map(t => t.key)).toEqual(["fees", "verification", "destination"]);
  for (const t of FUND_TRUST_PLACEHOLDERS) expect(t.text).toBe("[placeholder — needs frazer's approval]");
  expect(src("src/intelligence/VoiceReview.tsx")).toContain('data-placeholder="needs-frazer-approval"');
});

// #3 draft persistence
test("#3 a typed draft survives a reload per seat and is cleared on share/discard", () => {
  const s = sessionForSeat("fund");
  const d = { ...s, fields: { ...s.fields, what: "new roof" } };
  saveDraft(d, ["what"], null);
  expect(loadDraft("fund")?.session.fields.what).toBe("new roof");
  expect(loadDraft("wish")).toBeNull();
  saveDraft({ ...d, stage: "live" }, [], null); // shared → gone
  expect(mem.has(DRAFT_KEY_PREFIX + "fund")).toBe(false);
  saveDraft(d, [], null); clearDraft("fund");
  expect(loadDraft("fund")).toBeNull();
});
test("#3 the conversation store restores a stored draft on open and forgets it on discard", () => {
  conversation.openForm("wish");
  conversation.edit("what", "a ride to the airport");
  expect(loadDraft("wish")?.session.fields.what).toBe("a ride to the airport");
  conversation.close(); // navigating away is not a discard
  conversation.openForm("wish");
  expect(conversation.get().session?.fields.what).toBe("a ride to the airport");
  conversation.discard();
  expect(loadDraft("wish")).toBeNull();
});

// #4 sideways scroll
test("#4 degenerate hollow bands never push a row past its list", () => {
  const r = clampRowInset(422, 455, 390);
  expect(r.l + r.r).toBeLessThanOrEqual(390 - 160 + 0.01);
  expect(clampRowInset(10, 20, 390)).toEqual({ l: 10, r: 20 });
  expect(clampRowInset(Number.NaN, -5, 390)).toEqual({ l: 0, r: 0 });
  expect(src("src/styles.css")).toMatch(/\.cg-list \{ overflow-x:hidden; \}/);
});

// #5 map controls
test("#5 map controls no longer paint opaque full-width bands; the note sits at the bottom", () => {
  const css = src("src/styles.css");
  expect(css).toMatch(/\[data-cg-active-view="map"\] \.cg-filters, [^{]*\{ background:transparent;/);
  expect(css).toMatch(/\[data-cg-view="map"\] \[data-cg-results\] \{ justify-content:flex-end !important;/);
});
