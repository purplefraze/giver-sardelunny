import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import { haptics } from "@/lib/haptics";
import { SignInView } from "@/components/onboarding/SignInView";
import { useOtpSignIn } from "@/components/onboarding/use-otp-sign-in";

/**
 * THIN SIGN-IN GATE for the testing-phase onboarding. Email only — no
 * password, phone, or @name form. The email gets a 6-digit code (entered in
 * the same circle, no redirect) AND a link (the fallback, any tab). On
 * session, silently ensure a profile then hand control back to Onboarding
 * (-> the Living G opening -> the wheel at Give).
 */
export function AuthGate({ onDone }: { onDone: () => void }) {
  /* RE-ENTRY GUARD: the session can announce itself more than once (the
     SIGNED_IN event, the ready check, the code verify, a link in another tab);
     joinGiver must only ever run once. */
  const finishing = useRef(false);

  async function finish(emailAddr: string | null) {
    if (finishing.current) return;
    finishing.current = true;
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

  const otp = useOtpSignIn({ onVerified: (email) => void finish(email) });

  useEffect(() => {
    const current = sessionStore.get();
    if (current.status === "ready") {
      void finish(current.email);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finish(session.user.email ?? null);
    });
    /* The waiting screen also lands when the session arrives from another
       tab (sessionStore's storage / focus re-check). */
    const unsub = sessionStore.subscribe(() => {
      const s = sessionStore.get();
      if (s.status === "ready") void finish(s.email);
    });
    return () => {
      sub.subscription.unsubscribe();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once gate
  }, []);

  return <SignInView otp={otp} />;
}
