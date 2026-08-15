# Mode toggler — diagnosis and geometric correction

Scope: only `src/components/living-g/EarSelector.tsx` (plus, if measurement constants are needed, additive exports in `src/components/living-g/g-path.ts`). Nothing else changes — no colours, copy, typography, onboarding, profiles, content, or navigation.

## What the current implementation actually does

Confirmed by reading `EarSelector.tsx` and its single use in `src/routes/index.tsx`:

1. The circle and arm ARE one piece already: the canonical G path is drawn a second time and clipped to a disc (`EAR_R = 140`) around the ear's home at `(502, 76)`. So there is no separate dot and no separate arm element.
2. The piece is moved with `translate(...)` only — never rotated. At the left and lower seats the arm therefore still points up-and-right, exactly as it does at home, so the assembly reads as a floating blob that has come off the G.
3. The rail is wrong. The track centre is `{ x: 288, y: LOOP_CENTRE.middle.y }` — 288 is the viewBox centre, not the middle loop's centre (`272`) — and the track radius is simply "distance from that point to the ear's home" (~308 units). The middle loop's own outer edge is far closer in, so the bead orbits in empty space instead of riding the loop's circumference. The destination dots inherit the same wrong radius.
4. Home is erased with a flat `var(--world-bg)` disc of radius 140 at the ear's home. That disc is large enough to bite into neighbouring geometry, which is the source of the notch/scar look near the top of the G.
5. Nothing destructively edits the canonical path — good, that part stays.

## The correction

- **Measure the rail from the real geometry.** Derive the middle loop's optical centre and its outer stroke radius from the canonical path (rasterise the path once offline, as was done for `LOOP_CENTRE`), and store the result as new read-only constants next to `LOOP_CENTRE`. Track centre = middle-loop centre; track radius = the attachment radius at which the ear's circular end sits seated against the loop's outer rim.
- **One source of truth: a single angle.** Selector state becomes one angle on that track. Circle position, arm position, arm rotation, active mode, active dot/word and the haptic snap all read from it.
- **Rotate, don't translate.** The clipped assembly is transformed with `rotate(θ - θ_home)` about the track centre. Since the ear's home sits on the track, a pure rotation keeps the circular end seated on the rim at every angle and rotates the arm naturally with it — mechanically consistent by construction, and it scales with the G because it lives in viewBox space.
- **Clean cutout instead of a paint-over disc.** The base G is drawn through a mask whose only black area is a tightly measured disc around the ear at home (re-measured so it contains the circular end and its arm stub and nothing else). The loop underneath is then a perfect smooth curve the instant the selector leaves, with no scar and no duplicate geometry. The travelling assembly uses the same disc as its `clipPath`, rotated with it.
- **Four raised seats.** Angles set to roughly 10 (wish), 2 (give), 7–8 (borrow), 4–5 (trade) o'clock, balanced as a symmetric pair of pairs, with travel clamped to that span so there is no infinite orbit and no S-curve destination.
- **Rail-constrained drag.** The finger point is projected onto the track (angle only; radius ignored), so the selector can never be pulled toward the centre or off the G. A light magnetic pull near seats, snap to nearest on release, one `buzz(10)` per snap, never resting between states.
- **Dots and words unchanged in behaviour** — subtle dot per seat, dot becomes the word on arrival, word fades back to a dot on leaving, no duplicated mode label elsewhere.
- **Tap vs drag preserved:** movement threshold stays; a tap on the piece opens Profile, a drag changes mode, mode change never navigates.

## Verification

Drive the preview with Playwright: screenshot each of the four resting states plus intermediate frames of a continuous give → trade → borrow → wish → give drag, and check the circular end stays on the rim, the arm rotates with it, the loop behind is smooth, and no ghost geometry appears.
