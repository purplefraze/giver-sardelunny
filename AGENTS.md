<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Communi-G perimeter
- Keep `/dev/middle-loop` isolated with live geometry/seat imports.
- Derive paint, attachment normals, and camera from the smooth measured lower-loop curve in `perimeter-geometry.ts`; this prevents erosion seams and quantized ray-cache movement without altering the full Living G artwork.
- Keep one unwrapped angle as the only motion state and freeze only gesture input coordinates, never the camera; this avoids input feedback and preserves immediate reversal/stop behavior.
- Derive bounded spatial lens scale directly from the shared angle and normalize gesture input by the fixed screen ellipse; this preserves coordinated expansion/contraction without zoom timers or tall-phone angular gain distortion.
- Animate only release settling, interrupt it on fresh grip, and send haptic requests from gesture handlers through the shared service; this avoids catch-up movement and delayed activation-dependent pulses.
- Main attached posting toggle is immediately Record/Stop; Profile and communi-g remain navigation; only deliberate tap starts hands-free browser speech and the next tap stops. Nothing else (pointerdown, hold, drag, timer, focus, form entry) records; the only other recorder is the in-form bottom-centre tap button; this preserves activation and consent.
- Middle-loop tap at any posting seat calls `conversation.openForm(seat)`: one `form` flag presents VoiceReview inside VoiceEnclosure for both manual-first and voice-to-review entry, the same session/fields are edited by typing and speech, and typed fields (`edited`) are never overwritten by later voice or model replies; this prevents two parallel intake systems.
- The lower loop shares one selection through community-filter, toggle, filters and feed; its lower-only stations module owns bounded unwrapped travel and token lookup so map entry cannot wrap across the opening or inherit upper-seat colours.
- Revise only unedited Fund fixtures via fund-fixture; never convert real or edited records.
- Lower progress past 12 rides a fitted C1 S connector (`sCurve` in perimeter-geometry.ts) to an outside horizontal "back" seat that only a settled tap leaves; lower 12 retains all-type map navigation; one toggle, no detached Back button.
- Private profile columns require owner-only grants, `my_profile()` for owners and public directory columns; UI privacy is insufficient. Bio uses native date input and profile-birthday validation before store patch for date-only eligibility.
- Profile retains the actual upper ring; reuse communi-g inputAngle/signedTurn/scaleOf/settleDuration/easeOut for stable input and joint camera settling. Screen-space active/adjacent labels and unpainted Photo controls avoid clipping and overlays.
- Community fits the measured lower curve uniformly to the viewport with one bounded angle-driven lens; measure title/action separately at the shared high band, then tools/feed. Empty gaps may span the grip, controls may not; this avoids artificial width and tall-frame displacement without changing seats or artwork.
- Form Share runs only through `share-coordinator.ts`, keyed by the draft's stable `draftId` captured at the tap: one record per draft attached right after addItem, an in-flight lock, the full latest payload rebuilt for create and retry, unpublish on any failed confirm, and completion routed via `finishDraft`; this prevents duplicate posts, stale retries and cross-draft results.
- Voice opens editable review once required facts are complete; no "anything else?" loop.

- Community discovery projects the one item store with stable timestamp/coordinate sorting and a single list/map radius selection; unknown coordinates stay unknown rather than hashed into fabricated locations.
- Posting uses the canonical curved hollow with one entry/reverse-pinch progress and input guards. Details stay in CommunityFeed/PerimeterToggle, preserving camera and seat.
- Every individual record (community hollow, profile, My G) renders the one compact ActivityDetail; it reflows by bounded type steps with readable floors, then a denser arrangement, and flows around a resting bead via PerimeterToggle `flow` floats instead of shrinking text; lists keep rectangular clearance.
- Posting freezes its canonical uniform camera; only content follows keyboards, never entry focus. Sign-in owns a stable local canvas and native one-line email input; isolation prevents keyboard shrink/wrap feedback.
- Full G uses uniform path/closure/patch paint, separate from camera/orbit weights.
- Collection selection validates approximate coordinates in the same draft; text edits invalidate confirmation and async callbacks check draft identity, protecting privacy and stale-state safety.
