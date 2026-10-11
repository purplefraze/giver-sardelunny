# October 11 community correction — preview verification

Current saved-code verification is in **[luna-oct11-verification.md](luna-oct11-verification.md)**. Its fresh four-frame screenshots and test/build results supersede the older evidence below. Historical 17-unit paint, scrolling review, profile recording and exterior labels are not current instructions. Current paint is 8/9/10 CSS px, map attribution is 12px, and My G names remain inside the bead with no profile microphone.

## Authorised Luna repair — final preview follow-up

Baseline: `24142a1cc6aafb5b57a1ae0ba85a20d4763eef9c`. Verified implementation revision: `9dced3a5e8fc8900dd34a6a5d7f29b9b4739e3f2`; documentation is recorded subsequently by the editor. No published history rewrite, deployment or remote data mutation. `IMG_7061.jpeg` is defect evidence only: its obsolete exterior profile labels, record dots and typography were not restored.

### Delivered files
- Shared paint: `screen-paint.ts`, `use-screen-paint.ts`, `CanonicalPaint.tsx`, `LivingG.tsx`, `g-weight.tsx`, `loop-close.tsx`, `GEnclosure.tsx`, `EarSelector.tsx`, `GiveClosed.tsx`, `SignInView.tsx`, `ConveyorToggle.tsx`.
- Profile: `MyGRing.tsx` removes profile recording/subscriptions/transcripts, puts only the selected name in the bead, retains all eight upper-ring stations and seven unlabelled markers on the actual ring. Photo empty-state copy clears the bottom attachment. Bio/private birthday validation and profile store behavior remain intact.
- Community: `perimeter-geometry.ts`, `hollow-layout.ts`, `PerimeterToggle.tsx`, `CommunityFeed.tsx` and `styles.css` share paint, measure each list row independently and keep tools/feed independent of the heading. Wrapped tools' actual height reserves feed space. Category selection, mounted map and neighbourhood zoom are retained.
- Typography/fixtures/rules: `g-type.ts`, `SparkBundle.tsx`, `dev.luna.tsx`, `index.tsx`, root/community `AGENTS.md`, `docs/spec/g-navigation.md`, `roadmap.md`, `tests/screen-paint.test.ts` and `tests/perimeter-geometry.test.ts`. The route tree is editor-generated.

### Measured results
| app frame | full/sign-in visible paint | community heading top | profile selected font |
|---|---:|---:|---:|
| 320×568 | 8px | 56px | 11px |
| 390×640 | 9px | 56px | 11px |
| 390×844 | 9px | 56px | 11px |
| 430×932 | 10px | 56px | 11px |

Stroke checkpoints are DOM-reported shared paint, with non-scaling track/closure/bead strokes and projection-compensated canonical mask; not a raster thickness claim at antialiased edges. Widths between checkpoints interpolate independently of camera. No canonical path or full-G aspect/camera replacement. Transformed profile SVG fonts measure 10.999978–11.000020px (rounding around 11px), including `reputation` and `my g`; bead diameter is 78px before paint. Seven unlabelled marker nodes accompany every selected station. Community contextual headings remain 17px, filters 13px, titles 15px and handles 12px; no below-floor autofit. Listing titles retain ellipsis and neutral descriptions with schema prefixes.

