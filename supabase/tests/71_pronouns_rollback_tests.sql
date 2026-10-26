-- After the 06 rollback block: pronouns readable again, guard gone.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select t.lives('rollback: pronouns readable again', $$select pronouns from public.profiles$$);
select t.lives('rollback: admin sample pronouns edit allowed again', $$update public.profiles set pronouns='x' where sample_key='s-t'$$);
reset role;
select t.ok('rollback: guard trigger removed', not exists (select 1 from pg_trigger where tgname='profiles_guard_pronouns'));
