# ROOT CAUSE — G SCALE + CENTERING

`GStage.tsx` owns the scale and position. Its outer element is `absolute inset-0` with flex centering. Its inner wrapper width is:

- width-limited by `96% × (frame width / artwork width)`, or
- height-limited by `94dvh × artwork aspect × (frame width / artwork width)`.

`LivingG.tsx` then fills that wrapper and uses `LIVING_G_VIEWBOX`, currently `-76 -14 664 1160` from `g-path.ts`.

The live 402×645 measurement shows the current canonical path is approximately **606px high**, which is **94% of the viewport height**. Therefore the current implementation is not vertically scaling the canonical path below its declared 94dvh target. The visually smaller result comes from its narrow locked proportions and, more importantly, from centering the wrong box.

The inner wrapper and SVG are centered using the **expanded selector frame**, not the canonical artwork box. The frame extends from `x = -76` to `x = 588`, while the canonical artwork extends from `x = 0` to `x = 576`. The frame therefore has 76 units of left overflow but only 12 units of right overflow. Its centre is `x = 256`; the canonical G centre is `x = 288`. Flex-centering that asymmetric frame shifts the canonical G **32 SVG units to the right**. In the live viewport this is about **17px**, matching the visible rightward shift.

The selector caused that bounding-box change. `LIVING_G_FRAME` was expanded specifically to contain its outer seats. `GStage` compensates for the frame when calculating nominal artwork scale, but it still centers the frame itself. The previous scale-restoration pass restored the mathematical artwork height; it did not restore artwork-centred positioning. Safe-area padding can additionally move the available centering area on devices with asymmetric insets, but it is not the primary cause in the measured viewport. `World` and the route containers use full size with `overflow-hidden`; they do not apply another max-width or transform to the G. The route’s `max-w-[520px]` only constrains the whole mobile app on wider screens.

# ROOT CAUSE — SELECTOR DRAG BOUNDARY

The obstruction is an explicit permitted-arc clamp in `EarSelector.tsx`, compounded by the `atan2` wrap at ±180°.

The exact rule is:

- `ANGLE_MIN = SEAT_ANGLE.wish = -136°`
- `ANGLE_MAX = SEAT_ANGLE.borrow = 150°`
- every pointer angle is passed through `clampAngle(a) = min(150°, max(-136°, a))`

This permits only the numerically continuous arc from −136° through 0° to +150°. It forbids the remaining left-side arc from +150° through ±180° to −136°.

`Math.atan2` returns angles in the range −180° to +180°. As the pointer approaches the blocked side, values above +150° are pinned to +150°. When the pointer crosses the negative x-axis, `atan2` changes discontinuously from approximately +180° to −180°; the clamp then changes the selector from the +150° endpoint to the −136° endpoint. That is the observed block followed by a jump/snap. This is explicitly an **angular wraparound plus clamp problem**.

No invisible element is intercepting the drag. The moving 96-unit transparent grip calls `setPointerCapture`, has `touch-none`, and is rendered above the Living G region hit rectangles. Pointer capture keeps its move events even when the pointer leaves the grip, SVG, or clipped parent. The artwork masks and photo clipPath are visual only and use no pointer events. Parent `overflow-hidden` can clip drawing outside the screen but does not terminate the captured pointer gesture.

# ROOT CAUSE — COLOUR SOURCE

The rendered Living G reads only `var(--world-g)` in `LivingG.tsx` and `EarSelector.tsx`. `World.tsx` selects the current rule by setting `data-world={mode}`. The actual four mode mappings are therefore the `[data-world="..."]` blocks in `src/styles.css`.

Those mappings still combine multiple generations of the colour system:

- `wish` maps to `--giver-wish` = purple.
- `give` does not map to `--giver-give`; it is a special override mapping to `--giver-profile` = green.
- `trade` maps to the old `--giver-trade` = red.
- `borrow` maps to the old `--giver-borrow` = pink.

The base token section still documents and defines the older identity—Give orange, Trade red, Borrow pink—while the Give world later overrides that identity to green. Legacy colour aliases remain, and onboarding/person-role code has a separate `ROLE_COLOUR` map using discovery/community/trade/borrow tokens. Thus the current mode rendering ultimately comes from one CSS variable, but that variable is assembled from conflicting old semantic tokens and one-off world overrides rather than from one locked four-mode map. That is why old colours persist.

# ROOT CAUSE — TYPOGRAPHY SCALE

There are three separate in-G typography pipelines.

