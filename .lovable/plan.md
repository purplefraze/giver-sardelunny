# Duplicate + Mirror-Image Living G Prototype

## Goal
Create a safe playground copy of the current Giver project and, inside that copy, experiment with a horizontally flipped / mirror-image version of the Living G while preserving all geometry, navigation logic, colors, and interactions.

## Important limitation
Lovable does not expose an agent tool that creates a full, editable project remix. A new project/remix must be started from the Lovable UI.

## Manual step: create the duplicate project
1. In the Lovable editor, click the current project name at the top left.
2. Choose **Settings** → **Remix this project**.
3. Wait for the new project to spin up, then paste/share its name here so the agent can switch context and work inside the duplicate.

## What the agent will do once the duplicate exists
- Identify every place the Living G is rendered or where its paths / selectors depend on horizontal direction:
  - `src/components/living-g/LivingG.tsx`
  - `src/components/living-g/EarSelector.tsx`
  - `src/components/living-g/g-path.ts`
  - `src/components/living-g/GStage.tsx`
  - `src/components/living-g/profile-loop.tsx`
  - `src/components/living-g/TopLoopSelector.tsx`
  - any CSS or store logic that assumes left/right seat positions
- Apply a controlled horizontal mirror (SVG `scale(-1, 1)` or path-level transform) so the artwork is flipped without redrawing it.
- Adjust selector seat angles and travel direction to match the mirrored geometry:
  - Give at 6 o’clock stays visually at 6 o’clock (flipped path)
  - Lend, My Profile, Wish, Borrow, Trade keep their relative clock positions on the mirrored G
- Keep the open S-curve gap, single selector, drag logic, color tokens, onboarding, and world behavior untouched.
- Verify the selector stays fully visible and the G is stationary, just as in the original.
- Run a build and a mobile-Playwright visual check to confirm the mirror image renders correctly at all six seats.

## If the user does not want a separate project
Alternative: the agent can take a read-only local snapshot of the current codebase using the cross-project checkout tool, prepare the mirror-image changes as a patch, and only apply them if the user approves. This is less safe than a true duplicate but avoids manual UI steps.
