import { BackArrow } from "@/components/BackArrow";
import { itemLine, type Item } from "@/data/items";

/**
 * A GIVE JUST CLOSED (give-close.ts). One question, dismissible, no sparks:
 * offer the same give again, or give something else. Without a live give,
 * nothing else of theirs is visible — so it says that, plainly.
 *
 * Type, space and one bright way forward, like the community door.
 */
export function GiveClosed({
  item,
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
      className="g-page absolute inset-0 z-[60] flex flex-col justify-center"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <BackArrow onClick={onClose} />
      <p className="g-meta opacity-45">{itemLine(item)}</p>
      <button
        type="button"
        onClick={onAgain}
        className="g-display mt-3 text-left transition-transform active:scale-95"
        style={{ color: "var(--giver-generosity)" }}
      >
        want to offer that again?
      </button>
      <button
        type="button"
        onClick={onSomethingElse}
        className="g-heading mt-6 text-left transition-transform active:scale-95"
        style={{ color: "var(--giver-generosity)", opacity: 0.7 }}
      >
        or something else?
      </button>
      {stillLive ? null : (
        <p className="g-body mt-8 max-w-[24ch] opacity-60">
          without a live give, nothing else of yours is visible
        </p>
      )}
    </div>
  );
}
