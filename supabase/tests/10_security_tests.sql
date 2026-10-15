-- Automated tests for 20261015_01/01b/02. LOCAL THROWAWAY POSTGRES ONLY,
-- synthetic accounts only. Run via supabase/tests/run_local.sh.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
create schema if not exists t;
create table if not exists t.results (n serial, name text, ok boolean, detail text);
grant usage on schema t to public; grant all on t.results to public; grant all on sequence t.results_n_seq to public;
create or replace function t.ok(_name text, _cond boolean, _detail text default '') returns void
language sql as $$ insert into t.results(name, ok, detail) values (_name, coalesce(_cond,false), _detail) $$;
-- passes when _sql raises (optionally matching _like)
create or replace function t.throws(_name text, _sql text, _like text default '%') returns void
language plpgsql as $$
begin
  begin execute _sql;
  exception when others then
    perform t.ok(_name, sqlerrm ilike _like, sqlerrm); return;
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

-- ---- synthetic accounts (as postgres) ----------------------------------------
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000000a','a@test.local'),  -- A: has a live give
 ('00000000-0000-0000-0000-00000000000b','b@test.local'),  -- B: no give
 ('00000000-0000-0000-0000-00000000000c','c@test.local'),  -- C: has a live give (receiver)
 ('00000000-0000-0000-0000-00000000000d','d@test.local'),  -- D: admin
 ('00000000-0000-0000-0000-00000000000e','e@test.local');  -- E: brand-new member
insert into public.profiles(id,user_id,name,handle) values
 ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','Ada','ada'),
 ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','Bo','bo'),
 ('10000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000c','Cy','cy'),
 ('10000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000d','Di','di');
insert into public.profiles(id,name,handle,is_sample,sample_key) values
 ('10000000-0000-0000-0000-0000000000f5','Sample','sample',true,'s1');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000d','admin');
insert into public.items(id,owner_id,type,text,published,status,details) values
 ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000a','give','guitar lesson',true,'active','{}'),
 ('20000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-00000000000c','give','bread',true,'active','{}'),
 ('20000000-0000-0000-0000-0000000000cb','10000000-0000-0000-0000-00000000000c','give','second give',true,'active','{}'),
 ('20000000-0000-0000-0000-0000000000bb','10000000-0000-0000-0000-00000000000b','wish','wants a lift',true,'active','{}');

-- ======================= FIX 1: SPARKS ==========================================
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.lives('legit profile edit with currency in same PATCH',
  $$update public.profiles set name='Ada L', about='hi', sparks=99999, sparkles=999, give_sparks=999 where user_id=auth.uid()$$);
select t.ok('legit edit saved: name/about', (select name='Ada L' and about='hi' from public.my_profile()));
select t.ok('direct sparks edit ignored', (select sparks=250 and sparkles=3 and give_sparks=0 from public.my_profile()));
select t.lives('self-exempt attempt runs', $$update public.profiles set is_sample=true, sample_key='x' where user_id=auth.uid()$$);
select t.ok('is_sample/sample_key cannot be self-set', (select not is_sample and sample_key is null from public.my_profile()));
select t.throws('member cannot call adjust_sparks',
  $$select app_private.adjust_sparks('10000000-0000-0000-0000-00000000000a',1000,0,'admin')$$, '%permission denied%');
select t.throws('member cannot insert ledger rows',
  $$insert into public.spark_ledger(profile_id,delta_sparks,sparks_after,sparkles_after,kind) values ('10000000-0000-0000-0000-00000000000a',1,1,1,'x')$$, '%permission denied%');
select t.throws('member cannot call update_connection_state as someone else',
  $$select app_private.update_connection_state('00000000-0000-0000-0000-00000000000c', gen_random_uuid(), 'confirm', true)$$, '%permission denied%');

-- new member: insert + welcome grant
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000e',false);
select t.lives('new member creates profile (picks a balance)',
  $$insert into public.profiles(id,user_id,name,sparks,sparkles,give_sparks) values ('10000000-0000-0000-0000-00000000000e',auth.uid(),'Eve',99999,99,99)$$);
select t.ok('insert takes column defaults', (select sparks=250 and sparkles=3 and give_sparks=0 from public.my_profile()));
select t.lives('claim welcome grant', $$select public.claim_welcome_grant()$$);
select t.lives('claim welcome grant again (idempotent)', $$select public.claim_welcome_grant()$$);
select t.ok('welcome grant = +50 to wish, +50 to give, once', (select sparks=300 and give_sparks=50 from public.my_profile()));
select t.ok('welcome grant ledgered once (100 total)',
  (select count(*)=1 and sum(delta_sparks+delta_give_sparks)=100 from public.spark_ledger where kind='welcome'));
select t.lives('spend 10', $$select public.spend_my_sparks(10,'boost','r1')$$);
select t.lives('spend replay same ref', $$select public.spend_my_sparks(10,'boost','r1')$$);
select t.ok('spend debited once', (select sparks=290 from public.my_profile()));
select t.throws('overspend rejected', $$select public.spend_my_sparks(5000,'x','r2')$$, '%insufficient%');
select t.throws('zero/negative spend rejected', $$select public.spend_my_sparks(-5,'x','r3')$$, '%bad amount%');
select t.ok('member sees only own ledger',
  (select bool_and(profile_id='10000000-0000-0000-0000-00000000000e') from public.spark_ledger));
select t.throws('ledger is append-only', $$update public.spark_ledger set delta_sparks=1$$, '%permission denied%');

