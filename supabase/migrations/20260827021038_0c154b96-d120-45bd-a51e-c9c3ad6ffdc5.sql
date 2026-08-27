ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS accepted_user_id uuid;

CREATE INDEX IF NOT EXISTS invites_accepted_user_id_idx ON public.invites (accepted_user_id);
CREATE INDEX IF NOT EXISTS invites_created_at_idx ON public.invites (created_at DESC);