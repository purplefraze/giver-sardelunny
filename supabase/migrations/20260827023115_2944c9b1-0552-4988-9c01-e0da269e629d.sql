CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select app_private.has_role(auth.uid(), 'admin') $$;

CREATE OR REPLACE FUNCTION app_private.owns_profile(_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select exists (select 1 from public.profiles where id = _profile and user_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION app_private.is_sample_profile(_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select coalesce((select is_sample from public.profiles where id = _profile), false) $$;

CREATE OR REPLACE FUNCTION app_private.can_see_conversation(_conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.conversations c
    where c.id = _conversation
      and (
        app_private.owns_profile(c.a_id) or app_private.owns_profile(c.b_id)
        or (app_private.is_admin() and (app_private.is_sample_profile(c.a_id) or app_private.is_sample_profile(c.b_id)))
      )
  )
$$;

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role), app_private.is_admin(), app_private.owns_profile(uuid), app_private.is_sample_profile(uuid), app_private.can_see_conversation(uuid) TO authenticated, service_role;

-- boosts
ALTER POLICY "boost as self" ON public.boosts WITH CHECK (app_private.owns_profile(by_profile_id));
ALTER POLICY "unboost as self" ON public.boosts USING (app_private.owns_profile(by_profile_id));

-- conversations
ALTER POLICY "read own conversations" ON public.conversations USING (app_private.owns_profile(a_id) OR app_private.owns_profile(b_id) OR (app_private.is_admin() AND (app_private.is_sample_profile(a_id) OR app_private.is_sample_profile(b_id))));
ALTER POLICY "start conversation as self" ON public.conversations WITH CHECK (app_private.owns_profile(a_id) OR app_private.owns_profile(b_id) OR app_private.is_admin());
ALTER POLICY "touch own conversations" ON public.conversations USING (app_private.can_see_conversation(id)) WITH CHECK (app_private.can_see_conversation(id));

-- invites
ALTER POLICY "admins manage invites" ON public.invites USING (app_private.is_admin()) WITH CHECK (app_private.is_admin());

-- items
ALTER POLICY "delete own items" ON public.items USING (app_private.owns_profile(owner_id) OR (app_private.is_admin() AND app_private.is_sample_profile(owner_id)));
ALTER POLICY "insert own items" ON public.items WITH CHECK (app_private.owns_profile(owner_id) OR (app_private.is_admin() AND app_private.is_sample_profile(owner_id)));
ALTER POLICY "read published or own items" ON public.items USING (published OR app_private.owns_profile(owner_id) OR app_private.is_admin());
ALTER POLICY "update own items" ON public.items USING (app_private.owns_profile(owner_id) OR (app_private.is_admin() AND app_private.is_sample_profile(owner_id))) WITH CHECK (app_private.owns_profile(owner_id) OR (app_private.is_admin() AND app_private.is_sample_profile(owner_id)));

-- messages
ALTER POLICY "mark messages read" ON public.messages USING (app_private.can_see_conversation(conversation_id)) WITH CHECK (app_private.can_see_conversation(conversation_id));
ALTER POLICY "read messages in own conversations" ON public.messages USING (app_private.can_see_conversation(conversation_id));
ALTER POLICY "send as self or as sample when admin" ON public.messages WITH CHECK (app_private.can_see_conversation(conversation_id) AND (app_private.owns_profile(from_profile_id) OR (app_private.is_admin() AND app_private.is_sample_profile(from_profile_id))));

-- notifications
ALTER POLICY "delete own notifications" ON public.notifications USING (app_private.owns_profile(profile_id));
ALTER POLICY "notify a real counterpart" ON public.notifications WITH CHECK ((actor_profile_id IS NULL) OR app_private.owns_profile(actor_profile_id) OR app_private.is_admin());
ALTER POLICY "read own notifications" ON public.notifications USING (app_private.owns_profile(profile_id) OR (app_private.is_admin() AND app_private.is_sample_profile(profile_id)));
ALTER POLICY "update own notifications" ON public.notifications USING (app_private.owns_profile(profile_id) OR (app_private.is_admin() AND app_private.is_sample_profile(profile_id))) WITH CHECK (app_private.owns_profile(profile_id) OR (app_private.is_admin() AND app_private.is_sample_profile(profile_id)));

-- profiles
ALTER POLICY "update own profile" ON public.profiles USING ((user_id = auth.uid()) OR (app_private.is_admin() AND is_sample)) WITH CHECK ((user_id = auth.uid()) OR (app_private.is_admin() AND is_sample));

-- user_roles
ALTER POLICY "own roles readable" ON public.user_roles USING ((user_id = auth.uid()) OR app_private.is_admin());

DROP FUNCTION IF EXISTS public.can_see_conversation(uuid);
DROP FUNCTION IF EXISTS public.is_sample_profile(uuid);
DROP FUNCTION IF EXISTS public.owns_profile(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);