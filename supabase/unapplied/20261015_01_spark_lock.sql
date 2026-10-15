-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- FIX 1 (High): members can write their own Spark balances directly.
--
-- Target: PRODUCTION as reported by the 15 Oct read-only audit (only the 12
-- Aug-27 migrations; app_private helpers exist; Sep-23 reserved/sparks_seeded/
-- rewarded and Sep-27 wish_contributions do NOT exist). This file does NOT
-- depend on Sep-23/Sep-27: every optional column is handled by name at runtime
-- (to_jsonb(row) ? 'col'), so it works whether or not they exist, and keeps
-- guarding them if they are added later.
--
-- What it does
--  1. public.spark_ledger: append-only history of EVERY balance change.
--  2. Guard triggers: for client roles (anon/authenticated) a profile UPDATE
--     keeps the old value of every protected column, a profile INSERT gets the
--     column defaults. Protected: sparks, sparkles, + if present give_sparks,
--     reserved, sparks_seeded, rewarded, welcome_granted_at, + identity columns
--     is_sample, sample_key, user_id (is_sample would otherwise let a member
--     self-exempt from the live-give gate in file 02).
--     Silent keep, not raise: boot.ts saveProfile() PATCHes name/about AND
--     currency together; raising would drop legitimate profile edits.
--  3. Audit trigger: any balance change that did not go through
--     adjust_sparks() (e.g. the existing +10 connection payout) is still
--     written to spark_ledger (kind 'connection'/'system').
--  4. app_private.adjust_sparks(): the only sanctioned writer (row lock, no
--     negative balance, idempotent on (profile, kind, ref)). service_role only.
--  5. Client RPCs: spend_my_sparks() (debit only), claim_welcome_grant()
--     (100 = 50 to give + 50 to wish, once per profile, ledger ref 'welcome').
--  6. Closes an actor-impersonation hole: Aug-27 granted authenticated EXECUTE
--     on app_private.update_connection_state(_actor_user_id, ...), so a member
--     could confirm a connection AS the counterpart and mint the +10 payout.
--     Revoked; the public wrapper becomes SECURITY DEFINER and passes auth.uid().
--  Column-level UPDATE revoke is in 20261015_01b (apply WITH the client PR).
-- =============================================================================

begin;

-- Optional give pot (same name/shape as grant_live_give block 4, so the two
-- stay compatible). Needed for the 50-to-give half of the welcome grant.
alter table public.profiles add column if not exists give_sparks integer not null default 0;

-- 1. LEDGER --------------------------------------------------------------------
create table if not exists public.spark_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta_sparks integer not null default 0,
  delta_sparkles integer not null default 0,
  delta_give_sparks integer not null default 0,
  sparks_after integer not null,
  sparkles_after integer not null,
  give_sparks_after integer not null default 0,
  kind text not null,                 -- 'spend' | 'welcome' | 'connection' | 'admin' | 'system'
  reason text not null default '',
  ref text,                           -- idempotency / item / connection reference
  actor uuid,                         -- auth.uid() at the time, null for system
  created_at timestamptz not null default now(),
  constraint spark_ledger_nonzero check (delta_sparks <> 0 or delta_sparkles <> 0 or delta_give_sparks <> 0)
);
create unique index if not exists spark_ledger_ref_once
  on public.spark_ledger (profile_id, kind, ref) where ref is not null;
create index if not exists spark_ledger_profile_idx
  on public.spark_ledger (profile_id, created_at desc);
alter table public.spark_ledger enable row level security;
revoke all on public.spark_ledger from public, anon, authenticated;
grant select on public.spark_ledger to authenticated;
grant all on public.spark_ledger to service_role;
drop policy if exists "owners read spark ledger" on public.spark_ledger;
create policy "owners read spark ledger" on public.spark_ledger
  for select to authenticated using (app_private.owns_profile(profile_id));
-- No insert/update/delete policy or grant: append-only, written by triggers/definers.
create or replace function app_private.spark_ledger_immutable()
returns trigger language plpgsql as $$
begin raise exception 'spark_ledger is append-only'; end $$;
drop trigger if exists spark_ledger_immutable on public.spark_ledger;
create trigger spark_ledger_immutable before update or delete on public.spark_ledger
  for each row execute function app_private.spark_ledger_immutable();

-- 2. GUARDS --------------------------------------------------------------------
create or replace function app_private.protected_profile_columns()
returns text[] language sql immutable as $$
  select array['sparks','sparkles','give_sparks','reserved','sparks_seeded','rewarded',
               'welcome_granted_at','is_sample','sample_key','user_id']
