/**
 * THE FIRST LAND: THE ONE CONFIG.
 *
 * Every size, weight, place, colour and timing the first-land moment uses
 * lives here and nowhere else, so any value can be swapped without touching
 * the choreography (FirstLand.tsx).
 *
 * APPROVED (Frazer, 28 Sep 2026) unless marked STAND-IN. A STAND-IN is a value
 * the brief left open; it is chosen to be calm and can be replaced freely.
 *
 * Units: px are CSS pixels at the phone's width (converted to the G's own
 * units at draw time); ms are milliseconds from the start of the moment.
 */

/* ---- COPY (verbatim, lowercase) ---- */
export const FIRST_LAND_COPY = {
  drop: "here’s a hundred sparks.",
  give: "50 sparks to give",
  wish: "50 sparks to wish",
  closing: "your sparks live in my wishes.",
  question: "are you a giver?",
  /** Followed by the living G itself, drawn from g-path, never a typed "g". */
  communi: "communi-",
} as const;

/* ---- COLOUR ---- */
export const FIRST_LAND_COLOUR = {
  /** Giver speaking: every line of the moment is black. */
  ink: "#000000",
  /** The G letter stays My G blue during the moment (the blue-letter rule). */
  letter: "#1E7BFF",
  give: "#4BE01E",
  wish: "#9D00FF",
  /** STAND-IN: the sparks' colour while they fall, before they split. */
  falling: "#1E7BFF",
} as const;

/* ---- TYPE: Helvetica Neue, lowercase, two styles only ---- */
export const FIRST_LAND_TYPE = {
  family: "var(--giver-font)",
  /** "here's a hundred sparks." and the wish bank number. */
  strong: { sizePx: 22, weight: 500 },
  /** every other line of the moment, and the loop lines. */
  regular: { sizePx: 22, weight: 400 },
  /** Helvetica's cap height and x-height, used to set baselines optically. */
  capHeightEm: 0.72,
  xHeightEm: 0.52,
} as const;

/* ---- PLACEMENT ---- */
export const FIRST_LAND_PLACE = {
  /** "here's a hundred sparks." sits centred in the white space above the G. */
  dropLine: "centred-above-g",
  /**
   * "50 sparks to give" / "50 sparks to wish" sit in the negative space just
   * outside each toggle: give to the right of 1:30, wish to the left of
   * 10:30. At 390px a 22px line is wider than the paper beside a ring, so
   * each line is aligned to the screen edge on its own side (edgeMarginPx)
   * with its baseline gapAbovePx above the ring's top. STAND-IN numbers.
   */
  sideLabel: { edgeMarginPx: 16, gapAbovePx: 14 },
  /** "your sparks live in my wishes." centred in the white space below the G. */
  closingLine: "centred-below-g",
  /**
   * "are you a giver?" at 22px is wider than the middle loop's hole at 390px
   * (≈160px of type in a ≈150px hole), so it is set on two centred lines,
   * broken after this many words, at this line height. STAND-IN.
   */
  question: { breakAfterWords: 2, lineHeightEm: 1.15 },
  /** The wish bank number, centred inside the wish toggle. */
  wishCount: "centred-in-wish-toggle",
  /**
   * STAND-IN: with the number centred, the ring's own title ("wish") steps
   * down by this share of the hole's radius so the two never touch.
   */
  wishTitleDropOfInner: 0.58,
} as const;

/* ---- THE SPARK ---- */
export const FIRST_LAND_SPARK = {
  count: 100,
  /** 4px round dot. */
  dotPx: 4,
  /** soft 8px halo around it. */
  haloPx: 8,
  /** STAND-IN: the halo's peak opacity (kept low so 50 sparks read as sparks). */
  haloOpacity: 0.22,
  /** No trail. */
  trail: false,
  /**
   * They fall as a loose cluster, not a block: STAND-IN spread of the cluster
   * as it falls (px), each spark's start stagger (ms), and how far inside a
   * ring's hole the sparks settle (share of the hole's radius).
   */
  clusterSpreadPx: 46,
  staggerMs: 160,
  settleOfInner: 0.78,
  /** STAND-IN: the soft settle, a small overshoot on landing (px). */
  settleOvershootPx: 3,
  /** STAND-IN: the glow washing a toggle's negative space (peak opacity). */
  glowFillOpacity: 0.22,
} as const;

