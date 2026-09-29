/**
 * THE FIRST LAND — THE SPARK CEREMONY: THE ONE CONFIG.
 *
 * Every size, weight, place, colour and timing the ceremony uses lives here
 * and nowhere else, so any value can be swapped without touching the
 * choreography (FirstLand.tsx).
 *
 * APPROVED (Frazer via Luna, 28 Sep 2026, 8:12 PM) unless marked STAND-IN.
 * A STAND-IN is a value the brief left open; it can be replaced freely.
 *
 * Units: px are CSS pixels at the phone's width (converted to the G's own
 * units at draw time); ms are milliseconds from the start of the ceremony.
 */

/* ---- COPY (verbatim, lowercase) ---- */
export const FIRST_LAND_COPY = {
  hundred: "here’s 100 sparks",
  wish: "50 to wish",
  give: "50 to give",
  question: "are you a giver?",
  /** Followed by the living G itself, drawn from g-path, never a typed "g". */
  communi: "communi-",
} as const;

/* ---- COLOUR ---- */
export const FIRST_LAND_COLOUR = {
  /** Giver speaking. */
  ink: "#000000",
  /** The G and toggle at the start (My G blue); sparks in the middle loop. */
  blue: "#1E7BFF",
  wish: "#9D00FF",
  give: "#4BE01E",
  /** "communi-g" in the bottom loop, words and mark. */
  communi: "#E8322B",
  communiOpacity: 0.6,
} as const;

/* ---- TYPE: Helvetica Neue (box fallback via --giver-font), lowercase ---- */
export const FIRST_LAND_TYPE = {
  family: "var(--giver-font)",
  sizePx: 22,
  weight: {
    hundred: 500,
    wish: 400,
    give: 400,
    question: 500,
    communi: 400,
  },
  /** STAND-IN: line step when a line wraps inside the middle loop. */
  lineHeightEm: 1.15,
  /** Helvetica's cap height and x-height, used to set baselines optically. */
  capHeightEm: 0.72,
  xHeightEm: 0.52,
} as const;

/* ---- PLACEMENT ---- */
export const FIRST_LAND_PLACE = {
  /**
   * All ceremony copy is centred in the MIDDLE loop and wraps (fewest lines
   * first) so every line's corners stay inside a circle of this radius,
   * clear of the swirling sparks. STAND-IN, derived: swirl radius (below)
   * minus the spark's halo and a little air.
   */
  textRadiusPx: 60,
  /** "communi-g" is centred in the BOTTOM loop, on its x-height. */
  communiLoop: "bottom",
} as const;

/* ---- THE SPARK ---- */
export const FIRST_LAND_SPARK = {
  count: 100,
  /** 4px dot. */
  dotPx: 4,
  /** soft 8px halo. No trail. */
  haloPx: 8,
  /** STAND-IN: the halo's peak opacity. */
  haloOpacity: 0.3,
  /**
   * The swirl rides the middle loop's INNER edge: STAND-IN inset from that
   * edge (px) and a little radial scatter (± px) so it reads as sparks, not
   * a ring.
   */
  swirlInsetPx: 9,
  swirlScatterPx: 3.5,
  /** About one lap per 4s. */
  lapMs: 4000,
  /** STAND-IN: how the stream pours in at 12:00, then opens round the loop. */
  pourSpreadMs: 1300,
  /** STAND-IN: how wide the falling stream is inside the 12:00 hole (share of the hole). */
  fallSpreadOfInner: 0.55,
  /** STAND-IN: sparks resting in the bead sit inside this share of its hole. */
  beadSettleOfInner: 0.72,
  /** The poof: bead sparks scale up to this and fade out. */
  poofScale: 1.3,
} as const;

