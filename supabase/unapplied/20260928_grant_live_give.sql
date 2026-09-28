-- =============================================================================
-- !!! UNAPPLIED — DO NOT RUN WITHOUT OWNER APPROVAL !!!
--
-- WELCOME GRANT · LIVE-GIVE VISIBILITY · NO RECEIVING WITHOUT A LIVE GIVE ·
-- NO SPARKS ON A GIVE'S HANDOFF (yet).
--
-- Kept OUTSIDE supabase/migrations on purpose so no tool applies it by
-- accident. Everything here is enforced CLIENT-SIDE ONLY today (and so can be
-- bypassed by calling Supabase directly):
--   src/data/items.ts            isLiveGive / hasLiveGive / visibleToOthers
--   src/data/community-access.ts startBlock / receiveBlock
--   src/data/welcome-grant.ts    the 100-spark grant (user_metadata mirror)
--   src/data/connections.ts      settle() no longer pays a give locally
--
-- A LIVE GIVE = type 'give', status 'active', published, and not past its
-- window (details.expiresAt, else details.until / details.date end of day,
-- America/Toronto) — the same rule as items.ts availabilityEnd().
--
-- Block 2 REPLACES the items read policy. It supersedes block 4 of
-- 20260928_give_trust.sql (its expiry rule is folded in here); apply this
-- one after that one, or skip that block.
-- Block 6 conflicts with feature/give-flow-surface's per-lesson sparks only
-- in intent: it stops the one-off +10 for a verified GIVE connection (kind
-- 'connection'); per-lesson credits (kind 'session:%') are untouched.
-- Review each block before applying.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. WHAT "LIVE" MEANS
-- ---------------------------------------------------------------------------
create or replace function app_private.item_is_live_give(_type text, _status text, _published boolean, _details jsonb)
returns boolean language sql stable set search_path = public, app_private as $$
  select _type = 'give' and _status = 'active' and _published and (
    case
      when coalesce(_details->>'expiresAt', '') <> '' then (_details->>'expiresAt')::timestamptz >= now()
      when coalesce(_details->>'until', _details->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then coalesce(_details->>'until', _details->>'date')::date >= (now() at time zone 'America/Toronto')::date
      else true
    end)
$$;

-- security definer: reads items without re-entering the items policy below.
create or replace function app_private.has_live_give(_profile uuid)
returns boolean language sql stable security definer set search_path = public, app_private as $$
  select exists (
    select 1 from public.items i
    where i.owner_id = _profile
      and app_private.item_is_live_give(i.type, i.status, i.published, i.details)
  )
$$;
-- an item's type, read past the items policy (a hidden wish is still a wish)
create or replace function app_private.item_type(_item uuid)
returns text language sql stable security definer set search_path = public, app_private as $$
  select type from public.items where id = _item
$$;
revoke all on function app_private.item_type(uuid) from public, anon;
grant execute on function app_private.item_type(uuid) to authenticated, service_role;
revoke all on function app_private.has_live_give(uuid) from public, anon;
grant execute on function app_private.has_live_give(uuid) to authenticated, service_role;
grant execute on function app_private.item_is_live_give(text, text, boolean, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. VISIBILITY — without a live give, nothing else of theirs is visible
--    (wish, trade, borrow, lend, fund…). A give is visible only while live.
--    The two people in a connection on an item keep seeing that item, so a
--    conversation never loses what it was about.
-- ---------------------------------------------------------------------------
drop policy if exists "read published or own items" on public.items;
create policy "read published or own items" on public.items
  for select to authenticated using (
    app_private.owns_profile(owner_id)
    or app_private.is_admin()
    or (
      published and (
        case when type = 'give'
          then app_private.item_is_live_give(type, status, published, details)
          else app_private.has_live_give(owner_id)
        end
      )
    )
    or exists (
      select 1 from public.connections c
      where c.item_id = items.id and app_private.owns_profile(c.helper_id)
    )
  );
-- NOTE: if a signed-out (anon) read policy exists on live, mirror the same
-- condition there.

-- ---------------------------------------------------------------------------
-- 3. NOBODY STARTS OR RECEIVES WITHOUT A LIVE GIVE
--    Starting any connection needs a live give of your own; a give's taker
--    receives, and a wish's owner receives (it is being granted).
-- ---------------------------------------------------------------------------
drop policy if exists "helper starts connection" on public.connections;
create policy "helper starts connection" on public.connections
  for insert to authenticated
  with check (
    app_private.owns_profile(helper_id)
    and not app_private.owns_profile(owner_id)
    and app_private.has_live_give(helper_id)
    and (
      app_private.item_type(item_id) is distinct from 'wish'
      or app_private.has_live_give(owner_id)
    )
  );

-- ...and nothing settles for a receiver who has no live give (claim / confirm
-- in app_private.update_connection_state move state to awaiting / verified).
create or replace function app_private.receiver_needs_live_give()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
declare
  item_type text;
  receiver uuid;
begin
  if new.state in ('awaiting', 'verified') and new.state is distinct from old.state then
    select type into item_type from public.items where id = new.item_id;
    receiver := case item_type when 'give' then new.helper_id when 'wish' then new.owner_id end;
    if receiver is not null and not app_private.has_live_give(receiver) then
      raise exception 'receiving needs a live give';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists connections_receiver_live_give on public.connections;
create trigger connections_receiver_live_give before update on public.connections
  for each row execute function app_private.receiver_needs_live_give();

-- ---------------------------------------------------------------------------
-- 4. THE WELCOME GRANT — 100 sparks, 50 to give · 50 to wish, once per account
--    profiles.sparks stays the "to wish" pot (it already defaults to 50);
--    give_sparks is the "to give" pot. Passing give_sparks to someone is not
--    a give and unlocks nothing (nothing here reads it for visibility).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists give_sparks integer not null default 0,
  add column if not exists welcome_granted_at timestamptz;
-- only the trusted function below writes these (a column-level revoke would
-- not override the existing table-level update grant, so a trigger guards it)
create or replace function app_private.guard_welcome_columns()
returns trigger language plpgsql set search_path = public, app_private as $$
begin
  if (new.give_sparks is distinct from old.give_sparks
      or new.welcome_granted_at is distinct from old.welcome_granted_at)
     and coalesce(current_setting('app.welcome_grant', true), '') <> 'on' then
    raise exception 'give_sparks and welcome_granted_at are written by claim_welcome_grant()';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_welcome_columns on public.profiles;
create trigger profiles_guard_welcome_columns before update on public.profiles
  for each row execute function app_private.guard_welcome_columns();

create or replace function public.claim_welcome_grant()
returns public.profiles language plpgsql security definer set search_path = public, app_private as $$
declare
  p public.profiles;
  u auth.users;
begin
  select * into u from auth.users where id = auth.uid();
  select * into p from public.profiles where user_id = auth.uid() for update;
  if p.id is null or u.id is null then raise exception 'no profile'; end if;
  if p.welcome_granted_at is not null then return p; end if;
  -- first session only: the account's last sign-in within a day of creation
  if coalesce(u.last_sign_in_at, u.created_at) - u.created_at > interval '1 day' then return p; end if;
  perform set_config('app.welcome_grant', 'on', true);
  update public.profiles set
    give_sparks = give_sparks + 50,
    sparks = case when sparks_seeded then sparks else 50 end,
    sparks_seeded = true,
    welcome_granted_at = now()
    where id = p.id returning * into p;
  perform set_config('app.welcome_grant', '', true);
  return p;
end $$;
revoke all on function public.claim_welcome_grant() from public, anon;
grant execute on function public.claim_welcome_grant() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. (none — the close-of-give prompt and republish are ordinary item
--    updates by the owner; "offer that again" sets status 'active' again.)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 6. NO SPARKS ON A GIVE'S HANDOFF (a later ticket: the phone tap)
--    update_connection_state pays +10 per verified connection by inserting a
--    ledger_events row (kind 'connection') and, IF FOUND, adding 10 to
--    profiles.sparks. Skipping that insert for a give skips the +10 too.
--    Wishes, trades and borrows are unchanged.
-- ---------------------------------------------------------------------------
create or replace function app_private.no_give_handoff_sparks()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
begin
  if new.kind = 'connection' and exists (
    select 1 from public.connections c join public.items i on i.id = c.item_id
    where c.id = new.connection_id and i.type = 'give'
  ) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists ledger_no_give_handoff_sparks on public.ledger_events;
create trigger ledger_no_give_handoff_sparks before insert on public.ledger_events
  for each row execute function app_private.no_give_handoff_sparks();
