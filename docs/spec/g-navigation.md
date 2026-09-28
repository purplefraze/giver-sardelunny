# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026. Communi-gy rules (sections 2 to 5) updated 28 Sep 2026: the page rides the lower loop.

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

## 2. The page rides the lower loop

Frazer's Communi-gy rules, 28 Sep 2026. These replace the curved-track version, in which a visible red ring crossed the page.

- **The page is an opaque rectangle.** Each Communi-gy page is a full-size rectangle on a solid white background. It stays a rectangle because Communi-gy pages are working surfaces, such as forms to fill in and chats back and forth, and these cannot live inside a circle.
- **The track is invisible.** The page rides the circle of the lower loop. The loop is the path the page travels, not an element on screen: no part of it is ever drawn on or through the page, and behind the page there is only white.
- **Contact.** The toggle knob is the point where the page touches the loop. It sits on the page's edge, and the page's edge is always tangent to the loop at the knob.
- **Motion.** As the knob travels round the loop, the page pans and rotates with it, so the knob stays on the loop and the page stays tangent to it. While moving, the page leans a few degrees in the direction of travel and shrinks very slightly, and a soft shadow shows its edge against the white. A faint red arc of the loop may appear in the white outside the page. It always lies underneath the page, so it can never cross the content.
- **Settled.** At every stop the page is upright, at full size and fills the screen, with nothing visible around it. The knob rests where the upright page meets the loop at that stop: bottom centre at 6:00, the middle of the left side at 9:00, the middle of the right side at 3:00, top centre at 12:00, and the matching corner at 1:30, 4:30, 7:30 and 10:30.
- **Toggle.** The toggle is a hollow red ring. Holding and dragging it carries the page round the loop, clockwise or counter-clockwise, as far as you like. The stop dots act as waypoints: with the finger on a dot, the page is at that stop, and halfway between two dots it is halfway round the loop between them. On release it settles at the nearest stop. Arrow keys step from stop to stop.
- **Dots.** Each stop has a seat-indicator dot, in that seat's colour, on the page's perimeter. At rest the dots sit at the four edge midpoints and the four corners, in clock order, one per 45° of the loop. As the page rotates, the dots slide round its perimeter so they keep marking where each stop lies. The knob covers the dot of the stop it is on. Tapping a dot carries the page to that stop.
- The system is taught through use, never explained.

## 3. Lower loop (Communi-gy)

- The toggle orbits the middle loop.
- **Entry at 6:00.** At the 6:00 seat you enter Communi-gy. The page opens upright and full screen, riding the lower loop at 6:00, with the knob at the bottom centre.
- The knob's clock position on the lower loop sets the page. The lower loop uses the wheel's seat positions: each clock position from ~1:30 to ~10:30 means the same mode on both loops. The stops, listed by clock position:

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
- Tapping an action on a page (for example Wishes or Give) carries the page round the lower loop to that mode's clock position.
- The page swaps strictly per mode.
- **Always red.** Inside Communi-gy the lower loop, the toggle and the Communi-gy chrome are red (#E8322B) in every mode. The only thing that changes with the mode is the colour of the page's text, which is that seat's colour.
- The profile is locked until the toggle is at 12:00 on the middle loop.

## 4. Direction, open and closed loops

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-gy.
- **Full G.** The middle loop is always drawn closed. The bottom loop is always drawn open (gapped): keep that negative space.
- **Inside Communi-gy.** The lower loop is treated as closed (a full circle), so the page can travel all the way round it in either direction. It is a path only and is not drawn.
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
- Communi-gy: the lower loop and its toggle stay red in every mode; only the page's text takes the mode colour (section 3).

---

*Approved by Frazer, 27 Sep 2026; Communi-gy rules updated 28 Sep 2026 (the page rides the lower loop). Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
