CREATE OR REPLACE FUNCTION public.update_my_connection_state(
  _connection_id uuid,
  _action text,
  _value boolean DEFAULT true
) RETURNS public.connections
LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private
AS $$
  SELECT app_private.update_connection_state(auth.uid(), _connection_id, _action, _value)
$$;
REVOKE ALL ON FUNCTION public.update_my_connection_state(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.update_connection_state(uuid,uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_connection_state(uuid,text,boolean) TO authenticated;