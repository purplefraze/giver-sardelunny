DROP INDEX IF EXISTS public.items_owner_local_key;
CREATE UNIQUE INDEX items_owner_local_key ON public.items (owner_id, local_id);