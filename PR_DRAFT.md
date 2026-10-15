# DRAFT — security: spark lock + server-side live-give gate

**Draft for founder review. Nothing applied to production or any Supabase project. Do not merge.**
Every SQL file is in `supabase/unapplied/` (never auto-applied). Tested only on a local throwaway Postgres 17 with synthetic accounts.

## Migration order
1. `20261015_01_spark_lock.sql`: Fix 1. Standalone on top of prod's Aug-27 schema.
2. `20261015_02_live_give_gate.sql`: Fix 2. Independent of 01, but apply after it.
3. `20261015_01b_spark_column_revoke.sql`: column-level UPDATE revoke. **Apply only together with the client follow-up PR** (see Risks).

- **Not required:** Sep-23 `profile_sparks_sync`, Sep-27 `wish_contributions`, `give_trust`, `grant_live_give`.
- **If Sep-23 lands later:** 01 already guards `reserved`/`sparks_seeded`/`rewarded`. It looks them up by name at runtime, and this was tested with Sep-23 present.
- **`give_trust.sql`:** it calls `public.owns_profile`/`public.is_admin`, which prod dropped on Aug 27. As written it **will fail on prod**. It needs a rewrite to `app_private.*` before anyone applies it. Nothing here depends on it.
- **`grant_live_give.sql`:** 02 copies its blocks 1 and 3 (live-give definition, connections gate, receiver trigger), routed through one `may_act()` hook. If someone applies grant_live_give later, its block 4 re-creates `give_sparks` (IF NOT EXISTS, same column) and a second welcome-grant function (`claim_welcome_grant` returns `profiles` there, `spark_ledger` here). **Conflict:** pick one before applying both.

## Fix 1: Sparks can't be edited by members
- **Guard trigger** on profiles. Protected columns: `sparks`, `sparkles`, `give_sparks`, plus `reserved`/`sparks_seeded`/`rewarded`/`welcome_granted_at` when present, plus `is_sample`/`sample_key`/`user_id`.
  - Client roles: protected values are silently kept on UPDATE and reset to defaults on INSERT. Name/bio edits in the same PATCH still save.
  - `is_sample` had to be locked too. Today a member can set `is_sample=true` on their own row, and that would exempt them from the gate.
- **`public.spark_ledger`:** append-only (no client writes, UPDATE/DELETE trigger raises), owner-readable.
  - An AFTER UPDATE audit trigger logs **every** balance change, including the existing +10 connection payout (`kind='connection'`) and service_role edits.
- **`app_private.adjust_sparks()`:** SECURITY DEFINER, service_role only. Row lock, no negative balance, idempotent per `(profile, kind, ref)`.
- **Client RPCs:**
  - `spend_my_sparks(amount, reason, ref)`: debit only.
  - `claim_welcome_grant()`: +50 to wish (`sparks`) and +50 to give (`give_sparks`), once per profile.
- **New hole found and closed:** Aug-27 granted `authenticated` EXECUTE on `app_private.update_connection_state(_actor_user_id, …)`. Any member could confirm a connection **as the counterpart** and mint the +10 payout.
  - The grant is revoked.
  - `public.update_my_connection_state` is now SECURITY DEFINER and always passes `auth.uid()`.
- **01b:** replaces table-level UPDATE with a column list excluding protected columns, computed from the live catalog so it matches prod's real columns.

