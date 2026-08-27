# Why publish is blocked, and the three fixes

## 1. The password — diagnosed, confirmed

I read the profile actually stored on your device: your `@name` and birthday are there, **the password is not**. So the publish gate is telling the truth — it just never got a password to check.

Why it silently failed:

- The password only saves when *both* fields match **and** all four rules pass (8+, uppercase, lowercase, special symbol). If any of that isn't true, nothing is stored and nothing says so.
- In "my settings" the second field only appears after you type in the first, so a single-field entry never saves.
- The capital-letter complaint is a display bug, not a rule: the password input uses the shared `g-name` type style, which forces `text-transform: lowercase`, so with "show" on your capitals *render* lowercase. The typed value is fine — it just looks rejected.

Fix:

- Password inputs opt out of the lowercase transform and of mobile auto-capitalisation/autocorrect, so what you type is what you see.
- The four rules are always visible while typing (not only after the first character), each ticking as it's met, with an explicit state line: "not saved yet" → "saved".
- The "again, exactly" field is always present in both onboarding and settings, so there's no invisible second step.
- A signed-in dev account already has a real password. `publishEligibility` will accept "signed in with an account" as satisfying the password requirement, so being signed in is never blocked by a second local password.

Result: publishing a give, and therefore the community, unlocks.

## 2. A real "publish" action on the give/wish/trade form

Today the form autosaves silently and the only way out is a small "← back to my g", so nothing tells you the give went live. Adding:

- A clear primary action in the world's own colour and display type at the end of the form: **"publish give"** (wording per world: publish give / publish lend / publish wish / publish trade).
- A confirmation line right after it once it lands: "it's live in communi-g" — plus the existing haptic tick.
- If the account gate blocks it, the reason prints on that same button's line and points to my g (unchanged behaviour, just visible where you pressed).
- Autosave of the draft stays exactly as it is; the button is the moment of publishing, not the only save.

## 3. Both parties acknowledge it happened, then sparks settle

The rules already exist in the connection model — claim → "did this happen?" → mutual yes → sparks settle once, "no" parks it as disputed — but **no screen ever calls them**, so nothing can complete. Surfacing them:

- In a conversation, once the exchange has actually started, one quiet line: **"this happened"**.
- Pressing it puts the connection in *awaiting* and prints "waiting for @them to confirm".
- The other person sees **"did this happen?" · yes / no** in their own conversation.
- Mutual yes → verified, sparks settle exactly once, the existing spark flash fires, and the item reads "completed and verified".
- "no" → disputed; nothing settles, the conversation stays open, nobody is paid.
- The same acknowledge / confirm state appears in the connections list so it can be answered without opening the thread.
- Because it's one connection record shared through the existing cloud messaging bridge, the claim and the confirmation cross between real testers (and to you, in the admin console, when the counterpart is a sample profile).

## Technical notes

- `src/data/account.ts`: `AccountFacts` gains an "account exists" input; `publishEligibility` treats a signed-in account as password-satisfied.
- `src/data/my-profile.ts` `canPublish()` passes the session fact through.
- `src/components/profile/AboutForm.tsx`: `Secret` input styling + always-on rules + saved-state line.
- `src/components/profile/CategoryForm.tsx`: publish action, confirmation line, problem line moved beside it.
- `src/components/connection/Conversation.tsx` and `ConnectionsList.tsx`: wire `claimComplete` / `respond` from `src/data/connections.ts`; no new state model.
- `src/data/cloud/messaging.ts`: carry the claim/confirm state alongside messages so both devices agree.
- No change to Living G geometry, colour tokens, or typography registers.
