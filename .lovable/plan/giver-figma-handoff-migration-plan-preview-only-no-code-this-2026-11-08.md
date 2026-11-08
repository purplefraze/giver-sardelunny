# Giver — Figma handoff migration plan (preview only, no code this turn)

## Can I use the node links directly?
No. This sandbox has no live Figma access: there is no cloud Figma connector, and no desktop Figma session is connected. A node URL alone gives me no layers, measurements, copy or branch logic. Your text inventory confirms that the nodes exist, but it does not contain their contents. So that I don't guess at the design, I can only build each screen from exported per-screen material (listed below), or after you connect the Lovable Desktop app to Figma's local server.

## Status of each source
| Source | Node | Status | Use |
|---|---|---|---|
| Living G B balanced component | 554:2096 | APPROVED | canonical shape/framing |
| Framing reference | 554:2103 | APPROVED | camera/fit |
| Six-seat layout | 554:2256 | APPROVED | seat positions |
| Wish violet journeys | 424:2136 / entry 427:2096 | APPROVED | first implementation target |
| Give flow studies | 0:1, 131:2 | EXPLORATION | needs a pick of one path per branch |
| Lend/Trade/Borrow/Fund | 497:2095 (510:2135, 497:2116, 497:2136, 497:2156) | REVIEW | design input only, not final |
| Wider connected framing | 477:2096 | REVIEW, non-authoritative | ignore unless promoted |

## What's missing before reliable implementation
1. **Six-seat vs eight-seat conflict.** The approved layout has six seats; the current app and its project rules have eight (My G 12, give 1:30, lend 3, trade 4:30, communi-g 6, fund 7:30, borrow 9, wish 10:30). I need the exact six-seat angles and which two worlds are removed or merged. If this changes the rules, the Bible needs updating.
2. **Living G B geometry.** An SVG export of the shared centreline (554:2096): path data, viewBox and stroke spec. I won't redraw the curve from screenshots.
3. **Wish journey (424:2136).** It has 295 top-level children, so I need the screen order and branch map: which answer leads to which screen, plus a PNG and spec (copy, type size, spacing, colours) for each canonical screen, separated from discarded variants.
4. **Give.** One chosen path each for item and food, and the conditions that branch between them. The studies are not a spec.
5. **Lend/Trade/Borrow/Fund.** For each: confirmation of whether REVIEW can be implemented provisionally behind a flag, plus a screen map and question list. Fund also needs its limit and disclaimer copy, and the funds safeguards that must hold at each step.
6. **Colours.** Lend is undecided (#BEF43D or #D5F238), and Borrow is unsettled. Until you decide, both stay on the current tokens and are flagged provisional.
7. **Shared steps.** Specs for the calendar, photo, location (approximate/privacy), review, Record and Share screens: which branch uses each, and how each looks in its empty, error and permission-denied states.
8. **Small phones.** 320px variants, or a rule for adapting them; the Figma frames may only be drawn at one width.

## Migration plan once the assets arrive
1. **Shape:** replace the shape data with the approved B shape behind the existing locked renderer, then check stroke, joins and the lower opening at 320/390/430 against 554:2103.
2. **Seats:** apply the six-seat layout only after gap 1 is resolved. Update the seat table, colour tokens and tests.
3. **Shared intake framework:** a data-driven journey definition (screens, questions, branch conditions) feeding the existing draft store, so each type's journey is configuration, not a hand-built screen sequence. Old journey sequences get removed, not kept as fallbacks.
4. **Wish** end to end first (approved), then Give (once a path is chosen), then the four REVIEW types behind a provisional flag.
5. **Keep as-is:** auth/sign-in, draft identity and autosave, typed-edit protection, deliberate Record/Stop, separate explicit Share with the share coordinator, private birthday, approximate location, Fund safeguards.
6. **Verification:** isolated fixtures with writes blocked; real viewports at 320x568, 390x640, 390x844 and 430x932; focused tests per branch condition; screenshots compared side by side with the Figma exports. No database changes, auth changes, new providers or publishing.

## What I need from you
Either connect the Desktop app to Figma (Dev Mode → Enable desktop MCP server → Lovable Settings → Connectors → Local MCP servers), or attach these exports:
- the B shape as SVG;
- the six-seat angles;
- the Wish screen map with per-screen PNGs and specs;
- the chosen Give paths;
- the Lend/Trade/Borrow/Fund screen maps, plus a yes/no on building them provisionally;
- the colour decisions for Lend and Borrow.

Once the shape SVG and the Wish material arrive, I start with steps 1, 3 and 4 (Wish).
