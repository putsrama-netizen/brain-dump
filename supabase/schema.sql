-- ============================================================================
-- Brain Dump — Supabase schema
-- Anonymous-auth model: every row carries user_id; RLS scopes access per user.
-- Safe to re-run: tables guard with IF NOT EXISTS, policies are dropped first.
-- ============================================================================

-- ---------- Tables ----------

create table if not exists public.groups (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  bigint not null
);

create table if not exists public.notes (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  group_id    text references public.groups(id) on delete set null,
  color       text not null,
  tilt_seed   integer not null,
  created_at  bigint not null,
  updated_at  bigint not null,
  tossed_at   bigint
);

create table if not exists public.tasks (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  note_id       text references public.notes(id) on delete set null,
  completed     boolean not null default false,
  is_important  boolean not null default false,
  due_date      bigint,
  created_at    bigint not null,
  completed_at  bigint
);

create table if not exists public.rituals (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null,
  color       text not null,
  sort_order  bigint not null default 0,
  created_at  bigint not null
);

create table if not exists public.ritual_completions (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  ritual_id     text not null references public.rituals(id) on delete cascade,
  day_key       integer not null,
  completed_at  bigint not null,
  unique (ritual_id, day_key)
);

-- ---------- Indexes ----------

create index if not exists idx_groups_user            on public.groups (user_id);
create index if not exists idx_notes_user_active      on public.notes (user_id) where tossed_at is null;
create index if not exists idx_notes_group            on public.notes (group_id);
create index if not exists idx_tasks_user             on public.tasks (user_id);
create index if not exists idx_tasks_note             on public.tasks (note_id);
create index if not exists idx_tasks_due              on public.tasks (due_date) where due_date is not null;
create index if not exists idx_rituals_user           on public.rituals (user_id);
create index if not exists idx_ritual_completions_day on public.ritual_completions (user_id, day_key);

-- ---------- Row-Level Security ----------

alter table public.groups              enable row level security;
alter table public.notes               enable row level security;
alter table public.tasks               enable row level security;
alter table public.rituals             enable row level security;
alter table public.ritual_completions  enable row level security;

-- Owner-only access: users can see / mutate only their own rows.

drop policy if exists "owner all" on public.groups;
create policy "owner all" on public.groups
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner all" on public.notes;
create policy "owner all" on public.notes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner all" on public.tasks;
create policy "owner all" on public.tasks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner all" on public.rituals;
create policy "owner all" on public.rituals
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner all" on public.ritual_completions;
create policy "owner all" on public.ritual_completions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
