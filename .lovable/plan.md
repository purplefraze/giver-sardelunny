# Why Kenneth and Frank are invisible to each other

## What the data actually says

I looked at the live backend:

- There is **no account for Kenneth and none for Frank**. The only accounts on the app are my own test ones (alpha…, beta) and the four sample Givers.
- There is exactly **one shared give** in the whole database ("free science tutoring", posted by a test account).
- There are **zero conversations** and zero messages.

So nothing is broken in sync, sharing or permissions. Kenneth and Frank never actually joined the app's shared world.

## The cause

The Living G currently runs perfectly well with no account at all. When someone opens the link and goes through "my g" — username, birthday, password — that all happens **only inside their own phone's browser**. The password is stored locally; no real account is created. The only place a real account exists is the separate sign-in door, and nothing in the app ever sends anyone there.

Consequences, exactly as experienced:

- Their gives live in their own browser only, so nobody else can see them.
- Nobody appears in each other's communi-g.
- Messaging is impossible — a conversation needs two real accounts.
- Clearing the browser or switching phone loses everything, so it doesn't "stay forever".

## The fix

**1. Joining creates a real account.**
The "my g" setup becomes the real door: username, birthday, email, password — and it creates the actual account on Giver's backend, so the same password that gets typed is the password that gets them back in on any phone. No second sign-in screen, no SMS. If the email is already used, it signs them in instead.

**2. Everything they type is carried over.**
Whatever they already wrote locally (username, about, photo, gives) is attached to the new account the moment it's created, so nobody loses their words.

**3. You cannot publish into communi-g without an account.**
Publishing a give already checks username and age; it will also require the account. The message says plainly what's missing and takes them to my g to finish — the draft is never lost.

**4. Real people are visible and messageable.**
Once signed in, real members appear in communi-g and in search alongside the sample people, and touching a person opens a real conversation that the other person receives, with a notification.

**5. Anyone already stuck (Kenneth, Frank, me) gets asked once.**
On next open, if there's a local profile but no account, Giver asks for email and password to finish joining and carries the existing profile and gives up. One quiet moment, in the Living G's own voice — not a new onboarding flow.

**6. Invite links keep working** exactly as they do now, feeding the same door.

## Technical notes

- `AboutForm` / profile setup gains email + password fields wired to `supabase.auth.signUp` (fallback `signInWithPassword`), reusing the logic already in `src/routes/auth.tsx`; the local hashed password path is retired as the source of identity.
- `publishEligibility` in `src/data/account.ts` gains an `account` reason; `CategoryForm` and `CommunityLocked` surface it with a route into my g.
- On first successful session, `bootCloud`'s mirror runs immediately and `pushItems` uploads all existing local items once, so prior local gives become shared records keyed by `local_id` (no duplicates).
- Conversations/messages use the existing `messagingStore`; person tiles for real profiles route through `profileIdForLocal` so a real member opens a real conversation rather than the demo-reply path.
- Living G geometry, colours, depth stack, haptics and all existing interactions are untouched.
