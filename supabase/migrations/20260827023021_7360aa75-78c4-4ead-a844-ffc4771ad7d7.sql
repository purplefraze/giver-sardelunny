REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_profile(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_sample_profile(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_see_conversation(uuid) FROM anon, authenticated;