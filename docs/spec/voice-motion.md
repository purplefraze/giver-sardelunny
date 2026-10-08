# Voice Mode motion — proposed next phase (PLAN ONLY, not built)

Status: PROPOSAL. No geometry, GStage, EarSelector or PerimeterToggle code changes yet.

## Choreography (owner direction, Oct 8 2026)
Every voice DESTINATION CHANGE runs, in order, with no overlap:
1. CONTRACT — the open destination perimeter reforms into the full canonical Living G.
2. SWING — the existing toggle travels along its real middle-loop orbit to the target seat
   (My G 12:00, Give 1:30, Lend 3:00, Trade 4:30, Communi-G 6:00, Fund 7:30, Borrow 9:00, Wish 10:30). Never a snap or teleport.
   Light haptic on settle.
3. EXPAND — only then the G unfolds into the perimeter framing the new destination.
A refinement inside the SAME destination gets a gentle ripple only, with no return to the full G.

## State machine
```text
idle(G) ──voice route──▶ swinging ──settled──▶ expanding ──▶ framed(dest)
framed(A) ──route to B≠A──▶ contracting ──▶ swinging ──▶ expanding ──▶ framed(B)
framed(A) ──route to A──▶ rippling ──▶ framed(A)
any ──back──▶ contracting ──▶ idle(G)        any ──fresh touch──▶ interrupt (hold current progress)
```
One progress value per phase (0→1), sampled each frame, same rule as Bentley mode:
no second timers or catch-up. Reduced motion: crossfade each phase in ≤120ms, but the toggle still
moves to the seat (skipping the orbit sweep).

## Fit with what exists
- Swing: drive EarSelector's existing seat-angle path with an animated angle (the same function the
  drag uses). New input source only; the orbit maths stays unchanged.
- Contract/expand: GDepthStack + g-depth.ts already own portal entry. Add a phase controller
  that calls those existing open/close transitions; do not add a second G.
- Destination content: the existing editor/browse/detail panels in src/routes/index.tsx.
- Mic in expanded state: render VoiceMic inside the perimeter frame, same seat colour (--world-g).
- Context: voice draft/search state lives in voice-capture + VoiceIntake state; lift it to a small
  store so it survives phase changes and back navigation.

## Safe increments
1. Lift voice draft/search context into a store (no visual change).
2. Programmatic toggle swing to a seat on voice route (reuses the orbit; haptic on settle).
3. Sequence: swing → existing portal open. Sequence for change: existing close → swing → open.
4. Same-destination ripple (stroke-width pulse ≤ 2 units, colour token only).
5. Mic inside expanded frames; then reduced-motion and 60fps profiling on a real iPhone/Android.
Each step ships behind a dev flag and is verified on a phone before the next.