/* ---- TIMING (ms) ---- */
export const FIRST_LAND_TIMING = {
  /** Beat 1: blue sparks fall through the 12:00 hole in 900ms. */
  fall: { ms: 900, /** STAND-IN: spread of each spark's start. */ staggerMs: 260 },
  /** "here's 100 sparks" fades in over 300ms (STAND-IN: as the fall
      lands), holds 1.4s. */
  hundred: { fadeInMs: 300, holdMs: 1400 },
  /** Text crossfades between beats. */
  crossfadeMs: 250,
  /** Beat 2: toggle to 10:30 in 700ms, the G tinting purple over the same 700ms. */
  toWish: { ms: 700 },
  /** Beat 3: toggle back past 12:00 to 1:30 in 900ms, the G tinting green. */
  toGive: { ms: 900 },
  /**
   * Each spark's trip into the bead: 600ms, turning colour on the way.
   * STAND-IN: departures are staggered by up to staggerMs (nearest first), so
   * the stream takes 600 + staggerMs.
   */
  stream: { ms: 600, staggerMs: 160 },
  /** Sparks rest in the bead, then poof. */
  beadHoldMs: 400,
  poofMs: 300,
  /** Beat 4: "are you a giver?" fades in over 500ms and stays. */
  question: { fadeInMs: 500 },
  /** Beat 5: 500ms after beat 4 settles, "communi-g" fades in over 500ms and stays. */
  communi: { afterSettleMs: 500, fadeInMs: 500 },
} as const;

/* ---- THE MINI COMMUNI-G MARK (the "g" of "communi-g") ---- */
export const FIRST_LAND_MARK = {
  /** The G's middle loop (outer edge, stroke included) = the x-height, ≈11px. */
  middleLoopPx: 11.4,
  /** Its ink weight matches the letters' strokes. */
  strokePx: 2,
  /** 1px after the hyphen. */
  gapPx: 1,
} as const;

/** Everything the ceremony needs, in one object. */
export const FIRST_LAND = {
  copy: FIRST_LAND_COPY,
  colour: FIRST_LAND_COLOUR,
  type: FIRST_LAND_TYPE,
  place: FIRST_LAND_PLACE,
  spark: FIRST_LAND_SPARK,
  timing: FIRST_LAND_TIMING,
  mark: FIRST_LAND_MARK,
} as const;

/**
 * THE TIMELINE, derived from the timings above: when each beat starts and
 * ends. One place, so the choreography and the tests read the same numbers.
 */
export function firstLandTimeline() {
  const t = FIRST_LAND_TIMING;
  const fallEnd = t.fall.ms;
  const hundredIn = fallEnd;
  /* Beat 2 */
  const wishAt = hundredIn + t.hundred.fadeInMs + t.hundred.holdMs;
  const wishToggleEnd = wishAt + t.toWish.ms;
  const wishStream = wishToggleEnd;
  const wishStreamEnd = wishStream + t.stream.staggerMs + t.stream.ms;
  const wishPoof = wishStreamEnd + t.beadHoldMs;
  const wishPoofEnd = wishPoof + t.poofMs;
  /* Beat 3 */
  const giveAt = wishPoofEnd;
  const giveToggleEnd = giveAt + t.toGive.ms;
  const giveStream = giveToggleEnd;
  const giveStreamEnd = giveStream + t.stream.staggerMs + t.stream.ms;
  const givePoof = giveStreamEnd + t.beadHoldMs;
  const givePoofEnd = givePoof + t.poofMs;
  /* Beat 4: the question; once it settles, the ceremony is over. */
  const questionIn = givePoofEnd;
  const settle = questionIn + t.question.fadeInMs;
  /* Beat 5 */
  const communiIn = settle + t.communi.afterSettleMs;
  const end = communiIn + t.communi.fadeInMs;
  return {
    fallEnd,
    hundredIn,
    wishAt,
    wishToggleEnd,
    wishStream,
    wishStreamEnd,
    wishPoof,
    wishPoofEnd,
    giveAt,
    giveToggleEnd,
    giveStream,
    giveStreamEnd,
    givePoof,
    givePoofEnd,
    questionIn,
    settle,
    communiIn,
    end,
  };
}
