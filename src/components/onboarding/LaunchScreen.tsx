import { useEffect, useRef, useState } from "react";

/** One-shot spark on the "i": bloom, fade, faint trail — all inside this. */
export const LAUNCH_SPARK_MS = 1500;
/** The still beat after the spark, before the G is revealed. */
export const LAUNCH_PAUSE_MS = 600;
/** The crossfade from the wordmark into the existing Living G. */
export const LAUNCH_CROSSFADE_MS = 700;

/**
 * COLD OPEN. Paper, wordmark, one restrained spark on the "i" — then the app
 * continues. No buttons, no "get started", no CTA of any kind.
 *
 * Two uses of the same composition:
 * - default: plays the spark once (~1.5s), holds a short pause, then calls
 *   `onDone` (~2.1s).
 * - `veil`: the SAME wordmark, already still (spark settled, no animation),
 *   laid over the freshly-mounted Living G and faded out — the crossfade.
 *   Calls `onDone` once it has fully faded.
 *
 * All timings here are local to the launch. Nothing in the toggle reads them.
 */
export function LaunchScreen({ onDone, veil = false }: { onDone: () => void; veil?: boolean }) {
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  /** Veil only: flips to true on the next frame so the opacity transition runs. */
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDoneRef.current();
    };
    if (!veil) {
      const t = window.setTimeout(finish, LAUNCH_SPARK_MS + LAUNCH_PAUSE_MS);
      return () => window.clearTimeout(t);
    }
    const raf = window.requestAnimationFrame(() => setLeaving(true));
    const t = window.setTimeout(finish, LAUNCH_CROSSFADE_MS + 60);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [veil]);

  return (
    <div
      className={
        veil
          ? "pointer-events-none absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
          : "relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
      }
      style={{
        background: "var(--giver-paper)",
        color: "var(--giver-ink)",
        fontFamily: "var(--giver-font)",
        ...(veil
          ? {
              opacity: leaving ? 0 : 1,
              transition: `opacity ${LAUNCH_CROSSFADE_MS}ms cubic-bezier(0.32,0,0.24,1)`,
            }
          : {}),
      }}
      aria-label="giver"
      aria-hidden={veil || undefined}
      data-launch-still={veil ? "" : undefined}
    >
      <style>{`
        /* The dot blooms (soft glow swells), then the glow fades and the dot
           settles as the still tittle of the i. Plays once. */
        @keyframes giver-i-bloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.35);
                 box-shadow: 0 0 0 0 color-mix(in oklab, var(--giver-green) 0%, transparent); }
          35%  { opacity: 1; transform: translate(-50%, -50%) scale(1.18);
                 box-shadow: 0 0 14px 4px color-mix(in oklab, var(--giver-green) 55%, transparent); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1);
                 box-shadow: 0 0 6px 1px color-mix(in oklab, var(--giver-green) 25%, transparent); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1);
                 box-shadow: 0 0 0 0 color-mix(in oklab, var(--giver-green) 0%, transparent); }
        }
        /* Faint sparkle trail: drifts up and off, dissolving to nothing. */
        @keyframes giver-i-trail {
          0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.7); }
          25%  { opacity: 0.4; }
          100% { opacity: 0; transform: translate(var(--dx), -190%) scale(0.15); }
        }
        .giver-launch-mark {
          font-family: var(--giver-font);
          font-weight: 500;
          font-size: clamp(2.4rem, 11vw, 3.6rem);
          letter-spacing: 0.28em;
          text-transform: lowercase;
          line-height: 1;
          margin-right: -0.28em;
        }
        .giver-launch-tag {
          font-family: var(--giver-font);
          font-weight: 300;
          font-size: clamp(0.72rem, 3.2vw, 0.9rem);
          letter-spacing: 0.18em;
          text-transform: lowercase;
          opacity: 0.55;
          margin-top: 1.15rem;
          margin-right: -0.18em;
          /* 'giver' first, then the quieter line settles in beneath it. */
          animation: giver-tag-in 600ms cubic-bezier(0.32, 0, 0.24, 1) 400ms both;
        }
        @keyframes giver-tag-in {
          from { opacity: 0; }
          to   { opacity: 0.55; }
        }
        .giver-i-dot {
          position: absolute;
          left: 50%;
          top: 12%;
          width: 0.2em;
          height: 0.2em;
          border-radius: 999px;
          background: var(--giver-green);
          animation: giver-i-bloom ${LAUNCH_SPARK_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .giver-i-trail {
          position: absolute;
          left: 50%;
          top: 12%;
          width: 0.08em;
          height: 0.08em;
          border-radius: 999px;
          background: color-mix(in oklab, var(--giver-green) 70%, white);
          pointer-events: none;
          opacity: 0;
          animation: giver-i-trail 1150ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        /* Veil: the settled state only — no animation replays. */
        [data-launch-still] .giver-i-dot { animation: none; opacity: 1; transform: translate(-50%, -50%); }
        [data-launch-still] .giver-i-trail { display: none; }
        [data-launch-still] .giver-launch-tag { animation: none; }
        @media (prefers-reduced-motion: reduce) {
          .giver-i-dot { animation: none; opacity: 1; transform: translate(-50%, -50%); }
          .giver-i-trail { display: none; }
          .giver-launch-tag { animation: none; }
        }
      `}</style>

      {/* 'giver' sits slightly above centre; the tagline is quieter beneath. */}
      <div className="flex flex-col items-center" style={{ transform: "translateY(-6%)" }}>
        <h1 className="giver-launch-mark relative">
          g
          <span className="relative inline-block" style={{ width: "0.55em", textAlign: "center" }}>
            {/* Dotless stem; the spark is the tittle. */}
            <span aria-hidden style={{ position: "relative", display: "inline-block" }}>
              ı
              <span className="giver-i-dot" />
              {/* Three faint motes, staggered; all gone by ~1.5s. */}
              <span
                className="giver-i-trail"
                style={{ ["--dx" as string]: "-10%", animationDelay: "150ms" }}
              />
              <span
                className="giver-i-trail"
                style={{ ["--dx" as string]: "40%", animationDelay: "250ms" }}
              />
              <span
                className="giver-i-trail"
                style={{ ["--dx" as string]: "-60%", animationDelay: "350ms" }}
              />
            </span>
          </span>
          ver
        </h1>
        <p className="giver-launch-tag">kindness as currency</p>
      </div>
    </div>
  );
}
