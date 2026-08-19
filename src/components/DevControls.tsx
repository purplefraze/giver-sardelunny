import { useState } from "react";
import {
  completeOnboarding,
  replayOnboarding,
  resetNewUser,
  seedDevelopmentProfile,
} from "@/data/dev-fixture";
import { HapticsCheck } from "@/components/HapticsCheck";

export function DevControls() {
  const [open, setOpen] = useState(false);
  const [haptics, setHaptics] = useState(false);
  if (!import.meta.env.DEV) return null;

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
      >
        dev
      </button>
      {open ? (
        <div className="flex w-44 flex-col bg-giver-paper p-2 text-left text-[11px] font-black lowercase text-giver-ink">
          <button type="button" className="py-2 text-left" onClick={() => run(replayOnboarding)}>replay onboarding</button>
          <button type="button" className="py-2 text-left" onClick={() => run(resetNewUser)}>new-user reset</button>
          <button type="button" className="py-2 text-left" onClick={() => run(completeOnboarding)}>skip / complete</button>
          <button type="button" className="py-2 text-left" onClick={() => run(seedDevelopmentProfile)}>restore dev profile</button>
        </div>
      ) : null}
    </div>
  );
}