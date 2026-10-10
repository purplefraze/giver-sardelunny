# Combined mobile regression repair

## Exact edits and causes
- `CommunityFeed.tsx`, `PerimeterToggle.tsx`, `styles.css`: headings/list content previously inherited seat-dependent alignment and header placement. All list headings now start at the same top-left coordinate; listings/search/tools are left aligned. Existing top-right bead, geometry, gestures, detail dismissal and independent list scrolling are preserved.
- `VoiceLoops.tsx`: centre mode word uses its actual seat colour and a narrower content-only box inside the hollow, not the track.
- `World.tsx`, `LivingG.tsx`, `g-weight.tsx`, `loop-close.tsx`: main middle track uses a local paint-only 17-unit override and matching closure/patch. Erosion is restricted to the middle ring; canonical path, uniform scaling, selector orbit, lower loop and onboarding are unchanged. Expanded creation enclosures retain their prior canonical rendering.
- `give-lexicon.ts`: cooked turkey now classifies as food.
- `VoiceReview.tsx`, `CollectionLocation.tsx`, `CollectionMap.tsx`, `collection-location.ts`, `collection-search.ts`, `voice-flow.ts`, `voice-conversation.ts`, `share-coordinator.ts`: native collection date, explicit permission location, explicit provider-backed area/address search, result selection and draggable coarse pin. Editing area invalidates confirmation. Async results check draft identity. Food requires a valid date and confirmed location before Share. Existing public listing payload retains date/time and coarse label; exact home address is never automatically published. Coordinates remain local, coarse and bounded near the selected area; no schema/cloud changes.
- Email restoration is retained, not redesigned: history identified `7094f9d` whole-stage visualViewport scaling and `5481d30` transformed wrapping textarea. Existing native single-line input and stable sign-in canvas were already selectively restored. No onboarding files changed in this pass.

## Verified
- Chromium at 320×568: six actual creation components, no entry autofocus; canonical path and camera transform identical during simulated keyboard contraction and dismissal. Screenshots captured for each mode. No component runtime errors.
- Cooked turkey → explicit collection question → mock geocoder result → date → review: date and confirmed approximate area preserved. Mars rejected; public label excludes house number. Existing Share identity/retry tests use mocked dependencies, not real records.
- All community headings (`all community`, `gives`, `wishes`, `trades`, `borrows`, `lends`, `funds`) measured identically at x24/y108; lists left aligned.
- `/auth`: long email stays a native horizontally scrolling one-line input; Living G bounding box identical through focus, long typing, simulated visualViewport offset/contraction and dismissal.
- Local test suite and automatic build status are recorded in the final verification update below. No deployment or remote mutation.

## Unresolved / not claimed
- Physical iPhone Safari keyboard, autofill, date picker, touch gestures and haptics cannot be verified in this sandbox. Chromium visualViewport simulation is not hardware proof.
- Google Maps connector is absent. Existing OSM/Nominatim prototype provider is reused for explicit search only; its policy forbids per-keystroke autocomplete. True map autocomplete remains blocked pending an eligible connected provider. No paid service enabled.
- Dense Give review at 320×568 requires its existing last-resort internal scroll; the full page and G do not scroll/reflow. Date/Share require scrolling inside that review at this smallest viewport.
- Provider search browser checks use isolated responses; live geocoder availability and authenticated publication/second-viewer persistence remain unverified. Device location does not automatically establish a human-readable neighbourhood name.