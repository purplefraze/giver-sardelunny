# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026. Communi-gy rules (sections 2 to 5) updated 28 Sep 2026: curved track.

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

## 2. Curved track mechanic

Frazer's Communi-gy rules, 28 Sep 2026 (curved track replaces the straight rectangular track).

- The screen frame is the outline (perimeter) of the phone screen. It stays a rectangle because Communi-gy pages are working surfaces, such as forms to fill in and chats back and forth, and these cannot live inside a circle.
- **Immersion.** Inside Communi-gy the view is zoomed into the lower loop. The loop is drawn as a red circle wider than the screen, so the whole loop is never on screen.
- **Curved track.** The track is the lower loop's own arc, not the frame's straight edges. The toggle knob slides along that red arc.
- **Frame follows the knob.** The screen frame moves with the knob's position on the curve. Because the frame is the screen, the loop is what pans on screen: the knob and the stretch of arc around it (out to the neighbouring dot on each side) are always kept in view, pushed towards the loop's outer side. At 6:00 the knob is at the bottom centre, at 9:00 at the middle of the left side, at 3:00 at the middle of the right side, and at 12:00 at the top centre. In between it eases smoothly along an inner path.
- **Zoom.** The loop is as large as it can be while the knob's two neighbouring dots still fit across the screen's width at 6:00 and 12:00, where the arc runs across the narrow side of the screen. That keeps the loop wider than the screen and the nearby dots visible.
- **Toggle.** The toggle is a hollow red ring on the arc, with the red track running through it. Holding and dragging it slides it along the curve, clockwise or counter-clockwise, as far as you like, and the frame goes with it. The knob stays on the line from the screen centre to the finger. On release it settles at the nearest clock position. Arrow keys step from position to position.
- **Dots on the arc.** Each clock position has a seat-indicator dot, in that seat's colour, on the same red arc at its seat angle. The dots are evenly spaced along the curve, 45° apart, the same spacing as the wheel, and they pan with the arc. Dots that are far round the loop are off screen, and the neighbouring dots on either side of the knob are always on screen. The toggle covers the dot of the position it is on. Tapping a dot slides the knob, and the frame, to that position.
- The system is taught through use, never explained.

## 3. Lower loop (Communi-gy)

- The toggle orbits the middle loop.
- **Entry at 6:00.** At the 6:00 seat you enter Communi-gy, and the view zooms into the lower loop with the knob at 6:00 on its arc, at the bottom centre of the screen.
- The knob's clock position on the lower loop's arc sets the page. The lower loop uses the wheel's seat positions: each clock position from ~1:30 to ~10:30 means the same mode on both loops. The stops, listed by clock position:

  | Position | Stop |
  | --- | --- |
  | 12:00 | Exit to the full living G: the toggle is at 6:00 on the middle loop, and the G is solid red |
  | ~1:30 | Give (community gives) |
  | 3:00 | Lend (community lends) |
  | ~4:30 | Trade (community trades) |
  | 6:00 | Communi-gy everything map (home, the entry position) |
  | ~7:30 | Fund (community funds) |
  | 9:00 | Borrow (Communi-G Borrows) |
  | ~10:30 | Wish (Communi-G Wishes) |

- **12:00 is the exit.** My G's 12:00 seat is not a page inside Communi-gy. Releasing the knob at 12:00, or tapping the 12:00 dot, returns to the full living G with the toggle at 6:00 on the middle loop and the G solid red. Dragging past 12:00 without letting go does not exit, and the arrow keys skip 12:00. The back arrow remains available.
- Tapping an action on a page (for example Wishes or Give) slides the knob (and the frame with it) along the lower loop's arc to that mode's clock position.
- The page swaps strictly per mode.
- **Always red.** While zoomed in, the lower loop and the toggle are red (#E8322B) in every mode. The only thing that changes with the mode is the text colour inside the screen frame, which is that seat's colour. The red loop marks the community and appears red only in this zoomed view.
- The profile is locked until the toggle is at 12:00 on the middle loop.

## 4. Direction, open and closed loops

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-gy.
- **Full G.** The middle loop is always drawn closed. The bottom loop is always drawn open (gapped): keep that negative space.
- **Zoomed in.** The lower loop is drawn closed (a full circle) while inside Communi-gy, so the knob can travel all the way round the curve in either direction.
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
- Communi-gy: the zoomed-in lower loop and its toggle stay red in every mode; only the text inside the screen frame takes the mode colour (section 3).

---

*Approved by Frazer, 27 Sep 2026; Communi-gy rules updated 28 Sep 2026 (curved track). Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
