import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import {
  EMAIL_HAS_CODE,
  OTP_LENGTH,
  type OtpSignIn,
} from "@/components/onboarding/use-otp-sign-in";
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
 *           ONE continuous conveyor through all eight seats in clock order
 *           (ConveyorToggle.tsx): idle drift, drag either way the short way
 *           round, always on the middle loop (6:00 is the bottom of that
 *           ring), docking at 12:00 (my g); never filled with the seat
 *           colour, its hole opaque paper so the feed never shows through;
 *           the nearest seat's title sits upright inside the ring
 *   COLOUR  the whole G (every loop, the upper ring and the toggle) is ONE
 *           solid seat colour; the bottom loop is red only at 6:00 (map)
 *   GIVE    at give (1:30) the big G is the g of the wordmark: "ıver" is set
 *           beside it with the toggle as the i's dot, and the in-loop "giver"
 *           gives way to it (both follow the toggle's angle — no jump)
 *
 * KEYBOARD: the whole stage scales as ONE (use-keyboard-fit.ts).
 *
 * COLOUR + EMPHASIS follow the toggle's angle every frame, as CSS custom
 * properties on this root (signin-emphasis.ts): --seat is the nearest seat's
 * --mode-* colour, switched in one step (never mixed or blended),
 * --emph-<action> the feed alpha per action, --give-mark the give wordmark's
 * presence. The only seat name is the title inside the toggle's ring (the
 * nearest seat, ConveyorToggle.tsx); no other labels or hints. Starts on Give.
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

/**
 * THE EMAIL FIELD — THE WHOLE ADDRESS, ALWAYS (Frazer, 28 Sep 2026). The
 * address is never clipped, never scrolled, its start never hidden:
 *
 *   WIDTH    the underline spans as much of the bottom loop's white as the
 *            circle allows at the field's height (.signin-email, 84cqw).
 *   SHRINK   a longer address is set smaller until it fits on one line, down
 *            to a legible EMAIL_MIN_PX (13px as seen on screen — with the
 *            keyboard up the whole stage is scaled by `scale`, so the floor is
 *            13 / scale in the stage's own px).
 *   WRAP     only an address that still will not fit at the floor wraps onto
 *            a second line (a one-row textarea that grows): right after the
 *            "@" when both halves fit, otherwise at the last letter that
 *            fits. The send circle and the quiet lines move down with it
 *            (--field-extra) and the stack stays centred in the loop.
 *   NO ZOOM  the control's own font-size stays EMAIL_PX (17px, over iOS's
 *            16px focus-zoom threshold); the shrink is a transform on it, so
 *            iOS never zooms in on focus.
 *
 * Same face, weight, tracking, colour and underline as before.
 */
const EMAIL_PX = 17;
const EMAIL_MIN_PX = 13;
/** One line at EMAIL_PX (line-height 20 + the 4px padding above the underline). */
const EMAIL_ROW = 24;
/** The address the browser's own type="email" would accept (WHATWG). */
const EMAIL_OK =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const EMAIL_PLACEHOLDER = "email";

