import { buzz } from "@/lib/haptics";

/**
 * THE ONE ADMIN EDITING SURFACE.
 *
 * Every developer editor — a person, a give, a wish, a trade, a borrow — opens
 * in this same full-screen sheet: the thing's name, what it is, and its fields
 * on hairlines. Edits are written as they are typed, so "save" is never a
 * button that can be forgotten: the word up top simply says it is saved.
 */
export function AdminShell({
  title,
  kind,
  edited,
  children,
  onRevert,
  onClose,
}: {
  title: string;
  kind: string;
  /** Has a developer already overridden the written record? */
  edited: boolean;
  children: React.ReactNode;
  onRevert?: (() => void) | undefined;
  onClose: () => void;
}) {
  return (
    <div
      data-world="me"
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "var(--giver-paper)", color: "var(--giver-ink)" }}
    >
      <div className="g-page g-page-top g-page-bottom">
        <div className="flex items-baseline justify-between gap-4">
          <span className="g-heading" style={{ color: "var(--giver-me)" }}>
            editing {kind}
          </span>
          <button
            type="button"
            onClick={() => {
              buzz();
              onClose();
            }}
            className="text-[12px] font-black lowercase tracking-[0.26em]"
            style={{ color: "var(--giver-me)" }}
          >
            done
          </button>
        </div>

        <h1 className="g-display mt-3">{title}</h1>
        <p className="g-meta mt-3 opacity-55">
          {edited ? "edited — saved automatically" : "changes save as you type"}
        </p>

        <div className="mt-8 flex flex-col gap-5">{children}</div>

        {onRevert ? (
          <button
            type="button"
            onClick={() => {
              buzz();
              onRevert();
            }}
            disabled={!edited}
            className="mt-12 text-left text-[12px] font-black lowercase tracking-[0.26em] disabled:opacity-25"
            style={{ color: "var(--giver-action)" }}
          >
            revert to the original
          </button>
        ) : null}
      </div>
    </div>
  );
}
