# Rollback analysis: Living G geometry vs. the recent colour/position work

No changes made. This is an assessment only.

## Key finding: the G geometry was never touched by the recent experiments

Checked directly against the project history:

- `src/components/living-g/g-path.ts` (the canonical G trace, viewBox, loop centres — the actual geometry) was last modified on **19 Aug**.
- `src/components/living-g/LivingG.tsx` (the artwork renderer, loop swell, invisible hit areas) was last modified on **22 Aug**.
- Everything from **23 Aug** onward (the colour-system evolution and the clock-position corrections) touched only 7 files:
  `src/styles.css`, `src/lib/exchange-colours.ts`, `src/components/living-g/EarSelector.tsx`,
  `ActivityDetail.tsx`, `CommunityFeed.tsx`, `Conversation.tsx`, `ModeSearch.tsx`.

So the G silhouette, its scale, the stage/frame maths and the hit areas are already in the state you approved. Rolling back is not required to recover the geometry — only to undo the colour and seat-position layers.

## Best rollback target

**"Fixed Living G toggle seats"** (23 Aug, commit `2b5f27a`) — the last version before the colour/position experiments began.

This is the point immediately before:
1. "Evolved v3 colour system" (seafoam/hot-pink calibration)
2. "Fixed G nav positions" (first clock-anchor pass)
3. "Finalized G spatial and colors" (community = red)
4. "Corrected relational color rules" (v5: red/yellow other person)

## What is preserved by rolling back to that point

- The Living G geometry, scale, loop swell, invisible hit areas, word cues — untouched either way.
- The persistent spatial navigation / lens-portal camera (`GDepthStack`, `GDepthLevel`, `g-depth.ts`).
- The onboarding play sequence, spark journey and spark split.
- Profiles, inline editing, prompts, item detail pattern, admin editors.
- Community feed, connections, conversation-as-continuation, ledger, haptics.
- The three-intent creation flow and category/time inference.
- All data stores and persistence.

## What is lost by rolling back to that point

- Colour system v3/v4/v5 in `src/styles.css`: the seafoam `#60C0C0` and hot-pink `#E85088` calibration, and the `--person-self` / `--person-other-asking` (red) / `--person-other-offering` (yellow) tokens.
- The relational resolver in `src/lib/exchange-colours.ts`: `exchangeState(type, side)`, the wish/borrow -> red and give/lend/trade -> yellow rule, and the `lend` vs `borrow` world split.
- The four consumer wirings that pass `type` + `side` into the resolver (ActivityDetail, CommunityFeed, Conversation, ModeSearch) — they revert to the older colour calls.
- The fixed clock anchors currently in `EarSelector.tsx` (my g 12:00, give 1:30, lend 3:00, trade 4:30, wish 10:45, borrow 9:30). The seats revert to the earlier arrangement.
- The "persistent blue G" split between `--world-g` (identity stroke) and `--world-selector` (category feedback).

## Two narrower alternatives, if the geometry is fine and only one layer feels wrong

Because the layers landed in separate files, they can be undone independently without a full rollback:

- **Undo only the seat positions**, keep colour v5: revert `src/components/living-g/EarSelector.tsx` to its `2b5f27a` state (22 lines changed).
- **Undo only the colour experiments**, keep the clock anchors: revert `src/styles.css` and `src/lib/exchange-colours.ts` plus the four consumer files to `2b5f27a`.

## Recommendation

Roll back to **"Fixed Living G toggle seats"** if you want a clean slate for colour and positions. If the geometry is your actual concern, no rollback is needed — nothing after 22 Aug touched it, and a targeted revert of `EarSelector.tsx` or the colour files is the lower-risk move.

## How to roll back

Use the built-in history rather than code edits: click the revert button on the message titled "Fixed Living G toggle seats", or pick that version in the History tab. Later messages are archived but stay reapplicable.

Tell me which target you want and I will do the targeted revert, or you can revert from history yourself.
