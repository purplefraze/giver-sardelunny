import type { Seat } from "@/components/living-g/EarSelector";

/**
 * LOOP LABELS — THE ONE CONFIG, keyed by toggle seat.
 *
 * `middle` = the G's TOP loop (its upper/middle loop, region "middle");
 * `bottom` = the G's BOTTOM loop (the lower loop, region "bottom").
 * Always shown, one line each, rendered by <LoopLabels> (LoopLabel.tsx) with
 * one shared token set — the seat changes only these words and the colour.
 *
 * Each label names what that loop's EXISTING tap target does:
 *   give    top: the give form            bottom: communi-g gives
 *   lend    top: the lend form            bottom: communi-g lend/borrow feed
 *   trade   top: the trade form           bottom: communi-g trades
 *   fund    top: ask for funding          bottom: the pledge sheet (fund a wish)
 *   borrow  top: the borrow form          bottom: communi-g lend/borrow feed
 *   wish    top: the wish form            bottom: communi-g wishes
 *   my g    top: my g (profile)           bottom: my g (profile) — see report
 *
 * LOWERCASE LOCK: every string here is lowercase, and loopCopyFor lowercases
 * again as a guard.
 */
export type LoopCopy = { middle: string; bottom: string };

const LOOP_COPY: Record<Seat, LoopCopy> = {
  give: { middle: "give something", bottom: "what’s on offer" },
  lend: { middle: "lend something", bottom: "what’s on loan" },
  trade: { middle: "trade something", bottom: "what’s up for trade" },
  fund: { middle: "ask for funding", bottom: "fund a wish" },
  borrow: { middle: "borrow something", bottom: "what’s to borrow" },
  wish: { middle: "make a wish", bottom: "grant a wish" },
  giver: { middle: "my g", bottom: "my community" },
};

export function loopCopyFor(seat: Seat): LoopCopy {
  const copy = LOOP_COPY[seat] ?? { middle: "", bottom: "" };
  return { middle: copy.middle.toLowerCase(), bottom: copy.bottom.toLowerCase() };
}
