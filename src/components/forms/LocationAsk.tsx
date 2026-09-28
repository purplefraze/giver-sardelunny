import { useState } from "react";

import { askLocation, useMyLocation } from "@/data/my-location";
import { haptics } from "@/lib/haptics";

/**
 * ALLOW LOCATION — ONE QUIET LINE, ASKED ONLY ON TAP.
 *
 * "neighbours lend more when they see you're nearby". Nothing happens until
 * the person taps "allow location": only then does the browser's own
 * permission prompt appear (my-location.ts askLocation). What is kept is an
 * approximate spot (offset 200–400 m) on this device only — never an exact
 * address, never a shared column. Declining is fine and says so.
 */
export function LocationAsk() {
  const here = useMyLocation();
  const [state, setState] = useState<"idle" | "asking" | "denied" | "unavailable">("idle");

  if (here) {
    return (
      <p className="uf-location uf-location--on" data-testid="location-on">
        <span className="uf-location-dot" aria-hidden="true" />
        you’re nearby — neighbours see your area, never your address
      </p>
    );
  }
  return (
    <div className="uf-location" data-testid="location-ask">
      <button
        type="button"
        className="uf-location-ask"
        disabled={state === "asking"}
        onClick={async () => {
          haptics.selection();
          setState("asking");
          const got = await askLocation();
          setState(got.ok ? "idle" : got.reason);
        }}
      >
        {state === "asking" ? "asking…" : "allow location"}
      </button>
      <span className="uf-location-why">
        {state === "denied"
          ? "location is off — that’s fine, you can still post"
          : state === "unavailable"
            ? "location isn’t available here — you can still post"
            : "neighbours lend more when they see you’re nearby"}
      </span>
    </div>
  );
}