1. **Persistent mode action copy** uses `LivingG.tsx`, not `loopText.tsx`. `World` passes each `MODE_CONTENT` title as `region.label`; `LivingG` splits that title into words and sizes every line with `LOOP_SAFE_RADIUS[region] × LOOP_ACTION_RATIO`. `LOOP_ACTION_RATIO` is currently `0.38`, producing 46 SVG units in the middle loop and 65 in the bottom loop—approximately 25px and 35px in the measured mobile viewport. The larger `mine.action` and `community.action` arrays in `index.tsx` are not rendered.

2. **Onboarding copy** uses `loopText.tsx`. It starts from `LOOP_FIXED_SIZE`, but it still performs discrete auto-fitting: it rebuilds the stack through every value in `LOOP_SIZE_STEPS` until `layoutStack(...).fits` succeeds. Copy length, wrapping, row count, and glyph-width estimates can therefore step the entire composition down. It is not continuously auto-sized, but it is still copy-dependent.

3. **Profile copy** uses `profile-loop.tsx`, separate `PROFILE_TYPE` tokens, a smaller `PROFILE_SAFE_INSET`, and its own `PROFILE_STEPS` step-down loop. It is also copy-dependent and can shrink the full stack.

The G scale restoration did not leave these values in CSS pixels intended for a smaller G; the SVG typography scales with the G. The inconsistency comes from the three different pipelines and from the persistent workspace action labels using the deliberately reduced `0.38` ratio instead of the larger fixed message tokens used by onboarding. Restoring the G’s outer scale therefore cannot make those action labels proportionally larger inside their loops.

# FILES / COMPONENTS INVOLVED

- `src/components/living-g/GStage.tsx` — wrapper sizing, flex centering, safe-area padding.
- `src/components/living-g/g-path.ts` — canonical artwork box, expanded asymmetric frame, viewBox, loop measurements, selector geometry.
- `src/components/living-g/LivingG.tsx` — SVG fill, action-label sizing, region hit rectangles, masks, overlay order.
- `src/components/living-g/EarSelector.tsx` — selector frame requirements, pointer capture, angle calculation, clamp, seat snapping.
- `src/components/World.tsx` — `data-world` selection and stage/container hierarchy.
- `src/routes/index.tsx` — mode state, action titles, and currently unused action-line arrays.
- `src/styles.css` — base colour tokens, legacy aliases, and per-world `--world-g` mappings.
- `src/components/living-g/type-scale.ts` — action ratio, fixed loop tokens, profile tokens, and step-down scales.
- `src/components/living-g/loop-text.tsx` — onboarding wrapping and discrete step-down fitting.
- `src/components/living-g/loop-layout.ts` — width estimation, safe-circle fitting, and centering.
- `src/components/living-g/profile-loop.tsx` — separate profile scale and step-down fitting.
- `src/components/onboarding/IntroG.tsx` — onboarding’s use of `loopText`.
- `src/components/onboarding/MemberExample.tsx` — profile’s use of `profileLoop` and locked mode selector.
- `src/components/Onboarding.tsx` — separate person-role colour map.

# SMALLEST SAFE FIX

- **Scale and centering:** keep the current canonical path and its 94dvh/96%-width scale calculation, but position the expanded selector frame so the canonical `LIVING_G_BOX` centre—not the frame centre—lands on the viewport centre. Treat selector overflow as asymmetric external overflow rather than as the centering box. Do not change the path, loop proportions, or selector size.
- **Selector drag:** replace the raw numeric clamp with wrap-aware circular-angle handling. Unwrap pointer angles relative to the previous drag angle, then constrain only if a genuinely forbidden arc is still required. If all four mirrored seats must be continuously reachable from both directions, remove the forbidden arc entirely. Keep pointer capture, grip size, snapping, haptics, and tap-versus-drag behavior.
- **Colour source:** define one four-mode token map—give green, wish purple, trade orange, borrow blue—and have the four `data-world` rules reference only those tokens. Leave onboarding/profile/supporting-area colours separate and remove mode reliance on profile, trade-red, borrow-pink, or legacy aliases.
- **Typography:** route persistent mode action copy through one fixed action-token path rather than the smaller `LivingG` label ratio, and decide explicitly whether onboarding/profile step-down remains allowed. The minimum consistency correction is to stop using three unrelated primary-action scales; keep wrapping and optical centering, but use one role token per loop and avoid copy-length-based shrinking for primary mode actions.
