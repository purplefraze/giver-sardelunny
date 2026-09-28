import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { rememberSignInEmail, rememberedSignInEmail, takeLinkNotice } from "@/lib/auth-callback";

/**
 * SAME-CIRCLE SIGN-IN — the behaviour behind SignInView, shared by the
 * onboarding AuthGate and the /auth route.
 *
 *   email step  signInWithOtp (emailRedirectTo kept, so the email's LINK still
 *               signs in as a fallback — in this tab or any other)
 *   code step   a 6-digit code replaces the email field in the same circle;
 *               verifyOtp({ email, token, type: "email" }). No redirect.
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
export type OtpStep = "email" | "code";

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

  const setCode = (value: string) => {
    setCodeRaw(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    setError(null);
  };

  /* A LINK THAT DIDN'T WORK lands here, never on "access denied": back in the
     same browser, the code step for the address it was sent to (resend is one
     tap); anywhere else, the email step with that address to fill in. */
  useEffect(() => {
    const said = takeLinkNotice();
    if (!said) return;
    const known = rememberedSignInEmail();
    if (known) {
      setEmail(known);
      setStep("code");
      setError(`${said} — tap resend`);
    } else {
      setError(`${said} — send again`);
    }
  }, []);

  async function send(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (otpError) throw otpError;
    rememberSignInEmail(email.trim());
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
      setNotice("check your email");
      setStep("code");
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
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await send();
      setCodeRaw("");
      setNotice("sent again");
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
    error,
    notice,
    submitEmail,
    submitCode,
    resend,
    changeEmail,
  };
}

export type OtpSignIn = ReturnType<typeof useOtpSignIn>;
