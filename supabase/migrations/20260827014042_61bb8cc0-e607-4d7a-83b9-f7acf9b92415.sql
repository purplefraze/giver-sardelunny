grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_profile(uuid) to authenticated;
grant execute on function public.is_sample_profile(uuid) to authenticated;
grant execute on function public.can_see_conversation(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;