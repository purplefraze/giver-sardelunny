# App changes for the spark lock (01 / 01b) and live-give gate (02)

Server facts (supabase/unapplied):
- Guard trigger `profiles_guard_columns` (01) **silently keeps** old values of
  sparks, sparkles, give_sparks, reserved, sparks_seeded, rewarded,
  welcome_granted_at, is_sample, sample_key (+ user_id). No error is raised.
- 01b revokes column UPDATE: any PATCH naming those columns fails **42501** and
  the *whole* row update (name/about too) is lost.
- Member RPCs: `spend_my_sparks(_amount, _reason, _ref)` — debit `sparks` only,
  errors `bad amount` / `no profile` / `insufficient sparks`, idempotent per
  (kind 'spend', ref). `claim_welcome_grant()` — +50 sparks, +50 give_sparks,
  ref 'welcome'; a replay returns the first ledger row (no "already claimed" error).
- +10 generosity payout is already server-side (connection settlement →
  ledger_events → tagged in spark_ledger).
- 02 gate: connections INSERT, conversations INSERT, messages INSERT (outside a
  connection-bound conversation) fail RLS 42501; connection UPDATE to
  awaiting/verified raises `receiving needs a live give`.

Legend: **DONE** = in the local commit; **NEW RPC** = needs a server function that
does not exist; **DECISION** = product call.

