# Fix: password never saves, so the community never opens

## What is actually happening

I traced both symptoms in the running app. The underlying store logic is fine — when a password is stored, publishing a give works and the community unlocks immediately (verified live, including after a refresh). The failure is in the profile-setup screen and the gate it feeds:

1. **The password silently refuses to save.** My g only stores the password when the two fields match *and* the password passes all four rules — including "one special symbol". A normal password like `Password1` fails (confirmed), and the only feedback is a tiny low-opacity line ("not saved yet — see above") that is easy to miss. So the person believes they set a password when nothing was stored.
2. **A missing password blocks publishing a give.** The publish gate requires handle + birthday + 18+ + password (or a signed-in account). No password means the give is never created (confirmed: it returns "set a password in my g to publish this").
3. **No give means the community stays locked.** The community door only ever asks "are you a giver?" — it never says the real reason is an unfinished account, and it offers no way to fix it.

So: one hidden validation failure cascades into "my give won't publish" and "the community won't open".

## The fix

**Password**
- Relax the rules to something a person actually types: 8+ characters, and at least one letter and one number. Drop the mandatory symbol and mandatory uppercase (capitals stay welcome, never required).
- Make the outcome unmissable: the confirmation reads in the profile's own editorial type, not hidden meta type — "password saved" in the give-green, or a plain sentence naming exactly what is still needed ("a few more characters", "these two don't match").
- Save on a real gesture too, not only as a side effect of typing, so leaving the field commits the password.
- Keep the password reachable after setup (my settings) exactly as now.

**Publishing**
- Stop the local password from gating a publish. The password belongs to the way *in* (sign-in), not to the act of giving. The publish gate becomes: a chosen @name, a birthday, and 18+. This alone removes the dead end the user hit.
- When a publish is refused, the reason is stated at the top of the form in readable type, with a direct way to my g.

**The community door**
- When the account is incomplete, the door says which one thing is missing and takes the person straight there; otherwise it keeps today's "are you a giver?" invitation and the give route.
- Keep the Cardinal Giver Rule intact: one active give of your own still unlocks the community, permanently.

## Technical notes

- `src/data/account.ts` — `PASSWORD_RULES` relaxed; `publishEligibility` no longer returns the `password` reason.
- `src/components/profile/AboutForm.tsx` — commit password on blur as well as on match, promote `PasswordState`/`PasswordRules` to the editorial type registers (`g-body`/`g-meta` per the canon, no new ad-hoc sizes).
- `src/components/profile/CategoryForm.tsx` — surface `problem` at the top of the form in readable type.
- `src/components/community/CommunityLocked.tsx` — accept the missing-account reason and route to my g.
- No visual/interaction change to the Living G, its geometry, colours or depth stack.
- Verified after the change on a phone-sized viewport: set a plain password, publish a give, community opens, and everything survives a refresh.
