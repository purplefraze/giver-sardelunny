-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- FIX 1 (High): users can write profiles.sparks / sparkles directly.
--
-- Written against PRODUCTION as reported by the 15 Oct read-only audit
-- (only the 12 Aug-27 migrations applied; app_private helpers exist; the
-- Sep-23 reserved/sparks_seeded/rewarded columns and Sep-27 wish_contributions
-- do NOT exist). Nothing here references those missing columns/tables.
--
-- Design:
--  * A BEFORE UPDATE trigger on profiles that, for the client roles
--    (anon / authenticated), silently KEEPS the old sparks/sparkles values.
--    Silent (not raise) on purpose: boot.ts saveProfile() sends identity AND
--    currency in one PATCH; raising would also drop name/about/photo saves.
--    A column-level REVOKE alone does not work while the table-level UPDATE
--    grant exists, and REVOKE table + GRANT column-list would make the same
--    PATCH fail with 42501 -> same breakage. (Optional hardening, see bottom.)
--  * SECURITY DEFINER functions run as the function owner (not
--    'authenticated'), so update_connection_state's existing +10 payout and
--    the new functions below pass through the guard unchanged.
--  * New append-only public.spark_ledger records every change made through
--    app_private.adjust_sparks(). The existing ledger_events table is left as
--    is (its connection_id is NOT NULL, so it can't hold non-connection rows).
--  * Clients get ONE write path: public.spend_my_sparks(amount, reason, ref)
--    (debit only, never below zero). Earning stays server-side only.
-- =============================================================================

begin;

-- 1. LEDGER --------------------------------------------------------------------
create table if not exists public.spark_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta_sparks integer not null default 0,
  delta_sparkles integer not null default 0,
  sparks_after integer not null,
  sparkles_after integer not null,
  kind text not null,                 -- e.g. 'spend', 'connection', 'admin', 'grant'
  reason text not null default '',
  ref text,                           -- optional idempotency / item reference
  actor uuid,                         -- auth.uid() at the time, null for system
  created_at timestamptz not null default now(),
  constraint spark_ledger_nonzero check (delta_sparks <> 0 or delta_sparkles <> 0)
);
create unique index if not exists spark_ledger_ref_once
  on public.spark_ledger (profile_id, kind, ref) where ref is not null;
create index if not exists spark_ledger_profile_idx
  on public.spark_ledger (profile_id, created_at desc);
alter table public.spark_ledger enable row level security;
revoke all on public.spark_ledger from anon, authenticated;
grant select on public.spark_ledger to authenticated;
grant all on public.spark_ledger to service_role;
drop policy if exists "owners read spark ledger" on public.spark_ledger;
create policy "owners read spark ledger" on public.spark_ledger
  for select to authenticated using (app_private.owns_profile(profile_id));
-- no insert/update/delete policy: only adjust_sparks() writes.

-- 2. GUARD -----------------------------------------------------------------------
create or replace function app_private.guard_spark_columns()
returns trigger language plpgsql set search_path = public, app_private as $$
begin
  -- Not SECURITY DEFINER: current_user is the caller's role. Client roles may
  -- not move balances; definer functions (owner = postgres) and service_role may.
  if current_user in ('anon', 'authenticated') then
    new.sparks   := old.sparks;
    new.sparkles := old.sparkles;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_spark_columns on public.profiles;
create trigger profiles_guard_spark_columns before update on public.profiles
  for each row execute function app_private.guard_spark_columns();

-- New rows: a client insert must take the column defaults, not pick a balance.
create or replace function app_private.guard_spark_insert()
returns trigger language plpgsql set search_path = public, app_private as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.sparks   := (select column_default from information_schema.columns
                     where table_schema = 'public' and table_name = 'profiles' and column_name = 'sparks')::int;
    new.sparkles := (select column_default from information_schema.columns
                     where table_schema = 'public' and table_name = 'profiles' and column_name = 'sparkles')::int;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_spark_insert on public.profiles;
create trigger profiles_guard_spark_insert before insert on public.profiles
  for each row execute function app_private.guard_spark_insert();