$$;

-- Evaluates a column default as the owner (client roles may not be able to
-- read information_schema for columns they can't SELECT in prod).
create or replace function app_private.profile_column_defaults()
returns jsonb language plpgsql stable security definer set search_path = public, app_private as $$
declare r record; v jsonb := '{}'; d jsonb;
begin
  for r in select a.attname, pg_get_expr(ad.adbin, ad.adrelid) as expr
             from pg_attribute a join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
            where a.attrelid = 'public.profiles'::regclass and not a.attisdropped
              and a.attname = any (app_private.protected_profile_columns())
  loop
    execute format('select to_jsonb(%s)', r.expr) into d;
    v := v || jsonb_build_object(r.attname, d);
  end loop;
  return v;
end $$;
revoke all on function app_private.profile_column_defaults() from public, anon;
grant execute on function app_private.profile_column_defaults() to authenticated, service_role;

create or replace function app_private.guard_profile_columns()
returns trigger language plpgsql set search_path = public, app_private as $$
declare keep jsonb; o jsonb;
begin
  -- NOT security definer: current_user is the caller. Definer functions
  -- (owner postgres) and service_role pass through untouched.
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    select coalesce(jsonb_object_agg(k, o->k), '{}') into keep
      from unnest(app_private.protected_profile_columns()) k where o ? k;
    -- user_id: keep old unless it was null (claiming an unowned row is not a client path anyway)
  else
    keep := app_private.profile_column_defaults();
    -- the insert policy already pins user_id = auth.uid() and is_sample = false
    keep := keep - 'user_id';
    keep := keep || jsonb_build_object('is_sample', false) - 'sample_key';
    new.sample_key := null;
  end if;
  new := jsonb_populate_record(new, keep);
  return new;
end $$;
drop trigger if exists profiles_guard_spark_columns on public.profiles;
drop trigger if exists profiles_guard_spark_insert on public.profiles;
drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns before insert or update on public.profiles
  for each row execute function app_private.guard_profile_columns();

-- 3. AUDIT every balance change ------------------------------------------------
create or replace function app_private.audit_spark_change()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
declare o jsonb := to_jsonb(old); n jsonb := to_jsonb(new);
  ds int := new.sparks - old.sparks; dk int := new.sparkles - old.sparkles;
  dg int := coalesce((n->>'give_sparks')::int,0) - coalesce((o->>'give_sparks')::int,0);
begin
  if (ds <> 0 or dk <> 0 or dg <> 0)
     and coalesce(current_setting('app.spark_ledger_written', true), '') <> 'on' then
    insert into public.spark_ledger(profile_id, delta_sparks, delta_sparkles, delta_give_sparks,
        sparks_after, sparkles_after, give_sparks_after, kind, reason, actor)
      values (new.id, ds, dk, dg, new.sparks, new.sparkles, coalesce((n->>'give_sparks')::int,0),
        case when current_setting('app.spark_kind', true) is not null and current_setting('app.spark_kind', true) <> ''
             then current_setting('app.spark_kind', true) else 'system' end,
        'direct balance update (not via adjust_sparks)', auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists profiles_audit_sparks on public.profiles;
create trigger profiles_audit_sparks after update on public.profiles
  for each row execute function app_private.audit_spark_change();

-- Existing +10 connection payout (ledger_events insert) is labelled in spark_ledger.
create or replace function app_private.tag_connection_payout()
returns trigger language plpgsql as $$
begin perform set_config('app.spark_kind', 'connection', true); return new; end $$;
drop trigger if exists ledger_events_tag_payout on public.ledger_events;
create trigger ledger_events_tag_payout after insert on public.ledger_events
  for each row execute function app_private.tag_connection_payout();

-- 4. THE SANCTIONED WRITER -----------------------------------------------------
drop function if exists app_private.adjust_sparks(uuid,integer,integer,text,text,text);
create or replace function app_private.adjust_sparks(
  _profile uuid, _d_sparks integer, _d_sparkles integer, _kind text,
  _reason text default '', _ref text default null, _d_give_sparks integer default 0
) returns public.spark_ledger
language plpgsql security definer set search_path = public, app_private as $$
declare p public.profiles; led public.spark_ledger;
  ds int := coalesce(_d_sparks,0); dk int := coalesce(_d_sparkles,0); dg int := coalesce(_d_give_sparks,0);
begin
  if ds = 0 and dk = 0 and dg = 0 then raise exception 'nothing to adjust'; end if;
  select * into p from public.profiles where id = _profile for update;
  if p.id is null then raise exception 'no profile'; end if;
  if _ref is not null then
    select * into led from public.spark_ledger where profile_id = _profile and kind = _kind and ref = _ref;
    if found then return led; end if;          -- idempotent replay
  end if;
  if p.sparks + ds < 0 or p.sparkles + dk < 0 or p.give_sparks + dg < 0 then
    raise exception 'insufficient sparks';
  end if;
  perform set_config('app.spark_ledger_written', 'on', true);
  update public.profiles set sparks = sparks + ds, sparkles = sparkles + dk, give_sparks = give_sparks + dg
   where id = _profile returning * into p;
  perform set_config('app.spark_ledger_written', '', true);
  insert into public.spark_ledger(profile_id, delta_sparks, delta_sparkles, delta_give_sparks,
      sparks_after, sparkles_after, give_sparks_after, kind, reason, ref, actor)
    values (_profile, ds, dk, dg, p.sparks, p.sparkles, p.give_sparks, _kind, coalesce(_reason,''), _ref, auth.uid())
    returning * into led;
  return led;
end $$;
revoke all on function app_private.adjust_sparks(uuid,integer,integer,text,text,text,integer) from public, anon, authenticated;
grant execute on function app_private.adjust_sparks(uuid,integer,integer,text,text,text,integer) to service_role;

-- 5. CLIENT RPCs ---------------------------------------------------------------
create or replace function public.spend_my_sparks(_amount integer, _reason text, _ref text default null)
returns public.spark_ledger
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

-- 100-spark welcome grant: +50 to give (give_sparks), +50 to wish (sparks).
-- Once per profile (ledger ref 'welcome'). ADDITIVE on top of the current
-- balance — see PR open question on the prod default of 250.
create or replace function public.claim_welcome_grant()
returns public.spark_ledger
language plpgsql security definer set search_path = public, app_private as $$
declare me uuid;
begin
  select id into me from public.profiles where user_id = auth.uid();
  if me is null then raise exception 'no profile'; end if;
  return app_private.adjust_sparks(me, 50, 0, 'welcome', 'welcome grant: 50 to wish + 50 to give', 'welcome', 50);
end $$;
revoke all on function public.claim_welcome_grant() from public, anon;
grant execute on function public.claim_welcome_grant() to authenticated;

-- 6. ACTOR IMPERSONATION on connection settlement ------------------------------
revoke execute on function app_private.update_connection_state(uuid,uuid,text,boolean) from authenticated;
create or replace function public.update_my_connection_state(
  _connection_id uuid, _action text, _value boolean default true
) returns public.connections
language sql security definer set search_path = public, app_private as $$
  select app_private.update_connection_state(auth.uid(), _connection_id, _action, _value)
$$;
revoke all on function public.update_my_connection_state(uuid,text,boolean) from public, anon;
grant execute on function public.update_my_connection_state(uuid,text,boolean) to authenticated;

commit;

-- =============================================================================
-- ROLLBACK (restores Aug-27 behaviour; keeps spark_ledger for audit by default)
-- begin;
--   drop trigger if exists profiles_guard_columns on public.profiles;
--   drop trigger if exists profiles_audit_sparks on public.profiles;
--   drop trigger if exists ledger_events_tag_payout on public.ledger_events;
--   drop function if exists public.spend_my_sparks(integer,text,text);
--   drop function if exists public.claim_welcome_grant();
--   drop function if exists app_private.adjust_sparks(uuid,integer,integer,text,text,text,integer);
--   drop function if exists app_private.guard_profile_columns();
--   drop function if exists app_private.audit_spark_change();
--   drop function if exists app_private.tag_connection_payout();
--   drop function if exists app_private.profile_column_defaults();
--   drop function if exists app_private.protected_profile_columns();
--   create or replace function public.update_my_connection_state(_connection_id uuid, _action text, _value boolean default true)
--     returns public.connections language sql security invoker set search_path = public, app_private
--     as $$ select app_private.update_connection_state(auth.uid(), _connection_id, _action, _value) $$;
--   grant execute on function app_private.update_connection_state(uuid,uuid,text,boolean) to authenticated;  -- reopens the hole
--   -- give_sparks column: leave (grant_live_give uses it). Only if truly reverting:
--   -- drop trigger spark_ledger_immutable on public.spark_ledger; drop table public.spark_ledger;
--   -- alter table public.profiles drop column give_sparks;
-- commit;
-- =============================================================================
