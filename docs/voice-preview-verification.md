# Oct 10 correction verification

## Current behavior
- Main attached toggle: selected label for 1800ms after settling, idle record dot, explicit tap starts hands-free, second tap stops. Pointerdown/timers do not start speech. Drag suppresses recording, recording protects seat. Existing loop navigation remains; My G and communi-g have explicit open controls in their hollow.
- Full middle voice is centred at all eight seats. Expanded profile/community keep spatial placement. Seat changes park each draft/photo/location independently; typing follows the selected seat.
- Lessons/services share validated grounded AI context with rides/groceries. Guitar lessons infer skill, polish the title, separate in-person from area, clarify bare weekdays, and never show collection/condition. Review has one optional details field, photos, Share with communi-g, back to the G (keeps the draft), discard, and a bottom-centre record button that listens inside the form only after an explicit tap (Oct 10 17:08 supersedes 'review never listens').
- VoiceEnclosure interpolates the canonical filled G into the mode-coloured rounded review rim. Content appears after the transition; reduced motion skips it. This is visible path interpolation, not the full proposed destination contract/swing/expand sequence.
- Community retains eight seats and Bentley geometry; lower own-posts is communi-g. Give/Wish/own clearance is higher. Stable latest/oldest/nearest and list/map/radius use one filter, and only supplied coordinates count. Unknown listing coordinates are omitted from maps/radius rather than invented. A manual neighbourhood/city search and coordinate fallback complement explicit geolocation.

## Actual checks
- Consolidated Bun suite: 568 passing, zero failures, 18,074 assertions, 15 files. Two obsolete slide/hold tests were removed; focused lesson, map radius, raw interim, cancellation, initial-seat and timing checks were added.
- Authenticated Chromium 390×844: actual tap starts; release keeps listening; second tap stops; raw interim appears; denied recognition recovers; keyboard record/stop; selected seat protected; all eight prompts occupy the same centre (195.0, 297.2); all idle dots appear after settling. Simulated recognition only, no real microphone.
- Tall-phone 390×932 additionally passed cancel-to-G, unsupported recognition and typed fallback to a seat-seeded Give.
- Complete guitar dialogue: offer → in person → Leith → Tuesday → every Tuesday → editable review. No condition, no Share invoked. Reviewed screenshots include intermediate G interpolation and final border.
- Community browser-only 50-row fixtures at 320×740, 390×844, 430×932: one-row tabs (identical y), actual list scroll, stable oldest/latest, 5km returns 25 rows, 10km 50 rows, 50 matching Leaflet markers. No account session used for fixtures; no shared records were written.
- Gateway authenticated catalog includes openai/gpt-6-astra, zero retention on Responses. Existing effective configuration: Responses, low reasoning, stream true, store false, no model environment override. One bounded live lesson sample returned HTTP 200, asked the missing area and did not invent details.
- Automatic preview checks report build OK; no manual production build/typecheck was run.

## Limits
- Real Safari microphone activation, speech quality, native keyboard and physical haptics need device checks. Mouse/keyboard and simulated recognition are not proof of those.
- Public community listings currently have no shared coordinates in the existing schema. Most genuine listings therefore cannot appear in radius/map until an approved approximate location is supplied. No location was invented and no database/location-policy change was made.
- Map pins/radius/rendering verified; external OSM tiles can be unavailable and show an honest state. Manual area lookup was implemented but a live Nominatim result was not verified.
- Deterministic and model-assisted service handling covers identified lesson/service contexts; unrestricted model-based classification of every unknown utterance is not implemented. Unknown contexts still use existing local intent rules. Optional level/duration remain editable only when known.
- The path interpolation is perceptible, but automatic contour matching can pinch intermediate edges; a hand-authored multi-contour choreography is not finished. It also begins from canonical artwork rather than every live thinned cut/toggle contour.
- Successful share/read-back/reload/second-viewer remains untested against shared live data; no posts, messages, notifications, Sparks or profile edits were intentionally made during these checks. Existing server-confirmed duplicate-safe share logic is retained.
- Production was not published.
