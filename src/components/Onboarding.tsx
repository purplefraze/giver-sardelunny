import { useRef, useState } from "react";

import { LaunchScreen } from "@/components/onboarding/LaunchScreen";
import { AuthGate } from "@/components/onboarding/AuthGate";
import { sessionStore, type SessionState } from "@/data/cloud/session";
import type { Mode } from "@/components/living-g/EarSelector";

/**
 * TESTING-PHASE ONBOARDING.
 *
 * LaunchScreen → (signed in ? done : AuthGate) → onDone({ earned: false }).
 * ENTRY PATH IS ONLY: 'giver' → 'kindness as currency' → the Living G at
 * Give (1:30). PlayIntro (the "hey, that tickles" beat), IntroG, SparkSplit
 * and MemberExample remain in the tree as files but are NOT imported or routed
 * anywhere — nothing on launch or first land can render them.
 *
 * ⚠ TESTING ONLY — NOT THE SHIPPED PRODUCT. This path deliberately SKIPS the
 * spark interaction and the welcome spark grant (`earned: false`, so
 * initializeFirstUse never seeds sparks), and skips any phone / password /
 * name / profile gate. It exists so testers can reach the Living G fast.
 * Before launch, restore an earned-sparks onboarding and a real account step.
 *
 * `fromLaunch` is true when the G follows the launch screen directly (already
 * signed in), so the caller can crossfade the still wordmark into the G.
 */
type Stage = "launch" | "auth";

export function Onboarding({
  onDone,
}: {
  onDone: (result: {
    gaveTo: string | null;
    earned: boolean;
    mode?: Mode;
    fromLaunch?: boolean;
  }) => void;
}) {
  const [stage, setStage] = useState<Stage>("launch");
  const finishing = useRef(false);

  const complete = (fromLaunch: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    /* TESTING SKIP: earned:false — no spark grant. Not shipped behaviour. */
    onDone({ gaveTo: null, earned: false, fromLaunch });
  };

  const afterLaunch = () => {
    const go = (s: SessionState) => {
      if (s.status === "ready") complete(true);
      else setStage("auth");
    };
    const s = sessionStore.get();
    if (s.status === "loading") {
      const unsub = sessionStore.subscribe(() => {
        const next = sessionStore.get();
        if (next.status === "loading") return;
        unsub();
        go(next);
      });
      return;
    }
    go(s);
  };

  if (stage === "launch") {
    return <LaunchScreen onDone={afterLaunch} />;
  }

  return <AuthGate onDone={() => complete(false)} />;
}
