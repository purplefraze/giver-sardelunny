import { useEffect, useRef, useState } from "react";

import { LaunchScreen } from "@/components/onboarding/LaunchScreen";
import { AuthGate } from "@/components/onboarding/AuthGate";
import { sessionStore, type SessionState } from "@/data/cloud/session";
import { clearOpening } from "@/data/opening";
import type { Mode } from "@/components/living-g/EarSelector";

/**
 * TESTING-PHASE ONBOARDING — AUTH FIRST, THEN THE OPENING.
 *
 *   signed out      AuthGate (MagicLinkView: plain "giver", email, send link)
 *                   -> magic-link session -> the opening -> the wheel at Give
 *   signed in       straight to the opening -> the wheel at Give
 *   (loading)       plain white until the session answers — not a splash
 *
 * The opening (LaunchScreen) is POST-AUTH only: "giver" with the Living G as
 * its g, the toggle down/up, the spark to the i, "kindness as currency", then
 * the wheel. PlayIntro (the "hey, that tickles" beat), IntroG, SparkSplit and
 * MemberExample remain in the tree as files but are NOT imported or routed.
 *
 * ⚠ TESTING ONLY — NOT THE SHIPPED PRODUCT. This path deliberately SKIPS the
 * spark interaction and the welcome spark grant (`earned: false`, so
 * initializeFirstUse never seeds sparks), and skips any phone / password /
 * name / profile gate. Before launch, restore an earned-sparks onboarding and
 * a real account step.
 *
 * `fromLaunch` is always true now: the G follows the opening directly, so the
 * caller crossfades the still wordmark into the wheel.
 */
type Stage = "wait" | "auth" | "opening";

const stageFor = (s: SessionState): Stage =>
  s.status === "ready" ? "opening" : s.status === "loading" ? "wait" : "auth";

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
  const [stage, setStage] = useState<Stage>(() => stageFor(sessionStore.get()));
  const finishing = useRef(false);

  /* THE SESSION DECIDES: wait for it to answer, then auth or the opening. */
  useEffect(() => {
    if (stage !== "wait") return;
    const decide = () => {
      const next = stageFor(sessionStore.get());
      if (next !== "wait") setStage(next);
    };
    const unsub = sessionStore.subscribe(decide);
    decide();
    return () => {
      unsub();
    };
  }, [stage]);

  const complete = () => {
    if (finishing.current) return;
    finishing.current = true;
    /* The opening has played here; nothing else owes it. */
    clearOpening();
    /* TESTING SKIP: earned:false — no spark grant. Not shipped behaviour. */
    onDone({ gaveTo: null, earned: false, fromLaunch: true });
  };

  if (stage === "wait") {
    return <div className="h-full w-full" style={{ background: "var(--seat-bg)" }} />;
  }
  if (stage === "auth") {
    /* The existing magic-link success path hands over to the opening. */
    return <AuthGate onDone={() => setStage("opening")} />;
  }
  return <LaunchScreen onDone={complete} />;
}
