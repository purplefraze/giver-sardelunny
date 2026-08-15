# Mode toggler — technical diagnosis (no code changed)

## ROOT CAUSE

The selector is not a bead on the middle loop's rim. It is **the entire canonical Living G drawn a second time and rotated about the middle loop's centre**, with a circular window (radius 150) around the ear's home position acting as a peephole.

Two consequences follow, and they explain everything you see:

1. The window is centred at the ear's home `(502, 76)`, which is **319.7 units** from the middle-loop centre `(272, 298)`. The measured rim of the middle loop is **196.5 units**. So the piece orbits on a rail that is ~123 units *outside* the loop's edge — it is flying through empty space, not riding the circumference. It only looks attached at `give`, because that is the ear's original position in the artwork, where the real spine still visually bridges the gap.
2. Rotating the whole artwork means the visible "arm" is whatever canonical stroke happens to fall inside the window at that angle — at home that is the ear plus a stub of the spine. Rotated 82°, 88° or 170°, that stub is carried into places where nothing else meets it, so it reads as an appendage pointing into nowhere.

## CURRENT IMPLEMENTATION

- Selector: `src/components/living-g/EarSelector.tsx`, rendered as the `overlay` prop passed from `src/routes/index.tsx` into `World` → `LivingG`, so it lives inside the same SVG and viewBox (`0 0 576 1133`).
- Canonical G: `src/components/living-g/LivingG.tsx`, which draws `LIVING_G_PATH` once, then three more masked copies (one per loop) for the independent swell.
- Circle and arm are **not** separate elements — there is no circle element and no arm element at all. Both are one masked copy of `LIVING_G_PATH`, so they are rigid by accident of being the same path, not by design.
- The arm is part of the canonical path. Nothing is redrawn per mode; there is one path, one assembly, no duplicated geometry per mode.

## CURRENT GEOMETRY

Positions are angles, not x/y: `SEAT_ANGLE` = `give` −44°, `wish` −126°, `trade` +44°, `borrow` +126°, all measured from `LOOP_CENTRE.middle`. The transform applied is `rotate(angle − homeAngle, 272, 298)`, i.e. a true rotation about the middle-loop centre in SVG/viewBox space (not viewport space).

So the mechanism *is* already one angle, one centre, one rotation. What is wrong is the **radius**: it is implicitly `|home − centre| = 319.7`, inherited from where the ear happens to sit in the artwork, rather than the rim `196.5`. Resulting ear centres: wish `(84, 40)`, give `(502, 76)`, trade `(502, 520)`, borrow `(84, 557)`. With a 150-unit window around those, wish and borrow reach past the left edge of the framed G, which is why parts leave the screen.

## WHY THE ARM BREAKS

The arm is never authored. It is a byproduct of the window: whatever ink of the full G falls inside a 150-radius disc, minus everything inside the rim circle. Its length, taper and where it terminates are therefore fixed relative to the *rotating* copy, while the thing it is supposed to join — the loop's rim — is a smooth static curve. Because the orbit radius is wrong, the arm's inner cut edge never actually lands on the loop's stroke, and because the loop is an organic egg shape rather than a true circle of radius 196.5, the gap between arm and loop opens and closes as the angle changes.

## WHY THE G CHANGES SHAPE

The canonical path is never edited — but the selector paints a **solid disc of `--world-bg`, radius 150, at the ear's home**, masked only by the rim circle. That disc erases far more than the ear: it also wipes the spine stub and the top of the middle loop that live inside it, in every mode. That is the notch/bite you read as "the G changed shape". Additionally `LivingG` stacks three swell copies of the path underneath, and at 1.022 scale their edges can peek out beyond the erase disc.

Clipping/masking is therefore implicated twice: the erase disc (too big, wrong shape) and the window (defines a fake arm).

## CORRECT TECHNICAL MODEL

- ONE centre: `LOOP_CENTRE.middle`.
- ONE radius: derived so the selector's circular end sits tangent just outside the real stroke edge — `RIM_R + gap + earRadius`, with `RIM_R` re-measured per angle if the loop is not a perfect circle (or a single conservative radius plus a fixed gap).
- ONE assembly, authored explicitly, not harvested from the canonical path: a `<circle>` for the end plus a tapered arm drawn from the rim point outward to the circle, both defined in local coordinates and placed with a single `rotate(θ, cx, cy)`. Because the arm is authored to start exactly on the rim, it can never detach and its relationship to the circle is constant by construction.
- ONE state value: θ. Position, arm angle, active mode, hints, snap and haptics all read from it.
- The base G stays byte-identical in all four modes: the ear is removed once by a **static** mask sized tightly to the ear and its stub (or a pre-authored ear-less path), never by a background disc large enough to bite neighbouring strokes.

## FILES / COMPONENTS INVOLVED

- `src/components/living-g/EarSelector.tsx` — replace the rotated-path-through-a-window approach with the authored assembly.
- `src/components/living-g/g-path.ts` — additive read-only constants only: attachment radius, ear radius, arm width, and a tight ear-cut disc.
- `src/components/living-g/LivingG.tsx` — only if the static ear cut must be applied to the base path and its three swell copies (so the cut cannot be undone by a swell).
- Nothing else. No changes to onboarding, typography, colours, profiles, content, navigation or G scale.

## SMALLEST SAFE FIX

1. Stop deriving the orbit radius from the ear's home. Set the attachment radius from the measured rim plus the selector's own radius, so the piece rides the circumference.
2. Author the selector as circle + arm in its own local space, arm root pinned on the rim, then place it with one rotation about the middle-loop centre.
3. Replace the 150-unit background erase disc with a tight static cut around the ear only, applied to the base G once so it never varies by mode.
4. Keep the existing single-angle state, clamping, snap, magnet, haptics and tap-vs-drag logic exactly as they are — that layer is correct.

This keeps the base G static, keeps the assembly permanently on one circular track, makes circle and arm rigid by construction, and derives all four seats from that one track.
