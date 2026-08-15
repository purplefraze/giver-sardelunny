# Diagnosis: Living G typography drift + "blank profiles"

## ROOT CAUSE — TYPOGRAPHY

**1. What renders Living G typography**
- `src/components/living-g/loop-text.tsx` — all onboarding messages (via `IntroG`).
- `src/components/living-g/profile-loop.tsx` — profile middle/bottom loops.
- `src/components/living-g/LivingG.tsx` — action word cues only.
- Shared ratios: `src/components/living-g/type-scale.ts`. Radii: `LOOP_SAFE_RADIUS` in `g-path.ts`.

**2. Yes — font size is calculated dynamically, per message.**
`fit()` in `loop-text.tsx` runs a search loop: it starts at `radius * LOOP_IDEAL_RATIO` and steps the base size down by 0.5px until the composition fits the loop's inscribed circle, then returns the first fit. It also applies a second per-block `factor` (down to 0.6) so the widest phrase fits. Result: the size is a pure function of the copy's character count.

Measured live in the preview (402px wide viewport):
- "welcome to / giver" -> 52.79px
- "here's / 100 sparks / from giver" -> 51px
- "50 sparks / for you / to wish" -> 39px

Two different sizes in the *same* bottom loop, and the middle loop is smaller again because its safe radius (122) is smaller than the bottom's (172) while both use the same `message` role. That is the whole bug: there is no fixed token — only a fitter.

**3. Not CSS.** No `clamp()`, `vw`, container queries, or transforms are involved inside the loops. Sizes are inline `fontSize` numbers in SVG user space produced by the fitter. (`vw` sizing does exist, but only on non-loop pages: the choice screen and "yippee".)

**4. States share components** — every onboarding beat goes through `IntroG` -> `loopText`. There are no per-state classes. So the divergence is not styling; it is the per-call computation.

**5–7. Centering.** Text *is* anchored per loop, not to the page: `LivingG` passes `RING[key]` (`G_ANCHORS.smallRing/upperRing/lowerRing`) into each region's `render`, and `loopText` centres its row stack on that anchor with `textAnchor="middle"`. Two things still make it look off:
- Those anchors are the *interaction/feature* ring centres used for swell origin and hit bands, not measured optical centroids of the negative space. Any offset between ring centre and true negative-space centre shows up as copy sitting high or low, most visibly in the middle loop ("to help you get started...").
- The stack height changes with the number of rows and the dynamic size, so the same loop is optically balanced for one message and unbalanced for the next.

**8. Duplicated styling.** `loop-text.tsx` and `profile-loop.tsx` are two independent copies of the same fitter with *different* constants (max width `radius*1.78` vs `radius*1.72`, height allowance `1.84` vs `1.94`, different shrink ladders). Same role, two engines, two answers.

Also observed while inspecting: after the switch to the green G, the previous orange bottom message ("here's 100 sparks from giver") is still mounted in the DOM alongside the new green middle message, faded via a group opacity. Not a size bug, but it means two type compositions coexist during the beat.

## ROOT CAUSE — BLANK PROFILES

I drove the running app through onboarding at your exact viewport (402x645) and the profiles are **not blank in the current code**. Giulia rendered, in-loop, with no console or runtime errors:
middle loop = `29 / by day / chemistry teacher / by night / cuddle bug / on the weekends / cycling`; bottom loop = `giving / science tutoring / +1 more`; photo filling the top loop; `past wishes` label under it.

What that rules in and out:
1. Data lives in `src/data/giver.ts` (`MEMBERS`) — present and complete for Giulia, Sofia, Robin and Kai, including `bottom` block arrays.
2. All four photo assets resolve (`giulia/robin/sofia` asset JSON, `kai.jpg`, `me.jpg` on disk) — no broken import that would blank the screen.
3. Middle loop: `profileLoop()` called from `MemberExample.tsx`. Bottom loop: same function with `member.bottom`.
4. The top-loop history toggle does **not** gate them: `topPos` defaults to `0`, is only read to pick `historyLines`, and the `top` region has no `render` that could cover the others. No conditional wraps the middle/bottom renders.
5. `compose()` in `profile-loop.tsx` now keeps a `fallback` composition, so it can no longer return zero rows for non-empty blocks — this is the fix from the last change.

So the most probable explanation for what you are seeing is a **stale preview** still running the pre-fix bundle (that build's `compose()` returned an empty array when nothing satisfied the fit test, which is exactly "loops render blank"). The residual structural risk is unchanged and worth removing: the loops' content still depends on a search that *can* fail, and one blank-producing path remains — `member.bottom` being empty/undefined would render nothing silently.

## RECOMMENDED FIX

Smallest reliable change, no redesign:

1. **One fixed type token, no fitting, for primary loop copy.** Add fixed sizes to `type-scale.ts` (e.g. `LOOP_FIXED_SIZE[loop][role]`, derived once from `LOOP_SAFE_RADIUS` so bottom/middle/top stay proportionate but constant). `loopText` then *only* lays out and wraps at that fixed size — the `for (let base = ideal; ...)` search and the `factor` shrink are removed. Copy that does not fit is a copy problem, surfaced by wrapping (and a dev-only console warning), never by resizing.
2. **One centring system.** Add measured `LOOP_CENTRE` constants (optical centroids of each loop's negative space) to `g-path.ts` and centre in-loop copy on those, keeping `G_ANCHORS` for swell origin/hit bands. Both `loopText` and `profileLoop` use one shared helper so vertical centring is identical everywhere.
3. **Collapse the duplicate engines.** `profile-loop.tsx` imports the same layout helper and the same constants; it keeps only its own block/lead grammar. Profiles may still step down within `LOOP_PROFILE_FLEX`, since their content is variable — but from the same fixed base, and never below the readable floor.
4. **Blank-proof the profiles.** Keep the `fallback` guarantee and add a dev-only assertion when a member's `bottom` array is empty, so a data disconnect fails loudly instead of silently.
5. Verify in the browser at 402x645 that every onboarding message reports one identical `fontSize` per role, and that all four profiles render.

## FILES / COMPONENTS AFFECTED

- `src/components/living-g/type-scale.ts` — add fixed size tokens.
- `src/components/living-g/g-path.ts` — add `LOOP_CENTRE` (content-only constants; geometry untouched).
- `src/components/living-g/loop-text.tsx` — drop the size search, use fixed token + shared centring.
- `src/components/living-g/profile-loop.tsx` — use the shared layout/centring, keep block grammar.
- `src/components/onboarding/MemberExample.tsx` — dev-only data assertion only (no visual change).
- Possibly one or two copy lines in `src/components/Onboarding.tsx` if a phrase no longer fits at the fixed size.

Not touched: G path, viewBox, `GStage` scale, swell/haptics, hit bands, colour tokens, navigation, onboarding order.

## RISK OF REGRESSION

- **Copy overflow.** With no auto-shrink, a long line will wrap onto more lines instead of shrinking; a phrase like "here's 100 sparks from giver" may need its line breaks authored deliberately. This is the intended trade — but it means onboarding copy must be checked line by line after the change.
- **Perceived scale change.** Fixed tokens will make some messages smaller and some larger than today. The type will look consistent but not identical to any single current screen.
- **Loop-centre re-measurement.** Moving copy off `G_ANCHORS` shifts every in-loop composition slightly; if a centroid is measured wrong, copy could approach the stroke. Mitigated by keeping the existing safe-radius chord test as a guard.
- **Profiles.** Sharing one engine touches the exact code path that was blank before, so all four profiles need re-verification at your viewport after the change.
