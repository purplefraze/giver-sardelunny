REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, user_id, sample_key, is_sample, handle, name, photo_url, about, by_day, by_night, weekend, pronouns, created_at, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE user_id = auth.uid() LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated;