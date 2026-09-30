import { useState } from "react";

import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import { CG_INK, CG_WORD, modeFor, type CgMode } from "@/data/communigy";
import type { BorrowSide, ItemType } from "@/data/items";

/**
 * COMMUNI-G — lower-loop navigation shell (Frazer, 30 Sep 2026).
 * IN-COMMUNITY ONLY: entered via living G 6:00. Full G lower loop has no toggle.
 *
 * Red middle-weight track frames the phone; the white hole is the page.
 * Interior holds the mode heading (CG_WORD) — give at 1:30 reads as the give
 * page. No new Give wizard this turn.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

export function CommunityFeed({
  initialType = null,
  initialSide,
  onClose,
  onExit,
}: {
  initialType?: ItemType | null;
  initialScope?: Scope;
  initialView?: View;
  initialSide?: BorrowSide;
  onOpen: (itemId: string) => void;
  onOpenProfile?: (ownerId: string) => void;
  onEditMine?: (itemId: string) => void;
  onClose: () => void;
  /** 12:00 ON THE LOWER LOOP: back to the full G, the toggle at 6:00. */
  onExit?: () => void;
}) {
  const [mode, setMode] = useState<CgMode>(modeFor(initialType, initialSide));
  const ink = CG_INK[mode];

  return (
    <div
      data-world="communigy"
      data-cg-mode={mode}
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--world-bg)",
        border: "none",
        boxShadow: "none",
        outline: "none",
        ["--cg-ink" as string]: ink,
      }}
    >
      <PerimeterToggle value={mode} onChange={setMode} onExit={onExit ?? onClose}>
        <div
          className="flex h-full w-full flex-col items-center justify-center px-3 text-center"
          data-cg-interior-page=""
        >
          <h1
            className="g-display"
            data-cg-interior-heading=""
            style={{
              color: ink,
              fontSize: "clamp(1.6rem, 9vw, 2.6rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textTransform: "lowercase",
              lineHeight: 1.05,
            }}
          >
            {CG_WORD[mode]}
          </h1>
        </div>
      </PerimeterToggle>
    </div>
  );
}
