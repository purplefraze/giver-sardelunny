# Record control: Oct 8 preview verification

## Where to find it
Return to the whole Living G (close any open form or introduction). A seat-coloured circle with a central record dot sits in the white S-curve pocket between the middle and lower loops. It is available after the welcome animation settles; it is not dependent on completing profile setup. Refresh the current Lovable preview to load this source. The published site requires a separate publish/redeploy; no deployment was performed.

## Root causes and repairs
- The route previously suppressed the SVG record control whenever `firstLand` existed, including its settled welcome state. Only the active ceremony now suppresses it, with a regression test.
- Record ink explicitly follows the current eight-seat CSS tokens rather than the last activity world. Fill/stroke transitions remain 320ms.
- React development effect cleanup could erase the unsupported-browser status immediately after entry. Intake now prepares capability state during mount and cleans up recognition on exit.
- Old recognition callbacks could leak words/errors into a restarted session. Instance identity guards now reject them.
- Non-search submission now uses the voice router's draft and clarification threshold instead of bypassing it.
- Opening intake does not transmit audio. “Start listening” explicitly authorizes the browser's own recognition service, which may process audio remotely. No paid API, keys or Giver audio storage was added.

## Actually tested
Authenticated Chromium preview at 390×844 and 390×932:
- Whole-G screenshots inspected: visible dot in the open pocket, no artwork movement.
- Pointer click without force opens intake. All eight selector states retain their existing positions and give the control the matching colour: My G blue, Give green, Lend lime, Trade orange, Communi-G red, Fund brown, Borrow purple tint, Wish purple.
- Typed “I'm getting rid of a fridge” opens existing GiveFlow with editable `what=fridge`; changed it to `small fridge`. No publish action was taken.
- Recognition absent: clear typing fallback; “show me ladders nearby” reaches community search for `ladder`.
- Browser-only recognition double: listening, stop, permission-denial error, cancel. This proves UI lifecycle only, not speech recognition or microphone hardware. No fabricated transcript was presented as real speech.
- No page runtime errors during the completed verification.
- 20 targeted tests passed (15,979 assertions), including record gate, stale speech callbacks, existing voice intents, middle study seat/grip geometry and Bentley perimeter geometry.
- Automatic build log reports `build OK` at 20:10:45 UTC. Earlier TypeScript diagnostics are historical; a fresh successful standalone global typecheck was not independently established.

## Limits and unshipped work
- Real iPhone/Safari microphone, permission prompts, recognition quality and physical haptics require device testing. Chromium cannot prove tactile delivery.
- The visible control is intentionally small. Its SVG hit rectangle measures approximately 78×27 screen pixels at 390px width; it is tappable but does not meet a 44px vertical touch-target recommendation. Enlarging it vertically within this tight pocket without covering the stroke remains a constraint, not a claimed completed accessibility improvement.
- Contract → toggle swing → expand is documentation only in `docs/spec/voice-motion.md`; not implemented.
- The isolated middle-loop study at `/dev/middle-loop` is not production navigation. All eight seats and basic gestures were checked, but zoomed outline/bridge seams and stroke-weight consistency remain visual-study limitations. It has not replaced the whole G or the working lower Communi-G.
- Lower-loop `PerimeterToggle`, its geometry, existing EarSelector geometry/mechanics, seat layout and backend were not changed for the record repair.

## Source touched for voice repair
`src/routes/index.tsx`, `src/components/living-g/VoiceMic.tsx`, `src/styles.css`, `src/intelligence/record-availability.ts`, `src/intelligence/voice-capture.ts`, `src/intelligence/VoiceIntake.tsx`, `tests/record-availability.test.ts`, `tests/voice-capture.test.ts`, and voice documentation. Existing global strict-TypeScript repairs and isolated study files are separate changes from earlier work in this session; no manual Git commit was created.