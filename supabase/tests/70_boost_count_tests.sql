-- Tests for 20261026_04_boost_count_lock. LOCAL THROWAWAY POSTGRES ONLY,
-- synthetic accounts only. Assumes t.* helpers loaded and 01, 03, 04 applied.
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000d1','owner@test.local'),
 ('00000000-0000-0000-0000-0000000000d2','booster@test.local');
insert into public.profiles(id,user_id,name,handle) values
 ('10000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1','Owner','owner'),
 ('10000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000d2','Booster','booster');
update public.profiles set sparkles = 3 where id = '10000000-0000-0000-0000-0000000000d2';
insert into public.items(id,owner_id,type,text,published,status) values
 ('20000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-0000000000d1','give','lamp',true,'active');

set role authenticated;
-- ---- owner tries to edit the counter directly ----------------------------------
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t.lives('boost lock: owner direct boost_count PATCH runs (silently ignored)',
  $$update public.items set boost_count = 99, note = 'still saves' where id = '20000000-0000-0000-0000-0000000000d1'$$);
select t.ok('boost lock: owner direct boost_count edit refused (still 0), other fields saved',
  (select boost_count = 0 and note = 'still saves' from public.items where id = '20000000-0000-0000-0000-0000000000d1'));
select t.lives('boost lock: items-sync style upsert with boost_count=50',
  $$insert into public.items(owner_id,local_id,type,text,published,status,boost_count)
    values ('10000000-0000-0000-0000-0000000000d1','loc-1','give','chair',true,'active',50)
    on conflict (owner_id,local_id) where local_id is not null do update set boost_count = excluded.boost_count$$);
select t.ok('boost lock: new item boost_count forced to 0',
  (select boost_count = 0 from public.items where local_id = 'loc-1'));
select t.lives('boost lock: upsert replay (conflict -> update) with boost_count=50',
  $$insert into public.items(owner_id,local_id,type,text,published,status,boost_count)
    values ('10000000-0000-0000-0000-0000000000d1','loc-1','give','chair',true,'active',50)
    on conflict (owner_id,local_id) where local_id is not null do update set boost_count = excluded.boost_count$$);
select t.ok('boost lock: upsert update path keeps 0',
  (select boost_count = 0 from public.items where local_id = 'loc-1'));

-- ---- booster: spend_my_sparkle boosts exactly once ------------------------------
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d2',false);
select t.lives('boost lock: non-owner direct boost_count PATCH runs (RLS: 0 rows)',
  $$update public.items set boost_count = 7 where id = '20000000-0000-0000-0000-0000000000d1'$$);
select t.lives('boost lock: spend_my_sparkle boosts', $$select public.spend_my_sparkle('20000000-0000-0000-0000-0000000000d1')$$);
reset role;
select t.ok('boost lock: boost_count = 1, sparkles 3 -> 2, one boost row',
  (select boost_count = 1 from public.items where id = '20000000-0000-0000-0000-0000000000d1')
  and (select sparkles = 2 from public.profiles where id = '10000000-0000-0000-0000-0000000000d2')
  and (select count(*) = 1 from public.boosts where item_id = '20000000-0000-0000-0000-0000000000d1'));
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d2',false);
select t.throws('boost lock: second boost same item same member refused',
  $$select public.spend_my_sparkle('20000000-0000-0000-0000-0000000000d1')$$, '%capped%');
select t.throws('boost lock: member cannot delete own boost (closes free re-boost loop)',
  $$delete from public.boosts where item_id = '20000000-0000-0000-0000-0000000000d1'$$, '%permission denied%');
select t.throws('boost lock: member cannot insert boost directly',
  $$insert into public.boosts(item_id,by_profile_id) values ('20000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-0000000000d2')$$, '%permission denied%');
-- owner re-saves with a stale local counter (0): must not lower the real count
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t.lives('boost lock: owner stale save boost_count=0',
  $$update public.items set boost_count = 0 where id = '20000000-0000-0000-0000-0000000000d1'$$);
reset role;
select t.ok('boost lock: after refused 2nd boost + stale save: still 1, sparkles still 2',
  (select boost_count = 1 from public.items where id = '20000000-0000-0000-0000-0000000000d1')
  and (select sparkles = 2 from public.profiles where id = '10000000-0000-0000-0000-0000000000d2'));
-- server-side roles still pass (admin repair / service_role)
set role service_role;
select t.lives('boost lock: service_role may set boost_count',
  $$update public.items set boost_count = 5 where id = '20000000-0000-0000-0000-0000000000d1'$$);
reset role;
select t.ok('boost lock: service_role edit took effect',
  (select boost_count = 5 from public.items where id = '20000000-0000-0000-0000-0000000000d1'));
update public.items set boost_count = 1 where id = '20000000-0000-0000-0000-0000000000d1';
