# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026.

This document is the design source of truth for G navigation and G colour.
The build does not yet match this spec.

Spellings are exact: **Communi-gy** is the place; **Communi-G Wishes** and **Communi-G Borrows** are the names of the Wish and Borrow stops.

---

## 1. Wheel (middle loop) and seat colours

- The toggle rides the middle loop and docks at seats around the wheel.
- Counter-clockwise from 6:00 is the primary direction. Moving right from 6:00 you pass Fund, Lend, Give, My G, Wish, Borrow and Trade, then return to Communi-gy.
- Seats by clock position, in that order:

  | Position | Seat | Colour |
  | --- | --- | --- |
  | 6:00 | Communi-gy (Map / Search) | bright red, #E8322B |
  | ~4:30 | Fund | brown: clay, #9E4B2C |
  | 3:00 | Lend | a rich, playful forest green: energising, not too dark. Hex to be chosen. |
  | ~1:30 | Give | bright green |
  | 12:00 | My G | turquoise / seafoam blue, energising |
  | ~10:30 | Wish | bright, fun purple: Prince purple, #9D00FF |
  | 9:00 | Borrow | pinkish purple. Hex to be chosen. |
  | ~7:30 | Trade | orange |

- Opposite pairs:
  - Communi-gy (6:00) opposite My G (12:00).
  - Give (~1:30) opposite Trade (~7:30).
  - Lend (3:00) opposite Borrow (9:00).
  - Wish (~10:30) opposite Fund (~4:30).

## 2. Rectangle mechanic

- The rectangle is the outline (perimeter) of the phone screen.
- It is a rectangle because Communi-gy pages are working surfaces, such as forms to fill in and chats back and forth, and these cannot live inside a circle. The rectangle is the closest a page can get to the loop.
- The toggle always sits at 12:00 on the top edge of the phone perimeter and never moves relative to it.
- Behind the page, faded, is a zoomed-in portion of the G's lower loop. The toggle rides that line, and the page's position fades in relation to where it sits on the lower loop.
- The rectangle travels the track, so the toggle appears to move around the loop.
- This is how all screens propagate.
- The system is taught through use, never explained.

## 3. Lower loop (Communi-gy)

- The toggle orbits the middle loop.
- At 6:00 you enter Communi-gy, and the screen becomes a rectangle on the lower loop.
- The lower loop mirrors the middle loop's clock: each clock position from ~1:30 to ~10:30 means the same mode on both loops. The stops, listed by clock position:

  | Position | Stop |
  | --- | --- |
  | 12:00 | Exit to the full living G: the toggle is at 6:00 on the middle loop, and the G is solid red |
  | ~1:30 | Give |
  | 3:00 | Lend |
  | ~4:30 | Fund |
  | 6:00 | Communi-gy everything map (home) |
  | ~7:30 | Trade |
  | 9:00 | Borrow (Communi-G Borrows): borrow colour, the pinkish purple of the Borrow seat (hex to be chosen) |
  | ~10:30 | Wish (Communi-G Wishes): purple |

- Tapping an action on a page (for example Wishes or Give) quickly moves the rectangle around the lower loop to that mode's clock position.
- The page swaps strictly per mode.
- The page takes that mode's colour, and the Communi-gy rectangle's frame stays red. The frame is the screen frame inside Communi-gy, not the G's loop.
- The 12:00 position on the lower loop takes you back to the view of the full living G. The toggle is at 6:00 on the middle loop, and the G is red: solid red, because the toggle is on the 6:00 seat.
- The profile is locked until the toggle is at 12:00 on the middle loop.

## 4. Direction

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-gy.
- The lower loop is open (gapped) on the full-G view. Keep that negative space.
- The loop closes while inside Communi-gy, so the rectangle can travel freely both ways.

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
- Communi-gy: the Communi-gy rectangle's frame stays red; the page takes the mode colour. This is the screen frame inside Communi-gy, not the G's loop.

---

*Approved by Frazer, 27 Sep 2026. Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
