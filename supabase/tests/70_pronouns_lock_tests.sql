-- Tests for 20261026_05 + 06 (pronouns owner-only). LOCAL THROWAWAY POSTGRES
-- ONLY, synthetic accounts only. Run via supabase/tests/run_local_pronouns.sh.
\set ON_ERROR_STOP 1
create schema if not exists t;
create table if not exists t.results (n serial, name text, ok boolean, detail text);
grant usage on schema t to public; grant all on t.results to public; grant all on sequence t.results_n_seq to public;
create or replace function t.ok(_name text, _cond boolean, _detail text default '') returns void
language sql as $$ insert into t.results(name, ok, detail) values (_name, coalesce(_cond,false), _detail) $$;
create or replace function t.throws(_name text, _sql text, _like text default '%') returns void
language plpgsql as $$
begin
  begin execute _sql;
  exception when others then perform t.ok(_name, sqlerrm ilike _like, sqlerrm); return;
  end;
  perform t.ok(_name, false, 'did not raise');
end $$;
create or replace function t.lives(_name text, _sql text) returns void
language plpgsql as $$
begin
  begin execute _sql; exception when others then perform t.ok(_name, false, sqlerrm); return; end;
  perform t.ok(_name, true);
end $$;
grant execute on all functions in schema t to public;

-- synthetic accounts
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000000a','a@test.local'),
 ('00000000-0000-0000-0000-00000000000b','b@test.local'),
 ('00000000-0000-0000-0000-00000000000d','d@test.local');
insert into public.profiles(id,user_id,name,handle,pronouns) values
 ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','Ada','ada','she/her'),
 ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','Bo','bo','he/him'),
 ('10000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000d','Di','di',null);
insert into public.profiles(id,name,handle,is_sample,sample_key,pronouns) values
 ('10000000-0000-0000-0000-0000000000f5','Sample','sample-t',true,'s-t','they/them');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000d','admin');

set role authenticated;
-- A: owner
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.lives('owner edits own pronouns', $$update public.profiles set pronouns='they/she' where user_id=auth.uid()$$);
select t.ok('owner sees new pronouns via my_profile()', (select pronouns='they/she' from public.my_profile()));
select t.lives('owner edits other fields', $$update public.profiles set about='hello' where user_id=auth.uid()$$);
select t.ok('owner other field saved', (select about='hello' and pronouns='they/she' from public.my_profile()));
select t.throws('member cannot select pronouns column',
  $$select pronouns from public.profiles$$, '%permission denied%');
select t.throws('member cannot select * from profiles',
  $$select * from public.profiles$$, '%permission denied%');
select t.lives('public directory columns still readable',
  $$select id,user_id,sample_key,is_sample,handle,name,photo_url,about,by_day,by_night,weekend,created_at,updated_at from public.profiles$$);
select t.ok('directory sees other members', (select count(*)>=3 from public.profiles where handle in ('ada','bo','di')));
select t.throws('cannot filter on someone else''s pronouns',
  $$select id from public.profiles where pronouns='he/him'$$, '%permission denied%');
-- A tries to change B's pronouns: RLS hides B's row, so nothing changes
select t.lives('non-owner update runs (RLS filters it)', $$update public.profiles set pronouns='x' where handle='bo'$$);
select t.ok('my_profile() returns only my row', (select count(*)=1 and bool_and(handle='ada') from public.my_profile()));

-- D: admin on a sample profile (RLS allows; guard must stop pronouns)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select t.throws('admin cannot change sample pronouns',
  $$update public.profiles set pronouns='he/him' where sample_key='s-t'$$, '%only the profile owner%');
select t.lives('admin can still edit other sample fields', $$update public.profiles set about='sample about' where sample_key='s-t'$$);

-- anon has nothing
select set_config('request.jwt.claim.sub','',false);
reset role; set role anon;
select t.throws('anon cannot read profiles', $$select id from public.profiles$$, '%permission denied%');
select t.throws('anon cannot call my_profile()', $$select * from public.my_profile()$$, '%permission denied%');
reset role;

-- trusted paths unaffected; final state checks as postgres
select t.ok('B pronouns untouched by A', (select pronouns='he/him' from public.profiles where handle='bo'));
select t.ok('sample pronouns untouched by admin', (select pronouns='they/them' and about='sample about' from public.profiles where sample_key='s-t'));
set role service_role;
select t.lives('service_role can change any pronouns', $$update public.profiles set pronouns='she/they' where handle='bo'$$);
reset role;
select t.ok('service_role edit saved', (select pronouns='she/they' from public.profiles where handle='bo'));
