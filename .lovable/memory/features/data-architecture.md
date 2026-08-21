---
name: Data architecture
description: One canonical record per thing, autosave-as-you-type, no hard-coded copies, single spark balance
type: feature
---

ONE SOURCE OF TRUTH
- All gives/wishes/trades/borrows for EVERY person (mine and sample members) live in `itemsStore` (src/data/items.ts). The person's own fields and the single spark balance live in `myProfileStore` (src/data/my-profile.ts). Drafts live in `draftsStore` (src/data/drafts.ts).
- No screen may keep a second copy of user data (no `member.active[...]` reads, no local editor state that is the truth). Views project the stores.

AUTOSAVE IS THE CONFIRMATION
- Editing an existing record patches the store on change. A NEW record is created automatically once its draft is complete (title >= 3 chars; a trade needs both sides), debounced ~600ms, then every later keystroke patches THAT record via the remembered `liveId`.
- The in-progress draft is persisted separately, so leaving mid-sentence or reloading loses nothing. Back only flushes the pending debounce — it is never the save button. No save button anywhere.
- The record being typed is filtered out of the list above the field so it never appears twice.

SPARKS
- Exactly one balance, `STARTING_SPARKS` (50) at onboarding; never hard-code 50/80/100 elsewhere.
- A wish reserves 10 sparks once, at the single moment the record is created; withdrawal or 7-day expiry refunds. Rewards are keyed in `rewarded[]` so no interaction pays twice. Editing or deleting a give never touches sparks.
