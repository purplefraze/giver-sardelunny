# DRAFT — security: spark lock + server-side live-give gate

**Status: draft, local only. Not pushed. Nothing applied to any Supabase project.**
Branch: `security/spark-lock-and-give-gate` (from origin/main 62f73de)

Both files live in `supabase/unapplied/` (repo convention for "never auto-apply"), not `supabase/migrations/`, so a Lovable/CLI deploy can't pick them up by accident. Move them into `migrations/` only after review + branch-DB testing.

## Fix 1 (High) — `20261015_01_spark_lock.sql`
Problem: `authenticated` has table-level UPDATE on `profiles`; "update own profile" only checks ownership → any user can PATCH their own `sparks`/`sparkles`.
- `BEFORE UPDATE` trigger: for `anon`/`authenticated`, `new.sparks/sparkles := old.*` (silently ignored, not an error — see "client impact").
- `BEFORE INSERT` trigger: client-created profiles get the column defaults.
- `public.spark_ledger` (append-only, owner-readable, no client write policy).
- `app_private.adjust_sparks(...)` SECURITY DEFINER — the only writer; row lock, no negative balances, idempotent on `(profile, kind, ref)`, writes the ledger. service_role only.
- `public.spend_my_sparks(amount, reason, ref)` — the one client RPC (debit only).
- Existing `update_connection_state` +10 payout keeps working (definer runs as owner, not `authenticated`).

## Fix 2 (High) — `20261015_02_live_give_gate.sql`
Problem: insert policies on connections/conversations/messages don't check for a live give; the gate is client-side only (`community-access.ts`).
- Copies block 1 (`item_is_live_give`, `has_live_give`, `item_type`) and block 3 (connections insert policy + `receiver_needs_live_give` trigger) of `20260928_grant_live_give.sql`. Leaves out its visibility, welcome-grant, and handoff-sparks blocks (product changes).
- New `app_private.may_act(profile)` = admin OR `live_give_exempt(profile)` OR `has_live_give(profile)`. Every gate goes through it.
- `live_give_exempt()` = sample profiles only for now. **This is the place for the free-wish decision.**
- conversations: the starter must pass `may_act`.
- messages: the sender must pass `may_act`, **or** the conversation must be tied to a connection (so an ongoing handoff doesn't go dark when a give expires).

## Client impact (needs a follow-up PR before/with apply)
- `src/data/cloud/boot.ts` PATCHes `sparks`/`sparkles` (+ `reserved`, etc.) from local state. After Fix 1, those values are silently ignored and the server stays authoritative. That's safe, but local spend/earn will drift from the server until the client calls `spend_my_sparks` and earns go through server RPCs.
- Earns that the client does today (seed, rewards) have no server path yet. Each one needs a definer RPC with its own rule, or they stop persisting.
- After Fix 2, inserts that `community-access.ts` already blocks will now also fail at the server. Check the UI handles the RLS error (empty `data`) without crashing.

## Assumptions (prod per the 15 Oct audit, not verified by us)
- Prod = the 12 Aug-27 migrations: `app_private.{owns_profile,is_admin,is_sample_profile,can_see_conversation}` exist, and the policy names match Aug-27.
- `profiles.reserved/sparks_seeded/rewarded` and `wish_contributions` do NOT exist. Neither file references them.
- The audit's prod-only objects (column-level SELECT on profiles, `my_profile()`, extra private helpers) aren't touched. Re-check that `my_profile()` doesn't UPDATE sparks as `authenticated` (it would now be ignored).
- `ledger_events.connection_id` is NOT NULL, so there's a new `spark_ledger` instead of reusing it.

## Open questions (founder decisions — not resolved here)
1. Are the **three free wishes** exempt from the live-give gate? (Set this in `live_give_exempt`.)
2. Should messaging inside an existing connection survive the give expiring? (Currently: yes.)
3. Should a wish owner with no live give be able to receive a grant? (Currently: no, per grant_live_give.)
4. Should `reserved` (holds) also be server-guarded once Sep-23 lands?
5. Order/fate of `give_trust.sql`: it calls `public.owns_profile`/`public.is_admin`, which prod dropped, so it would fail as written.
6. Should the +10 connection payout also write `spark_ledger`?

## Rollback
Each file ends with commented rollback SQL that restores the Aug-27 policy definitions and drops the new triggers/functions. The ledger table is kept by default for audit.

## Test plan (Supabase branch DB seeded from a prod schema dump — never prod)
Setup: two users A and B plus one sample profile. A has a live give; B has none.

Fix 1
- [ ] As A: `update profiles set sparks=99999 where user_id=auth.uid()` → succeeds, but sparks is unchanged. `name` changes in the same PATCH are still saved.
- [ ] As A: insert a profile with `sparks=99999` → the default is stored.
- [ ] As A: `spend_my_sparks(10,'test','t1')` → balance −10, one ledger row. Repeat with the same ref → no second debit.
- [ ] Spend more than the balance → `insufficient sparks`. Amount ≤0 → `bad amount`.
- [ ] As A: call `app_private.adjust_sparks` directly → permission denied.
- [ ] As A: insert into `spark_ledger` → denied. B can't read A's ledger.
- [ ] Verified connection via `update_my_connection_state` → +10 still applied.
- [ ] service_role update of sparks → allowed.

Fix 2
- [ ] B inserts a connection as helper → RLS denied. A → ok.
- [ ] A connects on a wish owned by B (no live give) → denied.
- [ ] Claim/confirm to awaiting/verified where the receiver has no live give → `receiving needs a live give`.
- [ ] B starts a conversation → denied. A → ok.
- [ ] B sends a message in a plain conversation → denied. In a connection-bound conversation → ok.
- [ ] Admin as sample → still ok. Sample profiles → ok.
- [ ] A's give expires (details.expiresAt in the past) → A is now blocked like B.
- [ ] Rollback blocks run clean and restore the previous behaviour.

## Not verified
- Not run against any Postgres. SQL was parse-checked only (pglast, and the plpgsql bodies aren't checked).
- Prod catalog not queried (no credentials used). The prod facts are second-hand from the audit.
