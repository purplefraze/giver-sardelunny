-- =============================================================================
-- !!! UNAPPLIED — DRAFT — APPLY ONLY TOGETHER WITH THE CLIENT FOLLOW-UP PR !!!
-- FIX 1b: belt-and-braces column privilege. Replaces table-level UPDATE on
-- profiles with a column list that excludes every protected column.
-- WHY SEPARATE: today boot.ts PATCHes sparks/sparkles (+reserved etc.) in the
-- same request as name/about. With this applied that whole PATCH fails 42501,
-- so profile edits would stop saving until the client stops sending currency.
-- Requires 20261015_01 (trigger stays as the second layer).
-- Column list is computed from the live catalog, so it matches PROD's real
-- columns (incl. prod-only ones) instead of the repo's.
-- =============================================================================
begin;
do $$
declare cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
    from pg_attribute
   where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped
     and attname <> all (app_private.protected_profile_columns() || array['id','created_at']);
  execute 'revoke update on public.profiles from anon, authenticated';
  execute format('grant update (%s) on public.profiles to authenticated', cols);
end $$;
commit;
-- ROLLBACK
-- begin; revoke update on public.profiles from authenticated;
--        grant update on public.profiles to authenticated; commit;
