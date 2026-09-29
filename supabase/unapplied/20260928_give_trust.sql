-- =============================================================================
-- !!! UNAPPLIED — DO NOT RUN WITHOUT OWNER APPROVAL !!!
--
-- Kept OUTSIDE supabase/migrations on purpose so no tool applies it by
-- accident. It is the server-side version of rules that are enforced
-- CLIENT-SIDE ONLY today (and so can be bypassed by calling Supabase
-- directly):
--   1. first-give check: a give is not published until the owner is verified
--   2. quiet review flags for repeated unmatched / cancelled gives
--   3. the three-gives cap on ACTING on gives (connections insert)
--   4. expired gives hidden from browse (+ optional scheduled archive)
-- Review each block; the pg_cron block is commented out and needs approval.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIRST-GIVE CHECK
-- ---------------------------------------------------------------------------
-- !!! SUPERSEDED 2026-09-28 — DO NOT APPLY THIS BLOCK. The client-side
-- first-give email check was removed ("fix: signed-in posts never re-send a
-- login link"): it emailed signed-in people a new sign-in link on their first
-- give. Nothing calls confirm_first_give() any more, so this trigger would
-- keep every new member's gives unpublished forever. Blocks 2-5 are unchanged.
create table if not exists public.give_verifications (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table public.give_verifications enable row level security;
create policy "read own give verification" on public.give_verifications
  for select to authenticated using (public.owns_profile(profile_id) or public.is_admin());
-- No insert/update policy: the ONLY writer is the trusted function below.

-- Trusted path: call right after verifyOtp succeeds. It trusts the JWT's
-- `amr` claim, which Supabase Auth signs: an OTP sign-in in the last 10 min.
create or replace function public.confirm_first_give()
returns void language plpgsql security definer set search_path = public as $$
declare
  otp_at bigint;
begin
  select max((e->>'timestamp')::bigint) into otp_at
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) e
   where e->>'method' = 'otp';
  if otp_at is null or to_timestamp(otp_at) < now() - interval '10 minutes' then
    raise exception 'recent email code required';
  end if;
  insert into public.give_verifications (profile_id)
    values (public.current_profile_id())
    on conflict (profile_id) do nothing;
  update public.items set published = true
   where owner_id = public.current_profile_id() and type = 'give' and status = 'active';
end $$;
revoke all on function public.confirm_first_give() from public, anon;
grant execute on function public.confirm_first_give() to authenticated;

create or replace function public.items_first_give_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'give' and new.published
     and not exists (select 1 from public.give_verifications v where v.profile_id = new.owner_id)
     and not public.is_admin() then
    new.published := false;   -- quietly not live yet
  end if;
  return new;
end $$;
create trigger items_first_give_guard before insert or update on public.items
  for each row execute function public.items_first_give_guard();

-- ---------------------------------------------------------------------------
-- 2. QUIET REVIEW FLAGS (private: no member can read or write them)
--    threshold: 3 unmatched/cancelled gives in 30 days, or 5 in total
-- ---------------------------------------------------------------------------
create table if not exists public.give_end_events (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null,
  reason text not null check (reason in ('cancelled', 'unmatched')),
  at timestamptz not null default now()
);
create table if not exists public.review_flags (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  flagged_at timestamptz not null default now()
);
alter table public.give_end_events enable row level security;
alter table public.review_flags enable row level security;
create policy "admins read give ends" on public.give_end_events for select to authenticated using (public.is_admin());
create policy "admins read review flags" on public.review_flags for select to authenticated using (public.is_admin());

create or replace function public.log_give_end()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid := coalesce(old.owner_id, new.owner_id);
  matched boolean;
begin
  if coalesce(old.type, new.type) <> 'give' or old.status <> 'active' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  select exists (select 1 from public.connections c where c.item_id = old.id and c.state = 'verified') into matched;
  if not matched then
    insert into public.give_end_events (profile_id, item_id, reason)
      values (owner, old.id, case when tg_op = 'DELETE' then 'cancelled' else 'unmatched' end);
    if (select count(*) from public.give_end_events where profile_id = owner and at > now() - interval '30 days') >= 3
       or (select count(*) from public.give_end_events where profile_id = owner) >= 5 then
      insert into public.review_flags (profile_id, reason) values (owner, 'repeated unmatched or cancelled gives')
        on conflict (profile_id) do nothing;
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger items_log_give_end after update or delete on public.items
  for each row execute function public.log_give_end();

-- ---------------------------------------------------------------------------
-- 3. THE THREE-GIVES CAP — acting on gives (browsing is never restricted)
--    accepted = give connections where I am helper, not cancelled, created
--    after my counter reset; reset = the latest time a recipient of one of MY
--    gives confirmed receipt (helper_confirmed). Messaging needs a connection,
--    so blocking the connection insert blocks apply/interest/message/request.
-- ---------------------------------------------------------------------------
create or replace function public.give_cap_count(_profile uuid)
returns integer language sql stable security definer set search_path = public as $$
  with reset as (
    select coalesce(max(coalesce(c.settled_at, c.updated_at)), 'epoch'::timestamptz) as at
      from public.connections c join public.items i on i.id = c.item_id
     where i.type = 'give' and c.owner_id = _profile and c.helper_confirmed
  )
  select count(*)::int
    from public.connections c join public.items i on i.id = c.item_id, reset
   where i.type = 'give' and c.helper_id = _profile and c.owner_id <> _profile
     and c.state <> 'cancelled' and c.created_at > reset.at;
$$;

create or replace function public.connections_give_cap_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.items i where i.id = new.item_id and i.type = 'give')
     and public.give_cap_count(new.helper_id) >= 3 then
    raise exception 'give cap reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger connections_give_cap_guard before insert on public.connections
  for each row execute function public.connections_give_cap_guard();

-- ---------------------------------------------------------------------------
-- 4. EXPIRY — expired gives leave browse. details.expiresAt is UTC ISO.
-- ---------------------------------------------------------------------------
drop policy if exists "read published or own items" on public.items;
create policy "read published or own items" on public.items
  for select to authenticated
  using (
    (published and not (type = 'give' and (details->>'expiresAt') is not null
                        and (details->>'expiresAt')::timestamptz < now()))
    or public.owns_profile(owner_id) or public.is_admin()
  );
-- NOTE: if a signed-out (anon) read policy exists on live, mirror the same
-- expiry condition there.

-- OPTIONAL, NEEDS APPROVAL (pg_cron): archive expired gives every 15 minutes.
-- select cron.schedule('archive-expired-gives', '*/15 * * * *', $cron$
--   update public.items set status = 'archived', updated_at = now()
--    where type = 'give' and status = 'active'
--      and (details->>'expiresAt') is not null
--      and (details->>'expiresAt')::timestamptz < now();
-- $cron$);

-- ---------------------------------------------------------------------------
-- 5. GIVE PHOTOS — the existing post-media bucket policies already fit
--    (owner-only insert/update/delete, read for signed-in users). Limiting
--    reads to live gives only would need a path->item lookup policy, e.g.:
-- create policy "give photos readable when live" on storage.objects for select to authenticated
--   using (bucket_id = 'post-media' and (name not like 'give-photos/%' or exists (
--     select 1 from public.items i where i.details->>'photoPath' = name and (i.published or public.owns_profile(i.owner_id)))));
-- ---------------------------------------------------------------------------
