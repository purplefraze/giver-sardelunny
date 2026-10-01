import { useState } from "react";

import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import { WishMatch } from "@/components/community/WishMatch";
import { CG_INK, modeFor, type CgMode } from "@/data/communigy";
import type { BorrowSide, ItemType } from "@/data/items";

/**
 * COMMUNI-G — lower-loop navigation shell (Frazer, 30 Sep 2026).
 * IN-COMMUNITY ONLY: entered via living G 6:00. Full G lower loop has no toggle.
 *
 * Red middle-weight track frames the phone; the white hole is the page.
 * Seat word lives ONLY in the live bead. Wish seat holds the match page.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

export function CommunityFeed({
  initialType = null,
  initialSide,
  onOpen,
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
        {/* Seat word lives in the bead. Wish seat holds the match page. */}
        <div className="h-full w-full" data-cg-interior-page="">
          {mode === "wish" ? <WishMatch onOpen={onOpen} /> : null}
        </div>
      </PerimeterToggle>
    </div>
  );
}
