import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fundGoalProblem, fundDetailsOk, FUND_MIN_CENTS, FUND_TARGET_MAX_CENTS } from "../src/data/fund-rules";
import { EMPTY_FIELDS, missingAsks, mergeFollowUp, canGoLive, fundTargetOf } from "../src/intelligence/voice-flow";
import { FUND_TRUST_VISIBLE } from "../src/intelligence/fund-trust-placeholders";

test("fund goal: each bad input gets its own reason; good ones pass", () => {
  expect(fundGoalProblem("banana")).toContain("as a number");
  expect(fundGoalProblem("-5")).toContain("more than zero");
  expect(fundGoalProblem("0")).toContain("more than zero");
  expect(fundGoalProblem("0.00")).toContain("more than zero");
  expect(fundGoalProblem("12.345")).toContain("two decimals");
  expect(fundGoalProblem("1.2.3")).toContain("two decimals");
  expect(fundGoalProblem("1e5")).toContain("as a number");
  expect(fundGoalProblem("0.5")).toBe("the smallest goal is $1.");
  expect(fundGoalProblem("100000.01")).toBe("the largest goal is $100,000.");
  for (const ok of ["1", "1200", "$1,200", "12.5", "100000"]) expect(fundGoalProblem(ok)).toBeNull();
});

test("fund goal: invalid amount blocks progression and is re-asked", () => {
  const f = { ...EMPTY_FIELDS, what: "new roof for the hall", amount: "banana" };
  expect(canGoLive("fund", f)).toBe(false);
  expect(missingAsks("fund", f)[0]).toEqual({ field: "amount", ask: "enter the goal as a number, like 1200." });
  const fixed = mergeFollowUp("fund", f, "1200");
  expect(fundTargetOf(fixed)).toBe(120000);
  expect(missingAsks("fund", fixed).some(a => a.field === "amount")).toBe(false);
});

test("item write guard refuses an out-of-range fundTarget", () => {
  expect(fundDetailsOk({})).toBe(true);
  expect(fundDetailsOk(undefined)).toBe(true);
  expect(fundDetailsOk({ fundTarget: FUND_MIN_CENTS })).toBe(true);
  expect(fundDetailsOk({ fundTarget: FUND_TARGET_MAX_CENTS })).toBe(true);
  for (const bad of [0, -100, 99, FUND_TARGET_MAX_CENTS + 1, 12.5, "1200", null]) expect(fundDetailsOk({ fundTarget: bad })).toBe(false);
  const sync = readFileSync("src/data/cloud/items-sync.ts", "utf8");
  expect(sync.match(/fundDetailsOk\(i\.details\)/g)?.length).toBe(2);
});

test("unapproved fund trust placeholders stay in code but are hidden", () => {
  expect(FUND_TRUST_VISIBLE).toBe(false);
  expect(readFileSync("src/intelligence/VoiceReview.tsx", "utf8")).toContain('action === "fund" && FUND_TRUST_VISIBLE ?');
});

test("handle: short and badly shaped names are refused before any network call", async () => {
  const { checkHandle, HANDLE_SHAPE, HANDLE_MESSAGE } = await import("../src/data/account");
  expect(await checkHandle("ab")).toEqual({ state: "short" });
  expect(await checkHandle("...")).toEqual({ state: "format" });
  expect(await checkHandle("me.")).toEqual({ state: "format" });
  expect(await checkHandle("_robin")).toEqual({ state: "format" });
  expect(HANDLE_SHAPE.test("robin.k")).toBe(true);
  expect(HANDLE_SHAPE.test("a".repeat(20))).toBe(true);
  expect(HANDLE_MESSAGE.short).not.toBe("");
  expect(HANDLE_MESSAGE.format).not.toBe("");
  expect(readFileSync("src/lib/account.functions.ts", "utf8")).toContain(".regex(/^[a-z0-9._-]+$/)");
});

test("map frames pins clear of overlays, once per pin set, only while shown", () => {
  const src = readFileSync("src/components/community/CommunigyMap.tsx", "utf8");
  expect(src).toContain("export function mapFreeInsets");
  expect(src).toContain("paddingTopLeft: [pad.left, pad.top]");
  expect(src).toContain("fitted.current === pins");
  expect(readFileSync("src/components/community/CommunityFeed.tsx", "utf8")).toContain('active={!showDetail && view === "map"}');
});
