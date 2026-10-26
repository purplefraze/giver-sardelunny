-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- WELCOME GRANT, EXACT (Casper decision, 26 Oct 2026).
--
-- Applies AFTER 20261015_01_spark_lock.sql (needs spark_ledger, give_sparks and
-- app_private.adjust_sparks). Replaces public.claim_welcome_grant() only.
--
-- Before: claim_welcome_grant() ADDED +50 sparks / +50 give_sparks on top of
-- whatever the row held, so a new account landed at 100 wish + 50 give with the
-- 50 default (or 300 + 50 with the Aug-27 default of 250).
-- Now: it SETS a brand-new account to exactly 50 to wish (sparks) and 50 to give
-- (give_sparks), once per account. The profiles default is NOT changed.
--
--  * ONCE: the ledger row (kind 'welcome', ref 'welcome') is the record. A
--    second claim returns that row and changes nothing (idempotent), including
--    two claims racing (row lock + adjust_sparks' ref check).
--  * NEW ACCOUNTS ONLY: the profile was created within the last 24 hours (the
--    same "first session" window the app uses) AND has no spark_ledger history
--    yet. Anyone else (an existing member, or a new member who has already
--    spent or earned) gets null back and their balance is untouched, so the
--    grant can never be used to top a spent balance back up.
--  * Sparkles are not touched.
--  * The ledger row records the actual change (e.g. -200 sparks / +50 give from
--    a 250 default), reason 'welcome grant: set to 50 to wish + 50 to give'.
-- =============================================================================

begin;

create or replace function public.claim_welcome_grant()
returns public.spark_ledger
language plpgsql security definer set search_path = public, app_private as $$
declare
  p public.profiles;
  led public.spark_ledger;
  ds int;
  dg int;
begin
  select * into p from public.profiles where user_id = auth.uid() for update;
  if p.id is null then raise exception 'no profile'; end if;

  -- once: already granted -> the same row, nothing changes
  select * into led from public.spark_ledger
   where profile_id = p.id and kind = 'welcome' and ref = 'welcome';
  if found then return led; end if;

  -- new accounts only; everyone else is left exactly as they are
  if p.created_at < now() - interval '24 hours'
     or exists (select 1 from public.spark_ledger where profile_id = p.id) then
    return null;
  end if;

  ds := 50 - p.sparks;
  dg := 50 - p.give_sparks;
  if ds = 0 and dg = 0 then
    return null;  -- already exactly 50/50; nothing to record
  end if;
  return app_private.adjust_sparks(p.id, ds, 0, 'welcome',
    'welcome grant: set to 50 to wish + 50 to give', 'welcome', dg);
end $$;
revoke all on function public.claim_welcome_grant() from public, anon;
grant execute on function public.claim_welcome_grant() to authenticated;

commit;

-- =============================================================================
-- ROLLBACK (restores the additive 01 version)
-- begin;
--   create or replace function public.claim_welcome_grant()
--   returns public.spark_ledger
--   language plpgsql security definer set search_path = public, app_private as $$
--   declare me uuid;
--   begin
--     select id into me from public.profiles where user_id = auth.uid();
--     if me is null then raise exception 'no profile'; end if;
--     return app_private.adjust_sparks(me, 50, 0, 'welcome', 'welcome grant: 50 to wish + 50 to give', 'welcome', 50);
--   end $$;
--   revoke all on function public.claim_welcome_grant() from public, anon;
--   grant execute on function public.claim_welcome_grant() to authenticated;
-- commit;
-- =============================================================================
