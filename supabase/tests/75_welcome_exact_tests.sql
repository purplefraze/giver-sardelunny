-- Tests for 20261026_07_welcome_grant_exact.sql. LOCAL THROWAWAY POSTGRES ONLY,
-- synthetic accounts only. Needs the t.* helpers (10_security_tests.sql header).
\set ON_ERROR_STOP 1
-- ---- synthetic accounts (as postgres) ----
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','new@test.local'),       -- N: brand-new
 ('00000000-0000-0000-0000-0000000000a2','old@test.local'),       -- O: existing member, 30 days old
 ('00000000-0000-0000-0000-0000000000a3','spent@test.local')      -- S: new, but already spent
on conflict do nothing;
insert into public.profiles(id,user_id,name,handle,created_at) values
 ('10000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a2','Old','old', now() - interval '30 days'),
 ('10000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a3','Spent','spent', now());
update public.profiles set sparks = 137 where id = '10000000-0000-0000-0000-0000000000a2';
create temp table before_old as select sparks, sparkles, give_sparks from public.profiles where id='10000000-0000-0000-0000-0000000000a2';
grant select on before_old to public;

set role authenticated;
-- N: a brand-new member signs up (insert as themselves: column defaults apply)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t.lives('new: creates profile', $$insert into public.profiles(id,user_id,name) values ('10000000-0000-0000-0000-0000000000a1',auth.uid(),'New')$$);
select t.lives('new: claim', $$select public.claim_welcome_grant()$$);
select t.ok('new: lands exactly 50 to wish / 50 to give',
  (select sparks=50 and give_sparks=50 from public.my_profile()),
  (select sparks||' / '||give_sparks from public.my_profile()));
select t.lives('new: second claim', $$select public.claim_welcome_grant()$$);
select t.ok('new: second claim is a no-op (still 50 / 50)', (select sparks=50 and give_sparks=50 from public.my_profile()));
select t.ok('new: one welcome ledger row', (select count(*)=1 from public.spark_ledger where kind='welcome'));
select t.ok('new: ledger row matches the balance',
  (select sparks_after=50 and give_sparks_after=50 from public.spark_ledger where kind='welcome'));
select t.throws('new: still cannot write own sparks to top up',
  $$update public.profiles set sparks=500, give_sparks=500 where user_id=auth.uid()$$, '%permission denied%');

-- O: an existing member is unchanged
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
select t.lives('existing: claim runs', $$select public.claim_welcome_grant()$$);
select t.ok('existing: balance unchanged',
  (select m.sparks=b.sparks and m.sparkles=b.sparkles and m.give_sparks=b.give_sparks from public.my_profile() m, before_old b),
  (select m.sparks||'/'||m.give_sparks from public.my_profile() m));
select t.ok('existing: no welcome ledger row', (select count(*)=0 from public.spark_ledger where kind='welcome'));

-- S: a new member who already spent cannot use the grant to refill
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a3',false);
select t.lives('spent: spends 20 first', $$select public.spend_my_sparks(20,'test')$$);
create temp table s_before as select sparks, give_sparks from public.my_profile();
select t.lives('spent: claim runs', $$select public.claim_welcome_grant()$$);
select t.ok('spent: balance unchanged (no refill)',
  (select m.sparks=b.sparks and m.give_sparks=b.give_sparks from public.my_profile() m, s_before b));

-- anon cannot claim
reset role;
set role anon;
select t.throws('anon cannot claim', $$select public.claim_welcome_grant()$$, '%permission denied%');
reset role;
