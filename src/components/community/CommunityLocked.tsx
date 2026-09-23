import { BackArrow } from "@/components/BackArrow";

/**
 * THE DOOR THAT ASKS ONE QUESTION.
 *
 * Communi-g is already visible — this is not a hiding place. It asks for one
 * active give before a person may respond, message, sparkle or start a
 * connection. One give and the lock lifts — forever, re-checked every time.
 *
 * No cards, no boxes, no icons: type, space and one bright way forward.
 */
export function CommunityLocked({
  onGive,
  onClose,
  problem,
  onFix,
}: {
  onGive: () => void;
  onClose: () => void;
  /** WHAT IS ACTUALLY IN THE WAY, when it is not the give itself. */
  problem?: string | null;
  onFix?: () => void;
}) {
  return (
    <div
      className="g-page relative flex h-full w-full flex-col justify-center"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <BackArrow onClick={onClose} />

      <p className="g-meta opacity-45">oh, you're curious</p>
      <h1 className="g-display mt-3" style={{ color: "var(--giver-yellow)" }}>
        are you
        <br />a giver?
      </h1>
      <p className="g-body mt-6 max-w-[22ch] opacity-60">
        you can look around communi-g. to take part — respond, message, sparkle — give one thing.
        anything. then the lock lifts.
      </p>

      {problem ? (
        <>
          <p className="g-body mt-6 max-w-[24ch]" style={{ color: "var(--giver-me)" }}>
            {problem}
          </p>
          <button
            type="button"
            onClick={onFix}
            className="g-heading mt-6 text-left transition-transform active:scale-95"
            style={{ color: "var(--giver-me)" }}
          >
            take me to my g
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={onGive}
        className="g-heading mt-10 text-left transition-transform active:scale-95"
        style={{ color: "var(--giver-generosity)" }}
      >
        what can you give today?
      </button>
    </div>
  );
}
