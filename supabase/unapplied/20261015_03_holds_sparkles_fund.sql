-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- FIX 1 continued: the spark movements the client used to do by itself.
-- Requires 20261015_01 (adjust_sparks, spark_ledger). Independent of 02.
-- Does NOT need Sep-23 `reserved` (holds live in their own table) and does NOT
-- need Sep-27 `wish_contributions` (pledge_to_wish is created only if that table
-- exists; re-run this file after Sep-27 is applied to get it).
--
--  1. public.spark_holds: one open hold per wish, ledgered via adjust_sparks
--     (kind 'reserve' / 'refund', ref = hold id).
--  2. reserve_wish_sparks(_item, _amount) — owner, own published wish, debit.
--  3. release_my_wish_hold(_item) — owner withdraws: refund the open hold.
--     Item delete refunds too (trigger), so a hard delete can't eat sparks.
--  4. Settlement: when a wish connection reaches 'verified', the hold is
--     closed as 'settled' (no refund). The granter's +10 is the EXISTING
--     payout in update_connection_state — not paid twice.
--  5. spend_my_sparkle(_item) — -1 sparkle + boost row + boost_count, one
--     transaction. Direct INSERT on boosts revoked (else boosts are free).
--  6. pledge_to_wish(...) — only if public.wish_contributions exists.
-- =============================================================================
begin;

