import { BackArrow } from "@/components/BackArrow";

/**
 * THE DOOR THAT ASKS ONE QUESTION.
 *
 * The community is not hidden behind a lock icon, a paywall or a nag: it simply
 * asks the only question Giver cares about. One active give and the door is
 * open — forever, and for everyone else's eyes too.
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
        the community opens to people who are in it. give one thing — anything —
        and everything happening near you appears.
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

