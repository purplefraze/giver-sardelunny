import { useEffect, useId, useMemo, useRef, useState } from "react";

import { GStage } from "@/components/living-g/GStage";
import { LivingG } from "@/components/living-g/LivingG";
import {
  BOTTOM_LOOP_INTERIOR,
  LIVING_G_FRAME,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
} from "@/components/living-g/g-path";
import { G_STROKE, rimRadius, strokeInset } from "@/components/living-g/g-weight";
import { signInFeedLines, type SignInFeedLine } from "@/data/signin-feed";
import { OTP_LENGTH, type OtpSignIn } from "@/components/onboarding/use-otp-sign-in";
import { useKeyboardFit } from "@/components/onboarding/use-keyboard-fit";
import { ConveyorToggle } from "@/components/onboarding/ConveyorToggle";
import { GIVE_DOT } from "@/components/onboarding/signin-emphasis";

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
 *   UPPER   the G's middle loop, redrawn as ONE closed ring at the G's own
 *           stroke (28.5 units, outer edge on the rim) with a white fill that
 *           clears the feed: "giver" over "kindness as currency"
 *   LOWER   the G's bottom (communi-g) loop, left OPEN, its white feathered
 *           clear of the feed: quiet for ~3s, then a soft cross-fade to
 *           "are you a giver?", the email field and the send circle; after
 *           sending, the code field and its quiet lines take the same place
 *   toggle  the main G's variant A piece (toggleGeometry("middle")) on the
 *           ring: rim + the 24.5 white gap + ring radius 74.6 = orbit 283.1 —
 *           ONE continuous conveyor through all seven seats in clock order
 *           (ConveyorToggle.tsx): idle drift, drag either way the short way
 *           round, lifted over the waist, never parked at 12:00
 *   GIVE    at give (1:30) the big G is the g of the wordmark: "ıver" is set
 *           beside it with the toggle as the i's dot, and the in-loop "giver"
 *           gives way to it (both follow the toggle's angle — no jump)
 *
 * KEYBOARD: the whole stage scales as ONE (use-keyboard-fit.ts).
 *
 * COLOUR + EMPHASIS follow the toggle's angle every frame, as CSS custom
 * properties on this root (signin-emphasis.ts): --seat is the two nearest
 * seats' --mode-* colours mixed by position (OKLCH, shorter hue),
 * --emph-<action> the feed alpha per action, --give-mark the give wordmark's
 * presence. No labels, hints or seat names. Starts on Give.
 */

/**
 * THE UPPER RING, in viewBox units — derived, never typed: the middle loop's
 * centre and rim at the middle weight (184), stroked at the G's own middle
 * weight (G_STROKE.middle = 28.5) so the ring and the S-curve read as ONE
 * weight. It is the middle loop itself, drawn as a single uniform stroke on
 * top of the artwork: closed, the same thickness all the way round.
 */
const RING_C = LOOP_CENTRE.middle;
const RING_STROKE = G_STROKE.middle;
const RING_OUTER = rimRadius("middle");
const RING_INNER = RING_OUTER - RING_STROKE;
const pct = (n: number) => `${(n * 100).toFixed(4)}%`;
/** A box in viewBox units, as percentages of the stage (the frame). */
const box = (cx: number, cy: number, rx: number, ry: number): React.CSSProperties => ({
  left: pct((cx - rx - LIVING_G_FRAME.x) / LIVING_G_FRAME.width),
  top: pct((cy - ry - LIVING_G_FRAME.y) / LIVING_G_FRAME.height),
  width: pct((2 * rx) / LIVING_G_FRAME.width),
  height: pct((2 * ry) / LIVING_G_FRAME.height),
});
/** The upper ring's white interior (the upper copy lives here). */
const UPPER_BOX = box(RING_C.x, RING_C.y, RING_INNER, RING_INNER);
/**
 * The lower loop's white opening (BOTTOM_LOOP_INTERIOR, measured off the
 * canonical path). The feed fades out across it; the sign-up / code state
 * sits in its largest inscribed square-ish box.
 */
const LOWER = BOTTOM_LOOP_INTERIOR;
/* The fade reaches out past the conservative glyph interior to the stroke. */
const LOWER_FADE = box(LOWER.cx, LOWER.cy + 10, LOWER.rx * 1.2, LOWER.ry * 1.2);
const LOWER_BOX = box(LOWER.cx, LOWER.cy, LOWER.rx, LOWER.rx);

/**
 * THE JOIN TRIM. The traced bowl is not quite round: along its bottom, where
 * it runs into the S, its outer edge sits up to ~9 units outside the ring
 * (193 at 6 o'clock, easing back to 184 by ~8 o'clock) — a bulge that would
 * make the ring read heavier there. Paper, masked to the G's own strokes,
 * trims that sliver back to the ring's outer edge, easing in from the S's
 * underside (74°) to the rim (104°), so the S still leaves the ring in one
 * smooth line and the ring stays one weight all the way round.
 */
const TRIM = { from: 74, full: 104, to: 200, startR: 199, outerR: 222 };
const TRIM_PATH = (() => {
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(RING_C.x + r * Math.cos(a)).toFixed(2)} ${(RING_C.y + r * Math.sin(a)).toFixed(2)}`;
  };
  const inner: string[] = [];
  for (let d = TRIM.from; d <= TRIM.to; d += 2) {
    const t = Math.min(1, Math.max(0, (d - TRIM.from) / (TRIM.full - TRIM.from)));
    const e = t * t * (3 - 2 * t);
    inner.push(pt(d, TRIM.startR + (RING_OUTER - TRIM.startR) * e));
  }
  const outer: string[] = [];
  for (let d = TRIM.to; d >= TRIM.from; d -= 4) outer.push(pt(d, TRIM.outerR));
  return `M${inner.join(" L")} L${outer.join(" L")} Z`;
})();

/** The upper ring, drawn over the G's middle loop, under the toggle. */
function SignInRing() {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        {/* The painted (eroded) G, grown back by 1.5 units so the trim also
            takes the anti-aliased fringe along the cut. */}
        <mask
          id={`${id}-trim`}
          maskUnits="userSpaceOnUse"
          x={-400}
          y={-400}
          width={1600}
          height={2000}
        >
          <g transform={LIVING_G_TRANSFORM}>
            <path
              d={LIVING_G_PATH}
              fill="#fff"
              stroke="#000"
              strokeWidth={(strokeInset("middle") - 1.5) * 2 * 10}
              strokeLinejoin="round"
            />
          </g>
        </mask>
      </defs>
      <path d={TRIM_PATH} fill="var(--world-bg)" mask={`url(#${id}-trim)`} pointerEvents="none" />
      <SignInRingStroke />
    </>
  );
}
function SignInRingStroke() {
  return (
    <circle
      cx={RING_C.x}
      cy={RING_C.y}
      r={RING_OUTER - RING_STROKE / 2}
      fill="var(--world-bg)"
      stroke="var(--world-g)"
      strokeWidth={RING_STROKE}
      pointerEvents="none"
      data-signin-ring=""
    />
  );
}

/**
 * THE GIVE WORDMARK. At give the big G is the g: "ıver" (dotless i) is set
 * just right of the middle loop, the i's stem centred under the toggle's
 * give position so the toggle ring is its dot. Its presence is --give-mark
 * (0 away from give), written every frame by the conveyor.
 */
const GIVE_MARK = {
  size: 96,
  /** Paper between the ring's lowest point and the i's top (units). */
  dotGap: 22,
  xHeight: 0.52,
  tracking: 0.02,
};
function GiveWordmark() {
  const top = GIVE_DOT.y + GIVE_DOT.r + GIVE_MARK.dotGap;
  const baseline = top + GIVE_MARK.size * GIVE_MARK.xHeight;
  return (
    <g
      className="signin-give-mark"
      style={{ opacity: "var(--give-mark, 0)" }}
      fill="var(--world-g)"
      pointerEvents="none"
      aria-hidden="true"
    >
      <text x={GIVE_DOT.x} y={baseline} textAnchor="middle" style={{ fontSize: GIVE_MARK.size }}>
        {"\u0131"}
      </text>
      <text
        x={GIVE_DOT.x + GIVE_MARK.size * 0.16}
        y={baseline}
        style={{ fontSize: GIVE_MARK.size, letterSpacing: `${GIVE_MARK.tracking}em` }}
      >
        ver
      </text>
    </g>
  );
}

/** How long the upper copy holds alone before the lower loop's sign-up fades in. */
const FLIP_MS = 3000;

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
  const codeRef = useRef<HTMLInputElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const probe = useRef<HTMLDivElement | null>(null);
  const fit = useKeyboardFit(root, probe);
  /* THE FLIP: the lower loop stays quiet, then the sign-up fades in. */
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), FLIP_MS);
    return () => window.clearTimeout(t);
  }, []);

  /* The code field takes the email field's place — and the focus with it. */
  useEffect(() => {
    if (otp.step === "code") codeRef.current?.focus();
  }, [otp.step]);

  const line = otp.error ?? otp.notice;
  const lower = flipped || otp.step === "code";

  return (
    <div ref={root} className="signin relative h-full min-h-full w-full overflow-hidden lowercase">
      <Feed />

      {/* THE PROBE — an unscaled, invisible copy of the stage, read by the
          keyboard rule for the G's resting pose (never transformed). */}
      <div className="signin-probe" aria-hidden="true">
        <GStage>
          <div ref={probe} className="h-full w-full" />
        </GStage>
      </div>

      {/* THE STAGE — ONE wrapper, ONE uniform scale: the G, the ring, the
          toggle and both loops' copy move and scale together with the keyboard. */}
      <div
        className="signin-stage"
        data-signin-scale={fit.s.toFixed(4)}
        style={{
          transform: `translate3d(${fit.tx}px, ${fit.ty}px, 0) scale(${fit.s})`,
          transition: `transform ${fit.ease}`,
        }}
      >
        <GStage>
          {/* The lower loop's white: the feed feathers out under the G. */}
          <div className="signin-lower-fade" style={LOWER_FADE} aria-hidden="true" />
          <LivingG
            weight="middle"
            earCut
            showLabels={false}
            overlay={
              <>
                <GiveWordmark />
                <ConveyorToggle root={root} start="give" under={<SignInRing />} />
              </>
            }
          />

          {/* UPPER: the wordmark and its line, always. */}
          <div className="signin-upper" style={UPPER_BOX}>
            <h1 className="signin-mark">giver</h1>
            <p className="signin-tag">kindness as currency</p>
          </div>

          {/* LOWER: quiet, then the sign-up; after sending, the code. */}
          <div className="signin-lower" style={LOWER_BOX} data-shown={lower}>
            {otp.step === "email" ? (
              <form
                onSubmit={(e) => void otp.submitEmail(e)}
                className="signin-inner"
                inert={!lower}
              >
                <p className="signin-ask">are you a giver?</p>
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
                <div className="signin-under" aria-live="polite">
                  {line ? <p className="signin-line">{line}</p> : null}
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => void otp.submitCode(e)} className="signin-inner">
                <p className="signin-ask signin-line" aria-live="polite">
                  {line ?? "\u00a0"}
                </p>
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
                <div className="signin-under signin-under-links">
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
              </form>
            )}
          </div>
        </GStage>
      </div>
    </div>
  );
}
