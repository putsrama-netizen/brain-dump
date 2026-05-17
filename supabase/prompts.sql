-- ============================================================================
-- Daily Prompts + Resurfacing — schema, RLS, and 35 launch prompts.
-- Safe to re-run: tables guard with IF NOT EXISTS, policies are dropped first,
-- prompt rows skip on text-uniqueness conflict.
-- ============================================================================

create table if not exists public.prompts (
  id           uuid primary key default gen_random_uuid(),
  text         text not null unique,
  category     text not null,
  time_of_day  text not null,
  created_at   bigint not null default 0
);

create table if not exists public.prompt_analytics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  prompt_id   uuid not null references public.prompts(id) on delete cascade,
  action      text not null check (action in ('shown', 'completed', 'skipped')),
  created_at  bigint not null
);

create index if not exists idx_prompts_slot
  on public.prompts (time_of_day);
create index if not exists idx_prompt_analytics_user_time
  on public.prompt_analytics (user_id, created_at);
create index if not exists idx_prompt_analytics_user_action_time
  on public.prompt_analytics (user_id, action, created_at);

alter table public.prompts          enable row level security;
alter table public.prompt_analytics enable row level security;

-- Prompts are shared seed data: any authenticated user can read them.
drop policy if exists "anyone can read prompts" on public.prompts;
create policy "anyone can read prompts" on public.prompts
  for select to authenticated using (true);

-- Analytics are per-user.
drop policy if exists "owner all" on public.prompt_analytics;
create policy "owner all" on public.prompt_analytics
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed: 35 launch prompts. Re-runs no-op (unique text + on conflict).
-- ---------------------------------------------------------------------------
insert into public.prompts (text, category, time_of_day) values
  ('What''s loud right now?',                                  'Morning capture',      'morning'),
  ('What did you wake up thinking about?',                     'Morning capture',      'morning'),
  ('What''s already running in the background?',               'Morning capture',      'morning'),
  ('Anything sitting on your chest?',                          'Morning capture',      'morning'),
  ('What''s the first thing your brain won''t drop?',          'Morning capture',      'morning'),
  ('What''s the static in your head this morning?',            'Morning capture',      'morning'),
  ('Something already pulling your attention?',                'Morning capture',      'morning'),
  ('What were you mid-thought about?',                         'Morning capture',      'morning'),

  ('What can you let go of today?',                            'Release',              'release'),
  ('What''s not yours to carry?',                              'Release',              'release'),
  ('Something to toss?',                                        'Release',              'release'),
  ('What''s been taking up space you didn''t agree to?',       'Release',              'release'),
  ('What needs to leave your head?',                            'Release',              'release'),
  ('Anything you''ve been holding for no reason?',              'Release',              'release'),
  ('What''s expired but still rattling around?',                'Release',              'release'),

  ('Where''s the tension sitting?',                            'Body / feeling check', 'body'),
  ('How are you, actually?',                                    'Body / feeling check', 'body'),
  ('What does your body know that you haven''t said yet?',     'Body / feeling check', 'body'),
  ('What''s your shoulders doing right now?',                  'Body / feeling check', 'body'),
  ('Tired? Wired? Somewhere weird?',                            'Body / feeling check', 'body'),

  ('What''s the smallest thing you''d feel better having handled?', 'Gentle action',  'gentle_action'),
  ('One thing you''ve been avoiding?',                          'Gentle action',       'gentle_action'),
  ('What would 10 minutes of attention finish?',                'Gentle action',       'gentle_action'),
  ('Anything quick you''ve been putting off?',                  'Gentle action',       'gentle_action'),
  ('What''s been on the list too long?',                        'Gentle action',       'gentle_action'),

  ('What stayed with you today?',                               'Evening close',       'evening'),
  ('What didn''t get said?',                                    'Evening close',       'evening'),
  ('Anything left over before bed?',                            'Evening close',       'evening'),
  ('What do you need to put down?',                             'Evening close',       'evening'),
  ('What''s still echoing from today?',                         'Evening close',       'evening'),
  ('Anything you want to release before sleep?',                'Evening close',       'evening'),

  ('What did this week want to teach you?',                     'Weekly reflect',      'weekly_reflect'),
  ('What from this week still doesn''t have a home?',           'Weekly reflect',      'weekly_reflect'),
  ('What kept coming up this week?',                            'Weekly reflect',      'weekly_reflect'),
  ('Anything to close out before Monday?',                      'Weekly reflect',      'weekly_reflect')
on conflict (text) do nothing;
