import { useEffect, useMemo, useRef, useState } from "react";

import { FULL_SEATS, EarSelector, type Seat } from "@/components/living-g/EarSelector";
import { GStage } from "@/components/living-g/GStage";
import { LivingG } from "@/components/living-g/LivingG";
import { LIVING_G_FRAME, LOOP_CENTRE } from "@/components/living-g/g-path";
import { TOGGLE, rimRadius } from "@/components/living-g/g-weight";
import { signInFeedLines, type SignInFeedLine } from "@/data/signin-feed";
import { OTP_LENGTH, type OtpSignIn } from "@/components/onboarding/use-otp-sign-in";
import { useKeyboardFit } from "@/components/onboarding/use-keyboard-fit";
import { haptics } from "@/lib/haptics";

/**
 * THE SIGN-IN / ONBOARDING SCREEN — PRESENTATION ONLY (behaviour lives in
 * useOtpSignIn). Shared by the onboarding AuthGate and the /auth route.
 *
 *   paper   pure white
 *   feed    dense rows of SAMPLE activity wrapping the whole screen, each
 *           entry in its own action's colour, muted (signin-feed.ts)
 *   G       THE MAIN G, variant A: the same GStage (sized from the live toggle
 *           geometry, 715.4 × 1192.7 units, 8px edge air), the same LivingG at
 *           the middle weight (28.5-unit stroke via the g-weight mask), ear cut,
 *           in the seat colour
 *   circle  the G's middle loop IS the circle: centred on the loop's centre,
 *           its outer edge on the loop's (thinned) rim, stroked at the toggle
 *           ring's weight (17.2 units, ~9px at 390) in the seat colour, filled
 *           white so the feed is cleared. It holds "giver", the field (email,
 *           then the 6-digit code in the same place) and the send circle
 *   toggle  the main G's own EarSelector at the middle weight, riding that
 *           circle exactly as it rides the main G: rim + the 24.5 white gap +
 *           ring radius 74.6 = orbit 283.1. Tap = next seat clockwise; drag =
 *           snap to the nearest seat; arrow keys step. 12:00 stays empty.
 *
 * KEYBOARD: the whole stage scales as ONE (use-keyboard-fit.ts).
 *
 * Seat colours come from the one app-wide map (--mode-*) through ONE
 * attribute (data-signin-seat). Starts on Give.
 */

/**
 * THE CIRCLE, in viewBox units — derived, never typed: the middle loop's
 * centre, its rim at the middle weight (184), the toggle ring's stroke (17.2).
 */
const CIRCLE_C = LOOP_CENTRE.middle;
const CIRCLE_STROKE = TOGGLE.middle.outerR - TOGGLE.middle.innerR;
const CIRCLE_OUTER = rimRadius("middle");
const CIRCLE_INNER = CIRCLE_OUTER - CIRCLE_STROKE;
const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
/** The circle's white interior, as a box inside the stage (the form lives here). */
const CIRCLE_BOX: React.CSSProperties = {
  left: pct((CIRCLE_C.x - CIRCLE_INNER - LIVING_G_FRAME.x) / LIVING_G_FRAME.width),
  top: pct((CIRCLE_C.y - CIRCLE_INNER - LIVING_G_FRAME.y) / LIVING_G_FRAME.height),
  width: pct((2 * CIRCLE_INNER) / LIVING_G_FRAME.width),
  height: pct((2 * CIRCLE_INNER) / LIVING_G_FRAME.height),
};
/** The quiet lines sit in the bottom loop's white (relative to the circle box). */
const UNDER_AT: React.CSSProperties = {
  left: pct((LOOP_CENTRE.bottom.x - (CIRCLE_C.x - CIRCLE_INNER)) / (2 * CIRCLE_INNER)),
  top: pct((LOOP_CENTRE.bottom.y - (CIRCLE_C.y - CIRCLE_INNER)) / (2 * CIRCLE_INNER)),
};

/** The circle itself, drawn over the G's middle loop, under the toggle. */
function SignInCircle() {
  return (
    <circle
      cx={CIRCLE_C.x}
      cy={CIRCLE_C.y}
      r={CIRCLE_OUTER - CIRCLE_STROKE / 2}
      fill="var(--world-bg)"
      stroke="var(--world-g)"
      strokeWidth={CIRCLE_STROKE}
      pointerEvents="none"
      data-signin-ring=""
    />
  );
}

/** A tiny deterministic PRNG, so the feed reads the same on every visit. */
function prng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROWS = 48;
const PER_ROW = 6;
/** Seconds per row: a slow drift. */
const SECONDS_PER_ROW = 5;

