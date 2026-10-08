# Communi-G track repair
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
- Full signed-in app entry was attempted but remained on the main G/action state; end-to-end route entry is not verified. Component tests do not establish that flow.
- Automatic checks report no errors in the changed component/geometry. Overall typecheck remains blocked by pre-existing errors in MyGRing.tsx, cloud/boot.ts, and intelligence files; a successful final production build is not claimed. Vite serves the repaired component for review. Nothing was published.