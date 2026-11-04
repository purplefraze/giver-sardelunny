import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("test build direct entry", () => {
  const cfg = read("src/config/test-build.ts");
  const session = read("src/data/cloud/session.ts");
  const view = read("src/components/onboarding/SignInView.tsx");
  const gate = read("src/components/onboarding/AuthGate.tsx");

  test("one constant controls it", () => {
    expect(cfg).toMatch(/export const TEST_BUILD_DIRECT_ENTRY = (true|false);/);
  });

  test("guest entry is the question in the top loop, after giver and its line; no arrow; email sign-in alongside", () => {
    const i = view.indexOf('className="signin-enter"');
    expect(i).toBeGreaterThan(-1);
    const btn = view.slice(i, view.indexOf("</button>", i));
    expect(btn).toContain("are you a giver?");
    expect(btn).toContain("onEnter");
    expect(btn).not.toContain("SendCircle");
    expect(view).not.toContain('label="enter giver"');
    const mark = view.indexOf(">giver</h1>"), tag = view.indexOf("kindness as currency</p>"), ask = view.indexOf("are you a giver?", tag);
    expect(mark).toBeGreaterThan(-1);
    expect(tag).toBeGreaterThan(mark);
    expect(ask).toBeGreaterThan(tag);
    expect(view).toMatch(/TAG_MS = \d+;\nconst ASK_MS = \d+;/);
    expect(view).toContain("<EmailField");
  });

  test("the email/code sign-in is kept, only bypassed", () => {
    expect(view).toContain("otp.submitEmail");
    expect(view).toContain("otp.submitCode");
    expect(gate).toContain("useOtpSignIn");
  });

  test("entering as guest touches no backend and creates no user", () => {
    const fn = session.slice(session.indexOf("export function enterAsGuest"), session.indexOf("export function leaveGuest"));
    expect(fn).not.toMatch(/supabase|joinGiver|fetch\(/);
    const enter = gate.slice(gate.indexOf("const enter = ()"), gate.indexOf("return <SignInView"));
    expect(enter).toContain("enterAsGuest()");
    expect(enter).not.toMatch(/joinGiver|supabase|finish\(/);
    expect(session + gate).not.toMatch(/signInAnonymously|service_role|SERVICE_ROLE/);
  });

  test("the guest never asks the server for a session and writes are refused", () => {
    expect(session).toMatch(/if \(guestStored\(\)\) \{\s*commit\(GUEST\);\s*return;/);
    expect(session).toMatch(/if \(isGuest\(\)\) return "none";/);
    for (const p of ["src/data/cloud/connections-sync.ts", "src/data/cloud/wall-sync.ts"])
      expect(read(p)).toContain("if (isGuest()) throw new Error(GUEST_WRITE_LINE)");
    expect(read("src/components/give/GiveFlow.tsx")).toContain("setProblem(GUEST_WRITE_LINE)");
    expect(read("src/intelligence/share-live.ts")).toContain("isGuest: () => isGuest()");
  });

  test("guest line is in giver voice", () => {
    expect(cfg).toContain("make a wish");
    expect(cfg).not.toMatch(/Communi-G|community/);
  });
});
