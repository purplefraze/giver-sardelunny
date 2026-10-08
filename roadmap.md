# Communi-G track repair
- [ ] Urgent: make the existing record control visibly tappable in the actual default full G; verify voice entry, stop, typing, editable Give/search routing and distinguish planned choreography from shipped work.
- [ ] Build an isolated Wish-first middle-loop spatial prototype using the live eight-seat map, canonical artwork and toggle proportions.
- [ ] Verify phone/tall-phone framing, upright editable content, drag/hold/reversal, snapping, all seats and reduced motion; keep normal navigation untouched.
- [x] Tune expanded red-loop Bentley-mode zoom from shared progress, preserving entry and all seats.
- [x] Verify dynamic zoom, contact, hold/reversal, joint settle and prior gesture regressions on both phone sizes.
- [x] Compare working source with HEAD and inspect current mobile rendering.
- [x] Replace erosion/ray caches with a coherent smooth asymmetric track and attachment geometry.
- [x] Implement one-angle direct manipulation, interruptible release settle, detents, and safe pointer ownership.
- [x] Verify phone/tall-phone component gestures, every station, curve rendering, and automated checks; leave unpublished.

## Review evidence
- Saved baseline `02a03c9` and the original working preview both contained `freezeCam`, `freezeCentreRef`, and `DOLLY_MS=560`; the earlier claimed repair was absent from that baseline, not merely an unsaved preview change.
- Implementation saved through `1413463`: `src/components/community/PerimeterToggle.tsx`, `src/components/community/perimeter-geometry.ts`, `tests/perimeter-geometry.test.ts`; supporting notes in `AGENTS.md` and this file. Git commits are managed by Lovable, not manually created.
- Browser verification at localhost:8080 mounted the actual CommunityFeed component in a temporary browser-only overlay at 390×844 and 390×932. Chromium mouse-pointer tests passed slow/fast motion, immediate first movement without jump, stationary hold, reversal, two revolutions/seam crossings, release/hold after settling, mid-snap re-grab, background taps, cancellation, reduced motion, and all eight station selections. Camera angle and bead progress matched at each sample; no runtime page errors occurred.
- Borrow/lend/fund/wish screenshots were inspected: smooth continuous red curve, consistent stroke, square attached arm, and no visible kinks/seams. Wish clearance was adjusted from the same angle so the grip does not cover its form.
- Five geometry tests passed with 4,993 assertions, including skipped station crossings, seam continuity, stable-input grab offset, <=180ms settle, and full grip accessibility.
- Haptics are requests only: selection on crossed small detents and a stronger light request in the release handler, with no idle timer. Existing shared-service coalescing can suppress closely spaced requests. Chromium cannot prove physical Android/iPhone delivery. Native multitouch/second-pointer hardware delivery was not tested.
- Initial signed-in entry attempt remained behind the Give introduction. The Oct 8 clarification pass completed that existing introduction, returned from My Gives, selected the middle map seat at six o'clock and tapped its bead; actual Communi-G entry now passed without app/store changes.
- Automatic checks report no errors in the changed component/geometry. Overall typecheck remains blocked by pre-existing errors in MyGRing.tsx, cloud/boot.ts, and intelligence files; a successful final production build is not claimed. Vite serves the repaired component for review. Nothing was published.

## Bentley-mode clarification review (Oct 8)
- Before edits, saved source `ae85e49` matched the working preview for both perimeter files; the one-angle, smooth-curve and interruptible-settle repairs were present. Constant `FRAME_SCALE=1.85` had removed intentional lens travel.
- Current tuning is saved at `2090b92`: perimeter component, geometry, geometry tests and AGENTS.md; this review checklist is a later documentation change. No EarSelector, full Living G, setup, seats, forms, auth, packages or backend changes.
- Mapping diagnosis: raw atan2 on an unnormalized tall-screen ellipse yields uneven angular gain (roughly 2.6–2.9 aspect ratio on these phones). Sampling a camera-dependent centre would additionally produce feedback drift. Fixed input ellipse axes are captured with the input centre; integrated signed normalized-angle deltas preserve grab offset, stop and reversal. Camera and lens remain live, not frozen.
- Lens scale is a bounded continuous spatial function, `1.45 + 0.40*sin(angle)^2`: contraction at vertical ends, expansion along sides. This is an initial tuning choice, not a claimed historic exact lens formula. Bead, curve transform, square arm contact and lens all read the same angle; no held-time animation, velocity zoom, separate scale state or follow-up camera timer. Painted track remains 17 screen pixels through non-scaling stroke; previous coherent smooth geometry is unchanged.
- Actual authenticated app-entry tests at 390×844 and 390×932 passed two normalized-ellipse revolutions with continuous expansion/contraction (sampled range 1.4500–1.8495), no first-touch jump, stationary hold including zoom, immediate reversal, joint settle and no post-settle motion, plus all eight stations. No runtime page errors. Borrow/lend/fund/wish screenshots inspected at phone proportions: smooth red curve and flush square arm, no visible joins/spikes.
- Prior actual-component browser regression suite also passed slow/fast drag, hold, reverse, seam/two revolutions, mid-snap re-grab, background ownership, cancellation, reduced motion and deliberate-only My G exit on both sizes. Seven geometry tests passed, 12,634 assertions. Haptic request behavior was preserved, not proof of physical vibration; native second-pointer hardware delivery remains untested.
- Existing global typecheck errors remain outside the authorized correction scope; reviewable Vite preview runs without runtime errors. No production-build success or publish is claimed.
## Voice (Oct 8)
- [x] Seat-coloured record control in S-curve (--world-g), listening halo + stop square
- [x] Universal voice intent router: search reads existing listings; give drafts; other actions open existing forms; clarify otherwise
- [x] Plan only: voice-mode choreography written to docs/spec/voice-motion.md (build awaits approval)
