import { useState } from "react";

import { PerimeterToggle } from "@/components/community/PerimeterToggle";
import { modeFor, type CgMode } from "@/data/communigy";
import type { BorrowSide, ItemType } from "@/data/items";

/**
 * COMMUNI-G — lower-loop navigation shell (Frazer via Luna, 29 Sep 2026).
 * IN-COMMUNITY ONLY: entered via living G 6:00. Full G lower loop has no toggle.
 *
 * Organism lower-loop: red open crescent, bead on the track with inward arm,
 * seat-coloured plug/socket morph (middle-loop language). Chrome at y≈85.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

/** Mock chrome: SAFE 59 + air + btn/2 → centre y = 85. */
const CHROME_CY = 85;
const CHROME_R = 18;
const CHROME_L = 40;
const CHROME_R_X = 350;

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

      {/* Close + download — below status band (mock y≈85). */}
      <button
        type="button"
        aria-label="close"
        data-cg-chrome="close"
        onClick={onClose}
        className="pointer-events-auto absolute z-40 flex items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]"
        style={{
          left: CHROME_L - CHROME_R,
          top: CHROME_CY - CHROME_R,
          width: CHROME_R * 2,
          height: CHROME_R * 2,
          background: "#E6E6EB",
          border: "none",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M12.8 12.8 L23.2 23.2 M23.2 12.8 L12.8 23.2"
            fill="none"
            stroke="#1C1C1E"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        aria-label="download"
        data-cg-chrome="download"
        className="pointer-events-auto absolute z-40 flex items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent]"
        style={{
          left: CHROME_R_X - CHROME_R,
          top: CHROME_CY - CHROME_R,
          width: CHROME_R * 2,
          height: CHROME_R * 2,
          background: "#E6E6EB",
          border: "none",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M18 11 L18 20.2 M13.8 15.8 L18 20.2 L22.2 15.8 M11.8 22.4 L11.8 24.2 L24.2 24.2 L24.2 22.4"
            fill="none"
            stroke="#1C1C1E"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
