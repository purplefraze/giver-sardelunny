import { useState } from "react";

/**
 * THE MAGIC-LINK SCREEN — PRESENTATION ONLY. Shared by the onboarding
 * AuthGate and the /auth route so both read identically. Behaviour (one email
 * field, signInWithOtp) lives in the callers; this file only sets the voice:
 *
 *   Helvetica Neue (--giver-font), all lowercase, generous tracking, one idea,
 *   lots of white. Neutral ink only — no green, no mint, no filled button.
 *
 * Sizes (px): mark 15 · line 17 · field 22 · submit 17 · helper 13.
 */
export const MAGIC_LINK_TYPE = {
  mark: { fontSize: "15px", fontWeight: 500, letterSpacing: "0.28em" },
  line: { fontSize: "17px", fontWeight: 300, letterSpacing: "0.18em" },
  field: { fontSize: "22px", fontWeight: 400, letterSpacing: "0.08em" },
  submit: { fontSize: "17px", fontWeight: 500, letterSpacing: "0.18em" },
  helper: { fontSize: "13px", fontWeight: 300, letterSpacing: "0.14em" },
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
  /** The helper line appears only after focus, an error, or once sent. */
  const [touched, setTouched] = useState(false);
  const helper = error
    ? error.toLowerCase()
    : sent
      ? "check your email for the link"
      : touched
        ? "we’ll email you a link"
        : null;

  return (
    <div
      className="relative flex h-full min-h-full w-full flex-col items-center justify-center overflow-hidden px-9 lowercase"
      style={{
        background: "var(--seat-bg)",
        color: "var(--giver-ink)",
        fontFamily: "var(--giver-font)",
      }}
    >
      <div className="flex w-full max-w-[18rem] flex-col items-center text-center">
        {/* Small mark — the LaunchScreen wordmark's weight and tracking. */}
        <p style={{ ...MAGIC_LINK_TYPE.mark, marginRight: "-0.28em" }}>giver</p>

        <p
          className="mt-14"
          style={{ ...MAGIC_LINK_TYPE.line, opacity: 0.55, marginRight: "-0.18em" }}
        >
          one email
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex w-full flex-col items-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            onFocus={() => setTouched(true)}
            readOnly={sent}
            placeholder="email"
            aria-label="email"
            autoCapitalize="none"
            autoComplete="email"
            className="w-full border-0 border-b bg-transparent pb-2 text-center lowercase outline-none placeholder:text-[color:var(--giver-ink)] placeholder:opacity-30"
            style={{
              ...MAGIC_LINK_TYPE.field,
              borderBottom: "1px solid color-mix(in oklab, var(--giver-ink) 18%, transparent)",
              borderRadius: 0,
              color: "var(--giver-ink)",
            }}
          />

          <p
            className="mt-3 min-h-[1.2em]"
            aria-live="polite"
            style={{
              ...MAGIC_LINK_TYPE.helper,
              opacity: helper ? 0.55 : 0,
              transition: "opacity 300ms cubic-bezier(0.32,0,0.24,1)",
            }}
          >
            {helper ?? "\u00a0"}
          </p>

          {sent ? null : (
            <button
              type="submit"
              disabled={busy}
              className="mt-8 bg-transparent p-2 lowercase transition-opacity active:opacity-50 disabled:opacity-30"
              style={{
                ...MAGIC_LINK_TYPE.submit,
                color: "var(--giver-ink)",
                marginRight: "-0.18em",
              }}
            >
              {busy ? "one moment" : "send link"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
