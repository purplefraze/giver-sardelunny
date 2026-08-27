# Why "publish my give to communi-g" feels like nothing happens

## What I found in the code

The give form saves silently as you type: 600ms after the words are complete, the autosave already creates the record and marks it published. So by the time you press the big publish line, the give is usually **already live** — the press only patches it, wipes the fields, and sets a confirmation sentence.

That confirmation is rendered at the very bottom of the form, underneath your whole list of existing gives, so on a phone it lands off-screen. The visible result of pressing publish is: your words disappear and nothing else changes. There is also no way from that moment into communi-g to look at what you just posted, and if you have hit the per-category limit the publish line is not rendered at all.

(One thing I could not confirm from code alone: whether your specific press is also being refused by the account gate. The reason line is printed at the top of the form, which is equally off-screen on a phone — the plan fixes that too.)

## The fix

**Publishing becomes a real, deliberate moment**
- Autosave keeps protecting the words you typed (the draft), but it stops quietly creating the live record. The record is created when you press publish — that press is the publishing.
- Editing an existing give still saves continuously as it does today.

**You always see the result of the press**
- The confirmation appears where you pressed, in the world's own colour and display type: "it's live in communi-g" — with the existing haptic tick.
- Anything that refuses the publish (account not finished, spark balance, limit reached) prints in the same place instead of only at the top of the page, and scrolls into view.
- At the category limit, the publish line stays present and explains itself rather than vanishing.

**Two clear ways onward**
- **add another give** — clears the field, keeps you in the form (wording per world: give / lend / wish / trade / borrow).
- **see it in communi-g** — leaves the form and opens communi-g already scoped to **my gives**, so the thing you just posted is the first thing you see, with its interactions and notices attached.

## Technical notes

- `src/components/profile/CategoryForm.tsx`: split autosave from publish — the debounced effect writes only to `draftsStore`; `save()` creating a new item is called only from `add()`. Move the `problem`/`live` lines next to the publish action, scroll them into view on press, and keep the publish action rendered when `full`.
- Add an `onSeeInCommunity` prop, wired in `src/routes/index.tsx` to close the editor and open the community depth.
- `src/components/community/CommunityFeed.tsx`: accept an initial scope so it can open on `mine`; internal scope switching is unchanged.
- No change to Living G geometry, colours, depth stack, haptics or notification behaviour.
- Verify on a phone-sized viewport: publish once, see the confirmation, jump to communi-g, see the give under my gives, and confirm it survives a refresh with no duplicate record.
