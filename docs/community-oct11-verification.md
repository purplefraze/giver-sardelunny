# October 11 community correction — preview verification

Supersedes the fixed-left community band and middle-only paint instructions in October 10 notes. No deployment or remote data mutation.

## Causes and repairs
- `LivingG`, `g-weight`: removed the middle-band mask override. The canonical filled outline, rim patch and existing middle closure share 17-unit paint. Camera/orbit measurements remain 28.5 units; canonical path and stage proportions are unchanged. The index loading G uses the same paint.
- `hollow-layout`, `PerimeterToggle`: shared bounds measured from the existing lower curve with normal-distance inner clearance and bead/arm exclusions, recomputed during travel. A closed full-loop mask is used only for map clipping, not to replace the open visible navigation wire. This removes the diagonal map chord.
- `CommunityFeed`, `styles.css`: wishes/borrows/funds right-align; trades/lends left-align. Trade/overview request higher placement, bounded by the actual hollow. Headings, filters, rows and separators share safe bounds. Titles/handles stay single-line with ellipsis; stored text and details are unchanged. Only lists scroll vertically. Category filters scroll horizontally inside the safe frame.
- `lower-stations`, `community-filter`: overview heading/filter/toggle read `communi-g`; filters follow gives → lends → trades → communi-g → funds → borrows → wishes without moving physical seats. Map is an adjacent view action, not a category filter. Lower-12 all-type map and S/back remain.
- `CommunigyMap`, `map-view`: default zoom 15 around selected/permitted centre or labelled demo centre. Removed radius/pin fitBounds; radius is not changed by zoom. Map remains mounted through list/detail, preserving pan/zoom. Full-colour tiles, compact safe-area cards/attribution, and map pointer interaction retained; unknown coordinates stay unknown.

## Checks performed
- Chromium live-preview screenshots and assertions at 320×568, 390×640, 390×844 and 430×932, both `/dev/communi-g` and the actual `/` → lower-loop entry, using origin-scoped browser fixture state and blocked remote backend requests.
- All seven categories: heading, right/left alignment, title nowrap, no page overflow, no header/interior intersection with the toggle. Map/list toggles retain category and sort. Trade pin opens its detail and returns to the same map.
- Continuous lower-angle pure checks cover usable bounds, toggle exclusion and at least 18px sampled wire-centre clearance, preserving the physical lower route.
- Browser runs produced zero page runtime errors. Deliberately blocked remote profile reads are not live-cloud verification; existing floating-point track hydration warnings are not treated as verified fixes.
- Final local suite: 653 tests passed, zero failed. Automatic harness build reported `build OK`; no manual build or cloud writes.

## Limits
Physical iPhone Safari/touch and live signed-in persistence are not verified. Exact overview/trade vertical refinement awaits the user's reference image; current placement prioritizes curved-wire clearance. Draft, voice, profile and email source were not changed by this repair.