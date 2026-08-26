# Plan: finish the five-state Living G correction

## Goal
Make the current rendered app match the latest requested Giver interaction, especially in onboarding, without redesigning the Living G or changing unrelated product behavior.

## What I confirmed in the current app
- The main workspace selector source now has five seats: Giver, Give, Wish, Borrow, Trade.
- The onboarding play screen still uses the older activity-only selector and initializes at Give, which is why the live preview can still show the wrong default state and fewer than five positions.
- The 3-minute onboarding patience timer is already present (`180000ms`) and should be preserved.
- The canonical Living G artwork is still rendered as a whole path with `data-living-g-artwork="base"`.
- The touch color override exists, but needs verification from the actual onboarding and workspace toggle layers.

## Changes to make
1. **Unify onboarding with the five-seat track**
   - Change the onboarding selector state from the old four activity modes to the five-seat model.
   - Start onboarding at `giver` / 4:30 by default.
   - Pass the full five-seat list into the onboarding selector so Giver is reachable and visible there too.
   - Preserve the existing 100-spark movement and the one-sided sensitivity behavior.

2. **Keep gift completion compatible**
   - When onboarding finishes and needs to hand off an activity mode, convert `giver` safely to the intended default activity only where an activity is required.
   - Do not allow the profile/Giver seat to break the spark gifting flow.

3. **Remove stale visible multi-toggle cues**
   - Ensure inactive destination hints are not rendered as extra loops/toggles.
   - Keep exactly one visible selector ring/stem at a time.
   - Keep generous invisible hit targets, but no visible second loops.

4. **Verify seat positions and colors**
   - Confirm the active selector starts at Giver 4:30 in onboarding and workspace.
   - Confirm Give is 1:30 green, Wish is 10:30 purple, Borrow is 9:00 hot pink, and Trade is 6:00 orange overlapping the lower/larger loop.
   - Confirm no 12:00 seat exists.

5. **Verify real touch behavior**
   - On a mobile viewport with touch enabled, press and hold the active selector.
   - Confirm `data-g-touch="down"` appears and the Living G becomes purple.
   - Release and confirm `data-g-touch="up"` appears and the Living G becomes electric orange.

6. **Verify immutability**
   - Measure the canonical Living G artwork bounding box across all five states.
   - Confirm x/y/width/height are identical; only the selector bounding box changes.

## Technical details
- Primary files to update:
  - `src/components/onboarding/PlayIntro.tsx`
  - `src/components/living-g/EarSelector.tsx`
  - possibly `src/routes/index.tsx` only if handoff/default logic still restores the wrong state
- Do not edit the canonical G path or reshape the SVG.
- Do not add navigation, labels, cards, or new UI.
- Do not reduce the onboarding timeout; keep it at 3 minutes.

## Acceptance checks
- Latest preview, not an old commit preview, shows one visible toggle only.
- Clean onboarding starts at Giver 4:30.
- All five intended states are reachable.
- The G artwork bounding box is pixel-invariant across Giver, Give, Wish, Borrow, Trade.
- Holding the active toggle turns the G purple; releasing returns it to orange.
- 100-spark onboarding still works and does not auto-advance at 30 seconds.
