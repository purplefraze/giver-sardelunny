import { useEffect } from "react";
import { createPortal } from "react-dom";
import { GMark } from "@/components/living-g/GMark";
import { SendArrow } from "@/components/forms/UnifiedForm";
import { haptics } from "@/lib/haptics";

/**
 * THE THREE-GIVES PROMPT — calm, full screen, white, the give green. Shown
 * instead of acting on a give once the cap is reached (give-cap.ts). It sits
 * OVER whatever was open, so "not now" / "back" returns exactly there (same
 * list, same scroll position).
 *
 *   prompt   they have nothing out there: invite a give (green circle).
 *   waiting  they already have a give out there: just a quiet back.
 */
export function CapScreen({
  kind,
  onGive,
  onBack,
}: {
  kind: "prompt" | "waiting";
  onGive: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onBack]);
  /* Portalled to the app canvas: the depth card's transform would otherwise
     shrink a fixed overlay to the card. */
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="gf-cap" data-world="give" role="dialog" aria-modal="true" data-testid={`cap-${kind}`}>
      <div className="uf-screen">
        <span className="gf-cap-g" aria-hidden="true">
          <GMark colour="var(--form-seat)" height={32} />
        </span>
        {kind === "prompt" ? (
          <>
            <h1 className="uf-heading">you’ve received three gives.</h1>
            <p className="gf-cap-line">time to pass something on?</p>
            <button type="button" className="gf-cap-quiet" onClick={onBack}>
              not now
            </button>
            <button
              type="button"
              className="uf-send gf-done-fixed"
              aria-label="give something"
              onClick={() => {
                haptics.light();
                onGive();
              }}
            >
              <SendArrow />
            </button>
          </>
        ) : (
          <>
            <h1 className="uf-heading">look around all you like.</h1>
            <p className="gf-cap-line">to take part, give first. it counts once someone receives it.</p>
            <button type="button" className="gf-cap-quiet" onClick={onBack}>
              back
            </button>
          </>
        )}
      </div>
    </div>,
    document.querySelector("main") ?? document.body,
  );
}