-- 3. THE ONLY WRITER -----------------------------------------------------------
create or replace function app_private.adjust_sparks(
  _profile uuid, _d_sparks integer, _d_sparkles integer,
  _kind text, _reason text default '', _ref text default null
) returns public.spark_ledger
language plpgsql security definer set search_path = public, app_private as $$
declare
  p public.profiles;
  led public.spark_ledger;
begin
  if coalesce(_d_sparks, 0) = 0 and coalesce(_d_sparkles, 0) = 0 then
    raise exception 'nothing to adjust';
  end if;
  if _ref is not null then
    select * into led from public.spark_ledger
      where profile_id = _profile and kind = _kind and ref = _ref;
    if found then return led; end if;          -- idempotent replay
  end if;
  select * into p from public.profiles where id = _profile for update;
  if p.id is null then raise exception 'no profile'; end if;
  if p.sparks + coalesce(_d_sparks,0) < 0 or p.sparkles + coalesce(_d_sparkles,0) < 0 then
    raise exception 'insufficient sparks';
  end if;
  update public.profiles
     set sparks = sparks + coalesce(_d_sparks,0),
         sparkles = sparkles + coalesce(_d_sparkles,0)
   where id = _profile returning * into p;
  insert into public.spark_ledger(profile_id, delta_sparks, delta_sparkles,
      sparks_after, sparkles_after, kind, reason, ref, actor)
    values (_profile, coalesce(_d_sparks,0), coalesce(_d_sparkles,0),
      p.sparks, p.sparkles, _kind, coalesce(_reason,''), _ref, auth.uid())
    returning * into led;
  return led;
end $$;
revoke all on function app_private.adjust_sparks(uuid,integer,integer,text,text,text) from public, anon, authenticated;
grant execute on function app_private.adjust_sparks(uuid,integer,integer,text,text,text) to service_role;

-- Client-facing: debit own balance only.
create or replace function public.spend_my_sparks(
  _amount integer, _reason text, _ref text default null
) returns public.spark_ledger
language plpgsql security definer set search_path = public, app_private as $$
declare me uuid;
begin
  if _amount is null or _amount <= 0 or _amount > 10000 then raise exception 'bad amount'; end if;
  select id into me from public.profiles where user_id = auth.uid();
  if me is null then raise exception 'no profile'; end if;
  return app_private.adjust_sparks(me, -_amount, 0, 'spend', _reason, _ref);
end $$;
revoke all on function public.spend_my_sparks(integer,text,text) from public, anon;
grant execute on function public.spend_my_sparks(integer,text,text) to authenticated;

commit;

-- -----------------------------------------------------------------------------
-- NOT INCLUDED (decide first):
--  a) Rewiring update_connection_state's "+10 then ledger_events" to also
--     write spark_ledger. Its payout still works (definer bypasses guard) but
--     is recorded only in ledger_events. Follow-up: call adjust_sparks there.
--  b) Optional belt-and-braces once the client no longer PATCHes currency:
--       revoke update on public.profiles from authenticated;
--       grant update (handle,name,photo_url,about,by_day,by_night,weekend,
--                     pronouns,birthday,gender,answers) on public.profiles to authenticated;
--     (List must match PROD's real profiles columns — re-check catalog first.)
--  c) Sep-23 companion columns (reserved / sparks_seeded / rewarded) are not
--     in prod; when that migration lands, decide whether `reserved` (holds)
--     must also be guarded — today a client could fake holds in it.
--
-- ROLLBACK
-- begin;
--   drop trigger if exists profiles_guard_spark_columns on public.profiles;
--   drop trigger if exists profiles_guard_spark_insert on public.profiles;
--   drop function if exists public.spend_my_sparks(integer,text,text);
--   drop function if exists app_private.adjust_sparks(uuid,integer,integer,text,text,text);
--   drop function if exists app_private.guard_spark_columns();
--   drop function if exists app_private.guard_spark_insert();
--   -- keep the ledger for audit; only if truly reverting:
--   -- drop table if exists public.spark_ledger;
-- commit;
