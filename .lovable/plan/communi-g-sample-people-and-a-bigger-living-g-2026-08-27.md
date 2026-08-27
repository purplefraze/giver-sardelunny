# Communi-G, sample people and a bigger Living G

A single pass over the things that currently get in the way: your own gives being invisible in communi-g, thin sample content, Giulia repeating herself, sample people never confirming an exchange, profile type collisions, confusing publish wording, and a Living G that isn't using the screen it has.

## 1. See your own gives in communi-g

Confirmed cause: the community list is built with `excludeOwnerId: ME_ID`, so your own published items are filtered out by construction.

- Your items stay in the flow, marked as yours in your own identity colour rather than as another person.
- New organising row: **all · latest · nearby · popular · category · my gives**. Category opens the existing eight human topics as words, not chips.
- On your own item: **edit** and **remove** in place (edit reopens the same create surface; remove archives, never silently deletes).
- Sort/filter words stay words — no chips, no bars, no icons.

## 2. More sample activity: 4 gives, 3 wishes, 3 borrows, 3 trades

Written by hand in the sample fixtures (with real windows, places and cadence, like the existing flagship items), spread across the sample people and themed:

- music (records, gear, a jam, mixing help)
- burning man (playa build help, a bike loan, a costume trade)
- performance (rehearsal space, a photographer swap, a slot at a show)
- influencer / content (a shoot, editing help, a ring light loan)
- skate / onewheel (a board loan, a lesson, spare wheels)

Each carries the same structured details as existing seeds so they read and filter correctly.

## 3. Giulia stops repeating herself

Today the demo replies pick the first matching rule and return the same sentence for the same question. Change:

- Each rule gets several phrasings; which one is used depends on the conversation so far, so she never says the same line twice in a row.
- A reply must be answerable from what is actually stored on her item. When it isn't, she says so plainly in her own voice instead of a stock line.
- Openings, follow-ups and closings differ, and she references the specific activity you're talking about.

## 4. Sample people can confirm "this happened"

Right now only a real counterpart can answer a completion claim, so an exchange with a sample person never settles.

- When you claim it happened with a sample person, they confirm in their own voice, then sparks settle through the existing verified/settle path — no new payment logic.
- Wording per world: **wish granted** · **give gifted** · **trade traded** · **borrow returned** · **lend returned**.

## 5. Profile fixes

- The three photo beads: their word label is placed so it can never sit over profile copy — it gets its own reserved lane beside the photo, and the copy below starts under the beads' travel.
- Prompt answers: the sentence builder becomes properly intelligent — if the person typed part of the question back ("what makes me happy is my dogs"), the duplication is removed and one clean standalone sentence is rebuilt, first person on your profile, third person on someone else's. It must read correctly whether the answer is a fragment, a full sentence, or an echo of the question.
- **A wall.** People you've actually connected with can leave you a compliment on your profile. Only connected people can write; it reads as a short signed line, not a comment thread.

## 6. Publishing wording

- The loud action becomes **publish to communi-g** (in the world's colour, at display size).
- After it's live: the confirmation line stays, plus a clear **add another give / wish / trade / borrow** action.
- Both are readable — no faint tracking-hidden type.

## 7. A bigger Living G

Same geometry, same anchors, same frame, same spatial relationships — only scaled up. The stage currently caps the frame at 99% of the available height and 100% of width; it will take the full usable box so the frame (artwork plus the selector's whole travel) fills as much screen as it can without moving the G or clipping any part of it or the ear selector. Verified at 402x645 and on a tall phone that nothing crosses the frame edge.

## 8. Notifications permission

Asked once, at the right moment — the first time something is actually waiting for you (a message or a confirmation), never on first load. Declining changes nothing else, and everything keeps working without it.

## Technical notes

- `communityItems` gains an "include mine" mode; the feed owns sorting, category and the my-gives view. No new store.
- New sample items are added to the sample member fixtures and their hand-written details map, so they re-derive cleanly and stay admin-editable.
- `src/data/demo-replies.ts` becomes variant-based and conversation-aware; still deterministic, still local, still switchable from the dev panel.
- Sample confirmation goes through the existing connection lifecycle (`confirm` → verified → `settle`), with sample-side confirmation gated to sample owners only.
- Prompt sentence rebuilding lives in `src/data/prompts.ts` (question-echo stripping plus the existing first/third-person transforms), so every surface gets it.
- The wall is a new persisted record keyed by profile, written only by connected members, mirrored to the shared backend like items and messages.
- Living G scale is a change to the canonical size in `GStage.tsx` only — `g-path`, anchors and the selector are untouched.
