-- =============================================================================
-- !!! UNAPPLIED — DO NOT RUN WITHOUT FOUNDER APPROVAL !!!
-- SEC-04 (part 2): pronouns are owner-only.
--   a) READ: drop pronouns from the public directory grant. Other members can
--      no longer select it; the owner still reads it via my_profile().
--   b) EDIT: only the profile's own user can change pronouns. RLS already
--      limits UPDATE to the owner OR an admin on a sample profile; this guard
--      also stops the admin/sample path from changing pronouns.
-- SHIP ORDER: the client change (directory.ts no longer selects pronouns)
-- must be live FIRST. An old client selecting pronouns gets 42501 and an
-- empty directory once (a) is applied. Requires 20261026_05 first.
-- =============================================================================
begin;

-- a) read lock
revoke select (pronouns) on public.profiles from authenticated, anon;

-- b) edit lock. NOT security definer: current_user is the caller, so
-- definer functions and service_role pass through untouched.
create or replace function app_private.guard_profile_pronouns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if new.pronouns is distinct from old.pronouns
     and (old.user_id is null or old.user_id is distinct from auth.uid()) then
    raise exception 'only the profile owner can change pronouns'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_pronouns on public.profiles;
create trigger profiles_guard_pronouns before update on public.profiles
  for each row execute function app_private.guard_profile_pronouns();

commit;

-- ROLLBACK
-- begin;
-- drop trigger if exists profiles_guard_pronouns on public.profiles;
-- drop function if exists app_private.guard_profile_pronouns();
-- grant select (pronouns) on public.profiles to authenticated;
-- commit;
