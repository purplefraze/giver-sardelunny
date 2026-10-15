-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- FIX 2 (High): the live-give gate is client-side only (community-access.ts).
-- Enforce it in RLS for connections, conversations and messages.
--
-- Based on blocks 1 and 3 of supabase/unapplied/20260928_grant_live_give.sql
-- (same definitions, copied verbatim so this file stands alone). It does NOT
-- include that file's items-visibility (2), welcome grant (4) or handoff
-- sparks (6) blocks — those are product changes, not this security fix.
--
-- ORDERING: grant_live_give's header says "apply after give_trust". This file
-- only touches the connections INSERT policy and a new BEFORE UPDATE trigger;
-- give_trust adds a separate BEFORE INSERT trigger (three-gives cap) on
-- connections, so either order works. NOTE: give_trust as written calls
-- public.owns_profile()/public.is_admin(), which PROD has dropped (moved to
-- app_private on Aug 27) — give_trust will fail against prod as-is.
--
-- Prod assumptions: app_private.owns_profile / is_admin / is_sample_profile /
-- can_see_conversation exist (Aug-27 migration); policy names below match
-- the Aug-27 names. If the audit shows different policy names, adjust.
-- =============================================================================

begin;

-- 1. WHAT "LIVE" MEANS (verbatim from grant_live_give block 1) -----------------
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

create or replace function app_private.has_live_give(_profile uuid)
returns boolean language sql stable security definer set search_path = public, app_private as $$
  select exists (
    select 1 from public.items i
    where i.owner_id = _profile
      and app_private.item_is_live_give(i.type, i.status, i.published, i.details)
  )
$$;

create or replace function app_private.item_type(_item uuid)
returns text language sql stable security definer set search_path = public, app_private as $$
  select type from public.items where id = _item
$$;

-- OPEN PRODUCT QUESTION hook: "three free wishes" / any exemption from the
-- gate. Returns false (no exemption) until the founder decides. Change only
-- this function to grant an exemption; every policy below goes through it.
create or replace function app_private.live_give_exempt(_profile uuid)
returns boolean language sql stable security definer set search_path = public, app_private as $$
  select app_private.is_sample_profile(_profile)   -- seeded sample profiles keep working
$$;

create or replace function app_private.may_act(_profile uuid)
returns boolean language sql stable security definer set search_path = public, app_private as $$
  select app_private.is_admin()
      or app_private.live_give_exempt(_profile)
      or app_private.has_live_give(_profile)
$$;

revoke all on function app_private.item_type(uuid) from public, anon;
revoke all on function app_private.has_live_give(uuid) from public, anon;
revoke all on function app_private.live_give_exempt(uuid) from public, anon;
revoke all on function app_private.may_act(uuid) from public, anon;
grant execute on function app_private.item_is_live_give(text,text,boolean,jsonb),
  app_private.item_type(uuid), app_private.has_live_give(uuid),
  app_private.live_give_exempt(uuid), app_private.may_act(uuid)
  to authenticated, service_role;

-- 2. CONNECTIONS (grant_live_give block 3, routed through may_act) ------------
drop policy if exists "helper starts connection" on public.connections;
create policy "helper starts connection" on public.connections
  for insert to authenticated
  with check (
    app_private.owns_profile(helper_id)
    and not app_private.owns_profile(owner_id)
    and app_private.may_act(helper_id)
    and (
      app_private.item_type(item_id) is distinct from 'wish'
      or app_private.may_act(owner_id)
    )
  );

create or replace function app_private.receiver_needs_live_give()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
declare
  t text;
  receiver uuid;
begin
  if new.state in ('awaiting', 'verified') and new.state is distinct from old.state then
    select type into t from public.items where id = new.item_id;
    receiver := case t when 'give' then new.helper_id when 'wish' then new.owner_id end;
    if receiver is not null and not app_private.may_act(receiver) then
      raise exception 'receiving needs a live give';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists connections_receiver_live_give on public.connections;
create trigger connections_receiver_live_give before update on public.connections
  for each row execute function app_private.receiver_needs_live_give();

-- 3. CONVERSATIONS -------------------------------------------------------------
-- Starting a conversation needs a live give from the starter (whichever of
-- a_id / b_id is the caller). Admin path unchanged.
alter policy "start conversation as self" on public.conversations
  with check (
    app_private.is_admin()
    or (app_private.owns_profile(a_id) and app_private.may_act(a_id))
    or (app_private.owns_profile(b_id) and app_private.may_act(b_id))
  );

-- 4. MESSAGES ------------------------------------------------------------------
-- Sending needs a live give, EXCEPT inside a conversation bound to an
-- existing connection (connection_id not null): that exchange already passed
-- the gate at connection time and must not go dark mid-handoff when a give
-- expires. (Open question — see PR.)
alter policy "send as self or as sample when admin" on public.messages
  with check (
    app_private.can_see_conversation(conversation_id)
    and (
      (app_private.is_admin() and app_private.is_sample_profile(from_profile_id))
      or (
        app_private.owns_profile(from_profile_id)
        and (
          app_private.may_act(from_profile_id)
          or exists (select 1 from public.conversations c
                      where c.id = conversation_id and c.connection_id is not null)
        )
      )
    )
  );

commit;

-- -----------------------------------------------------------------------------
-- ROLLBACK (restores the Aug-27 definitions)
-- begin;
--   drop policy if exists "helper starts connection" on public.connections;
--   create policy "helper starts connection" on public.connections for insert to authenticated
--     with check (app_private.owns_profile(helper_id) and not app_private.owns_profile(owner_id));
--   drop trigger if exists connections_receiver_live_give on public.connections;
--   drop function if exists app_private.receiver_needs_live_give();
--   alter policy "start conversation as self" on public.conversations
--     with check (app_private.owns_profile(a_id) or app_private.owns_profile(b_id) or app_private.is_admin());
--   alter policy "send as self or as sample when admin" on public.messages
--     with check (app_private.can_see_conversation(conversation_id) and (app_private.owns_profile(from_profile_id)
--       or (app_private.is_admin() and app_private.is_sample_profile(from_profile_id))));
--   drop function if exists app_private.may_act(uuid);
--   drop function if exists app_private.live_give_exempt(uuid);
--   -- item_is_live_give / has_live_give / item_type are harmless to leave;
--   -- drop only if grant_live_give.sql has not been applied since.
-- commit;
