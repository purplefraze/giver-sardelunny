-- ROLES ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'tester');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "own roles readable" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- PROFILES ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  sample_key text unique,
  is_sample boolean not null default false,
  handle text unique,
  name text not null default '',
  photo_url text,
  about text not null default '',
  by_day text not null default '',
  by_night text not null default '',
  weekend text not null default '',
  pronouns text,
  birthday date,
  gender text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1
$$;

create or replace function public.owns_profile(_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _profile and user_id = auth.uid())
$$;

create or replace function public.is_sample_profile(_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_sample from public.profiles where id = _profile), false)
$$;

create policy "profiles readable by signed in" on public.profiles
  for select to authenticated using (true);
create policy "create own profile" on public.profiles
  for insert to authenticated with check (user_id = auth.uid() and is_sample = false);
create policy "update own profile" on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or (public.is_admin() and is_sample))
  with check (user_id = auth.uid() or (public.is_admin() and is_sample));

-- INVITES -------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text not null default '',
  created_by uuid,
  accepted_profile_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
alter table public.invites enable row level security;

create policy "admins manage invites" on public.invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ITEMS ---------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  local_id text,
  type text not null,
  side text,
  text text not null default '',
  offer text,
  want text,
  note text,
  status text not null default 'active',
  priority integer not null default 0,
  published boolean not null default false,
  photos jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  distance_km numeric,
  boost_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_owner_idx on public.items (owner_id);
create unique index items_owner_local_idx on public.items (owner_id, local_id) where local_id is not null;

grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;

create policy "read published or own items" on public.items
  for select to authenticated
  using (published or public.owns_profile(owner_id) or public.is_admin());
create policy "insert own items" on public.items
  for insert to authenticated
  with check (public.owns_profile(owner_id) or (public.is_admin() and public.is_sample_profile(owner_id)));
create policy "update own items" on public.items
  for update to authenticated
  using (public.owns_profile(owner_id) or (public.is_admin() and public.is_sample_profile(owner_id)))
  with check (public.owns_profile(owner_id) or (public.is_admin() and public.is_sample_profile(owner_id)));
create policy "delete own items" on public.items
  for delete to authenticated
  using (public.owns_profile(owner_id) or (public.is_admin() and public.is_sample_profile(owner_id)));

-- BOOSTS --------------------------------------------------------------------
create table public.boosts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  by_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, by_profile_id)
);

grant select, insert, delete on public.boosts to authenticated;
grant all on public.boosts to service_role;
alter table public.boosts enable row level security;

create policy "boosts readable" on public.boosts for select to authenticated using (true);
create policy "boost as self" on public.boosts
  for insert to authenticated with check (public.owns_profile(by_profile_id));
create policy "unboost as self" on public.boosts
  for delete to authenticated using (public.owns_profile(by_profile_id));

-- CONVERSATIONS -------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  a_id uuid not null references public.profiles(id) on delete cascade,
  b_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_pair_idx on public.conversations (a_id, b_id);

grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create or replace function public.can_see_conversation(_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = _conversation
      and (
        public.owns_profile(c.a_id) or public.owns_profile(c.b_id)
        or (public.is_admin() and (public.is_sample_profile(c.a_id) or public.is_sample_profile(c.b_id)))
      )
  )
$$;

create policy "read own conversations" on public.conversations
  for select to authenticated
  using (
    public.owns_profile(a_id) or public.owns_profile(b_id)
    or (public.is_admin() and (public.is_sample_profile(a_id) or public.is_sample_profile(b_id)))
  );
create policy "start conversation as self" on public.conversations
  for insert to authenticated
  with check (public.owns_profile(a_id) or public.owns_profile(b_id) or public.is_admin());
create policy "touch own conversations" on public.conversations
  for update to authenticated
  using (public.can_see_conversation(id)) with check (public.can_see_conversation(id));

-- MESSAGES ------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  sent_as_sample boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "read messages in own conversations" on public.messages
  for select to authenticated using (public.can_see_conversation(conversation_id));
create policy "send as self or as sample when admin" on public.messages
  for insert to authenticated
  with check (
    public.can_see_conversation(conversation_id)
    and (
      public.owns_profile(from_profile_id)
      or (public.is_admin() and public.is_sample_profile(from_profile_id))
    )
  );
create policy "mark messages read" on public.messages
  for update to authenticated
  using (public.can_see_conversation(conversation_id))
  with check (public.can_see_conversation(conversation_id));

-- NOTIFICATIONS -------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  body text not null default '',
  actor_profile_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications
  for select to authenticated
  using (public.owns_profile(profile_id) or (public.is_admin() and public.is_sample_profile(profile_id)));
create policy "notify a real counterpart" on public.notifications
  for insert to authenticated
  with check (actor_profile_id is null or public.owns_profile(actor_profile_id) or public.is_admin());
create policy "update own notifications" on public.notifications
  for update to authenticated
  using (public.owns_profile(profile_id) or (public.is_admin() and public.is_sample_profile(profile_id)))
  with check (public.owns_profile(profile_id) or (public.is_admin() and public.is_sample_profile(profile_id)));
create policy "delete own notifications" on public.notifications
  for delete to authenticated using (public.owns_profile(profile_id));

-- TIMESTAMPS ----------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
create trigger invites_touch before update on public.invites
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

-- SAMPLE GIVERS -------------------------------------------------------------
insert into public.profiles (sample_key, is_sample, handle, name, pronouns, about)
values
  ('giulia', true, 'giulia', 'Giulia', 'she', ''),
  ('sofia',  true, 'sofia',  'Sofia',  'she', ''),
  ('robin',  true, 'robin',  'Robin',  'they', ''),
  ('marcus', true, 'marcus', 'Marcus', 'he', '');