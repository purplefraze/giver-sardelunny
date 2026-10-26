-- =============================================================================
-- !!! UNAPPLIED — DRAFT — DO NOT RUN WITHOUT OWNER APPROVAL !!!
-- FIX 4: items.boost_count can only move through public.spend_my_sparkle (03).
-- Requires 20261015_01 and 20261015_03. Independent of 02 and 01b.
--
-- Before this file, "update own items" lets an item's owner PATCH boost_count
-- to any number (the counter the feed reads), so sparkles were bypassable.
--
--  1. Guard trigger on public.items (same style as 01's profile guard): for
--     client roles (anon/authenticated) boost_count is SILENTLY KEPT —
--     old value on UPDATE, 0 on INSERT. Definer functions (spend_my_sparkle,
--     owner postgres) and service_role pass through untouched.
--     WHY IGNORE, NOT RAISE: the shipped client (src/data/cloud/items-sync.ts)
--     upserts boost_count with every item save. Raising would fail the owner's
--     whole save whenever their local counter differs from the server (e.g.
--     somebody sparkled the item since the last pull). Ignoring keeps those
--     saves working and still makes a direct edit a no-op.
--  2. Revoke DELETE on public.boosts from authenticated. Otherwise a member can
--     delete their boost and call spend_my_sparkle again: the -1 sparkle is a
--     ledger replay (same ref 'boost:<item>') so it is FREE, and boost_count
--     goes up again — an unlimited loop. The app has no un-sparkle path today.
--     Item delete still cascades (RI runs as table owner).
-- Limit stays 1 boost per person per item (boosts unique(item_id, by_profile_id)
-- + 03's 'capped' check); the app's BOOST_RULES.maxPerPersonPerItem now matches.
-- =============================================================================
begin;

do $chk$
begin
  if to_regprocedure('public.spend_my_sparkle(uuid)') is null then
    raise exception '04 needs 20261015_03 (spend_my_sparkle) applied first';
  end if;
end $chk$;

create or replace function app_private.guard_item_boost_count()
returns trigger language plpgsql set search_path = public, app_private as $$
begin
  -- NOT security definer: current_user is the caller.
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'UPDATE' then
    new.boost_count := old.boost_count;
  else
    new.boost_count := 0;
  end if;
  return new;
end $$;
revoke all on function app_private.guard_item_boost_count() from public, anon;
grant execute on function app_private.guard_item_boost_count() to authenticated, service_role;

drop trigger if exists items_guard_boost_count on public.items;
create trigger items_guard_boost_count before insert or update on public.items
  for each row execute function app_private.guard_item_boost_count();

revoke delete on public.boosts from authenticated;

commit;

-- =============================================================================
-- ROLLBACK (restores Aug-27 behaviour: owners may edit boost_count, members may
-- delete their own boosts; 03's spend_my_sparkle is untouched)
-- begin;
--   drop trigger if exists items_guard_boost_count on public.items;
--   drop function if exists app_private.guard_item_boost_count();
--   grant delete on public.boosts to authenticated;
-- commit;
