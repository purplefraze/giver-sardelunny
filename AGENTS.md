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
- Voice creation uses only the browser speech-recognition API via src/intelligence/voice-capture.ts, started synchronously from the S-curve mic tap, and reads words with the local binder; this keeps Safari user-activation working, transmits no audio from Giver, and never auto-publishes.
- The in-G voice conversation is one store (src/intelligence/voice-conversation.ts) over pure rules (voice-session.ts / voice-flow.ts); only VoiceReview's explicit share posts, so recording or reviewing can never publish.
