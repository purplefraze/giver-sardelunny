-- FUND — money PLEDGED toward someone else's existing Wish.
--
-- NOT APPLIED to the live project. Committed on feature/fund for review only.
-- No payment is processed: a row is a pledge record. status is 'pledged' only.
-- TODO(payment-rails): add 'paid' / 'refunded' (and a processor reference)
-- only when a real payment processor exists. Never fake a charge.
--
-- Mirrors src/data/fund-rules.ts:
--   * funder must be the signed-in profile
--   * the wish must exist, be type 'wish', status 'active', published
--   * never your own wish
--   * amount: whole cents, $1 .. $10,000 per pledge
--   * when the wish states details->>'fundTarget' (cents), no pledge past it
--   * rows are immutable (no update/delete policies); refunds are an open
--     product question
--   * a pledge touches NO sparks and NO item status — nothing here writes to
--     profiles.sparks or items.status

create table public.wish_contributions (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.items(id) on delete cascade,
  funder_id uuid not null references public.profiles(id) on delete cascade,
  local_id text,
  amount_cents integer not null check (amount_cents >= 100 and amount_cents <= 1000000),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pledged' check (status in ('pledged')),
  created_at timestamptz not null default now()
);
create index wish_contributions_wish_idx on public.wish_contributions (wish_id);
create index wish_contributions_funder_idx on public.wish_contributions (funder_id);
create unique index wish_contributions_funder_local_idx
  on public.wish_contributions (funder_id, local_id) where local_id is not null;

grant select, insert on public.wish_contributions to authenticated;
grant all on public.wish_contributions to service_role;
alter table public.wish_contributions enable row level security;

-- Is this a wish that may be funded by _funder right now?
create or replace function public.wish_is_fundable(_wish uuid, _funder uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.items i
    where i.id = _wish
      and i.type = 'wish'
      and i.status = 'active'
      and i.published
      and i.owner_id <> _funder
  )
$$;

-- WHO SEES A PLEDGE: the funder, the wish's owner, admins. Funder identity is
-- never public (visibility of funder names is an open product question).
create policy "read own or received pledges" on public.wish_contributions
  for select to authenticated
  using (
    public.owns_profile(funder_id)
    or exists (select 1 from public.items i where i.id = wish_id and public.owns_profile(i.owner_id))
    or public.is_admin()
  );

create policy "pledge as self toward a fundable wish" on public.wish_contributions
  for insert to authenticated
  with check (
    public.owns_profile(funder_id)
    and public.wish_is_fundable(wish_id, funder_id)
    and status = 'pledged'
  );

-- THE RUNNING TOTAL IS PUBLIC, THE NAMES ARE NOT.
create or replace function public.wish_funding(_wish uuid)
returns table (funded_cents bigint, contributors integer)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount_cents), 0)::bigint, count(distinct funder_id)::integer
  from public.wish_contributions where wish_id = _wish
$$;
grant execute on function public.wish_funding(uuid) to authenticated;

-- NEVER PAST THE STATED COST. Serialised per wish so two pledges can't race.
create or replace function public.wish_contributions_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _target bigint;
  _funded bigint;
begin
  perform 1 from public.items where id = new.wish_id for update;
  select case
           when (details->>'fundTarget') ~ '^[0-9]{1,12}$' then (details->>'fundTarget')::bigint
           else null
         end
    into _target
    from public.items where id = new.wish_id;
  if _target is not null then
    select coalesce(sum(amount_cents), 0) into _funded
      from public.wish_contributions where wish_id = new.wish_id;
    if _funded + new.amount_cents > _target then
      raise exception 'pledge exceeds the wish''s stated cost';
    end if;
  end if;
  return new;
end
$$;

create trigger wish_contributions_guard
  before insert on public.wish_contributions
  for each row execute function public.wish_contributions_guard();
