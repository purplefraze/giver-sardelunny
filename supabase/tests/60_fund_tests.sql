-- pledge_to_wish, on a DB where Sep-27 wish_contributions exists. Synthetic only.
\set ON_ERROR_STOP 1
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000f1'),('00000000-0000-0000-0000-0000000000f2');
insert into public.profiles(id,user_id,name) values
 ('10000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f1','Owner'),
 ('10000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000f2','Funder');
insert into public.items(id,owner_id,type,text,published,status,details) values
 ('20000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','wish','laptop',true,'active','{"fundTarget":"5000"}');
create temp table fb as select sparks from public.profiles where id='10000000-0000-0000-0000-0000000000f2';
grant select on fb to public;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2',false);
select t.lives('fund: pledge', $$select public.pledge_to_wish('20000000-0000-0000-0000-0000000000f1', 3000, 'p1')$$);
select t.lives('fund: replay idempotent', $$select public.pledge_to_wish('20000000-0000-0000-0000-0000000000f1', 3000, 'p1')$$);
select t.throws('fund: past target refused', $$select public.pledge_to_wish('20000000-0000-0000-0000-0000000000f1', 3000, 'p2')$$, '%stated cost%');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select t.throws('fund: own wish refused', $$select public.pledge_to_wish('20000000-0000-0000-0000-0000000000f1', 100)$$, '%not fundable%');
reset role;
select t.ok('fund: one row, sparks untouched',
  (select count(*) = 1 from public.wish_contributions)
  and (select p.sparks = fb.sparks from public.profiles p, fb where p.id='10000000-0000-0000-0000-0000000000f2'));
