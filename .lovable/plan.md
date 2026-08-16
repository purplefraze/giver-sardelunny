# Opening onboarding: root-cause fixes

Scope: the opening sequence only (orange welcome through "let's giver"). No profile, selector, workspace or messaging changes.

## What I measured in the live preview

At 402x645 the G artwork renders 292 x 576 px — 89% of the viewport height, 73% of its width. The `<svg>` is 402 wide, not the 422 the stage asks for.

## Why these problems keep coming back

1. **G shrinks.** `GStage` sizes a *frame* that is deliberately wider than the artwork (790 x 1214 vs 576 x 1133) so the selector never clips. In dominant mode the frame is meant to bleed past the viewport — but it is a flex child with default `flex-shrink: 1`, so the browser silently shrinks it to the 402 px container and `aspect-ratio` then drops the height with it. Every time the frame gets wider (each selector-clearance fix) the G gets smaller. That is the recurring regression, not a scale value someone keeps editing.

2. **Preview flash of the finished phrase.** Beat state is committed in a `useEffect`, one frame *after* the beat index advances. For that frame the rows are built from the NEW beat's full composition (`plan`) while the "how many lines are revealed" count is still the PREVIOUS beat's — a longer count — so every line of the next phrase can render at opacity 1 for a frame. Separately, `<text>` rows mount with their final opacity, and CSS transitions do not run on mount, so a newly mounted phrase pops in instead of fading.

3. **Layout shift.** Pre-layout from `plan` is already correct; the shift that remains comes from the same stale-frame mismatch (rows keyed/counted from two different sources) rather than from re-measuring.

4. **"giver?" off-centre + wrong mark position.** The text is centred with `textAnchor="middle"`, then the "?" is pushed right with a `dx` tspan *after* centring. The advance added by `dx` is not accounted for, so the whole word sits left of the loop centre and the mark drifts.

5. **"let's giver".** It is pinned bottom-left at `pl-6`, which lands inside the bottom loop's stroke, and it inherits `--world-ink` (the dark green) rather than the intended bright complementary green.

## The fixes

**A. Restore the canonical big G (root cause).** Make the frame non-shrinkable in `GStage` so a bleeding frame is allowed to bleed: `flex-shrink: 0` / `min-width` on the sized element, keeping the existing horizontal centring math. Then verify by measurement that the artwork is back at ~94% of viewport height (~606 px at 645) and still centred on x = 288. No copy-driven G sizing anywhere.

**B. Zero flash, zero shift.**
- Commit the beat composition synchronously with the index (derive the loop state during render / `useLayoutEffect`) so no frame ever mixes the old reveal count with the new phrase.
- In `loop-text`, decide a row's visibility by matching it to the revealed *line* it belongs to (source index into the same array the rows were built from), never by comparing counts across two sources.
- Mount every row at opacity 0 and raise it on the next frame, so an arriving phrase always fades and never pops.
- Layout stays computed from the complete final composition; only opacity animates.

**C. WELCOME beat.** Orange G, middle loop: "welcome" fades in, then "to" fades in beneath it while "welcome" holds at its exact coordinates (already pre-laid from the two-line plan), then both fade out together before the bottom-loop beat.

**D. "giver?" centring + question mark.** Centre the *whole* composed word including the mark's extra advance (shift x by half the added `dx`), so the word reads optically centred in the bottom loop with clean separation before the "?".

**E. "let's giver".** Move it to a bottom band that clears the G's stroke (centred under the artwork, above the safe-area inset), and give it the mode's bright complementary green token instead of `--world-ink`.

## Files

- `src/components/living-g/GStage.tsx` — frame shrink fix
- `src/components/living-g/loop-text.tsx` — reveal-by-line, mount-at-zero, "?" centring
- `src/components/Onboarding.tsx` — synchronous beat commit, welcome beat, CTA placement/colour
- `src/styles.css` — only if the CTA needs the existing complementary-green token exposed

## Note

Your message looks cut off at "4. WELCOME ... BOTTOM". This plan covers points 1-4 plus the three defects you listed up front. Paste the rest (bottom-loop beats onward) and I will extend it.
