import { useEffect, useMemo, useRef, useState } from "react";

import { FULL_SEATS, type Seat } from "@/components/living-g/EarSelector";
import { GMark } from "@/components/living-g/GMark";
import { signInFeedLines, type SignInFeedLine } from "@/data/signin-feed";
import { OTP_LENGTH, type OtpSignIn } from "@/components/onboarding/use-otp-sign-in";
import { haptics } from "@/lib/haptics";

/**
 * THE SIGN-IN / ONBOARDING SCREEN — PRESENTATION ONLY (behaviour lives in
 * useOtpSignIn). Shared by the onboarding AuthGate and the /auth route.
 * After the v6 stills (/workspace/giver-signin-mockups/signin-v6-*.png):
 *
 *   paper   pure white
 *   feed    dense rows of SAMPLE activity wrapping the whole screen, each
 *           entry in its own action's colour, muted (signin-feed.ts)
 *   G       the plain G top left in the seat colour — no toggle, no dial
 *   circle  one solid white circle holding "giver", the field (email, then
 *           the 6-digit code in the same place) and the send circle
 *   toggle  a small ring riding just inside the circle's edge at the seat's
 *           clock position. Tap it: it slides clockwise to the next seat. Drag
 *           it round the edge: it snaps to the nearest seat on release. Arrow
 *           keys step it. No text labels anywhere.
 *
 * Seat colours come from the one app-wide map (--mode-*) through ONE
 * attribute (data-signin-seat). Starts on Give.
 */

/** Clock positions in degrees (0 = 3 o'clock, clockwise), 12:00 left empty. */
const SEAT_DEG: Record<Seat, number> = {
  give: -45, // 1:30
  lend: 0, // 3:00
  giver: 45, // 4:30 — my g
  trade: 90, // 6:00
  fund: 135, // 7:30
  borrow: 180, // 9:00
  wish: 225, // 10:30
};

/** For assistive tech only — nothing is printed on screen. */
const SEAT_NAME: Record<Seat, string> = {
  give: "give",
  wish: "wish",
  trade: "trade",
  fund: "fund",
  borrow: "borrow",
  lend: "lend",
  giver: "my g",
};

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
 * THE EDGE TOGGLE. Reuses the seat-switch logic of the retired seat dots:
 * FULL_SEATS in travel (clockwise) order, step ±1 with wrap-around, commit
 * one seat. Tap = the next seat clockwise; a drag follows the finger round
 * the edge and snaps to the nearest seat on release.
 */
function EdgeToggle({ seat, onSeat }: { seat: Seat; onSeat: (s: Seat) => void }) {
  const [rot, setRot] = useState(SEAT_DEG[seat]);
  const [dragging, setDragging] = useState(false);
  const orbit = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const rotRef = useRef(rot);
  rotRef.current = rot;

  /* The seat's angle expressed nearest the current rotation (or strictly
     clockwise / anticlockwise for a step), so it always slides the short,
     honest way round the edge. */
  const nearest = (deg: number) => deg + 360 * Math.round((rotRef.current - deg) / 360);
  const go = (next: Seat, dir: 0 | 1 | -1) => {
    const base = SEAT_DEG[next];
    let to = nearest(base);
    if (dir === 1) while (to <= rotRef.current) to += 360;
    if (dir === -1) while (to >= rotRef.current) to -= 360;
    setRot(to);
    if (next !== seat) {
      haptics.light();
      onSeat(next);
    }
  };
  const step = (by: 1 | -1) => {
    const i = FULL_SEATS.indexOf(seat as (typeof FULL_SEATS)[number]);
    const next = FULL_SEATS[(i + by + FULL_SEATS.length) % FULL_SEATS.length]!;
    go(next, by);
  };

  const angleAt = (e: React.PointerEvent) => {
    const r = orbit.current?.getBoundingClientRect();
    if (!r) return null;
    const deg = (Math.atan2(e.clientY - r.top, e.clientX - r.left) * 180) / Math.PI;
    return nearest(deg);
  };

  return (
    <div
      ref={orbit}
      className="signin-orbit"
      data-dragging={dragging}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <button
        type="button"
        className="signin-toggle"
        role="slider"
        aria-label="seat"
        aria-valuemin={1}
        aria-valuemax={FULL_SEATS.length}
        aria-valuenow={FULL_SEATS.indexOf(seat as (typeof FULL_SEATS)[number]) + 1}
        aria-valuetext={SEAT_NAME[seat]}
        onPointerDown={(e) => {
          if (gesture.current) return;
          gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) {
            g.moved = true;
            setDragging(true);
          }
          if (!g.moved) return;
          const a = angleAt(e);
          if (a !== null) setRot(a);
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          gesture.current = null;
          setDragging(false);
          if (!g.moved) {
            step(1);
            return;
          }
          /* SNAP to the nearest seat by angle. */
          const here = rotRef.current;
          let best: Seat = seat;
          let bestD = Infinity;
          for (const s of FULL_SEATS) {
            const d = Math.abs(nearest(SEAT_DEG[s]) - here);
            if (d < bestD) {
              bestD = d;
              best = s;
            }
          }
          go(best, 0);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDragging(false);
          go(seat, 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        {/* +x points outward along the radius; the stem points in. */}
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="#fff" />
          <rect x="4" y="21" width="22" height="6" rx="3" fill="var(--seat)" />
          <circle cx="24" cy="24" r="14" fill="#fff" stroke="var(--seat)" strokeWidth="5.5" />
        </svg>
      </button>
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

      <div className="signin-g">
        <GMark colour="var(--seat)" height={46} earless />
      </div>

      <div className="signin-circle">
        <EdgeToggle seat={seat} onSeat={setSeat} />
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
            <div className="signin-under" aria-live="polite">
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
            <div className="signin-under">
              <p className="signin-line" aria-live="polite">
                {line ?? "\u00a0"}
              </p>
              <div className="flex items-center gap-3">
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
