# Giver — mobile-first prototype

One shape. Three Gs. Different meanings.

## 1. The Living G as a fixed asset

Trace the attached reference into a single reusable SVG component (`LivingG`) built from stroked paths on one shared viewBox, matching the reference silhouette: small open ring top-right, large open ring upper body, the S-curve spine that links it into the large open lower ring, identical stroke weight and round caps throughout.

- Geometry is authored once and never altered per screen. Only colour changes.
- Tracing is done against pixel measurements of the uploaded image (ring centres, radii, stroke width, gap openings) so proportions, spacing and openings match rather than being eyeballed as three circles.
- No font glyph, no redrawn g.
- The visible strokes are non-interactive. Interaction lives in a separate overlay layer of large invisible hit shapes (top band, middle band, bottom band) sized to the regions of the G, so taps never require hitting a thin stroke and the G looks identical whether or not a region is active.
- Props: `palette` (colour token set), `regions` (labels + handlers per region), `showLabels`.

## 2. Onboarding

Single flow, no tab bar, minimal chrome.

1. **Welcome** — huge type: "Welcome to Giver." Kindness is currency.
2. **Sparks** — "Lucky you." / thanks for joining / 100 Sparks to start / 50 yours to use, 50 yours to give. Sparks shown as energy (spark marks, counters), never a wallet or balance sheet. Then "Want to make your first act of generosity now?" with a bold **Let's give** and a quiet text-only **Maybe later**.
3. **Meet members** — Maya (Wishing), John (Giving), Sofia (Trading). Each is presented inside a Living G shaped around them, not a card: top region = their current Wish/Give/Trade, middle = their photo/identity, bottom = About Me. Tapping a region reveals that snippet in place. Move between the three people by swiping/arrows.
4. **Give the 50** — choosing a person triggers a celebratory moment: spark burst animation, scale swell, haptic buzz where supported, then "Yippee. You just made your first act of generosity on Giver." No modal chrome, no transaction language.
5. Transition into the three-G app, landing on Home.

"Maybe later" skips straight to Home; the 50 give-away Sparks stay unspent.

## 3. The three-G system

Horizontal pager with exactly three full-viewport panes: Community ← Home → Profile, starting on Home.

- Swipe/drag with snap-to-pane; releases always settle on one pane, never halfway.
- Track is `100vw` panes inside an `overflow-hidden` viewport, so no horizontal overflow and no clipped Gs or text.
- Tiny three-dot / word indicator at the top; no tab bar, no menus.

Each pane: one very large G filling most of the mobile canvas, a short world word, nothing else.

| World | Top | Middle | Bottom |
| --- | --- | --- | --- |
| Home | Search | Wish | Give |
| Profile | My Activity | Me | About Me |
| Community | Community Map | Community Wishes | Community Gives |

Each region presses independently (scale swell + colour response + haptic) and opens its own minimal sheet/screen: Search = one big input with a few mock results; Wish and Give = one-line "what do you wish for / what are you giving" plus a confirm; Profile regions reveal mock activity, identity, About Me; Community regions reveal a placeholder map panel and short mock wish/give lists.

## 4. Colour

Three bold solid palettes driven entirely by CSS variables in `src/styles.css`, applied per pane via a data attribute — no colours hardcoded in components, no gradients. Prototype direction:

- Home: acid lime-green G on off-white, black type (closest to the reference).
- Profile: black G on bright yellow.
- Community: white G on deep teal.

Type: Helvetica-like grotesque, enormous headline sizes, generous white space.

## 5. Scope

No backend, auth, database, or Spark ledger. All state is in-memory React state (Sparks count, chosen recipient, current pane). Mock data only for the three members and community lists.

## Technical notes

- `src/components/living-g/LivingG.tsx` — traced SVG + region hit overlay; `regions.ts` for hit-area rects; palettes as token sets.
- `src/routes/index.tsx` — onboarding + app shell (the prototype is one route; onboarding step and pane are local state so swiping stays smooth). Route `head()` gets Giver-specific title/description/OG tags.
- Pager: pointer/touch drag with translateX and a snap on release; iPhone-sized viewport is the reference (390×844), with `overscroll-behavior-x: contain` and `touch-action: pan-y` on the track.
- Haptics via `navigator.vibrate` guarded by feature detection.
- Self-check before delivery: verify each of the nine regions fires its own action, the pager snaps from every drag distance/direction, and no horizontal scroll exists at 390px.

## Assumptions

Third member is Sofia (Trading) unless you'd prefer another name. Palette above is a starting point and swappable via tokens.