create table if not exists public.spark_holds (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  amount integer not null check (amount > 0),
  state text not null default 'held' check (state in ('held', 'refunded', 'settled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index if not exists spark_holds_one_open on public.spark_holds (item_id) where state = 'held';
alter table public.spark_holds enable row level security;
revoke all on public.spark_holds from public, anon, authenticated;
grant select on public.spark_holds to authenticated;
grant all on public.spark_holds to service_role;
drop policy if exists "owners read holds" on public.spark_holds;
create policy "owners read holds" on public.spark_holds
  for select to authenticated using (app_private.owns_profile(profile_id));

-- internal: refund one open hold (idempotent through the ledger ref)
create or replace function app_private.refund_hold(_hold uuid, _reason text)
returns void language plpgsql security definer set search_path = public, app_private as $$
declare h public.spark_holds;
begin
  select * into h from public.spark_holds where id = _hold and state = 'held' for update;
  if h.id is null then return; end if;
  perform app_private.adjust_sparks(h.profile_id, h.amount, 0, 'refund', _reason, h.id::text);
  update public.spark_holds set state = 'refunded', closed_at = now() where id = h.id;
end $$;
revoke all on function app_private.refund_hold(uuid, text) from public, anon, authenticated;

create or replace function public.reserve_wish_sparks(_item uuid, _amount integer default 10)
returns public.spark_holds
language plpgsql security definer set search_path = public, app_private as $$
declare me uuid; i public.items; h public.spark_holds;
begin
  if _amount is null or _amount <= 0 or _amount > 1000 then raise exception 'bad amount'; end if;
  select id into me from public.profiles where user_id = auth.uid();
  if me is null then raise exception 'no profile'; end if;
  select * into i from public.items where id = _item for update;
  if i.id is null or i.owner_id <> me or i.type <> 'wish' then raise exception 'not your wish'; end if;
  select * into h from public.spark_holds where item_id = _item and state = 'held';
  if found then return h; end if;                       -- idempotent
  insert into public.spark_holds(profile_id, item_id, amount) values (me, _item, _amount) returning * into h;
  perform app_private.adjust_sparks(me, -_amount, 0, 'reserve', 'held for wish', h.id::text);
  return h;
end $$;
revoke all on function public.reserve_wish_sparks(uuid, integer) from public, anon;
grant execute on function public.reserve_wish_sparks(uuid, integer) to authenticated;

create or replace function public.release_my_wish_hold(_item uuid)
returns void language plpgsql security definer set search_path = public, app_private as $$
declare me uuid; hid uuid;
begin
  select id into me from public.profiles where user_id = auth.uid();
  if me is null then raise exception 'no profile'; end if;
  select id into hid from public.spark_holds where item_id = _item and profile_id = me and state = 'held';
  if hid is null then return; end if;                   -- nothing held: no-op
  perform app_private.refund_hold(hid, 'wish withdrawn');
end $$;
revoke all on function public.release_my_wish_hold(uuid) from public, anon;
grant execute on function public.release_my_wish_hold(uuid) to authenticated;

create or replace function app_private.items_refund_on_delete()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
declare hid uuid;
begin
  for hid in select id from public.spark_holds where item_id = old.id and state = 'held' loop
    perform app_private.refund_hold(hid, 'wish deleted');
  end loop;
  return old;
end $$;
drop trigger if exists items_refund_holds on public.items;
create trigger items_refund_holds before delete on public.items
  for each row execute function app_private.items_refund_on_delete();

create or replace function app_private.settle_wish_hold()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
begin
  if new.state = 'verified' and old.state is distinct from 'verified' then
    update public.spark_holds set state = 'settled', closed_at = now()
     where item_id = new.item_id and state = 'held'
       and exists (select 1 from public.items i where i.id = new.item_id and i.type = 'wish');
  end if;
  return new;
end $$;
drop trigger if exists connections_settle_wish_hold on public.connections;
create trigger connections_settle_wish_hold after update on public.connections
  for each row execute function app_private.settle_wish_hold();

-- SPARKLES ------------------------------------------------------------------------
create or replace function public.spend_my_sparkle(_item uuid)
returns public.boosts
language plpgsql security definer set search_path = public, app_private as $$
declare me uuid; i public.items; b public.boosts;
begin
  select id into me from public.profiles where user_id = auth.uid();
  if me is null then raise exception 'no profile'; end if;
  select * into i from public.items where id = _item for update;
  if i.id is null then raise exception 'gone'; end if;
  if i.owner_id = me then raise exception 'self'; end if;
  if i.status <> 'active' or not i.published then raise exception 'inactive'; end if;
  if exists (select 1 from public.boosts where item_id = _item and by_profile_id = me) then
    raise exception 'capped';
  end if;
  perform app_private.adjust_sparks(me, 0, -1, 'sparkle', 'boosted an item', 'boost:' || _item::text);
  insert into public.boosts(item_id, by_profile_id) values (_item, me) returning * into b;
  update public.items set boost_count = boost_count + 1 where id = _item;
  return b;
end $$;
revoke all on function public.spend_my_sparkle(uuid) from public, anon;
grant execute on function public.spend_my_sparkle(uuid) to authenticated;
revoke insert on public.boosts from authenticated;

-- FUND (only once Sep-27 wish_contributions exists) ---------------------------------
do $do$
begin
  if to_regclass('public.wish_contributions') is null then
    raise notice 'wish_contributions absent: pledge_to_wish skipped (apply Sep-27, then re-run this file)';
    return;
  end if;
  execute $f$
  create or replace function public.pledge_to_wish(_wish uuid, _amount_cents integer, _local_id text default null)
  returns public.wish_contributions
  language plpgsql security definer set search_path = public, app_private as $b$
  declare me uuid; row public.wish_contributions;
  begin
    select id into me from public.profiles where user_id = auth.uid();
    if me is null then raise exception 'no profile'; end if;
    if _local_id is not null then
      select * into row from public.wish_contributions where funder_id = me and local_id = _local_id;
      if found then return row; end if;               -- idempotent replay
    end if;
    if not public.wish_is_fundable(_wish, me) then raise exception 'wish not fundable'; end if;
    insert into public.wish_contributions(wish_id, funder_id, local_id, amount_cents)
      values (_wish, me, _local_id, _amount_cents) returning * into row;   -- guard trigger caps at fundTarget
    return row;
  end $b$;
  $f$;
  execute 'revoke all on function public.pledge_to_wish(uuid, integer, text) from public, anon';
  execute 'grant execute on function public.pledge_to_wish(uuid, integer, text) to authenticated';
end $do$;

commit;

-- =============================================================================
-- ROLLBACK (holds table kept for audit; open holds are NOT auto-refunded)
-- begin;
--   drop function if exists public.pledge_to_wish(uuid, integer, text);
--   grant insert on public.boosts to authenticated;
--   drop function if exists public.spend_my_sparkle(uuid);
--   drop trigger if exists connections_settle_wish_hold on public.connections;
--   drop function if exists app_private.settle_wish_hold();
--   drop trigger if exists items_refund_holds on public.items;
--   drop function if exists app_private.items_refund_on_delete();
--   drop function if exists public.release_my_wish_hold(uuid);
--   drop function if exists public.reserve_wish_sparks(uuid, integer);
--   drop function if exists app_private.refund_hold(uuid, text);
-- commit;
-- =============================================================================
