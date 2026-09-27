/**
 * THE MAGIC-LINK SCREEN — PRESENTATION ONLY. Shared by the onboarding
 * AuthGate and the /auth route so both read identically. Behaviour (one email
 * field, signInWithOtp) lives in the callers; this file only sets the voice.
 *
 * Three pieces and nothing else: the "giver" wordmark, the email field, and
 * "send link". No instruction line. A quiet line appears under the control
 * ONLY as feedback — an error, or "check your email" once sent.
 *
 * Helvetica Neue (--giver-font), all lowercase, white (--seat-bg), dark ink.
 * The one Living G cue is "send link" in My G blue (--mode-giver). No
 * illustration, no pink, no filled button.
 */
export const MAGIC_LINK_TYPE = {
  /** The launch wordmark's weight and tracking, set larger: the page's centre. */
  mark: { fontSize: "34px", fontWeight: 500, letterSpacing: "0.28em" },
  field: { fontSize: "21px", fontWeight: 400, letterSpacing: "0.06em" },
  submit: { fontSize: "16px", fontWeight: 700, letterSpacing: "0.2em" },
  helper: { fontSize: "13px", fontWeight: 400, letterSpacing: "0.14em" },
} as const;

export function MagicLinkView({
  email,
  onEmail,
  busy,
  sent,
  error,
  onSubmit,
}: {
  email: string;
  onEmail: (value: string) => void;
  busy: boolean;
  sent: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  /** Feedback only — never an instruction. */
  const helper = error ? error.toLowerCase() : sent ? "check your email for the link" : null;

  return (
    <div
      className="relative flex h-full min-h-full w-full flex-col items-center justify-center overflow-hidden px-9 lowercase"
      style={{
        background: "var(--seat-bg)",
        color: "var(--giver-ink)",
        fontFamily: "var(--giver-font)",
      }}
    >
      <div
        className="flex w-full max-w-[17rem] flex-col items-center text-center"
        style={{ transform: "translateY(-4%)" }}
      >
        {/* THE WORDMARK — plain type, the launch treatment at a larger size. */}
        <h1 style={{ ...MAGIC_LINK_TYPE.mark, lineHeight: 1, marginRight: "-0.28em" }}>giver</h1>

        {/* ONE QUIET CONTROL: the field and its action, close together. */}
        <form onSubmit={onSubmit} className="mt-16 flex w-full flex-col items-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            readOnly={sent}
            placeholder="email"
            aria-label="email"
            autoCapitalize="none"
            autoComplete="email"
            className="w-full border-0 border-b bg-transparent pb-2.5 text-center lowercase outline-none placeholder:text-[color:var(--giver-ink)] placeholder:opacity-45"
            style={{
              ...MAGIC_LINK_TYPE.field,
              borderBottom: "1px solid color-mix(in oklab, var(--giver-ink) 32%, transparent)",
              borderRadius: 0,
              color: "var(--giver-ink)",
            }}
          />

          {sent ? null : (
            <button
              type="submit"
              disabled={busy}
              className="mt-5 bg-transparent px-3 py-2 lowercase transition-opacity active:opacity-50 disabled:opacity-40"
              style={{
                ...MAGIC_LINK_TYPE.submit,
                color: "var(--mode-giver)",
                marginRight: "-0.2em",
              }}
            >
              {busy ? "one moment" : "send link"}
            </button>
          )}

          <p
            className="mt-3 min-h-[1.2em]"
            aria-live="polite"
            style={{
              ...MAGIC_LINK_TYPE.helper,
              opacity: helper ? 0.7 : 0,
              transition: "opacity 300ms cubic-bezier(0.32,0,0.24,1)",
            }}
          >
            {helper ?? "\u00a0"}
          </p>
        </form>
      </div>
    </div>
  );
}