function EmailField({
  value,
  onChange,
  scale,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The stage's keyboard scale (useKeyboardFit), 1 with no keyboard. */
  scale: number;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const ruler = useRef<HTMLSpanElement | null>(null);
  /** f: the shrink (transform); w: the control's width in its own 17px space; h: its height. */
  const [set, setSet] = useState({ f: 1, w: 0, h: EMAIL_ROW });

  useLayoutEffect(() => {
    const b = box.current;
    const r = ruler.current;
    const a = area.current;
    if (!b || !r || !a) return;
    const measure = () => {
      const W = b.offsetWidth;
      if (W <= 0) return;
      /* Screen px per layout px (the keyboard scale and any other transform). */
      const k = b.getBoundingClientRect().width / W || 1;
      const px = (t: string) => {
        r.textContent = t;
        return r.getBoundingClientRect().width / k;
      };
      const text = a.value || EMAIL_PLACEHOLDER;
      const lo = EMAIL_MIN_PX / Math.min(1, Math.max(0.1, scale)) / EMAIL_PX;
      const hi = Math.max(1, lo);
      const t = px(text);
      /* 2px of air so a rounding error can never push the last letter over. */
      const fit = (W - 2) / t;
      let f: number;
      let w: number;
      if (fit >= lo) {
        f = Math.min(hi, fit);
        w = W / f;
      } else {
        f = lo;
        w = W / f;
        const at = text.lastIndexOf("@");
        if (at > 0) {
          const head = px(text.slice(0, at + 1));
          const tail = px(text.slice(at + 1));
          /* Break right after the "@": the control is exactly as wide as
             "name@", so the domain starts the second line. */
          if (head + 2 <= w && tail <= head) w = head + 2;
        }
      }
      a.style.width = `${w}px`;
      a.style.height = "0px";
      const h = Math.max(EMAIL_ROW, a.scrollHeight);
      a.style.height = `${h}px`;
      const extra = Math.max(0, h * f - EMAIL_ROW);
      b.parentElement?.style.setProperty("--field-extra", `${extra.toFixed(2)}px`);
      setSet((s) =>
        Math.abs(s.f - f) < 1e-4 && Math.abs(s.w - w) < 0.01 && s.h === h ? s : { f, w, h },
      );
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(b);
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [value, scale]);

  /* type="email"'s check, kept on the textarea. */
  useEffect(() => {
    const v = value.trim();
    area.current?.setCustomValidity(!v || EMAIL_OK.test(v) ? "" : "enter an email address");
  }, [value]);

  return (
    <div ref={box} className="signin-email" style={{ height: Math.max(EMAIL_ROW, set.h * set.f) }}>
      <span ref={ruler} className="signin-email-ruler" aria-hidden="true" />
      <textarea
        ref={area}
        rows={1}
        required
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s+/g, ""))}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }}
        placeholder={EMAIL_PLACEHOLDER}
        aria-label="email"
        name="email"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="email"
        spellCheck={false}
        inputMode="email"
        enterKeyHint="send"
        className="signin-email-input"
        data-email-scale={set.f.toFixed(4)}
        style={{
          width: set.w || undefined,
          height: set.h,
          marginLeft: set.w ? -set.w / 2 : undefined,
          transform: `scale(${set.f})`,
        }}
      />
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
  const lower = flipped || otp.step !== "email";

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
                <EmailField value={otp.email} onChange={otp.setEmail} scale={fit.s} />
                <SendCircle
                  label={otp.busy ? "sending" : EMAIL_HAS_CODE ? "send code" : "send link"}
                  busy={otp.busy}
                />
                <div className="signin-under" aria-live="polite">
                  {line ? <p className="signin-line">{line}</p> : null}
                </div>
              </form>
            ) : otp.step === "sent" ? (
              /* LINK-ONLY EMAIL: no field to fill — the address it went to,
                 then send again / use a different email. The caller lands
                 on the G the moment the link signs this browser in. */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void otp.resend();
                }}
                className="signin-inner signin-inner--sent"
              >
                <p className="signin-ask signin-line" aria-live="polite">
                  {line ?? "check your email and tap log in"}
                </p>
                <p className="signin-field signin-sent-to">{otp.email.trim()}</p>
                <div className="signin-under signin-under-links">
                  <button
                    type="submit"
                    className="signin-link"
                    disabled={otp.busy || otp.cooldown > 0}
                  >
                    {otp.busy
                      ? "sending"
                      : otp.cooldown > 0
                        ? `send again in ${otp.cooldown}s`
                        : "send again"}
                  </button>
                  <button type="button" className="signin-link" onClick={otp.changeEmail}>
                    use a different email
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => void otp.submitCode(e)}
                className="signin-inner signin-inner--code"
              >
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
