import { useEffect, useMemo, useRef, useState } from "react";

import { FULL_SEATS, type Seat } from "@/components/living-g/EarSelector";
import { signInFeedLines } from "@/data/signin-feed";
import { OTP_LENGTH, type OtpSignIn } from "@/components/onboarding/use-otp-sign-in";

/**
 * THE SIGN-IN / ONBOARDING SCREEN — PRESENTATION ONLY (behaviour lives in
 * useOtpSignIn). Shared by the onboarding AuthGate and the /auth route.
 *
 *   bottom  pure white
 *   middle  a slow, muted teleprompter of community activity, tinted in the
 *           active seat colour (sample data only — see signin-feed.ts)
 *   top     one large solid-white circle (a perfect circle, like the G's
 *           middle loop) holding "giver", the field and the send circle
 *
 * The feed reads above the circle, is hidden while it passes behind it, and
 * reappears below. The seat dots snap between seats and recolour everything
 * through ONE attribute (data-signin-seat); the hexes are scoped to this
 * screen in styles.css ("THE SIGN-IN SCREEN"). Starts on Give.
 */

const SEAT_WORD: Record<Seat, string> = {
  give: "give",
  wish: "wish",
  trade: "trade",
  fund: "fund",
  borrow: "borrow",
  lend: "lend",
  giver: "my g",
};

/** Roughly how long one feed line stays in view — slow, teleprompter pace. */
const SECONDS_PER_LINE = 3.4;

function Feed() {
  const lines = useMemo(() => signInFeedLines().map((l) => l.text), []);
  if (lines.length === 0) return null;
  /* Twice over, rolled by exactly half its height: a seamless loop that only
     ever moves by transform (GPU). */
  const doubled = [...lines, ...lines];
  return (
    <div className="signin-feed" aria-hidden="true">
      <div
        className="signin-feed-track"
        style={{ ["--signin-feed-duration" as string]: `${lines.length * SECONDS_PER_LINE}s` }}
      >
        {doubled.map((text, i) => (
          <p key={i} className="signin-feed-line">
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}

function SeatDots({ seat, onSeat }: { seat: Seat; onSeat: (s: Seat) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (from: number, by: number) => {
    const next = (from + by + FULL_SEATS.length) % FULL_SEATS.length;
    onSeat(FULL_SEATS[next]!);
    refs.current[next]?.focus();
  };
  return (
    <div className="signin-seats">
      <div className="signin-dots" role="radiogroup" aria-label="seat">
        {FULL_SEATS.map((s, i) => (
          <button
            key={s}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={s === seat}
            aria-label={SEAT_WORD[s]}
            tabIndex={s === seat ? 0 : -1}
            className="signin-dot"
            onClick={() => onSeat(s)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
          >
            <span style={{ background: `var(--signin-${s})` }} />
          </button>
        ))}
      </div>
      <span className="signin-seat-word" aria-hidden="true">
        {SEAT_WORD[seat]}
      </span>
    </div>
  );
}

function SendCircle({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button type="submit" className="signin-send" aria-label={label} disabled={busy}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M5 12h13.5M13 6.5 18.5 12 13 17.5"
          fill="none"
          stroke="#fff"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function SignInView({ otp }: { otp: OtpSignIn }) {
  const [seat, setSeat] = useState<Seat>("give");
  const codeRef = useRef<HTMLInputElement | null>(null);

  /* The code field takes the email field's place — and the focus with it. */
  useEffect(() => {
    if (otp.step === "code") codeRef.current?.focus();
  }, [otp.step]);

  const line = otp.error ?? otp.notice;

  return (
    <div
      className="signin relative h-full min-h-full w-full overflow-hidden lowercase"
      data-signin-seat={seat}
    >
      <Feed />
      <SeatDots seat={seat} onSeat={setSeat} />

      <div className="signin-circle">
        <div className="flex w-full flex-col items-center text-center">
          <h1 className="signin-mark">giver</h1>

          {otp.step === "email" ? (
            <form
              onSubmit={(e) => void otp.submitEmail(e)}
              className="mt-8 flex w-full flex-col items-center"
            >
              <input
                type="email"
                required
                value={otp.email}
                onChange={(e) => otp.setEmail(e.target.value)}
                placeholder="email"
                aria-label="email"
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                className="signin-field"
              />
              <div className="mt-5">
                <SendCircle label={otp.busy ? "sending" : "send code"} busy={otp.busy} />
              </div>
              <p className="signin-line mt-4 min-h-[1.35em]" aria-live="polite">
                {line ?? "\u00a0"}
              </p>
            </form>
          ) : (
            <form
              onSubmit={(e) => void otp.submitCode(e)}
              className="mt-8 flex w-full flex-col items-center"
            >
              <input
                ref={codeRef}
                type="text"
                required
                value={otp.code}
                onChange={(e) => otp.setCode(e.target.value)}
                placeholder={`${OTP_LENGTH}-digit code`}
                aria-label={`${OTP_LENGTH}-digit code sent to ${otp.email.trim()}`}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern={`\\d{${OTP_LENGTH}}`}
                maxLength={OTP_LENGTH}
                className="signin-field signin-field--code"
              />
              <div className="mt-5">
                <SendCircle label={otp.busy ? "checking" : "sign in"} busy={otp.busy} />
              </div>
              <p className="signin-line mt-4 min-h-[1.35em]" aria-live="polite">
                {line ?? "\u00a0"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  className="signin-link"
                  onClick={() => void otp.resend()}
                  disabled={otp.busy}
                >
                  resend
                </button>
                <span className="signin-line" aria-hidden="true">
                  ·
                </span>
                <button type="button" className="signin-link" onClick={otp.changeEmail}>
                  use a different email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
