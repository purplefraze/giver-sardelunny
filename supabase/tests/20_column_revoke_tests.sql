\set ON_ERROR_STOP 1
\pset tuples_only on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select t.lives('01b: identity-only PATCH still works', $$update public.profiles set about='only bio' where user_id=auth.uid()$$);
select t.throws('01b: PATCH including sparks now rejected', $$update public.profiles set sparks=1, about='x' where user_id=auth.uid()$$, '%permission denied%');
select t.throws('01b: PATCH including is_sample rejected', $$update public.profiles set is_sample=true where user_id=auth.uid()$$, '%permission denied%');
reset role;
select t.lives('01b: definer payout path unaffected', $$select app_private.adjust_sparks('10000000-0000-0000-0000-00000000000a',1,0,'admin','test','x1')$$);
