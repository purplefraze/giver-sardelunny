import { useState } from "react";
import {
  completeOnboarding,
  replayOnboarding,
  resetNewUser,
} from "@/data/dev-fixture";
import { adminStore } from "@/data/admin";
import { demoRepliesStore } from "@/data/demo-replies";

import { memberEditsStore } from "@/data/member-edits";
import { useAdmin } from "@/hooks/use-admin";
import { HapticsCheck } from "@/components/HapticsCheck";
import { isTestingSurface } from "@/lib/preview-mode";

export function DevControls() {
  const [open, setOpen] = useState(false);
  const [haptics, setHaptics] = useState(false);
  /** ADMIN EDITING lives on this switch and nowhere else. */
  const admin = useAdmin();
  /* The testing paths must be reachable in the preview, not only locally. */
  if (!isTestingSurface()) return null;

  const run = (action: () => void) => {
    action();
    window.location.reload();
  };
  return (
    <div className="absolute right-2 top-2 z-[100] font-sans">
      <button
        type="button"
        aria-label="development paths"
        onClick={() => setOpen((value) => !value)}
        className="h-8 w-8 text-sm font-black opacity-25 hover:opacity-70"
        style={admin ? { color: "var(--giver-me)", opacity: 0.8 } : undefined}
      >
        dev
      </button>
      {open ? (
        <div className="flex w-48 flex-col bg-giver-paper p-2 text-left text-[11px] font-black lowercase text-giver-ink">
          <button
            type="button"
            className="py-2 text-left"
            style={admin ? { color: "var(--giver-me)" } : undefined}
            onClick={() => adminStore.toggle()}
          >
            {admin ? "admin editing: on" : "admin editing: off"}
          </button>
          <button
            type="button"
            className="py-2 text-left"
            onClick={() => run(() => demoRepliesStore.toggle())}
          >
            {demoRepliesStore.get() ? "demo replies: on" : "demo replies: off"}
          </button>
          <button type="button" className="py-2 text-left" onClick={() => run(replayOnboarding)}>replay onboarding</button>
          <button type="button" className="py-2 text-left" onClick={() => run(resetNewUser)}>new-user reset</button>

          <button type="button" className="py-2 text-left" onClick={() => run(completeOnboarding)}>skip / complete</button>
          <button
            type="button"
            className="py-2 text-left"
            onClick={() => run(() => memberEditsStore.resetAll())}
          >
            reset all people edits
          </button>
          <button type="button" className="py-2 text-left" onClick={() => { setOpen(false); setHaptics(true); }}>haptics check</button>
        </div>
      ) : null}
      {haptics ? <HapticsCheck onClose={() => setHaptics(false)} /> : null}
    </div>
  );
}