### Browser/test evidence and limitations
- Main `/` community entry and isolated production-component fixture covered all seven categories' map/list views and keyboard travel at the four required frames; measured heading tops were `[56]`, with zero page errors. Lower order/continuous clearance remains covered by pure geometry regressions. The earlier temporary main/community scripts were lost on sandbox renewal; their logged results are historical evidence, not newly preserved screenshot files.
- Fresh `/dev/luna` evidence is at `/tmp/browser/luna/final_check.py`, `final.log`, and `{width}-{height}-full.png`, `-signin.png`, `-profile-{seat}.png`. Chromium viewport stays 1280×1800; actual containing phone frames use the required dimensions. Sign-in's isolated local canvas is explicitly constrained for the fixture because the desktop visual viewport otherwise supplies 1800px. Filling a synthetic email did not move the G in all four frames. This is not an actual phone keyboard test.
- Fresh screenshots visually reviewed: 320×568 full G/reputation, 390×640 sign-in, and earlier 430×932 photo/map and 320×568 category lists. Maps showed full-colour neighbourhood tiles, attribution and explicitly sample/demo state; provider availability and real-member coordinates were not certified.
- Main posting mock observed zero recognition starts on form entry, one on explicit Record, stopped after Stop, and zero starts on profile long hold; zero page errors. Share was not clicked. Existing transcript/typed-edit/draft identity/retry protections are exercised by the regression suite, not a real microphone or publication test.
- Final suite: **658 passed, 0 failed, 31,770 assertions across 30 files**. Latest automatic preview build: `build OK` at 18:48:30 UTC. No manual build/typecheck.
- Remote auth/data/function requests were mocked or blocked; no real sign-in, profile edits, posts, messages, Sparks or paid provider calls. Physical iPhone Safari/touch/pinch, microphone/haptics, live Cloud persistence and actual Helvetica Neue rendering remain unverified. Intended Helvetica Neue family/fallback is retained; no font acquired or actual-font claim made.

The historical sections below describe earlier, narrower repairs; their 17-unit paint and unchanged-profile statements are superseded by this follow-up.

Supersedes the fixed-left community band and middle-only paint instructions in October 10 notes. No deployment or remote data mutation.

## Causes and repairs
- `LivingG`, `g-weight`: removed the middle-band mask override. The canonical filled outline, rim patch and existing middle closure share 17-unit paint. Camera/orbit measurements remain 28.5 units; canonical path and stage proportions are unchanged. The index loading G uses the same paint.
- `hollow-layout`, `PerimeterToggle`: shared bounds measured from the existing lower curve with normal-distance inner clearance and bead/arm exclusions, recomputed during travel. A closed full-loop mask is used only for map clipping, not to replace the open visible navigation wire. This removes the diagonal map chord.
- `CommunityFeed`, `styles.css`: wishes/borrows/funds right-align; trades/lends left-align. All headings use the received reference-height rule. Header, filters/tools and lower list now have independently measured safe bands; lower curvature or grip no longer drives an unrelated header downward. Titles/handles stay single-line with ellipsis; stored text and details are unchanged. Only lists scroll vertically. Category filters scroll horizontally inside the safe frame.
- `lower-stations`, `community-filter`: overview heading/filter/toggle read `communi-g`; filters follow gives → lends → trades → communi-g → funds → borrows → wishes without moving physical seats. Map is an adjacent view action, not a category filter. Lower-12 all-type map and S/back remain.
- `CommunigyMap`, `map-view`: default zoom 15 around selected/permitted centre or labelled demo centre. Removed radius/pin fitBounds; radius is not changed by zoom. Map remains mounted through list/detail, preserving pan/zoom. Full-colour tiles, compact safe-area cards/attribution, and map pointer interaction retained; unknown coordinates stay unknown.

## Checks performed
- Chromium live-preview screenshots and assertions at 320×568, 390×640, 390×844 and 430×932, both `/dev/communi-g` and the actual `/` → lower-loop entry, using origin-scoped browser fixture state and blocked remote backend requests.
- All seven categories: heading, right/left alignment, title nowrap, no page overflow, no header/interior intersection with the toggle. Map/list toggles retain category and sort. Trade pin opens its detail and returns to the same map.
- Continuous lower-angle pure checks cover usable bounds, toggle exclusion and at least 18px sampled wire-centre clearance, preserving the physical lower route.
- Browser runs produced zero page runtime errors. Deliberately blocked remote profile reads are not live-cloud verification; existing floating-point track hydration warnings are not treated as verified fixes.
- Final local suite: 653 tests passed, zero failed. Automatic harness build reported `build OK`; no manual build or cloud writes.

## Limits
Physical iPhone Safari/touch and live signed-in persistence are not verified. The reference images are now received: their X is screenshot-viewer chrome used only as a height reference, not an app control. Draft, voice, profile and email source were not changed by this repair.

