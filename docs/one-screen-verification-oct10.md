# One-screen records, intake and voice — verification (10 Oct 2026, preview)

Isolated demo data; every non-auth write was blocked in the test browser. Speech was simulated by replacing the browser recogniser; a real iPhone microphone and haptics are NOT proven.

## Listing details (dev communi-g review page, every category)
| viewport | result |
| --- | --- |
| 320×568 | all fit, no overflow, no text under 11px, none under the bead. trades at 0.88 type step; fund at 0.88 + dense rows, flowing around the bead |
| 390×640 | all fit at full size except fund (0.88 step) |
| 390×844, 430×932 | all fit at full size |

## Main G voice and intake (390×844 unless noted)
- deliberate record tap → listening, interim and final words shown in the lower hollow; the opening words step aside, no overlap
- stop keeps the final words and the next question
- tapping the mode word opens the same draft; in-form record shows interim/final words, stop keeps them; typed answer survives later speech; escape folds and reopening returns the same draft
- "a kids bike in good condition, pick up in the west end…" now fills where = the west end (previously "good condition")

## Review sheet
| viewport | result |
| --- | --- |
| 430×932, 390×844 | fits one screen |
| 390×640 | about 16px over after dense step → scrolls inside its own area |
| 320×568 | about 70px over after dense step → scrolls inside its own area (discard / continue sit below share) |

## Not verified
- opening a listing from someone's profile end to end in the main app (it uses the same compact layout in code)
- real iPhone microphone, keyboard and haptics
