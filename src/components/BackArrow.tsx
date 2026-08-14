/** The single, minimal back affordance used everywhere in Giver. */
export function BackArrow({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
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
}