## Received-reference follow-up — October 11, 04:45 request

The initial reference pass removed the 56/96 split, but retained an artificial 214px header minimum and the old tall-screen projection. The 05:01 follow-up completes this repair: measure actual title layout width (not entry-transformed width) and the separate 32px map/list action, with 6px spacing. Each element must clear the curve and full grip/arm; their empty union need not. At lower 12 the title and list action occupy opposite safe sides of the central grip at the same height. Controls and feed remain independently measured.

The lower-loop fit now uses a shared bounded smooth viewport contribution to uniform scale plus a smooth narrow-frame horizontal grip orbit adjustment. All paint, attachment and map mask consume the same frame and unwrapped angle. The measured canonical curve, aspect ratio, station angles/order, full-G pose and profile camera are unchanged; no independent camera animation, distorted loop or seat-specific layout offset was introduced.

### Actual rendered heading tops (CSS px from app-frame top)

These are `[data-cg-head]` bounding-box tops, not the whole phone or Safari chrome. Both main `/` → map seat → bottom loop and `/dev/communi-g` produced identical positions. Each category's list and map views produced the same values.

| frame | gives | lends | trades | communi-g | funds | borrows | wishes | lower-12 map |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 320×568 | 56 | 56 | 56 | 56 | 56 | 56 | 56 | 56 |
| 390×640 | 56 | 56 | 56 | 56 | 56 | 56 | 56 | 56 |
| 390×844 | 56 | 56 | 56 | 56 | 56 | 56 | 56 | 56 |
| 430×932 | 56 | 56 | 56 | 56 | 56 | 56 | 56 | 56 |

Filters/tools start at 100px and list/results at 200px for all seven sections and their maps. Lower-12 tools start at 102px and results at 202px to clear the central grip. Heading boxes start at 56px; painted title spans start at 61px due to the retained 5px internal top spacing. Text remains 17px for contextual headings, 13px for filters/tools, 15px for listing titles, 12px for handles. No font shrinking was used. Narrow-screen measured titles include gives 140px and wishes 154px, rather than an invented 214px minimum.

### Evidence and geometry limits
- Chromium ran 120 settled entry/category/view checks with isolated local sample fixtures, no restored real session, all remote requests and internal write requests blocked. The main-app entry was actually navigated using its existing map seat and bottom-loop action.
- The latest Chromium run exercised 120 settled main/dev category/view checks and 699 animation-frame samples during keyboard-driven seat traversal. Actual title, action, controls and feed rectangles cleared the measured wire by at least 18px and the full attached grip/arm exclusion (0.05px layout-rounding tolerance). Zero page runtime errors. Evidence: `/tmp/browser/height/results.json`, `verify.log` and per-frame/seat screenshots. This is browser evidence, not physical iPhone Safari evidence.
- List/category-map switches retained category. Maps showed real sample marker elements, honest tile-unavailable feedback and attribution while external tile requests were intentionally blocked; this is not live map-service verification.
- The previous 170–226px placements were incomplete fit/clearance implementation, not physical impossibilities. All settled section/category-map/lower-12 headings now meet 56px on all four frames; no remaining settled height limitation is claimed.
- Focused regressions: 32 tests passed across five community/geometry suites, 26,069 assertions, zero failures. Tests cover actual longest title width, all-frame 56px placement, independent element clearance, full lower-wheel grip accessibility, canonical station order, continuous joint frame, paint and discovery/map rules. Automatic preview build reported `build OK` at 05:13:01 UTC; manual builds/typechecks are not run under the harness workflow.
- Physical iPhone Safari/touch, real microphone/haptics, live map tiles and signed-in Cloud persistence remain unverified. Remote requests and all writes were blocked; no production publication occurred. The pre-existing S/back transition can extend the invisible grip hit area about 2.6px outside the 320px frame at intermediate angles 43–50; its visible grip and settled back seat remain on screen. The S path was not changed by this height-only repair.