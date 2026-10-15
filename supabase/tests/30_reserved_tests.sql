\set ON_ERROR_STOP 1
\pset tuples_only on
-- run on a DB where Sep-23 profile_sparks_sync WAS applied before 01
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000aa');
insert into public.profiles(id,user_id,name) values ('10000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000000aa','R');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000aa',false);
select t.lives('reserved: PATCH runs', $$update public.profiles set reserved='{"hold":999}', sparks_seeded=true, rewarded='["x"]', name='R2' where user_id=auth.uid()$$);
reset role;
select t.ok('reserved/sparks_seeded/rewarded kept, name saved',
  (select reserved='{}'::jsonb and not sparks_seeded and rewarded='[]'::jsonb and name='R2' from public.profiles where id='10000000-0000-0000-0000-0000000000aa'));
select t.ok('Sep-23 default (50) respected on insert', (select sparks=50 from public.profiles where id='10000000-0000-0000-0000-0000000000aa'));
