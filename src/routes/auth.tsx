import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import { initializeFirstUse } from "@/data/first-use";
import { haptics } from "@/lib/haptics";
import { MagicLinkView } from "@/components/onboarding/MagicLinkView";

/**
 * TESTING-PHASE AUTH. Email magic link only — no phone, password, or @name.
 * Invite token is kept if present; handle is derived silently from the email.
 *
 * ⚠ TESTING ONLY — NOT THE SHIPPED PRODUCT: signing in here skips the spark
 * interaction and the welcome spark grant (initializeFirstUse(false)) and any
 * profile gate. Restore the earned path and a real account step before launch.
 */
export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ invite: z.string().optional() }).parse,
  head: () => ({
    meta: [
      { title: "sign in · giver" },
      { name: "description", content: "sign in to giver with a magic link." },
      { property: "og:title", content: "sign in · giver" },
      { property: "og:description", content: "one email. a magic link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishing = useRef(false);

  useEffect(() => {
    if (invite) window.localStorage.setItem("giver.invite.token", invite);
  }, [invite]);

  async function finish(emailAddr: string | null) {
    if (finishing.current) return;
    finishing.current = true;
    const token = invite ?? window.localStorage.getItem("giver.invite.token") ?? undefined;
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
    /* TESTING SKIP (not shipped product): no spark grant on this path. */
    initializeFirstUse(false);
    try {
      window.localStorage.removeItem("giver.invite.token");
    } catch {
      /* private mode */
    }
    haptics.light();
    void navigate({ to: "/" });
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
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void finish(data.session.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once
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
    <main className="min-h-screen" style={{ background: "var(--seat-bg)" }}>
      <div className="h-screen">
        <MagicLinkView
          email={email}
          onEmail={setEmail}
          busy={busy}
          sent={sent}
          error={error}
          onSubmit={submit}
        />
      </div>
    </main>
  );
}
