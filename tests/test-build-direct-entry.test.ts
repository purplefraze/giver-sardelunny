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

  test("the sign-in asks the question and has one enter button, no email field in that branch", () => {
    const i = view.indexOf("TEST_BUILD_DIRECT_ENTRY && onEnter");
    expect(i).toBeGreaterThan(-1);
    const branch = view.slice(i, view.indexOf(') : otp.step === "email"', i));
    expect(branch).toContain("are you a giver?");
    expect(branch).toContain("SendCircle");
    expect(branch).not.toContain("EmailField");
    expect(branch).not.toMatch(/password|otp\./);
    expect(view).toContain("kindness as currency");
    expect(view).toContain(">giver</h1>");
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
