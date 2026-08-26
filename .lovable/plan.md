# Fix stationary Living G navigation geometry

## What will change

- Remove the selector-driven camera pan so the canonical Living G stage remains centred at the exact same viewport coordinates in every state and throughout dragging.
- Keep the selector as an independent SVG interaction layer: its ring, stem, labels, hints, hit targets, and animation move while the underlying G remains fixed.
- Restore the six-seat map in visual order: Borrow (left), Wish, My G (12:00), Give (right), Lend, Trade (6:00 overlapping the lower loop).
- Extend the selector’s continuous drag track to the 6:00 Trade endpoint without changing the Living G path, stroke, frame, scale, or loop geometry.

## Verification

- On narrow and standard phone viewports, capture the Living G path bounding box for every seat and confirm its x/y/width/height remain pixel-identical.
- Confirm all six controls are present and reachable, the visible selector stays on-screen, and Trade lands at the bottom over the lower loop rather than beside the middle loop.
- Check drag and tap selection behavior, then confirm the preview build and runtime logs remain clean.

## Technical details

- `GStage` will use one invariant `translateX(-50%)`; selector state will no longer write a global stage transform variable.
- `EarSelector` will own the six angular destinations and use a continuous non-wrapping rail from Borrow through Trade, with Trade at 90° in SVG space.
- The canonical traced path and its artwork constants remain untouched.