| # | File:line (pre-commit) | Now | Should | Errors / re-read | Status |
|---|---|---|---|---|---|
| 1 | src/data/cloud/boot.ts:127-157 `mirrorMyProfile` | PATCHes sparks, sparkles, reserved, sparks_seeded, rewarded with identity on every change; fallback retries with sparks/sparkles | Send identity only. No client currency write | 01b would fail the whole PATCH 42501 → profile edits lost. After fix: on failure reset `lastPushed` to retry | **DONE** |
| 2 | src/data/cloud/boot.ts:51-65 `restoreCurrencyFromCloud` | Copies server balance into local store once per sign-in | Keep; server is source of truth. Should also read `give_sparks` once regenerated types include it | — | kept (give_sparks read is in new `refreshBalance`) |
| 3 | src/data/cloud/session.ts:300-320 `saveProfile` | Generic `profiles.update(fields)` / insert, then re-reads `my_profile` | Fine as long as callers don't pass protected columns. Optional hardening: strip protected keys | Already re-reads | no change needed |
| 4 | src/data/welcome-grant.ts:79-90 `claimWelcome` (called from src/routes/index.tsx:665) | Local `grantWelcome(50,50)` + `auth.updateUser` metadata `sparks_to_give` | Call `claim_welcome_grant()`, then re-read my_profile → patch sparks/give_sparks/welcomeGranted | RPC missing (pre-migration, PGRST202) → keep local grant; other errors logged; replay is safe (idempotent) | **DONE** (local grant kept as optimistic UI; server value overwrites on success) |
| 5 | src/data/welcome-grant.ts:52-73 `welcomeOwed` | Trusts `user_metadata.welcome_grant_at` / `sparks_to_give` (user-writable!) | Read `profiles.welcome_granted_at` / `give_sparks` via my_profile instead | metadata is forgeable display-only; server ignores it | **TODO** — needs my_profile() in prod to return give_sparks/welcome_granted_at (verify; regenerate types) |
| 6 | src/data/my-profile.ts:606-623 `grantWelcome` | Local balance write | Optimistic only; server value wins via refreshBalance | — | kept |
| 7 | src/data/my-profile.ts:626-650 `seedSparks` (from src/data/first-use.ts:16) | Sets sparks=50, sparks_seeded locally (onboarding "earned" balance) | No client write. Either drop (welcome grant covers it) or **NEW RPC** `claim_onboarding_seed` | Overlaps welcome grant → possible double 50 / drift | **DECISION + maybe NEW RPC** |
| 8 | src/data/my-profile.ts:322-340 `reward` / 541 `earnSparks` (from src/data/connections.ts:184) | Local +10, `rewarded` key list | No client write; server pays on settlement. Replace with `refreshBalance()` after settlement is observed | Without fix local shows +10 that server also pays → equal, but `rewarded` never persists | **TODO** (low risk, but touches connection settle flow; left for review) |
| 9 | src/data/my-profile.ts:438-455 `addItem` wish | Debits 10 into `reserved[item.id]` | **NEW RPC** `reserve_wish_sparks(item_id)` (move sparks→reserved, ledgered) | insufficient sparks → keep draft, show "sparks"; re-read | **NEW RPC** (spend_my_sparks is debit-only and would lose the refund) |
| 10 | src/data/my-profile.ts:567-586 `holdWishCompose` (src/routes/index.tsx:695) | Debits 10 into `reserved.__compose` when composer opens | Client-only UI hold; never persisted. Or **NEW RPC** if holds must be server-side | — | **DECISION** |
| 11 | src/data/my-profile.ts:588-596 `releaseWishCompose` | Refunds compose hold | Pairs with #10 | — | **DECISION** |
| 12 | src/data/my-profile.ts:548-565 `releaseWish` (removeItem refund; connections.ts:187 settle) | Refund to sparks or pass on | **NEW RPC** `release_wish_sparks(item_id, refund)`; settle-to-granter should be done by the connection settlement server-side | refund needs credit, impossible via spend | **NEW RPC** |
| 13 | src/data/my-profile.ts:655-670 `useSparkle` (FullProfile.tsx:359, ActivityDetail.tsx:228) | Local sparkles-1 + item boost | **NEW RPC** `spend_my_sparkle(item_id)` (spend_my_sparks only debits `sparks`), atomically with boost | none left / gate (02 doesn't gate boosts — DECISION) | **NEW RPC** |
| 14 | give_sparks spending | Shown in MyGRing.tsx:559 only; nothing spends it client-side | When "give sparks" are passed on, needs **NEW RPC** (and grant_live_give's semantics) | — | **DECISION** |
| 15 | Wish/fund contributions (`wish_contributions`, Sep 27) | Not in prod; separate reconciliation | Fund contributions must be an RPC, never a balance PATCH | — | out of scope |
| 16 | src/data/cloud/connections-sync.ts:72 connections upsert | Throws raw PostgREST error | Map RLS 42501 to plain gate line | 02 gate → "put a give out first…" ; client startBlock stays as pre-check | **DONE** |
| 17 | src/data/cloud/connections-sync.ts:77 conversations upsert | Error ignored | Check error; on gate rejection surface the same line (connection row exists without a conversation) | | **TODO** |
| 18 | src/data/cloud/messaging.ts:162 conversation insert | Returns null on any error | Return/throw gate reason so UI can say "put a give out first" | 02 conversations policy | **TODO** (UI copy decision) |
| 19 | src/data/cloud/messaging.ts:187 message insert | Returns null silently | Same; message in connection-bound conversation is exempt | 02 messages policy | **TODO** |
| 20 | src/data/cloud/connections-sync.ts:~95 `updateConnection` claim/confirm → src/lib/connections.functions.ts:16 | Throws `error.message` | Map `receiving needs a live give`; after confirm call `refreshBalance()` (server +10, reserve release) | | **TODO** (small; with #8) |
| 21 | src/lib/invites.functions.ts / `joinGiver` | Server creates profile (service role) | Defaults decide starting balance (open question: prod default 250 vs app's 50) | | **DECISION** |
| 22 | is_sample / sample_key | No client writes found (admin sample sends use messages.sent_as_sample) | — | — | none |

## New helper (DONE)
`src/data/cloud/sparks.ts`: `spendSparks`, `claimWelcomeGrant`, `refreshBalance`,
`sparkFailure` (maps insufficient sparks / gate 42501 / no profile / bad amount /
PGRST202 unavailable), `gateLine`. Every successful RPC re-reads `my_profile`.
`spendSparks` has no caller yet: no current client debit is a plain spend
(wish costs are reserves, sparkles aren't sparks).

## Ship order
Apply 01 → deploy this client → apply 01b (01b with the old client loses profile
edits). Shipping this client **before** 01 means balances stop persisting
across devices (local only) until 01 + the reserve/sparkle RPCs exist.
