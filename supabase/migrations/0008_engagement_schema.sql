-- 0008 — Engagement schema (rachas, resúmenes semanales, prefs de notificación)
--
-- Consolida en una migración todo el modelo de retención:
--   1. daily_activity — una fila por (usuario, día) con tipo de actividad
--   2. profiles.current_streak / longest_streak / last_streak_date —
--      campos denormalizados de lectura rápida
--   3. weekly_summaries — snapshot por semana mostrado en /resumen-semanal
--   4. profiles.notification_preferences — toggles del settings
--
-- Idempotente: re-correr no rompe nada.

-- ---------------------------------------------------------------------------
-- 1. daily_activity
-- ---------------------------------------------------------------------------
create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  type text not null check (type in ('session_completed', 'checkin', 'app_open')),
  session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz default now(),
  unique (profile_id, activity_date)
);

create index if not exists daily_activity_profile_date_idx
  on public.daily_activity(profile_id, activity_date desc);

alter table public.daily_activity enable row level security;

drop policy if exists daily_activity_owner_rw on public.daily_activity;
create policy daily_activity_owner_rw on public.daily_activity
  for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- 2. profiles: columnas de racha + prefs de notificación
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_streak_date date,
  add column if not exists notification_preferences jsonb not null default
    '{"dailyReminder": true, "weeklySummary": true, "coachUpdates": true}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. weekly_summaries
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_number integer not null,
  -- data jsonb: { sessionsCompleted, sessionsTotal, averageRPE, fingerPainAvg,
  --              currentStreak, personalizedMessage, ... }
  data jsonb not null default '{}'::jsonb,
  viewed_at timestamptz,
  created_at timestamptz default now(),
  unique (profile_id, week_number)
);

create index if not exists weekly_summaries_profile_idx
  on public.weekly_summaries(profile_id, week_number desc);

alter table public.weekly_summaries enable row level security;

drop policy if exists weekly_summaries_owner_rw on public.weekly_summaries;
create policy weekly_summaries_owner_rw on public.weekly_summaries
  for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
