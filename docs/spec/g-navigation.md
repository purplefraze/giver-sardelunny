# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026. Communi-g rules (sections 2 to 4) updated 28 Sep 2026.

This document is the design source of truth for G navigation and G colour.
The build does not yet match this spec.

Spellings are exact: **Communi-g** is the place; **Communi-G Wishes** and **Communi-G Borrows** are the names of the Wish and Borrow stops.

---

## 1. Wheel (middle loop) and seat colours

- The toggle rides the middle loop and docks at seats around the wheel.
- Seat positions and colours: Frazer's direct call, 28 Sep 2026. Going clockwise from 6:00 you pass Fund, Borrow, Wish, My G, Give, Lend and Trade, then return to Communi-g. Counter-clockwise remains the primary direction (section 4).
- Seats by clock position, in that order:

  | Position | Seat | Colour |
  | --- | --- | --- |
  | 6:00 | Communi-g (Map / Search) | red, #E8322B |
  | ~7:30 | Fund | brown: clay, #9E4B2C |
  | 9:00 | Borrow | pinkish purple, #C77DD6 |
  | ~10:30 | Wish | bright purple: Prince purple, #9D00FF |
  | 12:00 | My G | bright blue, #1E7BFF |
  | ~1:30 | Give | bright green, #4BE01E |
  | 3:00 | Lend | yellow-green, #B5D334 |
  | ~4:30 | Trade | orange, #FF6A13 |

- Red is only ever the 6:00 seat.
- Opposite pairs:
  - Communi-g (6:00) opposite My G (12:00).
  - Give (~1:30) opposite Fund (~7:30).
  - Lend (3:00) opposite Borrow (9:00).
  - Wish (~10:30) opposite Trade (~4:30).

## 2. Rectangle mechanic

Frazer's Communi-g rules, 28 Sep 2026.

- The rectangle is the outline (perimeter) of the phone screen.
- It is a rectangle because Communi-g pages are working surfaces, such as forms to fill in and chats back and forth, and these cannot live inside a circle. The rectangle is the closest a page can get to the loop.
- **Immersion.** Inside Communi-g the view is zoomed so far into the lower loop that the whole loop is never on screen. Only the loop's red edges near the rectangle are visible: the bottom edge at 6:00, the left side from ~7:30 to ~10:30, the right side from ~1:30 to ~4:30, and the top edge at 12:00. Between those positions one curved corner of the loop is visible. These visible edges are the track the rectangle travels along.
- **Toggle.** The toggle sits where the rectangle meets the track: on the bottom edge at 6:00, on the left side at 9:00, on the right side at 3:00. The toggle is attached to the rectangle at that contact point and never slides along the rectangle on its own: holding and dragging the toggle carries the whole rectangle around the track, clockwise or counter-clockwise, as far as you like. On release the rectangle settles at the nearest clock position.
- **Perimeter dots.** Each clock position has a seat-indicator dot on the rectangle's perimeter, in that seat's colour. Dots are placed by angle from the rectangle's centre, projected onto its perimeter, at even 45° steps, the same spacing as the wheel. The 9:00 and 3:00 dots therefore sit exactly at the middle of the left and right sides. The toggle covers the dot of the position it is on. Tapping a dot moves the rectangle to that position.
- The system is taught through use, never explained.

## 3. Lower loop (Communi-g)

- The toggle orbits the middle loop.
- **Entry at 6:00.** At the 6:00 seat you enter Communi-g, and the screen becomes a rectangle sitting at 6:00 on the lower loop.
- The rectangle's clock position on the lower loop sets the page. The lower loop uses the wheel's seat positions: each clock position from ~1:30 to ~10:30 means the same mode on both loops. The stops, listed by clock position:

  | Position | Stop |
  | --- | --- |
  | 12:00 | Exit to the full living G: the toggle is at 6:00 on the middle loop, and the G is solid red |
  | ~1:30 | Give (community gives) |
  | 3:00 | Lend (community lends) |
  | ~4:30 | Trade (community trades) |
  | 6:00 | Communi-g everything map (home, the entry position) |
  | ~7:30 | Fund (community funds) |
  | 9:00 | Borrow (Communi-G Borrows) |
  | ~10:30 | Wish (Communi-G Wishes) |

- **12:00 is the exit.** My G's 12:00 seat is not a page inside Communi-g. Releasing the rectangle at 12:00, or tapping the 12:00 dot, returns to the full living G with the toggle at 6:00 on the middle loop and the G solid red. The back arrow remains available.
- Tapping an action on a page (for example Wishes or Give) moves the rectangle around the lower loop to that mode's clock position.
- The page swaps strictly per mode.
- **Always red.** While zoomed in, the lower loop and the toggle are red (#E8322B) in every mode. The only thing that changes with the mode is the text colour inside the rectangle, which is that seat's colour. The red loop marks the community and appears red only in this zoomed view.
- The profile is locked until the toggle is at 12:00 on the middle loop.

## 4. Direction, open and closed loops

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-g.
- **Full G.** The middle loop is always drawn closed. The bottom loop is always drawn open (gapped): keep that negative space.
- **Zoomed in.** The lower loop is closed while inside Communi-g, so the rectangle can travel all the way round in either direction.
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
- Communi-g: the zoomed-in lower loop and its toggle stay red in every mode; only the text inside the rectangle takes the mode colour (section 3).

---

*Approved by Frazer, 27 Sep 2026; Communi-g rules updated 28 Sep 2026. Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
