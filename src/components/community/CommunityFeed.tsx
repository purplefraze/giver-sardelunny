import { useState } from "react";

import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import { modeFor, type CgMode } from "@/data/communigy";
import type { BorrowSide, ItemType } from "@/data/items";

/**
 * COMMUNI-G — lower-loop navigation shell (Frazer via Luna, 29 Sep 2026).
 * IN-COMMUNITY ONLY: entered via living G 6:00. Full G lower loop has no toggle.
 *
 * Organism lower-loop: red open crescent, bead on the track with inward arm,
 * seat-coloured plug/socket morph (middle-loop language). No iOS capture chrome.
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
      }}
    >
      <PerimeterToggle value={mode} onChange={setMode} onExit={onExit ?? onClose} />
    </div>
  );
}
