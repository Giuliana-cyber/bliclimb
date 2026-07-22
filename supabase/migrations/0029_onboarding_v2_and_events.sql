-- BilClimb · v1 lanzamiento · schema para onboarding-v2 + session_events + sessions_cache
-- Aprobado por Giuliana 2026-07-21 · P0 backend.
--
-- IDEMPOTENTE · seguro re-correr.
--
-- 1. Extiende `profiles` con las columnas nuevas del onboarding-v2.
-- 2. Crea `session_events` para reportes de dolor, sesiones completadas,
--    rest days, check-ins post-sesión.
-- 3. Crea `sessions_cache` para F4-UI.4: cache por (profile_id, date).

-- =========================================================================
-- 1. profiles · extend
-- =========================================================================

alter table public.profiles
  add column if not exists disciplina text check (disciplina in ('boulder', 'ruta', 'no-se')),
  add column if not exists estado_actual text check (estado_actual in ('activo', 'volviendo-paron', 'volviendo-lesion', 'empezando')),
  add column if not exists techo_historico text,
  add column if not exists hang_25mm_seconds int,
  add column if not exists max_pullup_reps int,
  add column if not exists estilos text[] default '{}',
  add column if not exists objetivo text,
  add column if not exists mas_equipo_pronto bool default false,
  add column if not exists has_active_lesion bool default false,
  add column if not exists zonas_lesion text[] default '{}',
  add column if not exists dolor_hoy text check (dolor_hoy in ('nada', 'molestia', 'dolor')),
  add column if not exists embarazo text check (embarazo in ('no-aplica', 'si')) default 'no-aplica',
  -- onboarded_at NULL = user creó cuenta pero no completó onboarding
  add column if not exists onboarded_at timestamptz;

-- =========================================================================
-- 2. session_events
-- Cualquier evento con carga narrativa · fuente única de verdad para
-- Progreso (streak, week path, momentos) + Plan (sesiones completadas).
-- =========================================================================

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'session_started',
    'session_completed',
    'session_skipped',
    'pain_reported',
    'rest_day',
    'checkin_feeling'
  )),
  session_id uuid references public.sessions(id) on delete set null,
  -- payload · shape depende de event_type:
  --   pain_reported: { zonas: text[], intensidad: int, action: 'adjust'|'rest'|'derive' }
  --   session_completed: { feeling: 'bien'|'cansancio'|'molestia', notes: text }
  --   rest_day: { reason: text }
  --   checkin_feeling: { feeling: 'bien'|'cansancio'|'molestia', context: text }
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists session_events_profile_created_idx
  on public.session_events(profile_id, created_at desc);
create index if not exists session_events_type_idx
  on public.session_events(profile_id, event_type, created_at desc);

alter table public.session_events enable row level security;

create policy "session_events_select_own" on public.session_events
  for select using (auth.uid() = profile_id);
create policy "session_events_insert_own" on public.session_events
  for insert with check (auth.uid() = profile_id);
create policy "session_events_delete_own" on public.session_events
  for delete using (auth.uid() = profile_id);
-- No update: los eventos son inmutables (append-only log).

-- =========================================================================
-- 3. sessions_cache
-- Cache de sesión generada · una fila por (profile_id, date).
-- Evita regenerar/pagar LLM cuando el user recarga /hoy en el mismo día.
-- Fase 4b: TTL 24h (invalidar cuando hay pain_reported reciente).
-- =========================================================================

create table if not exists public.sessions_cache (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  session_data jsonb not null,      -- AssembledSession completa (7 EX del pilot)
  focus_rule text,                   -- FR-001 · FR-002 · etc
  tokens_used int,
  latency_ms int,
  created_at timestamptz default now(),
  unique (profile_id, date)
);

create index if not exists sessions_cache_profile_date_idx
  on public.sessions_cache(profile_id, date desc);

alter table public.sessions_cache enable row level security;

create policy "sessions_cache_select_own" on public.sessions_cache
  for select using (auth.uid() = profile_id);
create policy "sessions_cache_insert_own" on public.sessions_cache
  for insert with check (auth.uid() = profile_id);
create policy "sessions_cache_delete_own" on public.sessions_cache
  for delete using (auth.uid() = profile_id);

-- =========================================================================
-- Rollback (documentado, NO ejecutar salvo emergencia)
-- =========================================================================
-- drop table if exists public.sessions_cache;
-- drop table if exists public.session_events;
-- alter table public.profiles
--   drop column if exists disciplina,
--   drop column if exists estado_actual,
--   drop column if exists techo_historico,
--   drop column if exists hang_25mm_seconds,
--   drop column if exists max_pullup_reps,
--   drop column if exists estilos,
--   drop column if exists objetivo,
--   drop column if exists mas_equipo_pronto,
--   drop column if exists has_active_lesion,
--   drop column if exists zonas_lesion,
--   drop column if exists dolor_hoy,
--   drop column if exists embarazo,
--   drop column if exists onboarded_at;
