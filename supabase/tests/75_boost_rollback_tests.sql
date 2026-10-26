-- After applying 04's ROLLBACK block: Aug-27 behaviour is back. LOCAL ONLY.
\set ON_ERROR_STOP 1
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t.lives('after 04 rollback: owner boost_count edit allowed again',
  $$update public.items set boost_count = 42 where id = '20000000-0000-0000-0000-0000000000d1'$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d2',false);
select t.lives('after 04 rollback: member can delete own boost again',
  $$delete from public.boosts where item_id = '20000000-0000-0000-0000-0000000000d1'$$);
reset role;
select t.ok('after 04 rollback: owner edit took effect (42), boost row gone',
  (select boost_count = 42 from public.items where id = '20000000-0000-0000-0000-0000000000d1')
  and (select count(*) = 0 from public.boosts where item_id = '20000000-0000-0000-0000-0000000000d1'));
select t.ok('after 04 rollback: guard function and trigger removed',
  to_regprocedure('app_private.guard_item_boost_count()') is null
  and not exists (select 1 from pg_trigger where tgname = 'items_guard_boost_count'));
select t.ok('after 04 rollback: spend_my_sparkle (03) untouched',
  to_regprocedure('public.spend_my_sparkle(uuid)') is not null);
