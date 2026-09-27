import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import { initializeFirstUse } from "@/data/first-use";
import { requestOpening } from "@/data/opening";
import { haptics } from "@/lib/haptics";
import { SignInView } from "@/components/onboarding/SignInView";
import { useOtpSignIn } from "@/components/onboarding/use-otp-sign-in";

/**
 * TESTING-PHASE AUTH. Email only — a 6-digit code entered in the same circle
 * (the email's link still works as a fallback) — no phone, password, or @name.
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
      { name: "description", content: "sign in to giver with your email." },
      { property: "og:title", content: "sign in · giver" },
      { property: "og:description", content: "one email. one code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
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
    /* SIGNED IN: the opening plays over the wheel once we land on "/". */
    requestOpening();
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

  const otp = useOtpSignIn({
    /* The link may be opened in a new tab: the opening is owed there too
       (index.tsx only plays it once that session is ready). */
    onSent: () => requestOpening(),
    onVerified: (email) => void finish(email),
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--seat-bg)" }}>
      <div className="h-screen">
        <SignInView otp={otp} />
      </div>
    </main>
  );
}
