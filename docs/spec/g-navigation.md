# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026. Communi-gy rules (sections 2 to 5) updated 28 Sep 2026: the red perimeter stroke is the track, the page never tilts, and the toggle is a hollow circle in the seat colour with the seat word inside.

This document is the design source of truth for G navigation and G colour.
The build does not yet match this spec.

Spellings are exact: **Communi-gy** is the place; **Communi-G Wishes** and **Communi-G Borrows** are the names of the Wish and Borrow stops.

---

## 1. Wheel (middle loop) and seat colours

- The toggle rides the middle loop and docks at seats around the wheel.
- Seat positions and colours: Frazer's direct call, 28 Sep 2026. Going clockwise from 6:00 you pass Fund, Borrow, Wish, My G, Give, Lend and Trade, then return to Communi-gy. Counter-clockwise remains the primary direction (section 4).
- Seats by clock position, in that order:

  | Position | Seat | Colour |
  | --- | --- | --- |
  | 6:00 | Communi-gy (Map / Search) | red, #E8322B |
  | ~7:30 | Fund | brown: clay, #9E4B2C |
  | 9:00 | Borrow | pinkish purple, #C77DD6 |
  | ~10:30 | Wish | bright purple: Prince purple, #9D00FF |
  | 12:00 | My G | bright blue, #1E7BFF |
  | ~1:30 | Give | bright green, #4BE01E |
  | 3:00 | Lend | yellow-green, #B5D334 |
  | ~4:30 | Trade | orange, #FF6A13 |

- Red is only ever the 6:00 seat.
- Opposite pairs:
  - Communi-gy (6:00) opposite My G (12:00).
  - Give (~1:30) opposite Fund (~7:30).
  - Lend (3:00) opposite Borrow (9:00).
  - Wish (~10:30) opposite Trade (~4:30).

## 2. The red perimeter stroke is the track

Frazer's Communi-gy rules, 28 Sep 2026 (7:08 AM call). These replace the "page rides the lower loop" version: the dots and the leaning, shrinking page are gone.

- **The page never moves.** Each Communi-gy page is a full-size rectangle on a solid white background, always upright, full size and filling the screen. It never rotates, scales or shifts and has no shadow, not even mid-drag. It stays a rectangle because Communi-gy pages are working surfaces, such as forms to fill in and chats back and forth, and these cannot live inside a circle.
- **The track is a thin red stroke.** A thin red (#E8322B) stroke runs round the page's perimeter, just inside the screen edge: a rectangle with rounded corners that follow the loop's feel. It is the visible path the toggle travels. Its weight is a third of the toggle ring's stroke (3px on a 390px-wide screen), so it reads as a track without being heavy and belongs to the ring's stroke family.
- **The stroke never crosses the content.** The page's content sits in its own box inside the stroke, clipped to it. The stroke sits the toggle ring's outer radius plus a few pixels (plus the safe area) in from each screen edge, so the whole toggle, which centres on the stroke, always stays on screen.
- **No seat markers.** Seats have no dots or ticks, 12:00 included. Each seat is where the stroke faces that clock position: the middle of the bottom, left, right and top edges for 6:00, 9:00, 3:00 and 12:00, and the middle of each rounded corner for the diagonals.
- **Toggle.** The toggle is the main G's toggle ring, at exactly the same size, stroke width and title type: a hollow circle in the colour of the current seat, with an opaque white interior (nothing shows through) and the seat's word inside in the seat colour, lowercase Helvetica Neue with +0.08em tracking, centred and upright. The words are communi-g (6:00), fund, borrow, wish, give, lend and trade. The toggle sits on the red stroke and centres on it.
- **Moving the toggle.** Hold and drag the toggle round the stroke, clockwise or counter-clockwise, as far as you like. While it is held, its colour and word change to the nearest seat, as on the main G; at 12:00 it reads "my g" in my g's blue (#1E7BFF), because letting go there goes back to the full G. On release it snaps to the nearest seat along the stroke and the page content switches to that mode. Arrow keys step from seat to seat.
- **Tapping the stroke.** Tapping the stroke near a seat (within about 22px of it along the stroke, anywhere between the screen edge and the content) goes to that seat.
- The system is taught through use, never explained.

## 3. Lower loop (Communi-gy)

- The toggle orbits the middle loop.
- **Entry at 6:00.** At the 6:00 seat you enter Communi-gy. The page opens upright and full screen, with the toggle on the red stroke at the bottom centre, reading communi-g in red.
- The toggle's clock position on the stroke sets the page. Communi-gy uses the wheel's seat positions: each clock position from ~1:30 to ~10:30 means the same mode on the wheel and on the stroke. The seats, listed by clock position:

  | Position | Seat |
  | --- | --- |
  | 12:00 | Exit to the full living G: the toggle is at 6:00 on the middle loop, and the G is solid red |
  | ~1:30 | Give (community gives) |
  | 3:00 | Lend (community lends) |
  | ~4:30 | Trade (community trades) |
  | 6:00 | Communi-gy everything map (home, the entry position) |
  | ~7:30 | Fund (community funds) |
  | 9:00 | Borrow (Communi-G Borrows) |
  | ~10:30 | Wish (Communi-G Wishes) |

- **12:00 is the exit.** My G's 12:00 seat is not a page inside Communi-gy. Releasing the toggle at 12:00, or tapping the stroke at top centre, returns to the full living G with the toggle at 6:00 on the middle loop and the G solid red. Dragging past 12:00 without letting go does not exit, and the arrow keys skip 12:00. The back arrow remains available.
- Tapping an action on a page (for example Wishes or Give) carries the toggle round the stroke to that mode's clock position.
- The page swaps strictly per mode.
- **Colours.** Inside Communi-gy the perimeter stroke and the Communi-gy chrome are red (#E8322B) in every mode. The toggle takes the colour of the seat it is on, and the page's text takes that seat's colour.
- The profile is locked until the toggle is at 12:00 on the middle loop.

## 4. Direction, open and closed loops

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-gy.
- **Full G.** The middle loop is always drawn closed. The bottom loop is always drawn open (gapped): keep that negative space.
- **Inside Communi-gy.** The track is the closed red stroke round the page, so the toggle can travel all the way round it in either direction.
- The traced G path data is never edited to open or close a loop; the closed middle loop is achieved at render time.

## 5. Colour (critical)

- The G is always one solid colour: never two-tone, tie-dye, gradient, blended or multi-colour.
- No loop differs from the rest.
- This holds at sign-in.
- The G's colour is the colour of the seat the toggle is on.
- The bottom loop, sign-in included, is red only when the toggle is at 6:00 (Map / Search). In every other seat it is the seat colour, the same as the rest of the G: purple in Wish, green in Give, and so on. The G is never two-tone.
- You are blue.
- Other members' content stays red.
- Mode chrome takes the mode colour.
- Granting mixes blue with their colour into the seat's hue.
- Communi-gy: the perimeter stroke stays red in every mode; the toggle and the page's text take the seat colour (section 3).

---

*Approved by Frazer, 27 Sep 2026; Communi-gy rules updated 28 Sep 2026 (the red perimeter stroke is the track; the toggle is a hollow circle in the seat colour with the seat word inside). Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
