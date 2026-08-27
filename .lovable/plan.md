# Make Giver a genuinely shared, permanent test app

## Confirmed problem

The live backend currently contains 18 profiles (14 generated test profiles plus 4 samples), one shared give, and no conversations, messages, notifications, invites, or boosts. There are no accounts or profiles named Kenneth or Frank.

The shared link currently lets a visitor complete My G, choose a username/password, and publish without creating a real account. Those values and several core interaction records are saved only in that phone's browser. That is why people can believe they joined while remaining invisible to everybody else.

This is broader than post sync:

- Real backend persistence exists for profiles, items, conversations, messages, notifications, and boosts.
- The app still treats local browser storage as authoritative for the profile, activity list, connections, completion claims, verification, spark settlement, history, and compliment wall.
- Browser notification permission exists, but notifications only appear while the app is open; there is no push subscription or background delivery.
- The separate email sign-in route exists, but the normal Living G onboarding does not require or reliably lead into it.

## Build

### 1. Make every participant a real account

- Fold email + password account creation into the existing My G setup, preserving the Living G experience rather than adding a generic onboarding screen.
- A completed setup must create or sign into a real backend account, then create exactly one profile linked to that identity.
- Username uniqueness is checked against the backend, not only sample fixtures.
- Remove the local hashed password as an identity mechanism. Passwords are handled only by the authentication service and are never stored in profile data or browser state.
- Keep a clear returning-member sign-in path and add the required password-reset flow.
- Preserve invite links, but make the normal shared link usable for all approved test participants; every successful signup receives the tester role while admin assignment remains controlled.
- Never show “joined”, “password saved”, or a publishable state until a valid authenticated session and linked profile actually exist.

### 2. Recover people already caught in the local-only state

- On the next open, detect a built local profile with no authenticated account and ask once for email/password to finish joining.
- After successful authentication, migrate that browser's existing username, birthday, photo, profile copy, and local activities into its new permanent profile.
- Upsert activities by `(owner_id, local_id)` so retries and refreshes cannot duplicate them.
- Keep all local data intact until the backend acknowledges the migration; show a clear retry state if any part fails.
- Kenneth and Frank can recover what is still on their respective phones by opening the repaired app and completing this one-time account step. Data already erased from a browser cannot be reconstructed because it never reached the backend.

### 3. Make backend data authoritative after sign-in

- Hydrate My G from the signed-in profile before any local mirror can overwrite it.
- Load the signed-in member's own activities as well as everybody else's published activities; reconcile by stable backend IDs/local IDs.
- Persist create, edit, archive/remove, completion status, ordering, media references, and boost state immediately, with visible success/failure feedback.
- Keep local stores as responsive UI caches only. After sign-in, the backend wins on refresh, another phone, logout/login, or conflicts.
- Add explicit error handling to every sync write; no silent `.insert()`, `.upsert()`, or `.update()` failures.

### 4. Make every real profile discoverable and interactable

- Directory, search, Communi-G, item detail, and profile views all consume the same backend member identity.
- A real person's post opens that real person's profile; “message” and exchange intent resolve their backend profile ID, never the sample/demo path.
- New profiles and posts arrive live through realtime subscriptions, with refresh polling as a fallback.
- Preserve the Cardinal Giver Rule: a signed-in person still needs an active give to enter Communi-G, but the qualifying give must be durably stored first.

### 5. Persist the complete exchange lifecycle

Add durable records for the current lifecycle rather than leaving them in browser storage:

- connection/intent between the item owner and helper
- state: connecting, awaiting confirmation, verified, disputed, cancelled
- completion claimant and both parties' confirmations
- borrow/lend handover and return state
- idempotent spark settlement and permanent exchange history
- compliment wall entries, restricted to members with a verified connection

All writes use authenticated identity from the session and backend row-level policies; caller-supplied ownership cannot impersonate another member. Mutual verification remains required before completion or spark settlement.

### 6. Make messaging work immediately and durably

- Starting an intent creates one durable connection/conversation, protected against duplicates.
- Messages write directly to that conversation and render for the recipient through realtime updates; reconnecting or refreshing reloads full history.
- Unread/read state is backend-backed per recipient rather than inferred only from local mappings.
- Remove the browser-only conversation-ID bridge as the source of truth; retain it only during one-time migration if needed.
- Sample replies remain distinct and admin-controlled; real people always use the real-person path.

### 7. Deliver real notifications

- Keep the in-app notification inbox in the backend and create notifications transactionally for messages, intents, completion claims, confirmations, wall compliments, and relevant activity interactions.
- Add an authenticated push-subscription table scoped to user/device, a service worker, and Android Chrome/PWA push registration.
- Ask permission only after a meaningful user gesture, as Giver already intends.
- Send background push notifications when the app is closed; tapping one opens the relevant conversation, activity, or profile.
- Unsupported or denied notification permission remains a safe no-op; in-app notifications still work.

### 8. Security and administration

- Apply schema changes through migrations with grants, RLS, indexes, uniqueness constraints, and `service_role` grants for every new public table.
- Users can modify only their own profile, posts, subscriptions, and side of an exchange; participants alone can read their conversations; wall writing requires a verified connection.
- Add an admin-only test-member reset action that deletes selected test accounts and all dependent records after explicit confirmation. Nothing expires or disappears automatically before Fraser performs that reset.
- Existing sample profiles remain available and separate from real tester accounts.

## Acceptance test before declaring this fixed

Use two newly created non-admin accounts in separate clean browser contexts and verify the complete flow against stored backend rows:

1. Account A signs up from the shared link, builds/edits a profile, uploads a photo, publishes each activity type, then refreshes and signs out/in.
2. Account B signs up independently and immediately sees A's profile and published activity; A sees B's.
3. B expresses interest and messages A; A receives it live, after refresh, and after reopening the app.
4. Verify Android push delivery with the recipient app backgrounded/closed, plus correct notification deep-linking.
5. Both parties complete the appropriate give/wish/trade/borrow lifecycle; verify mutual acknowledgement, borrow return rules, one-time spark settlement, history, and item status on both accounts.
6. Verify profile edits, post edits/removal, media, compliments, unread/read state, and all records after refresh and logout/login.
7. Attempt cross-user ownership changes and non-participant conversation access; confirm both are rejected.
8. Inspect the final backend rows for both accounts. Report authenticated flow, persistence, realtime delivery, and background push separately; do not claim any path is fixed unless that exact test passes.

## Scope preserved

Living G geometry, spatial navigation, colour language, haptics, copy voice, sample profiles, and the existing interaction model remain intact. This change replaces false local membership with durable shared membership; it does not redesign Giver.
