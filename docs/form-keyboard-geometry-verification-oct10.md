# Creation-form geometry and keyboard preview verification

## Changes
- VoiceEnclosure renders the existing canonical path and existing middle-weight mask/closure, with one uniformly scaled/translated camera. No path-data changes or nonuniform perimeter deformation.
- Removed the old warped-outline renderer from this entry path. Defined the enclosure's mask tokens locally; without those tokens only the separate restoration arcs were visible.
- Camera keeps the top/bottom rim visible; narrow-screen side arcs may extend offscreen. Content margins avoid the painted rim.
- Entry does not focus a text field. Captured enclosure dimensions and SVG remain fixed while visualViewport changes affect only content. Focused fields can scroll within the content above the keyboard.
- VoiceReview presents one microphone warning within the form; removed its extra stopped-listening warning.

## Verified
- Main application at 320×568, all six modes: give, wish, trade, borrow, lend, fund.
- No initial text focus; deliberate answer-field click; simulated visualViewport height 568→300→568.
- SVG bounding rectangle and complete SVG innerHTML unchanged across keyboard simulation and dismissal in all six modes.
- Captured hidden/shown screenshots for all six modes under `/tmp/browser/form-keyboard/`; visually reviewed Fund final images for rim and field/control clearance.
- Inward two-touch pinch simulation closes all six forms. No remote mutation allowed: guard blocked eight background write attempts. No publishing.
- Mock asynchronous microphone denial renders exactly one `.gv-problem` in Fund. This is not a physical permission test.
- 21 focused tests pass (63 assertions); automatic preview build reports OK.

## Limitations / unresolved
- Chromium viewport simulation is not physical iPhone/Safari keyboard, microphone or haptic verification.
- Four opaque pageerror values (`Object`) occurred during signed-in startup with writes blocked. Their cause is not established; do not claim a clean runtime run.
- All-mode rendered geometry/keyboard invariance and pinch passed, but no new end-to-end Share or Cloud persistence check was attempted.
- Existing canonical rim patch/closure joins remain visible at this enlarged scale; the path itself is unchanged. The parent connection at the lower-right edge is retained, not treated as disposable artwork.
- Earlier one-screen detail/review findings and other roadmap tasks are not resolved by this scoped repair.