-- =============================================================================
-- !!! UNAPPLIED — DO NOT RUN WITHOUT FOUNDER APPROVAL !!!
-- SEC-04 (part 1): put my_profile() and the profiles column grants that
-- ALREADY EXIST IN PROD into the repo, so the repo matches prod.
-- Source of the shape: drizzle/migrations/0000_migration.sql (Lovable export).
-- The exact prod body has NOT been read back from prod; verify with a
-- read-only check before applying. Idempotent: safe to re-run.
-- =============================================================================
begin;

-- Owner reads their own full row (incl. private columns) through this only.
create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where user_id = auth.uid() limit 1 $$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Public directory columns (prod today). birthday, gender, answers and the
-- spark columns are NOT granted: owner-only via my_profile().
revoke select on public.profiles from authenticated, anon;
grant select (id, user_id, sample_key, is_sample, handle, name, photo_url,
              about, by_day, by_night, weekend, pronouns, created_at, updated_at)
  on public.profiles to authenticated;

commit;

-- ROLLBACK (restores the Aug-27 repo state; NOT prod — prod already has this)
-- begin;
-- drop function if exists public.my_profile();
-- grant select on public.profiles to authenticated;
-- commit;
