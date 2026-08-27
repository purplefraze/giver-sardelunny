ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sparks integer NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS sparkles integer NOT NULL DEFAULT 3;

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'connecting' CHECK (state IN ('connecting','awaiting','verified','disputed','cancelled')),
  claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_confirmed boolean NOT NULL DEFAULT false,
  helper_confirmed boolean NOT NULL DEFAULT false,
  handed_over boolean NOT NULL DEFAULT false,
  returned boolean NOT NULL DEFAULT false,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_distinct_people CHECK (owner_id <> helper_id),
  CONSTRAINT connections_unique_helper UNIQUE (item_id, helper_id)
);
GRANT SELECT, INSERT ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read connections" ON public.connections
  FOR SELECT TO authenticated
  USING (app_private.owns_profile(owner_id) OR app_private.owns_profile(helper_id) OR (app_private.is_admin() AND (app_private.is_sample_profile(owner_id) OR app_private.is_sample_profile(helper_id))));
CREATE POLICY "helper starts connection" ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (app_private.owns_profile(helper_id) AND NOT app_private.owns_profile(owner_id));
CREATE INDEX connections_owner_idx ON public.connections(owner_id, updated_at DESC);
CREATE INDEX connections_helper_idx ON public.connections(helper_id, updated_at DESC);
CREATE TRIGGER connections_touch BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS connection_id uuid UNIQUE REFERENCES public.connections(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS conversations_connection_idx ON public.conversations(connection_id);

CREATE TABLE public.ledger_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL DEFAULT 'connection',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_one_settlement UNIQUE (profile_id, connection_id, kind)
);
GRANT SELECT ON public.ledger_events TO authenticated;
GRANT ALL ON public.ledger_events TO service_role;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read ledger" ON public.ledger_events
  FOR SELECT TO authenticated USING (app_private.owns_profile(profile_id));

CREATE TABLE public.compliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  about_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliments_distinct_people CHECK (about_profile_id <> from_profile_id),
  CONSTRAINT compliments_one_per_connection UNIQUE (connection_id, from_profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliments TO authenticated;
GRANT ALL ON public.compliments TO service_role;
ALTER TABLE public.compliments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read compliments" ON public.compliments FOR SELECT TO authenticated USING (true);
CREATE POLICY "verified participant writes compliment" ON public.compliments
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.owns_profile(from_profile_id)
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id AND c.state = 'verified'
        AND ((c.owner_id = from_profile_id AND c.helper_id = about_profile_id)
          OR (c.helper_id = from_profile_id AND c.owner_id = about_profile_id))
    )
  );
CREATE POLICY "author updates compliment" ON public.compliments
  FOR UPDATE TO authenticated USING (app_private.owns_profile(from_profile_id))
  WITH CHECK (app_private.owns_profile(from_profile_id));
CREATE POLICY "author deletes compliment" ON public.compliments
  FOR DELETE TO authenticated USING (app_private.owns_profile(from_profile_id));
CREATE INDEX compliments_about_idx ON public.compliments(about_profile_id, created_at DESC);
CREATE TRIGGER compliments_touch BEFORE UPDATE ON public.compliments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owners create push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owners update push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owners delete push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.update_connection_state(
  _connection_id uuid,
  _action text,
  _value boolean DEFAULT true
) RETURNS public.connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private
AS $$
DECLARE
  c public.connections;
  actor uuid;
  item_type text;
  item_side text;
  generous uuid[];
  generous_id uuid;
BEGIN
  SELECT * INTO c FROM public.connections WHERE id = _connection_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'connection not found'; END IF;
  SELECT id INTO actor FROM public.profiles WHERE user_id = auth.uid();
  IF actor IS NULL OR actor NOT IN (c.owner_id, c.helper_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _action = 'handover' THEN
    IF c.state NOT IN ('connecting','disputed') THEN RAISE EXCEPTION 'wrong state'; END IF;
    UPDATE public.connections SET handed_over = _value WHERE id = c.id RETURNING * INTO c;
  ELSIF _action = 'return' THEN
    IF c.state NOT IN ('connecting','disputed') OR (_value AND NOT c.handed_over) THEN RAISE EXCEPTION 'handover required'; END IF;
    UPDATE public.connections SET returned = _value WHERE id = c.id RETURNING * INTO c;
  ELSIF _action = 'claim' THEN
    SELECT type INTO item_type FROM public.items WHERE id = c.item_id;
    IF c.state NOT IN ('connecting','disputed') OR (item_type = 'borrow' AND NOT (c.handed_over AND c.returned)) THEN RAISE EXCEPTION 'not ready'; END IF;
    UPDATE public.connections SET state = 'awaiting', claimed_by = actor,
      owner_confirmed = (actor = owner_id), helper_confirmed = (actor = helper_id)
      WHERE id = c.id RETURNING * INTO c;
  ELSIF _action = 'confirm' THEN
    IF c.state <> 'awaiting' OR c.claimed_by = actor THEN RAISE EXCEPTION 'wrong confirmer'; END IF;
    UPDATE public.connections SET
      owner_confirmed = owner_confirmed OR actor = owner_id,
      helper_confirmed = helper_confirmed OR actor = helper_id
      WHERE id = c.id RETURNING * INTO c;
    IF c.owner_confirmed AND c.helper_confirmed THEN
      UPDATE public.connections SET state = 'verified', settled_at = COALESCE(settled_at, now()) WHERE id = c.id RETURNING * INTO c;
      IF c.settled_at IS NOT NULL THEN
        SELECT type, side INTO item_type, item_side FROM public.items WHERE id = c.item_id;
        generous := CASE
          WHEN item_type = 'give' THEN ARRAY[c.owner_id]
          WHEN item_type = 'trade' THEN ARRAY[c.owner_id, c.helper_id]
          WHEN item_type = 'borrow' AND item_side = 'lend' THEN ARRAY[c.owner_id]
          ELSE ARRAY[c.helper_id]
        END;
        FOREACH generous_id IN ARRAY generous LOOP
          INSERT INTO public.ledger_events(profile_id, connection_id, amount, body)
          VALUES (generous_id, c.id, 10, 'verified giver connection')
          ON CONFLICT DO NOTHING;
          IF FOUND THEN UPDATE public.profiles SET sparks = sparks + 10 WHERE id = generous_id; END IF;
        END LOOP;
        UPDATE public.items SET status = 'completed' WHERE id = c.item_id;
      END IF;
    END IF;
  ELSIF _action = 'dispute' THEN
    IF c.state <> 'awaiting' OR c.claimed_by = actor THEN RAISE EXCEPTION 'wrong responder'; END IF;
    UPDATE public.connections SET state = 'disputed', owner_confirmed = false, helper_confirmed = false WHERE id = c.id RETURNING * INTO c;
  ELSIF _action = 'cancel' THEN
    IF c.state = 'verified' THEN RAISE EXCEPTION 'already verified'; END IF;
    UPDATE public.connections SET state = 'cancelled', owner_confirmed = false, helper_confirmed = false WHERE id = c.id RETURNING * INTO c;
  ELSE
    RAISE EXCEPTION 'unknown action';
  END IF;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.update_connection_state(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_connection_state(uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_see_conversation(_conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation
      AND (
        app_private.owns_profile(c.a_id) OR app_private.owns_profile(c.b_id)
        OR (app_private.is_admin() AND (app_private.is_sample_profile(c.a_id) OR app_private.is_sample_profile(c.b_id)))
      )
  )
$$;
REVOKE ALL ON FUNCTION public.can_see_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_conversation(uuid) TO authenticated;