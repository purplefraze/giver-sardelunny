# Correct the Living G selector open arc

## What will change

- Keep the canonical Living G on one fixed, invariant stage and retain the selector as a separate SVG overlay that cannot affect artwork layout, masking, sizing, or transforms.
- Replace the current Borrow-to-Trade wire with the clarified open arc: My G at about 5 o’clock is one endpoint; the long route passes Lend, Give, 12 o’clock with no seat, Wish, Borrow, and ends at Trade at 6 o’clock over the lower loop.
- Use continuous unwrapped angles (`My G +60°`, `Lend 0°`, `Give -45°`, `Wish -135°`, `Borrow -180°`, `Trade -270°`) so the forbidden short 5-to-6 gap cannot be crossed.
- Keep all six workspace seats present and keyboard navigation ordered along physical track travel; clamp only the selector overlay when needed.

## Verification

- Capture and inspect all six selector states on phone viewports.
- Measure the canonical artwork bounding box in every state and require identical x/y/width/height.
- Confirm My G at the middle-loop lower-right opening, no 12-o’clock seat, Wish present, and Trade at 6 o’clock overlapping the lower loop.
- Exercise dragging from My G toward the forbidden gap and confirm the selector cannot jump directly to Trade, then drag the long route to Trade.
- Run type/build/runtime diagnostics and confirm every selector remains fully visible without moving the G.

## Technical details

- The track uses a non-wrapping interval from `-270°` through `+60°`; pointer angles are unwrapped relative to the live bead before clamping.
- The artwork and selector remain sibling SVG layers. Only the selector group may receive an edge-correction translate.