## Fix 2: first-Give gate at the DB
`app_private.may_act(p)` = admin OR `live_give_exempt(p)` (sample profiles only, for now) OR `has_live_give(p)`.
- **Connections:** the helper must pass `may_act`. Connecting on a wish also needs the wish owner to pass it ("receiving").
- **Receiving:** the `connections_receiver_live_give` trigger blocks moving to awaiting/verified when the receiver has no live give.
- **Conversations:** the starter must pass `may_act`.
- **Messages:** the sender must pass `may_act`, or the conversation must be bound to a connection (handoffs don't go dark when a give expires).
- **New `conversations_guard` trigger:** members can't change `a_id`/`b_id`/`item_id`/`connection_id`. Before this, a member with no give could re-point a conversation at a connection to get the message exemption, or swap in anyone as `b_id`. A connection-bound conversation must be between that connection's two people.

## Test results (local Postgres 17, synthetic accounts): 57 pass / 0 fail
`PGHOST=… PGPORT=… supabase/tests/run_local.sh`. Full output is in `supabase/tests/RESULTS.txt`.

Three runs:
1. **Prod-shaped:** shim, then Aug-27 ×12, then a prod-drift shim (column-level SELECT on profiles + `my_profile()`), then 01, 02, 01b. **50/50.**
2. **Rollback blocks of 01b, 02, 01:** Aug-27 behaviour returns, ledger kept. **4/4.**
3. **Sep-23 present:** `reserved` etc. are guarded, Sep-23 default respected. **3/3.**

Proven to still work:
- Profile edits.
- 100-spark welcome grant (50/50, once).
- Spend.
- Giver +10 on a mutually confirmed lesson, with the receiver's balance unchanged.
- Messaging after a live give.
- Handoff chat after expiry.
- Admin acting as sample.
- service_role adjustments.

Proven blocked:
- Direct sparks/sparkles/give_sparks/is_sample edits.
- Insert with a chosen balance.
- Calling adjust_sparks or update_connection_state directly.
- Writing the ledger.
- Connect/converse/message without a live give.
- Connecting on a giveless member's wish.
- Settling when the receiver's give has expired.
- Conversation re-pointing.

## Rollback
Each file ends with a `ROLLBACK` block (begin…commit). `run_local.sh` executes those exact blocks in reverse order (01b → 02 → 01), and the tests confirm they work. `spark_ledger` and `give_sparks` are kept by default.

## Risks / client follow-up (needed before or with apply)
- **Balances stop syncing from the client.** `src/data/cloud/boot.ts` PATCHes `sparks`/`sparkles`/`reserved`/… from local state. After 01 those values are silently ignored, so local balances will drift from the server until the client:
  - reloads balances from the server,
  - spends via `spend_my_sparks`,
  - stops sending currency.
  Client-side earns (seed, rewards) need server RPCs or they stop persisting.
- **01b + current client = broken profile saves.** The whole PATCH fails with 42501, so name/bio saves break. Apply 01b only with the client change.
- **Gate errors in the UI.** After 02, writes that `community-access.ts` blocks will also fail server-side. Check the UI handles RLS errors.
- **Prod drift is a stand-in.** The prod-drift shim is an approximation (assumed hidden columns: birthday/gender/answers). Re-run against a real schema-only dump.
- **The gate is cheap to satisfy.** "Live give" = any published, active, unexpired give the member posted themselves, so a throwaway give passes. give_trust's verification block is superseded.

## Open questions (founder decisions — not resolved)
1. Are the **three free wishes** exempt from the gate? Hook: `app_private.live_give_exempt`.
2. What counts as **"receiving"**? Implemented: settling a connection to awaiting/verified as the receiver, and others connecting on your wish. Should it also block receiving messages, or being the `b_id` of a new conversation? (Currently not blocked.)
3. Should messaging inside an existing connection survive the give expiring? (Currently: yes.)
4. **Welcome grant is additive.** Prod's column default is `sparks=250, sparkles=3` (Aug-27); Sep-23 changes it to 50/0. Should new accounts start at 0 so grant = exactly 100? Which welcome-grant implementation wins (this one vs grant_live_give block 4)?
5. Should `reserved` holds move to a server RPC too? (Today they're locked; holds won't persist from the client.)
6. Should the give-handoff +10 continue? (grant_live_give block 6 says no sparks on a give's handoff; current prod pays the give owner. Left unchanged.)

## Not verified
- Prod catalog was not queried: no read-only access was available, and none was used. The prod facts are from the 15 Oct audit (second-hand).
- The Notion audit page was not read.
- Not run on a Supabase branch DB. Local Postgres only, with a hand-written Supabase shim (roles, `auth.uid()`). PostgREST behaviour wasn't exercised.
