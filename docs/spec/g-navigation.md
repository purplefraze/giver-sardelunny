# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026. Communi-g spatial nav (sections 2 to 5) updated 29 Sep 2026: the phone rectangle rides the lower loop's arc; the toggle stays fixed at 12:00 on the rectangle; snap on midpoint.

This document is the design source of truth for G navigation and G colour.

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

## 2. Communi-g lower-loop navigation

Frazer's unified lower-loop nav, 29 Sep 2026 (via Luna).

- **One system.** The red arc is the track — a full circle, cropped by the phone frame so each seat only shows the arc where that seat sits.
- **Empty canvas.** Inside the loop is white only (surface for later). No title, map, pins, or page content.
- **Toggle.** Always fully visible. Rides the arc at the active seat. Seat-coloured ring, opaque white centre, seat name inside.
- **Track stroke.** Red (#E8322B). Stand-in `TRACK_STROKE = 32` CSS px, matched to Frazer's reference crops (~24–37px on a 390-wide phone). Substantial, not hairline, not a chunky frame. No box border on the viewport.
- **Seats (clock order).** 6:00 communi-g #E8322B · 7:30 fund #9E4B2C · 9:00 borrow #C77DD6 · 10:30 wish #9D00FF · 12:00 my g #1E7BFF (exit) · 1:30 give #4BE01E · 3:00 lend #B5D334 · 4:30 trade #FF6A13.
- **Snap.** Midpoint cross → magnet home in ~200ms. Drag both ways. Reverse before the midpoint snaps back.
- **Exit.** Lower-loop 12:00 opens the full living G with the toggle at middle-loop 6:00.

## 3. Lower loop (Communi-g)

- The toggle orbits the middle loop.
- **Entry at 6:00.** At the 6:00 seat you enter Communi-g. The page opens upright and full screen, riding the lower loop at 6:00, with the toggle at the top centre of the rectangle.
- The rectangle's clock position on the lower loop sets the mode. The seats, listed by clock position:

  | Position | Seat |
  | --- | --- |
  | 12:00 | Exit to the full living G: the toggle is at 6:00 on the middle loop, and the G is solid red |
  | ~1:30 | Give (community gives) |
  | 3:00 | Lend (community lends) |
  | ~4:30 | Trade (community trades) |
  | 6:00 | Communi-g everything map (home, the entry position) |
  | ~7:30 | Fund (community funds) |
  | 9:00 | Borrow (Communi-G Borrows) |
  | ~10:30 | Wish (Communi-G Wishes) |

- **12:00 is the exit.** My G's 12:00 seat is not a page inside Communi-g. Snapping to 12:00, or tapping the 12:00 perimeter seat, returns to the full living G with the toggle at 6:00 on the middle loop and the G solid red. Dragging past 12:00 without crossing its midpoint does not exit, and the arrow keys skip 12:00. The back arrow remains available.
- Tapping an action on a page (for example Wishes or Give) carries the rectangle round the lower loop to that mode's clock position.
- **Colours.** Inside Communi-g the red track and the contact stroke stay red (#E8322B) in every mode. The toggle takes the colour of the seat the rectangle is on, and the page's text takes that seat's colour.
- The profile is locked until the toggle is at 12:00 on the middle loop.
- Bottom loop label on the My G seat is just "communi-g".

## 4. Direction, open and closed loops

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-g.
- **Full G.** The middle loop is always drawn closed. The bottom loop is always drawn open (gapped): keep that negative space.
- **Inside Communi-g.** The lower loop is treated as closed (a full circle), so the rectangle can travel all the way round it in either direction. The living G and the red track stay put behind the page.
- The traced G path data is never edited to open or close a loop; the closed middle loop is achieved at render time.

## 5. Colour (critical)

- The G is always one solid colour: never two-tone, tie-dye, gradient, blended or multi-colour.
- No loop differs from the rest.
- This holds at sign-in.
- **Normal world colour lock:** the G letter stays blue #1E7BFF; seat colour is air/field and toggle only.
- Inside Communi-g the red track / seat-coloured text behaviour of section 3 holds (this brief overrides screen motion only).
- You are blue.
- Other members' content stays red.
- Mode chrome takes the mode colour.
- Granting mixes blue with their colour into the seat's hue.

---

*Approved by Frazer, 27 Sep 2026; Communi-g spatial nav updated 29 Sep 2026 (rectangle rides the curve; toggle fixed at 12:00; snap on midpoint). Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
