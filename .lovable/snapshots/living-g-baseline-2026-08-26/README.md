# Living G baseline snapshot — 2026-08-26

Frozen copy of the LOCKED Living G geometry, selector track and hit areas,
taken immediately before the mirror-image experiment.

Contents (verbatim copies, never imported by the app):
- `g-path.ts` — LIVING_G_PATH, LIVING_G_FRAME, anchors, hit bands (G_REGION_BANDS),
  loop centres/radii, EAR_GEOMETRY, EAR_CUT, RIM_PATCH
- `EarSelector.tsx` — six fixed seats, open-arc track, drag logic
- `GStage.tsx` — fixed stage sizing/offset
- `LivingG.tsx`, `TopLoopSelector.tsx`, `profile-loop.tsx`

## Restore
Copy any file back over its counterpart in `src/components/living-g/`.

## Rule
Before applying further geometry or hit-area edits, take a new dated snapshot
folder here first. Never edit files inside a snapshot folder.
