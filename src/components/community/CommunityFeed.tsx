import { useState } from "react";

import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import { CG_INK, modeFor, type CgMode } from "@/data/communigy";
import type { BorrowSide, ItemType } from "@/data/items";

/**
 * COMMUNI-G — lower-loop navigation shell (Frazer, 30 Sep 2026).
 * IN-COMMUNITY ONLY: entered via living G 6:00. Full G lower loop has no toggle.
 *
 * Red middle-weight track frames the phone; the white hole is the page.
 * Interior children slot stays EMPTY — seat word lives ONLY in the live bead.
 * No new Give wizard this turn.
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
        {/* Empty hole — no interior seat word. */}
        <div className="h-full w-full" data-cg-interior-page="" />
      </PerimeterToggle>
    </div>
  );
}
