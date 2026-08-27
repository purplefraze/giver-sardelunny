DROP FUNCTION IF EXISTS public.update_connection_state(uuid,text,boolean);
DROP FUNCTION IF EXISTS public.can_see_conversation(uuid);

CREATE OR REPLACE FUNCTION app_private.update_connection_state(
  _actor_user_id uuid,
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
  SELECT id INTO actor FROM public.profiles WHERE user_id = _actor_user_id;
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
REVOKE ALL ON FUNCTION app_private.update_connection_state(uuid,uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.update_connection_state(uuid,uuid,text,boolean) TO service_role;