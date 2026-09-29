import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { rememberSignInEmail, rememberedSignInEmail, takeLinkNotice } from "@/lib/auth-callback";
import { authRedirectOrigin } from "@/lib/public-origin";
import { takeSessionEnded } from "@/data/cloud/session";

/**
 * SAME-CIRCLE SIGN-IN — the behaviour behind SignInView, shared by the
 * onboarding AuthGate and the /auth route.
 *
 *   email step  signInWithOtp; the email's LINK ("log in") returns to the
 *               PUBLIC app (public-origin.ts), never a Lovable preview host
 *   sent step   (EMAIL_HAS_CODE false — today) "check your email and tap log
 *               in", send again, use a different email. No code field: the
 *               email has no code to type. The session is caught by the
 *               caller (onAuthStateChange / sessionStore) when the link is
 *               tapped in this browser, in this tab or another.
 *   code step   (EMAIL_HAS_CODE true) a 6-digit code replaces the email field
 *               in the same circle; verifyOtp({ email, token, type: "email" }).
 *
 * On success Supabase emits SIGNED_IN; the caller's own onAuthStateChange /
 * finish() continues into the existing post-auth path. `onVerified` is also
 * called directly so a caller never depends on the event alone (callers guard
 * finish() against running twice).
 *
 * ⚠ The code only arrives if the Supabase email template includes
 * {{ .Token }} (a dashboard setting). Without it the email still carries the
 * link, which keeps working.
 */
export type OtpStep = "email" | "code" | "sent";

/**
 * THE ONE SWITCH. The Supabase Magic Link email today has only a "log in"
 * link — no 6-digit code — so the code field is hidden. Flip to true once the
 * Magic Link template includes {{ .Token }}.
 */
export const EMAIL_HAS_CODE = false;

/** After a send, the step that waits for the person. */
const AFTER_SEND: OtpStep = EMAIL_HAS_CODE ? "code" : "sent";

/** Supabase allows one email per address per 60s by default. */
const RESEND_COOLDOWN_S = 60;

export const OTP_LENGTH = 6;

/** One short lowercase line — never Supabase's full sentence. */
function sayError(err: unknown, step: OtpStep): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : "";
  if (/security purposes|rate limit|too many/.test(raw)) return "wait a moment, then try again";
  if (/network|fetch/.test(raw)) return "no connection — try again";
  /* Supabase says "expired or is invalid" for both — one honest line. */
  if (step === "code") return "that code didn’t work";
  if (/invalid|email/.test(raw)) return "that email didn’t work";
  return "that didn’t work — try again";
}

export function useOtpSignIn({
  onSent,
  onVerified,
}: {
  /** After a code/link has been sent (eg to owe the opening in a new tab). */
  onSent?: () => void;
  onVerified?: (email: string | null) => void;
} = {}) {
  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCodeRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /* Seconds until "send again" may send (mirrors Supabase's own limit). */
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const setCode = (value: string) => {
    setCodeRaw(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    setError(null);
  };

  /* A LINK THAT DIDN'T WORK lands here, never on "access denied": back in the
     same browser, the waiting step for the address it was sent to (send again
     is one tap); anywhere else, the email step to fill in. */
  useEffect(() => {
    const said = takeLinkNotice();
    /* A SESSION THAT ENDED ON ITS OWN: nothing was sent. The email step, the
       last address filled in, one line — the person taps send themselves. */
    if (!said && takeSessionEnded()) {
      setEmail(rememberedSignInEmail());
      setError("session ended — send a new link");
      return;
    }
    if (!said) return;
    const known = rememberedSignInEmail();
    if (known) {
      setEmail(known);
      setStep(AFTER_SEND);
      setError(EMAIL_HAS_CODE ? `${said} — tap resend` : `${said} — send again`);
    } else {
      setError(`${said} — send again`);
    }
  }, []);

  async function send(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${authRedirectOrigin()}/` },
    });
    if (otpError) throw otpError;
    rememberSignInEmail(email.trim());
    setCooldown(RESEND_COOLDOWN_S);
    onSent?.();
    return true;
  }

  async function submitEmail(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await send();
      setCodeRaw("");
      setNotice(EMAIL_HAS_CODE ? "check your email" : "check your email and tap log in");
      setStep(AFTER_SEND);
      haptics.light();
    } catch (err) {
      setError(sayError(err, "email"));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setNotice(null);
    if (code.length !== OTP_LENGTH) {
      setError(`enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (verifyError) throw verifyError;
      haptics.light();
      onVerified?.(data.user?.email ?? email.trim());
    } catch (err) {
      setError(sayError(err, "code"));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await send();
      setCodeRaw("");
      setNotice(EMAIL_HAS_CODE ? "sent again" : "sent again — tap log in");
      haptics.light();
    } catch (err) {
      setError(sayError(err, "email"));
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setStep("email");
    setCodeRaw("");
    setError(null);
    setNotice(null);
  }

  return {
    step,
    email,
    setEmail: (v: string) => {
      setEmail(v);
      setError(null);
    },
    code,
    setCode,
    busy,
    cooldown,
    error,
    notice,
    submitEmail,
    submitCode,
    resend,
    changeEmail,
  };
}

export type OtpSignIn = ReturnType<typeof useOtpSignIn>;
