-- Full app flow against 01 + 03 (+02), in SHIP ORDER: 01 -> client -> 01b.
-- LOCAL THROWAWAY POSTGRES ONLY, synthetic accounts. Assumes the t.* helpers
-- (header of 10_security_tests.sql) are loaded and 01, 02, 03 applied; 01b NOT yet.
\set ON_ERROR_STOP 1
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','fa@test.local'),
 ('00000000-0000-0000-0000-0000000000c1','fc@test.local'),
 ('00000000-0000-0000-0000-0000000000b1','fb@test.local');
insert into public.profiles(id,user_id,name,handle) values
 ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Wisher','wisher'),
 ('10000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','Granter','granter'),
 ('10000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','NoGive','nogive');
insert into public.items(id,owner_id,type,text,published,status) values
 ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','give','soup',true,'active'),
 ('20000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1','give','tea',true,'active');
create temp table bal0 as select id, sparks from public.profiles;
grant select on bal0 to public;

set role authenticated;
-- ---- CLIENT AFTER 01, BEFORE 01b: identity-only PATCH (new boot.ts) ----------
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t.lives('client: identity-only profile save', $$update public.profiles set about='new about' where user_id=auth.uid()$$);
select t.ok('client: identity saved', (select about='new about' from public.my_profile()));
-- welcome grant once
select t.lives('welcome: claim', $$select public.claim_welcome_grant()$$);
select t.lives('welcome: replay is a no-op', $$select public.claim_welcome_grant()$$);
select t.ok('welcome: +50 sparks +50 give once',
  (select p.sparks = b.sparks + 50 and p.give_sparks = 50 from public.my_profile() p, bal0 b where b.id = p.id));
-- wish publish + reserve
insert into public.items(id,owner_id,type,text,published,status) values
 ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1','wish','a bike',true,'active'),
 ('20000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000a1','wish','withdraw me',true,'active');
select t.lives('reserve: wish A2', $$select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000a2')$$);
select t.lives('reserve: replay idempotent', $$select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000a2')$$);
select t.lives('reserve: wish A3', $$select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000a3')$$);
select t.ok('reserve: -20 total, two open holds',
  (select p.sparks = b.sparks + 50 - 20 from public.my_profile() p, bal0 b where b.id = p.id)
  and (select count(*) = 2 from public.spark_holds where state = 'held'));
select t.throws('reserve: someone else''s item refused', $$select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000c1')$$, '%not your wish%');
-- withdraw A3 -> refund
select t.lives('release: withdraw A3', $$select public.release_my_wish_hold('20000000-0000-0000-0000-0000000000a3')$$);
select t.lives('release: replay no-op', $$select public.release_my_wish_hold('20000000-0000-0000-0000-0000000000a3')$$);
select t.throws('reserve: more than balance refused', $$select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000a3'::uuid, 1000)$$, '%insufficient sparks%');
select t.ok('release: refunded once (-10 net)',
  (select p.sparks = b.sparks + 50 - 10 from public.my_profile() p, bal0 b where b.id = p.id));
-- hard delete of a reserved wish refunds
insert into public.items(id,owner_id,type,text,published,status) values
 ('20000000-0000-0000-0000-0000000000a4','10000000-0000-0000-0000-0000000000a1','wish','delete me',true,'active');
select public.reserve_wish_sparks('20000000-0000-0000-0000-0000000000a4');
delete from public.items where id = '20000000-0000-0000-0000-0000000000a4';
select t.ok('delete: hold refunded', (select p.sparks = b.sparks + 40 from public.my_profile() p, bal0 b where b.id = p.id));
select t.throws('holds: member cannot write holds', $$insert into public.spark_holds(profile_id,amount) values ('10000000-0000-0000-0000-0000000000a1',1)$$, '%permission denied%');

-- ---- settlement: granter C grants A's wish A2 ---------------------------------
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select t.lives('settle: granter connects (has live give)',
  $$insert into public.connections(id,item_id,owner_id,helper_id) values ('30000000-0000-0000-0000-0000000000a2','20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000c1')$$);
select t.lives('settle: granter claims', $$select public.update_my_connection_state('30000000-0000-0000-0000-0000000000a2','claim',true)$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t.lives('settle: wisher confirms', $$select public.update_my_connection_state('30000000-0000-0000-0000-0000000000a2','confirm',true)$$);
reset role;
select t.ok('settle: hold closed as settled (not refunded)',
  (select state = 'settled' from public.spark_holds where item_id = '20000000-0000-0000-0000-0000000000a2'));
select t.ok('settle: wisher not refunded', (select p.sparks = b.sparks + 40 from public.profiles p join bal0 b using (id) where p.id = '10000000-0000-0000-0000-0000000000a1'));
select t.ok('settle: granter paid +10 exactly once', (select p.sparks = b.sparks + 10 from public.profiles p join bal0 b using (id) where p.id = '10000000-0000-0000-0000-0000000000c1'));
select t.ok('ledger: every A balance change ledgered',
  (select sum(delta_sparks) = 40 from public.spark_ledger where profile_id = '10000000-0000-0000-0000-0000000000a1'));

-- ---- boosts lock (sparkle feature dropped; only the insert lock remains) --------
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select t.throws('boosts: direct boost insert revoked', $$insert into public.boosts(item_id,by_profile_id) values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000c1')$$, '%permission denied%');

-- ---- gate (02) on client paths --------------------------------------------------
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t.throws('gate: no-give member cannot start conversation',
  $$insert into public.conversations(a_id,b_id) values ('10000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000a1')$$, '%row-level security%');
select t.throws('gate: no-give member cannot connect',
  $$insert into public.connections(item_id,owner_id,helper_id) values ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000b1')$$, '%row-level security%');
reset role;