-- ======================= FIX 2: LIVE-GIVE GATE ===================================
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select t.throws('B (no give) cannot connect on a give',
  $$insert into public.connections(item_id,owner_id,helper_id) values ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b')$$, '%row-level security%');
select t.throws('B (no give) cannot start a conversation',
  $$insert into public.conversations(a_id,b_id) values ('10000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-00000000000a')$$, '%row-level security%');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select t.throws('C cannot connect on B''s wish (B cannot receive without a live give)',
  $$insert into public.connections(item_id,owner_id,helper_id) values ('20000000-0000-0000-0000-0000000000bb','10000000-0000-0000-0000-0000000000bb'::uuid,'10000000-0000-0000-0000-00000000000c')$$, '%');
select t.throws('C cannot connect on B''s wish (correct owner id)',
  $$insert into public.connections(item_id,owner_id,helper_id) values ('20000000-0000-0000-0000-0000000000bb','10000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-00000000000c')$$, '%row-level security%');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.lives('A (live give) starts a conversation with B',
  $$insert into public.conversations(id,a_id,b_id) values ('30000000-0000-0000-0000-0000000000ab','10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b')$$);
select t.lives('A messages after a live give',
  $$insert into public.messages(conversation_id,from_profile_id,text) values ('30000000-0000-0000-0000-0000000000ab','10000000-0000-0000-0000-00000000000a','hello')$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select t.throws('B (no give) cannot message, even in A''s conversation',
  $$insert into public.messages(conversation_id,from_profile_id,text) values ('30000000-0000-0000-0000-0000000000ab','10000000-0000-0000-0000-00000000000b','hey')$$, '%row-level security%');
select t.ok('B can still read A''s message', (select count(*)=1 from public.messages));

-- lesson: A gives, C (live give) receives
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select t.lives('C (live give) connects on A''s give',
  $$insert into public.connections(id,item_id,owner_id,helper_id) values ('40000000-0000-0000-0000-0000000000ac','20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000c')$$);
select t.lives('C opens the connection-bound conversation',
  $$insert into public.conversations(id,a_id,b_id,connection_id) values ('30000000-0000-0000-0000-0000000000ac','10000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-00000000000a','40000000-0000-0000-0000-0000000000ac')$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select t.throws('B cannot re-point a conversation to a connection (bypass)',
  $$update public.conversations set connection_id='40000000-0000-0000-0000-0000000000ac' where id='30000000-0000-0000-0000-0000000000ab'$$, '%fixed%');
select t.throws('B cannot swap conversation participants',
  $$update public.conversations set b_id='10000000-0000-0000-0000-00000000000c' where id='30000000-0000-0000-0000-0000000000ab'$$, '%fixed%');
select t.lives('participant may still touch timestamps',
  $$update public.conversations set last_message_at=now() where id='30000000-0000-0000-0000-0000000000ab'$$);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.lives('A claims the lesson', $$select public.update_my_connection_state('40000000-0000-0000-0000-0000000000ac','claim')$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select t.lives('C confirms (mutual)', $$select public.update_my_connection_state('40000000-0000-0000-0000-0000000000ac','confirm')$$);
reset role;
select t.ok('giver A paid +10 sparks', (select sparks=260 from public.profiles where id='10000000-0000-0000-0000-00000000000a'));
select t.ok('receiver C is free (balance unchanged)', (select sparks=250 from public.profiles where id='10000000-0000-0000-0000-00000000000c'));
select t.ok('payout recorded in spark_ledger as connection',
  (select count(*)=1 from public.spark_ledger where profile_id='10000000-0000-0000-0000-00000000000a' and kind='connection' and delta_sparks=10));
select t.lives('service_role can still adjust balances',
  $$set local role service_role; update public.profiles set sparks=sparks+1 where id='10000000-0000-0000-0000-00000000000b'$$);
select t.ok('service_role change audited', (select count(*)=1 from public.spark_ledger where profile_id='10000000-0000-0000-0000-00000000000b'));

-- receiving gate on settlement: C's gives expire, then a new A->C lesson can't settle
update public.items set details='{"expiresAt":"2020-01-01T00:00:00Z"}' where owner_id='10000000-0000-0000-0000-00000000000c';
insert into public.items(id,owner_id,type,text,published,status) values
 ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-00000000000a','give','second lesson',true,'active');
insert into public.connections(id,item_id,owner_id,helper_id) values
 ('40000000-0000-0000-0000-0000000000a2','20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000c');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.throws('receiving blocked once receiver has no live give',
  $$select public.update_my_connection_state('40000000-0000-0000-0000-0000000000a2','claim')$$, '%receiving needs a live give%');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select t.throws('expired give = blocked from starting conversations',
  $$insert into public.conversations(a_id,b_id) values ('10000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-00000000000b')$$, '%row-level security%');
select t.lives('in-progress handoff chat survives expiry (connection-bound)',
  $$insert into public.messages(conversation_id,from_profile_id,text) values ('30000000-0000-0000-0000-0000000000ac','10000000-0000-0000-0000-00000000000c','on my way')$$);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select t.lives('admin starts conversation as sample',
  $$insert into public.conversations(id,a_id,b_id) values ('30000000-0000-0000-0000-0000000000f5','10000000-0000-0000-0000-0000000000f5','10000000-0000-0000-0000-00000000000b')$$);
select t.lives('admin messages as sample',
  $$insert into public.messages(conversation_id,from_profile_id,text,sent_as_sample) values ('30000000-0000-0000-0000-0000000000f5','10000000-0000-0000-0000-0000000000f5','welcome',true)$$);
reset role;
