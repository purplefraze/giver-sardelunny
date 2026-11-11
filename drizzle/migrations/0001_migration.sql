CREATE OR REPLACE FUNCTION app_private.can_see_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _profile_id AND (p.user_id = auth.uid() OR p.is_sample))
    OR app_private.is_admin()
    OR EXISTS (SELECT 1 FROM public.items i WHERE i.owner_id = _profile_id AND i.published)
    OR EXISTS (SELECT 1 FROM public.connections c WHERE (c.owner_id = _profile_id AND app_private.owns_profile(c.helper_id)) OR (c.helper_id = _profile_id AND app_private.owns_profile(c.owner_id)))
    OR EXISTS (SELECT 1 FROM public.conversations v WHERE (v.a_id = _profile_id AND app_private.owns_profile(v.b_id)) OR (v.b_id = _profile_id AND app_private.owns_profile(v.a_id)))
    OR EXISTS (SELECT 1 FROM public.compliments m WHERE m.from_profile_id = _profile_id OR m.about_profile_id = _profile_id);
$$;
REVOKE ALL ON FUNCTION app_private.can_see_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.can_see_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles readable by signed in" ON public.profiles;
CREATE POLICY "profiles visible in context" ON public.profiles FOR SELECT TO authenticated
USING (app_private.can_see_profile(id));