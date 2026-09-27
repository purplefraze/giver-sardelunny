import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LivingG } from "@/components/living-g/LivingG";
import { LIVING_G_FRAME, LOOP_CENTRE, LOOP_RIM_RADIUS } from "@/components/living-g/g-path";
import { EarSelector, seatCentre, type Seat } from "@/components/living-g/EarSelector";

/**
 * THE OPENING — played once the person is SIGNED IN (see Onboarding.tsx),
 * never as a pre-auth splash. Only two pieces of copy: "giver" and
 * "kindness as currency". No buttons, no CTA.
 *
 * BEATS (ms, local to the opening; nothing in the live toggle reads them):
 *   1 wordmark   "giver" — its g IS the Living G (LivingG + g-path.ts, ear cut,
 *                the real EarSelector toggle at Give). The i has NO dot.
 *   2 toggle     the toggle travels DOWN the wire one seat (give 1:30 -> lend
 *                3:00) and back UP, driven by the EarSelector's own rest spring
 *                (only its `mode` prop changes — geometry and physics untouched)
 *   3 spark      as it arrives home, a spark leaves the toggle, travels to the
 *                i, and blooms (the existing i-dot bloom) into its dot
 *   4 tagline    only then does "kindness as currency" fade in
 *   5 read       held fully visible and still, then a slow fade out
 *   6 wheel      the caller swaps in the Living G; `veil` lays this wordmark
 *                (still, dot settled, tagline gone) over it and fades it off
 */
export const OPENING_MS = {
  /** 1 — the wordmark alone, dotless i. */
  still: 900,
  /** 2a — toggle travels down one seat and settles (spring settles ~420ms). */
  toggleDown: 650,
  /** 2b — toggle travels back up to Give. */
  toggleUp: 450,
  /** 3a — the spark travels from the toggle to the i. */
  sparkTravel: 700,
  /** 3b — the existing i-dot bloom. */
  bloom: 1500,
  /** 4 — "kindness as currency" fades in. */
  tagIn: 900,
  /** 5a — fully visible and still. */
  tagHold: 2600,
  /** 5b — slow fade out (never snappy). */
  tagOut: 1100,
  /** 6 — the still wordmark fades off the live wheel. */
  crossfade: 900,
} as const;

/** Legacy names, kept so nothing importing them breaks. */
export const LAUNCH_SPARK_MS = OPENING_MS.bloom;
export const LAUNCH_CROSSFADE_MS = OPENING_MS.crossfade;

type Phase = "still" | "down" | "up" | "spark" | "bloom" | "tagIn" | "tagHold" | "tagOut" | "done";

const ORDER: Phase[] = ["still", "down", "up", "spark", "bloom", "tagIn", "tagHold", "tagOut", "done"];
const LENGTH: Record<Exclude<Phase, "done">, number> = {
  still: OPENING_MS.still,
  down: OPENING_MS.toggleDown,
  up: OPENING_MS.toggleUp,
  spark: OPENING_MS.sparkTravel,
  bloom: OPENING_MS.bloom,
  tagIn: OPENING_MS.tagIn,
  tagHold: OPENING_MS.tagHold,
  tagOut: OPENING_MS.tagOut,
};
const at = (p: Phase, q: Phase) => ORDER.indexOf(p) >= ORDER.indexOf(q);

/*
  THE LIVING G, SET AS THE g. Sized in em so it follows the wordmark's own
  font size: the middle loop's outer rim spans the x-height (≈0.56em), its
  bottom sits on the baseline, the ear/toggle rises above like a g's ear and
  the large bottom loop is the descender. Pure placement — the artwork and the
  toggle are the real components, unscaled internally.
*/
const U = 0.56 / (LOOP_RIM_RADIUS.middle * 2); // em per viewBox unit
const LOOP_TOP = LOOP_CENTRE.middle.y - LOOP_RIM_RADIUS.middle;
const LOOP_BOTTOM = LOOP_CENTRE.middle.y + LOOP_RIM_RADIUS.middle;
const ART_WIDTH = 576;

