-- =============================================================================
-- !!! UNAPPLIED — DO NOT RUN WITHOUT OWNER APPROVAL !!!
--
-- PER-LESSON SPARKS FOR REPEATING GIVES.
-- Kept OUTSIDE supabase/migrations on purpose so no tool applies it by
-- accident. Until it is applied the client degrades on its own: it probes
-- for public.give_sessions, finds nothing, and cloud connections keep the
-- existing one-off flow ("this happened" → +10 once to the giver).
--
-- The rule (mirrors src/data/give-sessions.ts + connections.ts):
--   * receivers never pay for a give.
--   * a give whose items.details->>'cadence' repeats (weekly, fortnightly,
--     monthly, "every other sunday", typed cadences…) is confirmed LESSON BY
--     LESSON: one person claims "this lesson happened", the other confirms.
--   * each confirmed lesson → giver adds 10 sparks to the GIVER (the give's
--     owner): a ledger_events row (kind 'session:<period>') + profiles.sparks
--     + the client's rewarded key, so no device can pay it twice.
--   * at most ONE session per connection per cadence period (utc buckets
--     starting monday 1970-01-05: day / week / fortnight / calendar month);
--     at most 12 credited sessions per connection; at most 5 credited
--     sessions per giver per week across all their gives. Past a cap a
--     lesson is still recorded as confirmed, it just earns nothing.
--   * a repeating give's connection is never claimed/settled as a whole any
--     more (block 4), so the old one-off +10 cannot be collected on top.
--   * one-time gives are untouched: the existing +10 once per verified
--     connection.
-- Review each block before applying. Apply the whole file in one go.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. THE PERIOD KEY — identical to periodKey() in src/data/give-sessions.ts
-- ---------------------------------------------------------------------------
create or replace function app_private.give_session_period(_cadence text, _at timestamptz)
returns text language plpgsql stable set search_path = public, app_private as $$
declare
  c text := lower(btrim(coalesce(_cadence, '')));
  d date := (_at at time zone 'UTC')::date;
  n integer := d - date '1970-01-05';
begin
  if c = '' or c in ('one time', 'flexible') then return null; end if;
  if c ~ 'month' then return 'month:' || to_char(d, 'YYYY-MM'); end if;
  if c ~ '(fortnight|every other|every second|every (2|two) weeks|bi-?weekly)' then
    return 'fortnight:' || to_char(date '1970-01-05' + (floor(n / 14.0)::integer * 14), 'YYYY-MM-DD');
  end if;
  if c ~ '(\yonce\y|one[- ]?off|one time|just the once)' then return null; end if;
  if c ~ '(daily|every day|each day)' then return 'day:' || to_char(d, 'YYYY-MM-DD'); end if;
  return 'week:' || to_char(date '1970-01-05' + (floor(n / 7.0)::integer * 7), 'YYYY-MM-DD');
end $$;

-- ---------------------------------------------------------------------------
-- 2. ONE ROW PER LESSON
-- ---------------------------------------------------------------------------
create table if not exists public.give_sessions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  period text not null,
  claimed_by uuid references public.profiles(id) on delete set null,
  owner_confirmed boolean not null default false,
  helper_confirmed boolean not null default false,
  state text not null default 'awaiting' check (state in ('awaiting', 'verified', 'disputed')),
  credited boolean not null default false,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the abuse guard: one session per scheduled occurrence
  constraint give_sessions_one_per_period unique (connection_id, period)
);
-- one open question at a time per connection
create unique index if not exists give_sessions_one_awaiting
  on public.give_sessions (connection_id) where state = 'awaiting';
create index if not exists give_sessions_credited_idx
  on public.give_sessions (credited_at) where credited;

grant select on public.give_sessions to authenticated;
grant all on public.give_sessions to service_role;
alter table public.give_sessions enable row level security;
create policy "participants read give sessions" on public.give_sessions
  for select to authenticated using (
    exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (app_private.owns_profile(c.owner_id) or app_private.owns_profile(c.helper_id))
    )
  );
-- No insert/update/delete policy: the ONLY writer is the function below.

-- ---------------------------------------------------------------------------
-- 3. CLAIM / CONFIRM / DISPUTE A LESSON
-- ---------------------------------------------------------------------------
create or replace function app_private.update_give_session(
  _actor_user_id uuid,
  _connection_id uuid,
  _action text
) returns public.give_sessions
language plpgsql security definer set search_path = public, app_private as $$
declare
  c public.connections;
  s public.give_sessions;
  actor uuid;
  item_type text;
  cadence text;
  key text;
  n_connection integer;
  n_week integer;
  pays boolean;
  reward_key text;
