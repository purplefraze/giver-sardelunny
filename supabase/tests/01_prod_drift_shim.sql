-- Approximates PROD-only objects reported by the 15 Oct audit (NOT in repo).
-- ASSUMED shape: exact prod column list / my_profile() body are unverified.
revoke select on public.profiles from authenticated;
do $$ declare cols text; begin
  select string_agg(quote_ident(attname), ', ') into cols from pg_attribute
   where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped
     and attname not in ('birthday','gender','answers');
  execute format('grant select (%s) on public.profiles to authenticated', cols);
end $$;
create or replace function public.my_profile() returns public.profiles
language sql stable security definer set search_path = public as
$$ select * from public.profiles where user_id = auth.uid() $$;
grant execute on function public.my_profile() to authenticated;