function LivingLetter({ seat }: { seat: Seat }) {
  return (
    <span
      aria-hidden
      className="relative inline-block"
      style={{
        width: `${ART_WIDTH * U}em`,
        height: `${(LOOP_BOTTOM - LOOP_TOP) * U}em`,
        marginRight: "0.28em",
        pointerEvents: "none",
        /* The wordmark's ink: the creature is the letter, not a logo beside it.
           (Green instead? set --world-g: var(--mode-give).) */
        ["--world-g" as string]: "var(--giver-ink)",
        ["--world-bg" as string]: "var(--giver-paper)",
      }}
    >
      <span
        data-launch-g
        className="absolute block"
        style={{
          left: `${LIVING_G_FRAME.x * U}em`,
          top: `${(LIVING_G_FRAME.y - LOOP_TOP) * U}em`,
          width: `${LIVING_G_FRAME.width * U}em`,
          height: `${LIVING_G_FRAME.height * U}em`,
        }}
      >
        <LivingG
          showLabels={false}
          earCut
          overlay={<EarSelector mode={seat} onChange={() => {}} seats={[]} locked hideWord />}
        />
      </span>
    </span>
  );
}

export function LaunchScreen({ onDone, veil = false }: { onDone: () => void; veil?: boolean }) {
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [phase, setPhase] = useState<Phase>(veil ? "done" : "still");
  /** Veil only: flips on the next frame so the opacity transition runs. */
  const [leaving, setLeaving] = useState(false);

  const root = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<HTMLSpanElement | null>(null);
  const dotAnchor = useRef<HTMLSpanElement | null>(null);
  /** The travelling spark: from the toggle to the i, in root pixels. */
  const [spark, setSpark] = useState<{ x0: number; y0: number; x1: number; y1: number; go: boolean } | null>(null);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current();
  };

  /* THE TIMELINE: one timeout per beat, each scheduling the next. */
  useEffect(() => {
    if (veil) {
      const raf = window.requestAnimationFrame(() => setLeaving(true));
      const t = window.setTimeout(finish, OPENING_MS.crossfade + 60);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }
    if (phase === "done") {
      finish();
      return;
    }
    const next = ORDER[ORDER.indexOf(phase) + 1]!;
    const t = window.setTimeout(() => setPhase(next), LENGTH[phase]);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, veil]);

  /* BEAT 3: measure where the toggle sits (Give) and where the i's dot goes. */
  useLayoutEffect(() => {
    if (phase !== "spark") return;
    const box = root.current?.getBoundingClientRect();
    const svg = gRef.current?.querySelector("[data-launch-g] svg");
    const dot = dotAnchor.current?.getBoundingClientRect();
    if (!box || !svg || !dot) return;
    const r = svg.getBoundingClientRect();
    const k = r.width / LIVING_G_FRAME.width;
    const bead = seatCentre("give");
    setSpark({
      x0: r.left - box.left + (bead.x - LIVING_G_FRAME.x) * k,
      y0: r.top - box.top + (bead.y - LIVING_G_FRAME.y) * k,
      x1: dot.left - box.left + dot.width / 2,
      y1: dot.top - box.top + dot.height / 2,
      go: false,
    });
    const raf = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSpark((s) => (s ? { ...s, go: true } : s))),
    );
    return () => window.cancelAnimationFrame(raf);
  }, [phase]);

  const toggleSeat: Seat = phase === "down" ? "lend" : "give";
  const dotOn = veil || at(phase, "bloom");
  const tagOpacity = veil ? 0 : phase === "tagIn" || phase === "tagHold" ? 0.55 : 0;
  const tagMs = phase === "tagOut" ? OPENING_MS.tagOut : OPENING_MS.tagIn;

  return (
    <div
      ref={root}
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
              transition: `opacity ${OPENING_MS.crossfade}ms cubic-bezier(0.32,0,0.24,1)`,
            }
          : {}),
      }}
      aria-label="giver"
      aria-hidden={veil || undefined}
      data-launch-still={veil ? "" : undefined}
      data-opening-phase={phase}
    >
      <style>{`
        /* The dot blooms (soft glow swells), then the glow fades and the dot
           settles as the still tittle of the i. Plays once. */
        @keyframes giver-i-bloom {
          0%   { opacity: 0.9; transform: translate(-50%, -50%) scale(0.6);
                 box-shadow: 0 0 0 0 color-mix(in oklab, var(--giver-green) 0%, transparent); }
          35%  { opacity: 1; transform: translate(-50%, -50%) scale(1.18);
                 box-shadow: 0 0 14px 4px color-mix(in oklab, var(--giver-green) 55%, transparent); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1);
                 box-shadow: 0 0 6px 1px color-mix(in oklab, var(--giver-green) 25%, transparent); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1);
                 box-shadow: 0 0 0 0 color-mix(in oklab, var(--giver-green) 0%, transparent); }
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
          margin-top: 1.15rem;
          margin-right: -0.18em;
        }
        .giver-i-dot {
          position: absolute;
          left: 50%;
          top: 12%;
          width: 0.2em;
          height: 0.2em;
          border-radius: 999px;
          background: var(--giver-green);
          animation: giver-i-bloom ${OPENING_MS.bloom}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        /* The spark the toggle leaves behind, on its way to the i. */
        .giver-spark {
          position: absolute;
          width: 0.2em;
          height: 0.2em;
          margin: -0.1em 0 0 -0.1em;
          border-radius: 999px;
          background: var(--giver-green);
          box-shadow: 0 0 10px 3px color-mix(in oklab, var(--giver-green) 45%, transparent);
          pointer-events: none;
        }
        /* Veil: the settled state only — no animation replays. */
        [data-launch-still] .giver-i-dot { animation: none; opacity: 1; transform: translate(-50%, -50%); }
        @media (prefers-reduced-motion: reduce) {
          .giver-i-dot { animation: none; opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>

      {/* The toggle's spark, travelling to the i (beat 3 only). */}
      {spark && phase === "spark" ? (
        <span
          aria-hidden
          className="giver-spark"
          style={{
            position: "absolute",
            fontSize: "clamp(2.4rem, 11vw, 3.6rem)",
            left: 0,
            top: 0,
            transform: `translate(${spark.go ? spark.x1 : spark.x0}px, ${spark.go ? spark.y1 : spark.y0}px)`,
            transition: `transform ${OPENING_MS.sparkTravel - 60}ms cubic-bezier(0.45, 0, 0.2, 1)`,
          }}
        />
      ) : null}

      {/* 'giver' sits slightly above centre; the tagline is quieter beneath. */}
      <div className="flex flex-col items-center" style={{ transform: "translateY(-6%)" }}>
        {/* Room for the Living G's descender (its bottom loop falls ≈0.91em
            below the baseline), so the tagline never touches it. */}
        <h1 className="giver-launch-mark relative" style={{ paddingBottom: "0.72em" }}>
          <span ref={gRef}>
            <LivingLetter seat={toggleSeat} />
          </span>
          <span className="relative inline-block" style={{ width: "0.55em", textAlign: "center" }}>
            {/* Dotless stem; the spark becomes the tittle. */}
            <span aria-hidden style={{ position: "relative", display: "inline-block" }}>
              ı
              <span
                ref={dotAnchor}
                aria-hidden
                style={{ position: "absolute", left: "50%", top: "12%", width: 0, height: 0 }}
              />
              {dotOn ? <span className="giver-i-dot" /> : null}
            </span>
          </span>
          ver
        </h1>
        <p
          className="giver-launch-tag"
          style={{
            opacity: tagOpacity,
            transition: `opacity ${tagMs}ms cubic-bezier(0.32, 0, 0.24, 1)`,
          }}
        >
          kindness as currency
        </p>
      </div>
    </div>
  );
}
