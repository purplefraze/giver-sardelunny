-- After 01b: the NEW client still saves; the OLD client (currency in PATCH) fails.
\set ON_ERROR_STOP 1
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t.lives('01b: new client identity save', $$update public.profiles set about='after 01b' where user_id=auth.uid()$$);
select t.throws('01b: old client PATCH (with sparks) rejected — why client ships first',
  $$update public.profiles set about='x', sparks=1 where user_id=auth.uid()$$, '%permission denied%');
select t.lives('01b: RPCs still work', $$select public.release_my_wish_hold('20000000-0000-0000-0000-0000000000a2')$$);
reset role;
