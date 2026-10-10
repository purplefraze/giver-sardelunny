# Sign-in keyboard regression — 10 October 2026

## Confirmed history and cause
- `7094f9d` (27 September) introduced whole-stage visualViewport-driven scale/translation. It bypassed the stable app canvas.
- `5481d30` (28 September) replaced the native email input with a transformed, measured textarea. Minimum font compensation increased as the G shrank, forcing wrapping; `--field-extra` then recentered the form stack.
- Pre-`5481d30` source confirms a native single-line email input, but already includes keyboard scaling. No last-working physical Safari commit is proven. The recent `2cef377` shared-height change added content variables only, not these mechanisms. No nonuniform sign-in transform was found in examined source.

## Changed files
- `src/components/onboarding/SignInView.tsx`: native email input again; remove probe and whole-stage keyboard transform. Current OTP/link behavior, conveyor, seats, copy and artwork preserved.
- `src/components/onboarding/use-keyboard-fit.ts` and `src/lib/signin-canvas.ts`: stable local canvas and local GStage height limit, independent of keyboard contraction. Width changes accept new orientation; pinch zoom ignored. No keyboard translation or scroll instruction.
- `src/styles.css`: sign-in stage/email rules only; 17px, fixed 24px single-line input, native horizontal scrolling; no wrap-driven stack movement. Retain original underline/placeholder colours via tokens.
- `tests/signin-canvas.test.ts`, `AGENTS.md`, `roadmap.md` and this note.
- Canonical SVG/path/geometry, shared app-height hook, background typography and creation forms were not changed.

## Verification
- Chromium mobile/touch emulation at 320×568, 390×640, 390×844, 430×932 on both signed-out `/` and `/auth`.
- Field tap, sequential typing, four lengths through 112 characters; native input/change events equivalent to autofill, not actual iOS autofill.
- Simulated visualViewport contraction to 48%, offsetTop 45 and dismissal: exact stage/root/upper-copy/input/SVG bounding-box and path equality. No application-induced G motion. Input stays 17px/24px and one line; long values scroll horizontally (968px scrollWidth). No page errors on these signed-out checks.
- Focused 320×568 and dismissed 390×844 screenshots inspected; they simulate viewport signals, not a real keyboard overlay.
- 24 focused tests passed, 66 assertions. Existing six-mode creation checks passed no-entry-focus, identical keyboard/dismissal geometry, inward pinch, one mocked Fund-denial warning. Eight background writes blocked; four prior opaque signed-in startup errors persisted.
- No remote mutations or publication.

## Limits
Physical iPhone Safari keyboard/focus scrolling, browser chrome, actual autofill and dismissal remain unverified without hardware. A stationary lower loop may sit behind the physical keyboard on short phones; no G movement or overlay was introduced to disguise this constraint. Cloud signup/post/persistence was not exercised.