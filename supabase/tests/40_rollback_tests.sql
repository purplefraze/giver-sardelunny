\set ON_ERROR_STOP 1
\pset tuples_only on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select t.lives('after rollback: B can start a conversation again', $$insert into public.conversations(a_id,b_id) values ('10000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-00000000000a')$$);
select t.lives('after rollback: sparks edit allowed again (Aug-27 behaviour)', $$update public.profiles set sparks=7 where user_id=auth.uid()$$);
reset role;
select t.ok('after rollback: sparks edit took effect', (select sparks=7 from public.profiles where id='10000000-0000-0000-0000-00000000000b'));
select t.ok('after rollback: ledger kept', (select count(*)>0 from public.spark_ledger));
