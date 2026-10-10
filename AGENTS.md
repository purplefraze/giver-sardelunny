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
- Keep the opt-in middle spatial study at `/dev/middle-loop` isolated from app navigation and stores, importing the live seat/geometry tables; this permits review without risking the established full G or lower-loop engine.
- Derive paint, attachment normals, and camera from the smooth measured lower-loop curve in `perimeter-geometry.ts`; this prevents erosion seams and quantized ray-cache movement without altering the full Living G artwork.
- Keep one unwrapped angle as the only motion state and freeze only gesture input coordinates, never the camera; this avoids input feedback and preserves immediate reversal/stop behavior.
- Derive bounded spatial lens scale directly from the shared angle and normalize gesture input by the fixed screen ellipse; this preserves coordinated expansion/contraction without zoom timers or tall-phone angular gain distortion.
- Animate only release settling, interrupt it on fresh grip, and send haptic requests from gesture handlers through the shared service; this avoids catch-up movement and delayed activation-dependent pulses.
- Voice creation uses only the browser speech-recognition API via src/intelligence/voice-capture.ts, started from a stationary press-and-hold on the main toggle itself (EarSelector onRecordStart/onRecordEnd; release ends listening, the ring interior shows the record button, the selected seat seeds the session); there is no separate S-curve/nook recorder, drags and short taps never start the mic, and nothing auto-publishes.
- The in-G voice conversation is one store (src/intelligence/voice-conversation.ts) over pure rules (voice-session.ts / voice-flow.ts); only VoiceReview's explicit share posts, so recording or reviewing can never publish.
- My G profile areas and their voice phrases live in one pure table (src/intelligence/profile-areas.ts) read by both MyGRing touch seats and voice-session; this guarantees voice and touch land on the same area.
- The lower loop keeps ONE selection (src/intelligence/community-filter.ts) shared by the inside toggle, filter row and feed; its 12:00 seat is "mine", never an exit, and only the back arrow leaves communi-g.
- Profile birthday, gender, answers and sparks are owner-only by column grants; the owner reads its full row via `my_profile()` and the directory selects public columns only — UI privacy alone can be bypassed.
- My G zooms into the actual toggle circle at 12 (bead on the ring's track, middle-loop curve kept in view, area content in the middle loop's hollow); this keeps origin and continuity instead of a detached profile page.
- Text alignment and content placement follow the control's clock seat through one pure table (src/intelligence/seat-placement.ts) read by the main, My G and community loops; this keeps all three loops consistent.
- Contextual follow-up questions come from pure rules (src/intelligence/contextual-needs.ts); the AI gateway call (src/lib/followup.functions.ts) only fills empty, transcript-grounded details and rephrases the same next question, validated by those rules — so a model failure or hallucination can never invent facts, skip a needed detail, or publish.
- Voice sharing says "live" only after `confirmItemSaved` reads the server row back (one local record per draft, keyed by owner+local_id, unpublished on failure); this prevents false success and duplicate posts on retry.
- Voice questioning stops as soon as the pure rules find nothing necessary missing and opens the editable review directly; no "anything else?" loop, so voice stays shorter than the form.
