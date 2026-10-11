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

The old 56/96 seat split and all-content 220px rectangle were removed. One 56px app-frame reference drives every header. Header clearance uses a 36px strip with room for the existing 17px contextual heading and adjacent map action; controls follow by 8px in their own 92px band. Lower lists grow independently to their curve/grip limit. No path, camera, seat, paint, provider, record or cloud logic was edited.

### Actual rendered heading tops (CSS px from app-frame top)

These are `[data-cg-head]` bounding-box tops, not the whole phone or Safari chrome. Both main `/` → map seat → bottom loop and `/dev/communi-g` produced identical positions. Each category's list and map views produced the same values.

| frame | gives | lends | trades | communi-g | funds | borrows | wishes | lower-12 map |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 320×568 | 170 | 60 | 56 | 56 | 56 | 56 | 170 | 102 |
| 390×640 | 56 | 56 | 56 | 56 | 56 | 56 | 56 | 102 |
| 390×844 | 72 | 106 | 88 | 138 | 88 | 102 | 72 | 102 |
| 430×932 | 66 | 114 | 144 | 226 | 144 | 112 | 66 | 102 |

Filters/tools start 44px after the heading; list/results start 144px after it in these settled checks. Text remains 17px for contextual headings, 13px for filters/tools, 15px for listing titles, 12px for handles. No font shrinking was used.

### Evidence and geometry limits
- Chromium ran 120 settled entry/category/view checks with isolated local sample fixtures, no restored real session, all remote requests and internal write requests blocked. The main-app entry was actually navigated using its existing map seat and bottom-loop action.
- Both entries additionally exercised pointer travel from give through map in 6-degree input steps at all four sizes. Rendered header, controls and list bounds cleared the visible wire by at least 18px and the full attached grip/arm exclusion; contextual text fit at every sampled step. Zero page runtime errors. Existing track hydration warnings and intentionally blocked tiles/profile requests remain distinct from placement checks.
- List/category-map switches retained category. Maps showed real sample marker elements, honest tile-unavailable feedback and attribution while external tile requests were intentionally blocked; this is not live map-service verification.
- Exact 56px placement is geometrically impossible in some unchanged camera frames: the tall overview's hollow begins below that height; tall side seats have narrow shoulders; the 320px give/wish upper grip blocks the usable heading width. The lower-12 grip occupies y6–102, so its header begins at 102px. These are reported limits, not hidden overlaps or altered geometry.
- Geometry tests include the shared 56px rule, concrete 390×640 positions, unchanged seat/paint/camera rules and continuous band/wire/full-grip exclusions. Browser evidence is not physical iPhone Safari evidence. No production publication or remote data writes occurred.