function Feed() {
  const rows = useMemo(() => {
    const rnd = prng(20260927);
    const lines: SignInFeedLine[] = [...signInFeedLines()];
    for (let i = lines.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [lines[i], lines[j]] = [lines[j]!, lines[i]!];
    }
    if (!lines.length) return [];
    let k = 0;
    return Array.from({ length: ROWS }, () => ({
      x: -Math.round(10 + rnd() * 200),
      items: Array.from({ length: PER_ROW }, () => lines[k++ % lines.length]!),
    }));
  }, []);
  if (!rows.length) return null;
  /* Twice over, rolled by exactly half its height: a seamless loop that only
     ever moves by transform (GPU). Still under reduced motion. */
  const doubled = [...rows, ...rows];
  return (
    <div className="signin-feed" aria-hidden="true">
      <div
        className="signin-feed-track"
        style={{ ["--signin-feed-duration" as string]: `${ROWS * SECONDS_PER_ROW}s` }}
      >
        {doubled.map((row, i) => (
          <div key={i} className="signin-feed-row" style={{ marginLeft: row.x }}>
            {row.items.map((l, j) => (
              <span key={j} className={`k-${l.kind}`}>
                {l.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SendCircle({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button type="submit" className="signin-send" aria-label={label} disabled={busy}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 12h13.5M13 6.5 18.5 12 13 17.5"
          fill="none"
          stroke="#fff"
          strokeWidth="1.9"
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
  const root = useRef<HTMLDivElement | null>(null);
  const probe = useRef<HTMLDivElement | null>(null);
  const fit = useKeyboardFit(root, probe);

  /* The code field takes the email field's place — and the focus with it. */
  useEffect(() => {
    if (otp.step === "code") codeRef.current?.focus();
  }, [otp.step]);

  /* TAP ON THE TOGGLE = the next seat clockwise (travel order, wrapping). */
  const nextSeat = () => {
    const i = FULL_SEATS.indexOf(seat as (typeof FULL_SEATS)[number]);
    haptics.light();
    setSeat(FULL_SEATS[(i + 1) % FULL_SEATS.length]!);
  };

  const line = otp.error ?? otp.notice;

  return (
    <div
      ref={root}
      className="signin relative h-full min-h-full w-full overflow-hidden lowercase"
      data-signin-seat={seat}
    >
      <Feed />

      {/* THE PROBE — an unscaled, invisible copy of the stage, read by the
          keyboard rule for the G's resting pose (never transformed). */}
      <div className="signin-probe" aria-hidden="true">
        <GStage>
          <div ref={probe} className="h-full w-full" />
        </GStage>
      </div>

      {/* THE STAGE — ONE wrapper, ONE uniform scale: the G, the circle, the
          toggle and the form move and scale together with the keyboard. */}
      <div
        className="signin-stage"
        data-signin-scale={fit.s.toFixed(4)}
        style={{
          transform: `translate3d(${fit.tx}px, ${fit.ty}px, 0) scale(${fit.s})`,
          transition: `transform ${fit.ease}`,
        }}
      >
        <GStage>
          <LivingG
            weight="middle"
            earCut
            showLabels={false}
            overlay={
              <>
                <SignInCircle />
                <EarSelector
                  mode={seat}
                  weight="middle"
                  seats={FULL_SEATS}
                  onChange={setSeat}
                  onTap={nextSeat}
                />
              </>
            }
          />
          <div className="signin-circle" style={CIRCLE_BOX}>
            {otp.step === "email" ? (
              <form onSubmit={(e) => void otp.submitEmail(e)} className="signin-inner">
                <h1 className="signin-mark">giver</h1>
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
                <SendCircle label={otp.busy ? "sending" : "send code"} busy={otp.busy} />
                <div className="signin-under" style={UNDER_AT} aria-live="polite">
                  {line ? <p className="signin-line">{line}</p> : null}
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => void otp.submitCode(e)} className="signin-inner">
                <h1 className="signin-mark">giver</h1>
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
                <SendCircle label={otp.busy ? "checking" : "sign in"} busy={otp.busy} />
                <div className="signin-under" style={UNDER_AT}>
                  <p className="signin-line" aria-live="polite">
                    {line ?? "\u00a0"}
                  </p>
                  {/* Stacked, so both fit the bottom loop's white at 320. */}
                  <div className="signin-under-links">
                    <button
                      type="button"
                      className="signin-link"
                      onClick={() => void otp.resend()}
                      disabled={otp.busy}
                    >
                      resend
                    </button>
                    <button type="button" className="signin-link" onClick={otp.changeEmail}>
                      use a different email
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </GStage>
      </div>
    </div>
  );
}
