revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.owns_profile(uuid) from anon, public;
revoke execute on function public.is_sample_profile(uuid) from anon, public;
revoke execute on function public.can_see_conversation(uuid) from anon, public;
drop function if exists public.current_profile_id();