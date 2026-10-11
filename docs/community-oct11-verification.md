# October 11 community correction — preview verification

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