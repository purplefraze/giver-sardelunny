import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { CAMERA, anchorOrigin } from "@/components/living-g/g-depth";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LIVING_G_VIEWBOX } from "@/components/living-g/g-path";
import { GThinMask } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import type { Item } from "@/data/items";

/**
 * A GIVE JUST CLOSED (give-close.ts). One question, dismissible, no sparks:
 * offer the same give again, or give something else. Without a live give,
 * nothing else of theirs is visible — so it says that, plainly.
 *
 * THE SOFT MINT GIVE SURFACE, the same as the give flow's card: a mint page
 * (#EEF9EA) on a mint surround (#DDF3D6 → #D6F1CF), the zoomed middle-loop
 * arcs in give green (#4BE01E) behind it. Every word is My G blue (#1E7BFF),
 * no grey, no letter-spacing, exactly two text styles:
 *   question  34px · 500
 *   answers   22px · 400
 */
const BLUE = "#1E7BFF";
const GREEN = "#4BE01E";
const PAGE = "#EEF9EA";

const question: React.CSSProperties = {
  fontFamily: "var(--giver-font)",
  fontSize: 34,
  fontWeight: 500,
  lineHeight: 1.06,
  letterSpacing: 0,
  color: BLUE,
  textTransform: "lowercase",
  textWrap: "balance",
};
const answer: React.CSSProperties = {
  fontFamily: "var(--giver-font)",
  fontSize: 22,
  fontWeight: 400,
  lineHeight: 1.25,
  letterSpacing: 0,
  color: BLUE,
  textTransform: "lowercase",
};

/** The zoomed middle loop, held at rest in give green behind the card. */
function GiveArcs() {
  const o = anchorOrigin("middle");
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        transform: `translateZ(0) scale(${CAMERA.unfurl})`,
        transformOrigin: `${o.x}% ${o.y}%`,
      }}
    >
      <GStage>
        <svg
          viewBox={LIVING_G_VIEWBOX}
          className="pointer-events-none h-full w-full overflow-visible"
        >
          <defs>
            <GThinMask id="gc-arcs-thin" weight="middle" />
          </defs>
          <g transform={LIVING_G_TRANSFORM} fill={GREEN}>
            <path d={LIVING_G_PATH} mask="url(#gc-arcs-thin)" />
          </g>
          <MiddleLoopClose weight="middle" fill={GREEN} />
        </svg>
      </GStage>
    </div>
  );
}

export function GiveClosed({
  stillLive,
  onAgain,
  onSomethingElse,
  onClose,
}: {
  item: Item;
  /** Another give of mine is still live: the last line would not be true. */
  stillLive: boolean;
  onAgain: () => void;
  onSomethingElse: () => void;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="give-closed"
      className="absolute inset-0 z-[60] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #DDF3D6 0%, #D6F1CF 100%)",
        ["--world-ink" as string]: BLUE,
      }}
    >
      <GiveArcs />
      <div
        className="absolute overflow-hidden"
        style={{
          left: 16,
          right: 16,
          top: "max(92px, calc(env(safe-area-inset-top) + 60px))",
          bottom: "max(64px, calc(env(safe-area-inset-bottom) + 40px))",
          background: PAGE,
          borderRadius: 32,
        }}
      >
        <BackArrow onClick={onClose} label="close" />
        <div className="flex h-full flex-col justify-center" style={{ padding: "0 30px" }}>
          <button
            type="button"
            onClick={onAgain}
            className="text-left transition-transform active:scale-[0.98]"
            style={{ ...question, maxWidth: "11em", background: "none", border: 0, padding: 0 }}
          >
            want to offer that again?
          </button>
          <button
            type="button"
            onClick={onSomethingElse}
            className="text-left transition-transform active:scale-[0.98]"
            style={{ ...answer, marginTop: 38, background: "none", border: 0, padding: 0 }}
          >
            or something else?
          </button>
          {stillLive ? null : (
            <p style={{ ...answer, marginTop: 14, maxWidth: "15em" }}>
              without a live give, nothing else of yours is visible
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
