# Communi-G track repair
## Oct 10 21:50 creation keyboard regression
- [x] Replace warped form renderer with uniformly transformed canonical middle-loop artwork; restore mask tokens and one form warning; six-mode hidden/shown screenshots. Enlarged existing joins remain visible; see docs/form-keyboard-geometry-verification-oct10.md.
- [x] Remove creation-entry autofocus and freeze enclosure geometry through simulated keyboard viewport changes.
- [x] Verify all six modes at 320×568, tapped answer field, dismissal and simulated inward pinch with writes blocked. Physical iPhone/Safari remains unverified; four opaque startup errors remain unexplained.
## Oct 10 21:47 urgent bio correction
- [x] Remove obsolete bio fields from UI/draft/save; native birthday, strict calendar/18+ validation, no invented date.
- [x] Verify isolated birthday save/reopen, invalid/underage rejection and small-phone circular fit; preserve earlier profile fixes. Physical iOS picker and signed-in Cloud persistence remain unverified; see docs/profile-birthday-verification-oct10.md.
## Oct 10 21:41 focused My G repair
- [x] Repair only profile camera/drag, viewport-safe neighboring labels and circular Photo presentation using existing communi-g helpers.
- [x] Verify all eight profile seats, narrow-phone photo and navigation without cloud mutations; see docs/profile-loop-verification-oct10.md for component checks and device/main-entry limits.
## Oct 10 19:45 current priorities (supersedes perimeter snap and delayed record)
- [ ] Profile: deep upper-ring camera, thin connected rim, all real seat content in upper hollow, Photo-only backdrop and explicit-save birthday.
- [ ] Community details replace lower-hollow content, not a floating rectangular depth panel.
- [ ] Curved posting enclosure, large mode word, immediate posting Record/Stop; navigation seats remain navigation.
- [ ] Main-app phone and regression verification, cancellation/return and draft safety; no real writes or publish.
- [ ] Earlier canonical upward S trace, rounded-tail comparison and ambient exterior activity remain open until verified.
## Oct 10 16:50 lower follow-up
- [x] Prefix-only category colours, stronger communi-g heading, hide account chrome inside community.
- [x] Lower-only blue map entry, open top-to-Give gap, bounded counterclockwise navigation and consistent assembly tokens.
- [x] Cause-based unedited synthetic Fund, existing target/pledge progress, schema-consistent Fund detail.
- [ ] Requested real S-curve midpoint return: blocked by absent connected centreline/attachment geometry; explicit accessible return retained, no invented crossing.
- [x] Phone/tall-phone map entry, six isolated marker types, Fund detail, repeated colours, prefix wrapping, keyboard endpoints/reversal and drag gap clamp; 575 regressions pass and automatic build OK. Real-device speech/haptics remain unverified.
## Oct 10 full correction
- [x] 1–4: tap record/stop, seat-seeded prompts, centred middle voice and readable raw transcript/typing.
- [x] 5–7: grounded identified lesson/service context, contextual review and visible path interpolation.
- [ ] General model-based unknown-intent classification and hand-authored multi-contour unpretzel are not finished; current identified contexts and interpolated unfolding work.
- [ ] Shared approximate listing coordinates need an approved data/privacy design; current map never invents missing coordinates.
- [ ] Real-device speech/keyboard/haptics and successful share/reload/second-viewer require hardware and isolated writable test environment.
- [x] 8–12: lower placement/wording/colours, single-line filters, scrolling, sort/map/radius, synthetic author variety.
- [x] 13: update obsolete guidance, regression tests and phone preview verification; no production deployment.
- [x] Urgent record visibility and voice entry verified on both phone sizes; see docs/voice-preview-verification.md for tested behavior and remaining touch-target/device limitations.
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
- [x] ~~Seat-coloured record control in S-curve~~ (superseded by hold-on-toggle)
- [x] Universal voice intent router: search reads existing listings; give drafts; other actions open existing forms; clarify otherwise
- [x] Plan only: voice-mode choreography written to docs/spec/voice-motion.md (build awaits approval)
- [x] In-G voice conversation (Oct 8): tap record/stop (Oct 10 supersedes hold/slide-lock), live words in the bottom loop, one question at a time in the middle loop, photo plus, review-only glide + unfold, editable preview, explicit "Share with communi-g"
- [x] My G eight-area profile loop with voice navigation (review at /dev/my-g)
- [x] Communi-G: one selection drives inside toggle + filter row + feed; 12:00 = blue all-types map (Oct 10 16:50 supersedes own aggregate); existing expanded voice controls retained (review at /dev/communi-g)
- [x] Main middle toggle: landing label → idle dot → tap to record/stop on the toggle itself (seat seeds the draft); nook mic removed
- [ ] Tapping My G zooms into the actual toggle circle with the profile bead inside (not started; profile loop still rides the middle-loop rim)
- Contextual follow-up: rule engine + AI second read (openai/gpt-6-astra) via src/lib/followup.functions.ts — done; device speech test open

- [x] Oct 10 17:08: middle-loop tap opens every posting mode form in the unfolded G; bottom-centre in-form recorder shares the one draft.
- [ ] Refine the unpretzel intermediate (filled-blob frame) and a reverse fold on return to the G.
- [ ] Real iPhone microphone/Safari check of the in-form recorder.

- [x] Manual Fund requires valid positive goal (no Wish fallback)
- [x] Typed titles infer context/category in all modes incl. Trade; re-infer on title change
- [x] Morph: no blob, pinch reverses same movement
- [ ] Whole lower loop = full-colour map; ambient outside-radius activity backdrop with tap/magnifier (Frazer Oct 10 17:36)
- [x] Map only at lower 12; categories are lists
- [x] Rounded gap terminations + arm continuation
- [x] Toggle continues from 12 along S to outside horizontal back (tap returns)
- [x] Inward pinch returns from expanded community
- [x] Share identity in session (no dup on fold/reopen retry); live pinch returns + retires draft; touchcancel never commits; no pinch during opening

## Oct 10 18:22 focused form correction
- [ ] Grounded whole/segmented Give speech through the shared conversation; preserve typed edits.
- [ ] Separate recorder dock from scrolling actions and anchor frame to visual viewport.
- [ ] Replace stretch/crossfade with continuous derived G contour movement, shared reverse/pinch owner.
- [ ] Main-app phone-size speech, controls and intermediate-frame verification; regressions; preview only.
- [ ] Earlier community real S trace/rounded-tail comparison/ambient background remain unfinished (outside this correction).

## Oct 10 18:32 guided intake addition
- [ ] One large question with deliberate typed Next/Enter; quiet fields, early review, six modes and retained drafts.
- [ ] Ordinary-object grounded AI interpretation/title suggestions through existing authenticated gateway; validated fallback and stale-edit protection.
- [ ] Local-clock calendar/time answers and ambiguity confirmation carried into review/post payload.
- [ ] Production-path isolated tests plus main-app phone interaction/animation verification; no real writes or publish.

## Oct 10 18:50 latest corrections
- [ ] Magnetic continuous canonical G contour, rounded bands, reverse/cancellation and keyboard endpoints.
- [ ] Actual upward canonical S route beyond lower map, outside-right My G return (whole G, not Profile).
- [ ] Main giver seat label/accessibility Profile; readable word-fitted toggle labels at 320/390/430.
- [ ] Actual main/community browser verification, rendered font sizes and preview commit; no real writes/publish.
