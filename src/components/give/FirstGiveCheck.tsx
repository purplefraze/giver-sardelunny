import { useEffect, useRef, useState } from "react";
import { FormG, FormSend } from "@/components/forms/UnifiedForm";
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/data/cloud/session";
import { haptics } from "@/lib/haptics";

/**
 * ONE QUICK CHECK BEFORE A FIRST GIVE GOES LIVE
 * (/workspace/giver-give-infer/give-infer-verify.png).
 *
 * One fresh code to the signed-in person's own email: supabase.auth
 * .signInWithOtp({ email, shouldCreateUser: false }) then verifyOtp({ type:
 * "email" }) — the exact path sign-in already uses, so the existing email
 * template (which already carries the 6-digit {{ .Token }}) is what they get.
 * auth.reauthenticate() was not used: its nonce only feeds updateUser().
 * Phone/SMS would need a provider (e.g. Twilio via Supabase phone auth); not
 * built.
 */
export function FirstGiveCheck({
  title,
  kind,
  onVerified,
  onBack,
}: {
  title: string;
  kind: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [say, setSay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sent = useRef(false);
  const email = sessionStore.get().email;

  useEffect(() => {
    if (sent.current || !email) return;
    sent.current = true;
    void supabase.auth
      .signInWithOtp({ email, options: { shouldCreateUser: false } })
      .then(({ error }) => {
        if (error) setSay("the code didn’t send — try again in a minute");
      });
  }, [email]);

  const verify = async () => {
    if (!email) {
      setSay("sign in first, then we can send your code");
      haptics.warning();
      return;
    }
    if (code.trim().length < 6) {
      haptics.warning();
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setSay("that code didn’t match — check your email");
      haptics.warning();
      return;
    }
    haptics.success();
    onVerified();
  };

  return (
    <div className="uf-screen" data-testid="first-give-check">
      <FormG onBack={onBack} />
      <h1 className="uf-heading">{title}</h1>
      <p className="gf-check-kind">{kind}</p>
      <p className="gf-check-line">one quick check before your first give goes live</p>
      <input
        className="uf-input gf-check-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        placeholder="code from your email"
        aria-label="code from your email"
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === "Enter") void verify();
        }}
      />
      {say ? <p className="uf-say gf-check-say">{say}</p> : null}
        <FormSend label="check" disabled={busy} onSend={() => void verify()} />
    </div>
  );
}
