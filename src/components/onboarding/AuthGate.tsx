import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import { haptics } from "@/lib/haptics";
import { MagicLinkView } from "@/components/onboarding/MagicLinkView";

/**
 * THIN MAGIC-LINK GATE for the testing-phase onboarding. Email only — no
 * password, phone, or @name form. On session, silently ensure a profile then
 * hand control back to Onboarding.
 */
export function AuthGate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(emailAddr: string | null) {
    const token =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("giver.invite.token") ?? undefined)
        : undefined;
    const local = emailAddr?.split("@")[0] ?? "giver";
    const chosen = normaliseHandle(myProfileStore.get().username || local || "giver");
    try {
      await joinGiver({
        data: { handle: chosen, name: chosen, ...(token ? { token } : {}) },
      });
      if (chosen) myProfileStore.patch({ username: `@${chosen}` });
    } catch {
      /* Prefer landing on the G over blocking on profile setup. */
    }
    await sessionStore.refresh();
    try {
      window.localStorage.removeItem("giver.invite.token");
    } catch {
      /* private mode */
    }
    haptics.light();
    onDone();
  }

  useEffect(() => {
    const current = sessionStore.get();
    if (current.status === "ready") {
      void finish(current.email);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finish(session.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once gate
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (otpError) throw otpError;
      setSent(true);
      haptics.light();
    } catch (err) {
      setError(err instanceof Error ? err.message.toLowerCase() : "that didn't work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MagicLinkView
      email={email}
      onEmail={setEmail}
      busy={busy}
      sent={sent}
      error={error}
      onSubmit={submit}
    />
  );
}
