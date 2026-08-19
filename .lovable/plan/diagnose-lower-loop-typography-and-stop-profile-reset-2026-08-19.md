# Diagnose lower-loop typography and stop profile reset

## Confirmed root causes

### Lower-loop typography
- Bottom-loop profile content is rendered by `profileLoop()` in `src/components/living-g/profile-loop.tsx`, called by both My G and the four sample profiles.
- Its bottom primary token is `84px` against a `172`-unit safe radius, while the middle token is `96px` against a smaller `122`-unit radius. The bottom loop therefore starts proportionally much smaller.
- Bottom content is additionally restricted by a `0.78` safe inset, a bottom-only `1.5` wrap factor, and no true-width fill allowance. Its effective line width is proportionally much narrower than the middle loop.
- `layoutStack()` models the opening as a conservative circle and checks every row against a chord. `profileLoop()` then steps the entire stack down through `PROFILE_STEPS`; a long answer or tracked label can shrink every row.
- The sample-profile bottom loop uses the same profile typography pipeline as My G, but it carries six blocks (three label/answer groups), so it is especially vulnerable to global step-down. Ordinary Living G cues use a separate fixed-token pipeline.
- `GStage` applies one canonical responsive scale to the complete SVG. It scales type and G together and is not the source of the relative undersizing; there is no extra bottom-only parent transform.

### First-run and profile state
- The route gates all onboarding with `const [entered, setEntered] = useState(false)`. This resets on every mount, so refresh/reopen always starts onboarding.
- The persisted `built` profile field is written but never used for routing. There is no persisted `onboarding_completed` gate.
- The Living G tutorial flag itself is persisted correctly under `living_g_tutorial_seen`; the repeated full intro is the transient route gate. These are different states and need separate semantics.
- The current development profile legitimately falls back to an empty person, while the item store only seeds other community members. There is no current-user development fixture, so My G is blank whenever preview storage is fresh.
- Current persistence is browser-local only. The state model can be made account-ready now, but true sign-out/sign-in and cross-device persistence will require the future account backend.

## Implementation

### 1. Fit bottom-loop profile copy to the real opening
- Preserve the locked Living G path, scale, selector, hit areas, colors, and interactions.
- Add a read-only bottom interior contour derived from the canonical path geometry: vertical samples of the actual inner opening with a comfortable stroke inset. This is a content constraint only and will not redraw or alter the G.
- Update the profile fitter so each rendered row receives the width available at its actual vertical ink bounds. Place the longest primary line in the widest part of the lower loop; keep short labels and `+N more` in narrower portions.
- Wrap and balance text before reducing type. Do not let a secondary label or one long answer automatically shrink the entire composition; reduce only the overflowing role/group through discrete controlled steps after wrapping and placement have been exhausted.
- Tighten line boxes and group gaps while retaining optical centering and safe clearance from the stroke.
- Rebase bottom profile role tokens on the lower loop’s measured usable geometry rather than another arbitrary bump. Middle/top behavior remains unchanged.
- Use the same corrected bottom-profile fitter for My G and all four yellow sample profiles.

### 2. Add measurable layout diagnostics
- Expose development-only layout metrics from the profile fitter: measured interior bounds, stroke-safe inset, usable contour bounds, selected role sizes/steps, and final text bounds.
- Verify in the live 402×645 mobile viewport with representative My G content and all sample profiles using SVG `getBBox()`/screen bounds.
- Record and report the measured interior width/height, inset, usable area, rendered text bounds, stroke clearance, and percentage of usable vertical space occupied. Fail verification if text intersects the safe contour.

### 3. Persist one account-level first-run lifecycle
- Add a small persisted lifecycle store with an explicit `onboardingCompletedAt` (or equivalent boolean/timestamp), independent from `profileCompleted` and `tutorialSeen`.
- Replace the transient `entered` gate with the persisted lifecycle value:
  - incomplete → onboarding → first generosity → profile setup → mark onboarding complete → My Living G;
  - complete → My Living G immediately.
- Keep `profileCompleted`/the existing `built` value for profile setup status and migrate existing completed local profiles safely.
- Keep the Living G tutorial flag separate, mark it as seen once its first-use presentation completes or is dismissed, and never clear it during ordinary routing. Manual “learn how giver works” remains in the existing profile help area.
- Preserve the four independent activity-world instruction flags.

### 4. Seed the real development user through existing stores
- Add an idempotent development-only seed helper that writes the existing current-user profile store and existing shared item store—no fake profile component and no parallel data model.
- Use the existing `me.jpg` asset and seed a realistic username, About Me, day/night/weekend details, one Give, one Wish, one canonical two-sided Trade, one Borrow/Lend item, Sparks, Sparkles, `profileCompleted`, `tutorialSeen`, and completed onboarding.
- Seed only in development/preview when no explicit development state has been chosen. Never alter production new-user defaults or community sample records.
- Ensure every My G/full-profile/category view reads the seeded records through the same projections and formatters used by real edits.

### 5. Add development-only path controls
- Add a restrained control that is excluded from production builds with these actions:
  - **Replay onboarding** — preserve seeded profile/items but clear onboarding completion.
  - **New-user reset** — clear the current-user profile/items and all first-run flags to test the true blank path.
  - **Skip / complete onboarding** — persist completion and return directly to My Living G.
  - **Restore development profile** — reapply the idempotent real-store fixture after a full reset.
- Reset only current-user records; do not duplicate the app or profile system and do not damage the shared sample community data.

## Verification
- Refresh and reopen after completion: land directly on My Living G with no intro, Sparks explanation, sample profiles, generosity tutorial, or profile builder.
- Complete/dismiss the Living G tutorial, refresh repeatedly, and confirm it stays dismissed; reopen it manually from profile help.
- Exercise both replay-preserving and true-new-user reset controls, then skip/complete back to My G.
- Confirm the development profile and all four activity categories remain populated after refresh through the real stores.
- Measure lower-loop content on My G and all four sample profiles at the requested mobile viewport, confirm no stroke contact, and include the exact metrics and changed files in the final report.
