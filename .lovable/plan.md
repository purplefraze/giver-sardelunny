# Fix the post-onboarding first-use state

## Confirmed causes

- The index route calls `seedDevelopmentProfileOnce()` before reading any stores. On a fresh preview this inserts the current-user photo/profile, marks `built: true`, adds “science tutoring” and the other current-user activities, and completes onboarding.
- The empty Living G branch currently checks only `!me.built`; it does not model `onboarding complete + profile setup incomplete` as an explicit lifecycle state.
- Onboarding completion currently records onboarding and optionally awards Sparks, but it does not establish a clean current-user first-use boundary.
- Sample community items are stored separately from current-user items, but the normal mode rendering exposes them as soon as the incorrect seeded profile makes the app believe setup is complete.
- Toggle pointer handlers already stop propagation and distinguish tap from drag; this boundary will be retained and verified rather than redesigned.

## Implementation

### 1. Separate onboarding completion from profile completion
- Extend the persisted lifecycle with an explicit profile-setup completion timestamp/state.
- Derive first use only from the exact state: onboarding complete and profile setup incomplete.
- Keep profile setup independent from onboarding and mark it complete only when the user intentionally exits/completes Set Up Your Profile.
- Migrate legitimate existing built profiles without turning a fresh or reset user into a completed profile.

### 2. Remove automatic current-user demo hydration
- Stop automatically applying the development profile fixture during normal app startup.
- Keep sample people and their community records available for onboarding/demo/community use, but never project them into the current user.
- Keep “Restore development profile” as an explicit development action only.
- Update reset/replay/skip development paths so “complete onboarding” produces the same empty first-use state as the real flow.

### 3. Establish a clean post-onboarding boundary
- When a genuinely new onboarding journey completes, clear current-user profile fields, current-user activities, and current-user drafts before entering first use.
- Preserve only the earned onboarding Spark balance when the Spark interaction was completed; do not surface balances, messages, badges, photos, or profile content on the first-use G.
- Do not clear the separate sample-community records.
- Make this transition idempotent so refreshes do not repeatedly erase data.

### 4. Render the explicit empty Living G
- In first use, render only the Living G, normal background, intended starting toggle position, and `my g` in the top/profile circle.
- Pass no photo, badge, Sparks display, tutorial copy, middle-loop blocks, bottom-loop blocks, community labels/counts, placeholders, or contextual destinations.
- Keep middle and bottom empty for every toggle seat while profile setup remains incomplete.
- Route intentional taps from top, middle, bottom, and the Living G body/stroke to Set Up Your Profile.

### 5. Preserve toggle play without navigation
- Let the toggle snap among Give, Wish, Trade, and Borrow and recolor the whole G using the established world colors.
- Show only the landed mode name; do not populate either loop or open another screen.
- Keep pointer capture, movement threshold, and propagation blocking so pointer down/move/up/cancel on the toggle cannot reach the Living G setup handler.

## Verification

- Run the true new-user path through completed Spark gifting and confirm the next frame contains only the empty Living G and `my g`.
- Test Give, Wish, Trade, and Borrow by both tap and drag: verify color/name changes, both content loops stay empty, and no navigation occurs.
- Tap each loop and the G stroke outside the toggle: verify each opens Set Up Your Profile.
- Refresh before completing profile setup: verify the same empty first-use state returns with no seeded profile or activities.
- Complete profile setup, refresh, and verify normal real-user profile/activity rendering begins only then.
- Exercise development reset, skip/complete, replay, and explicit restore-profile controls to ensure only the explicit restore action loads the demo current user.
- Verify at the current 402×645 mobile viewport and check for runtime console errors.
