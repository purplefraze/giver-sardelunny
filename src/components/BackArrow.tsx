/** The single, minimal back affordance used everywhere in Giver. */
export function BackArrow({
  onClick,
  label = "Back",
  sticky = false,
}: {
  onClick: () => void;
  label?: string;
  /**
   * WHEN THE SCREEN ITSELF SCROLLS, BACK MUST NOT SCROLL AWAY. On a phone the
   * only way out of a long profile is this arrow, so inside a scrolling
   * container it rides a zero-height sticky rail and stays put. Must be the
   * first child of that container.
   */
  sticky?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute left-3 top-3 z-40 p-3 opacity-60 transition-transform active:scale-90"
      style={{ color: "var(--world-ink)" }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5 8 12l7 7" />
      </svg>
    </button>
  );

  if (!sticky) return button;

  return (
    <div className="sticky top-0 z-40 h-0 w-full shrink-0">{button}</div>
  );
}