/* ---- TIMING (ms). About 10.1 seconds from the first spark to free. ---- */
export const FIRST_LAND_TIMING = {
  /** 100 sparks drop into My G at 12:00: ease-in, then a soft settle. */
  drop: { at: 0, ms: 900 },
  /** "here's a hundred sparks." holds 1.2s once they have landed. */
  dropLine: { fadeInMs: 400, holdAfterDropMs: 1200, fadeOutMs: 400 },
  /** 50 to give (1:30), 50 to wish (10:30). */
  split: { ms: 800 },
  /** Both toggles glow for 1.5s with their lines. */
  glow: { ms: 1500, fadeMs: 400 },
  /** "your sparks live in my wishes." */
  closing: { fadeInMs: 400, holdMs: 2000, fadeOutMs: 400 },
  /** "are you a giver?" fades in as the closing line fades out, then stays. */
  question: { fadeInMs: 500 },
  /** "communi-" + the G: in, hold, out. STAND-IN: starts this long after the
      question starts fading in. */
  communi: { afterQuestionMs: 500, fadeInMs: 500, holdMs: 1500, fadeOutMs: 800 },
  /** STAND-IN: the helper rings at 12:00 and 10:30 appear / leave. */
  ringsFadeMs: 300,
  /** A skip tap is swallowed for this long after it lands. */
  swallowAfterSkipMs: 350,
} as const;

/* ---- THE LIVING G IN "communi-" ---- */
export const FIRST_LAND_LOGO = {
  /** The G's height as a share of the type size: the letters' height. */
  heightEm: 0.72,
  /** Its bottom sits on the words' baseline. */
  onBaseline: true,
  /** STAND-IN: the space between "communi-" and the G, in em. */
  gapEm: 0.06,
  /**
   * The G's ink weight, matched to the letters' strokes: Helvetica Neue 400's
   * stem is about 0.08–0.085em (≈1.8px at 22px). STAND-IN, measured by eye.
   */
  stemEm: 0.08,
} as const;

/** Everything the moment needs, in one object. */
export const FIRST_LAND = {
  copy: FIRST_LAND_COPY,
  colour: FIRST_LAND_COLOUR,
  type: FIRST_LAND_TYPE,
  place: FIRST_LAND_PLACE,
  spark: FIRST_LAND_SPARK,
  timing: FIRST_LAND_TIMING,
  logo: FIRST_LAND_LOGO,
} as const;

/**
 * THE TIMELINE, derived from the timings above: when each beat starts and
 * ends. One place, so the choreography and the tests read the same numbers.
 */
export function firstLandTimeline() {
  const t = FIRST_LAND_TIMING;
  const dropEnd = t.drop.at + t.drop.ms;
  const dropLineIn = t.drop.at;
  const dropLineOut = dropEnd + t.dropLine.holdAfterDropMs;
  const splitAt = dropLineOut;
  const splitEnd = splitAt + t.split.ms;
  const glowEnd = splitEnd + t.glow.ms;
  const closingIn = glowEnd;
  const closingOut = closingIn + t.closing.fadeInMs + t.closing.holdMs;
  const closingEnd = closingOut + t.closing.fadeOutMs;
  const questionIn = closingOut;
  const communiIn = questionIn + t.communi.afterQuestionMs;
  const communiOut = communiIn + t.communi.fadeInMs + t.communi.holdMs;
  const end = communiOut + t.communi.fadeOutMs;
  return {
    dropEnd,
    dropLineIn,
    dropLineOut,
    splitAt,
    splitEnd,
    glowEnd,
    closingIn,
    closingOut,
    closingEnd,
    questionIn,
    communiIn,
    communiOut,
    end,
  };
}
