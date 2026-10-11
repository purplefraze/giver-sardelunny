# Luna repair — saved-code completion verification, October 11

## Revision and scope

Continued the existing authorised repair, not a restart. Requested ancestor: `008fe95af04cde92ba307da4dd78f9b0d9821c8b`; final verified implementation: `740458ec1c90a22fb603bc904c1b6502cbe420f0`. This note is saved in a subsequent editor-managed documentation commit. Preview only: no deployment, history rewrite, real posts/messages/profile saves, Sparks, paid provider or auth-security changes.

The earlier repair already supplied `MyGRing`, canonical screen-paint renderers, `PerimeterToggle`, row-specific `CommunityFeed` bounds and category-preserving `CommunigyMap`. This continuation found and repaired two actual presentation defects: map attribution was 11px, and dense review could scroll/hide Share on a short phone. Changed `styles.css`, `VoiceReview.tsx` and `CollectionLocation.tsx`; collection search still uses the same draft, validation and guarded callbacks. Updated root/intelligence guidance, community evidence and the active roadmap without checking unrelated historical work.

## Fresh measured results

Chromium viewport: 1280×1800. Actual app/component containing frames below were constrained to the requested phone dimensions. These are app-frame results, not physical Safari chrome measurements.

| app frame | full/sign-in/lower paint | category heading top | selected profile text | ordinary Give review scroll delta |
|---|---:|---:|---:|---:|
| 320×568 | 8px | 56px | 11px | 0px |
| 390×640 | 9px | 56px | 11px | 0px |
| 390×844 | 9px | 56px | 11px | 1px rounding, no scroll container |
| 430×932 | 10px | 56px | 11px | 0px |

- Paint is shared projected/non-scaling CSS paint, with canonical mask compensation. Antialiased raster edge pixels are not claimed to equal an integer count. Camera/path/aspect and actual seat coordinates remain unchanged; existing pure tests check interpolation and camera compensation.
- All eight profile names measured approximately 10.999978–11.000019px after SVG transform (rounding around 11px), fully inside the bead; seven unlabelled markers remain on the real ring. `reputation` and `my g` included. Tap/keyboard, hold, drag/reversal, synthetic pinch exit and My G exit passed; hold microphone starts were zero at every frame.
- All seven category list/map views retained a 56px heading band. Wish/borrow/fund right-aligned, lend/trade left-aligned. Visible row widths vary per curved clearance instead of inheriting the narrowest shoulder; title styles are nowrap/ellipsis, and full titles remain in details. Offscreen list rows may report zero available width and are not claimed as visible content.
- Community title/handle/tool floors remain 12px or above; contextual headings 17px, filters 13px, titles 15px, handles 12px, attribution now 12px. Profile bead names 11px. Review compact labels/actions 12px, native text/date fields 16px, Record 15px. Intended family is Helvetica Neue with platform fallbacks; 400/500/700 and zero authored tracking remain. No font asset acquired or actual Helvetica Neue claim.
- Final short-phone review screenshots show title, subject/category, approximate collection entry/search, native date, condition, details/photo, Share/discard/continue questions and separate Record together. Dense reflow is container-height based, not a second intake/draft or smaller type. A measured 1px scrollHeight difference on 390×844 is rounding with visible overflow, not enabled ordinary-review scrolling. Keyboard-only scroll handling remains.

## Production-component flows

- `/dev/luna` mounts actual full G, sign-in, MyGRing and CommunityFeed. Fresh profile/sign-in checks passed all four frames and all profile stations; synthetic email fill preserved G bounds.
- Main `/` existing lifecycle fixture plus actual lower-loop navigation exercised all seven categories at four frames. Separate main review checks exercised real VoiceEnclosure/VoiceReview, not a substitute UI. No page runtime errors in any final browser run.
- Category map/list switches and sample trade pin routing passed. Pin card opened `trade: playa bike build for camp dues`; detail close retained trade/map/oldest. Deliberate category change dismissed the stale detail. Existing map state keeps category/search/radius and mounted pan/zoom; neighbourhood zoom 15 is independent of search radius. Unknown real locations are not assigned coordinates. Full-colour map tiles and required attribution were visible in screenshots; durable provider availability is not certified.
- Mocked Web Speech events through the production adapter: no start on entry; explicit Record starts and Stop stops. Stable draft identity, final heard text and typed subject survived subsequent simulated voice and fold/reopen; no extra microphone starts on reopen. Share was deliberately not clicked, so no live publication/read-back is claimed. Existing share/draft/date/birthday/privacy regressions passed. No real profile persistence was exercised.
- Flush bead/square attachment, curved map clipping, lists and profile/photo screens were visually inspected. No substitute loop geometry introduced. Reopen captures made while a desktop fixture still had stale form offsets are not visual framing evidence; final `*-posting-review.png` and entry/interim captures are the valid form-layout evidence, while reopen state is verified by the recorded draft results.

## Evidence

Fresh scripts and outputs live under `/tmp/browser/luna-finish/`:

- `profile_check.py`, `profile.log`: full/sign-in and all eight profile stations.
- `main_check.py`, `main-results.json`, `main.log`: actual main community entry/category height and final review fit/type.
- `flows.py`, `flows-results.json`, `flows.log`: 64 category/map/posting-state observations, zero page errors and blocked request records.
- `interactions.py`, `interactions-results.json`, `interactions.log`: four-frame profile gestures and exact pin/detail/category returns.
- `tests.log`: **658 passed, 0 failed, 31,770 assertions, 30 files** on final source. Supported automatic preview build log `/tmp/observability/build-errors.log`: **build OK, 19:19:30 UTC**. No prohibited manual build/typecheck run.
- Screenshots: `{width}-{height}-full.png`, `-signin.png`, `-profile-{seat}.png`, `-{category}-list.png`, `-{category}-map.png`, `-main-{category}.png`, `-trade-pin-card.png`, `-trade-pin-detail.png`, `-posting-entry.png`, `-posting-interim.png`, `-posting-review.png`. Contact sheets `contact-0.jpg` through `contact-5.jpg` are supplemental; final individual images take precedence.

Reviewed individual evidence includes 320×568 reputation/wish/trade/map-card/detail/final review, 390×640 sign-in/final review, 390×844 borrow/final review, and 430×932 photo/fund map/final review, plus all-category/profile contact sheets. Evidence is sandbox-local and may not survive sandbox renewal.

## Limits and handoff

No known remaining defect in the repaired presentation flows above. This is not exhaustive proof for every possible long user-authored record, expanded search result/map editor, error/photo-warning combination or real keyboard state. Physical iPhone Safari/multitouch/microphone/haptics, hosted authenticated Cloud persistence, live publishing/read-back, sustained tile availability and actual Helvetica Neue remain unverified. They are external verification limitations, not a reason to pause these sandbox repairs.

Rollback: restore the narrowly changed presentation behavior through a new editor-managed change if necessary, never rewrite published history. Human review/acceptance remains with Creator/Marcus. Historical 17px paint, floating profile labels and profile recording are superseded; preserve unrelated doctrine and preview-only status.