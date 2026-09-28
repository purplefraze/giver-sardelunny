# G navigation + colour spec

**Status:** Approved by Frazer, 27 Sep 2026.

This document is the design source of truth for G navigation and G colour.
**The code does not match it yet.** Nothing in the app has been changed to follow this spec; it is recorded here as the target.

Spellings are exact: **Communi-gy** is the place; **Communi-G Wishes** and **Communi-G Borrows** are the stop names.

---

## 1. Rectangle mechanic

- The screen is a rectangle.
- The toggle is locked at 12:00 on the rectangle and never moves relative to it.
- The rectangle travels the track, so the toggle appears to move around the loop.
- This is how all screens propagate.

## 2. Lower loop (Communi-gy)

- The toggle orbits the middle loop.
- At 6:00 you enter Communi-gy, and the screen becomes a rectangle on the lower loop.
- The stops on the lower loop, listed in position order running counter-clockwise from 6:00:

  | Position | Stop | Colour |
  | --- | --- | --- |
  | 6:00 | Communi-gy everything map (home) | — |
  | 9:00 | Communi-G Borrows | borrow colour (the lighter purple of the Borrow seat) |
  | ~10:30 | Communi-G Wishes | purple |

- The lower-loop stops mirror the wheel seats: 9:00 Borrow, ~10:30 Wish.
- The page swaps strictly per mode.
- The frame stays red, and the page takes the mode colour.
- From the map, dragging up to 12:00 on the middle loop gives the full G at My G.
- The profile is locked until the toggle is at 12:00 on the middle loop.

> **Open: confirm stop order.** Frazer listed the stops as "6:00 home; ~10:30 Wishes; 9:00 Borrows". Counter-clockwise from 6:00 on a clock face reaches 9:00 before 10:30. The positions above (6:00, ~10:30, 9:00) are recorded exactly as given; only the listing order follows position.

## 3. Direction

- Counter-clockwise is primary.
- Clockwise is allowed inside Communi-gy.
- The lower loop is OPEN (gapped) on the full-G view. Keep that negative space.
- The loop CLOSES while inside Communi-gy, so the rectangle can travel freely both ways.

## 4. Colour (critical)

- The G is ALWAYS one solid colour: never two-tone, tie-dye, gradient, blended or multi-colour.
- No loop differs from the rest.
- This holds at sign-in.
- The G's colour is the colour of the seat the toggle is on.
- You are blue.
- Other members' content stays red.
- Mode chrome takes the mode colour.
- Granting mixes blue with their colour into the seat's hue.
- Communi-gy: the frame stays red; the page takes the mode colour.

---

*Approved by Frazer, 27 Sep 2026. Mirrors the Navigation System and Colours pages in The Giver Bible (Notion).*