begin
  select * into c from public.connections where id = _connection_id for update;
  if c.id is null then raise exception 'connection not found'; end if;
  select id into actor from public.profiles where user_id = _actor_user_id;
  if actor is null or actor not in (c.owner_id, c.helper_id) then raise exception 'forbidden'; end if;
  if c.state in ('cancelled', 'verified') then raise exception 'connection closed'; end if;

  select type, details->>'cadence' into item_type, cadence from public.items where id = c.item_id;
  key := app_private.give_session_period(cadence, now());
  if item_type is distinct from 'give' or key is null then raise exception 'not a repeating give'; end if;

  if _action = 'claim' then
    select * into s from public.give_sessions where connection_id = c.id and state = 'awaiting';
    if found then return s; end if;
    select * into s from public.give_sessions where connection_id = c.id and period = key for update;
    if found then
      if s.state = 'verified' then raise exception 'already counted this period'; end if;
      update public.give_sessions set state = 'awaiting', claimed_by = actor,
        owner_confirmed = (actor = c.owner_id), helper_confirmed = (actor = c.helper_id),
        updated_at = now()
        where id = s.id returning * into s;
    else
      insert into public.give_sessions (connection_id, period, claimed_by, owner_confirmed, helper_confirmed)
      values (c.id, key, actor, actor = c.owner_id, actor = c.helper_id)
      returning * into s;
    end if;

  elsif _action = 'confirm' then
    select * into s from public.give_sessions where connection_id = c.id and state = 'awaiting' for update;
    if not found or s.claimed_by = actor then raise exception 'wrong confirmer'; end if;
    select count(*) into n_connection from public.give_sessions where connection_id = c.id and credited;
    select count(*) into n_week
      from public.give_sessions gs join public.connections cc on cc.id = gs.connection_id
      where cc.owner_id = c.owner_id and gs.credited
        and app_private.give_session_period('weekly', gs.credited_at) = app_private.give_session_period('weekly', now());
    pays := n_connection < 12 and n_week < 5;
    update public.give_sessions set state = 'verified', owner_confirmed = true, helper_confirmed = true,
      credited = pays, credited_at = case when pays then now() end, updated_at = now()
      where id = s.id returning * into s;
    if pays then
      insert into public.ledger_events (profile_id, connection_id, amount, kind, body)
      values (c.owner_id, c.id, 10, 'session:' || s.period, 'confirmed lesson of a repeating give')
      on conflict do nothing;
      if found then
        -- the same key the client's earnSparks() uses, so its local credit is a no-op
        reward_key := 'session:' || c.id::text || ':' || s.period;
        update public.profiles set
          sparks = sparks + 10,
          rewarded = case when rewarded ? reward_key then rewarded else rewarded || to_jsonb(reward_key) end
          where id = c.owner_id;
      end if;
    end if;

  elsif _action = 'dispute' then
    select * into s from public.give_sessions where connection_id = c.id and state = 'awaiting' for update;
    if not found or s.claimed_by = actor then raise exception 'wrong responder'; end if;
    update public.give_sessions set state = 'disputed', owner_confirmed = false, helper_confirmed = false,
      updated_at = now()
      where id = s.id returning * into s;

  else
    raise exception 'unknown action';
  end if;
  return s;
end $$;
revoke all on function app_private.update_give_session(uuid, uuid, text) from public, anon;
grant execute on function app_private.update_give_session(uuid, uuid, text) to authenticated, service_role;

create or replace function public.update_my_give_session(_connection_id uuid, _action text)
returns public.give_sessions
language sql security invoker set search_path = public, app_private as $$
  select app_private.update_give_session(auth.uid(), _connection_id, _action)
$$;
revoke all on function public.update_my_give_session(uuid, text) from public, anon;
grant execute on function public.update_my_give_session(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. NO ONE-OFF SETTLEMENT FOR A REPEATING GIVE
-- A repeating give is paid lesson by lesson, so its connection may not be
-- claimed as a whole (which would pay the old one-off +10 and complete the
-- give). Cancelling still works. One-time gives are unaffected.
-- ---------------------------------------------------------------------------
create or replace function app_private.block_repeating_give_claim()
returns trigger language plpgsql security definer set search_path = public, app_private as $$
declare
  item_type text;
  cadence text;
begin
  if new.state = 'awaiting' and old.state is distinct from 'awaiting' then
    select type, details->>'cadence' into item_type, cadence from public.items where id = new.item_id;
    if item_type = 'give' and app_private.give_session_period(cadence, now()) is not null then
      raise exception 'repeating gives are confirmed lesson by lesson';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists connections_repeating_give_claim on public.connections;
create trigger connections_repeating_give_claim before update on public.connections
  for each row execute function app_private.block_repeating_give_claim();
