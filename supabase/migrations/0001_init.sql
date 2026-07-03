-- BilClimb.ai · esquema inicial
-- Fase 1: cimientos en Supabase (auth + Postgres + pgvector)
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo).

-- =========================================================================
-- Extensiones
-- =========================================================================
create extension if not exists "pgcrypto";
create extension if not exists "vector" with schema extensions;

-- =========================================================================
-- profiles
-- Extiende auth.users con todo lo que vivía en UserProfile (lib/profile.ts)
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  character text check (character in ('bill', 'senda')) default 'bill',
  language text check (language in ('es', 'en')) default 'es',
  name text,
  age text,
  climbing_time text,
  level text,
  goals text[] default '{}',
  goal_description text,
  project text,
  project_description text,
  training_history text,
  previous_training text,
  equipment text[] default '{}',
  equipment_notes text,
  days_per_week int,
  session_duration int,
  plan_duration int,
  injuries text[] default '{}',
  injury_description text,
  injury_notes text,
  current_finger_pain int default 0,
  current_shoulder_pain int default 0,
  current_elbow_pain int default 0,
  wants_conservative_plan bool default false,
  training_aggressiveness text,
  energy_level text,
  energy text,
  sleep_quality text,
  sleep text,
  needs_regeneration bool default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: crear profile automáticamente al registrar nuevo auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- plans
-- =========================================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text check (status in ('active', 'archived', 'draft')) default 'active',
  plan_version text,
  mesocycle_type text,
  microcycles jsonb,
  planning_rationale text,
  progression_model text,
  total_weeks int not null,
  current_week int default 1,
  start_date timestamptz default now(),
  used_file_search bool default false,
  library_sources text[] default '{}',
  quality_scores jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists plans_profile_id_idx on public.plans(profile_id);
create index if not exists plans_active_idx on public.plans(profile_id) where status = 'active';

-- =========================================================================
-- sessions (normalizado, una fila por sesión)
-- Antes vivían dentro de plan.weeks[].sessions[] en localStorage
-- =========================================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_number int not null,
  day_number int not null,
  microcycle_id text,
  week_theme text,
  week_objective text,
  title text not null,
  stimulus_type text,
  location text,
  equipment text[] default '{}',
  estimated_minutes int,
  estimated_duration_minutes int,
  objective text,
  why text,
  intensity_target text,
  safety_notes text,
  adjustment_rules text,
  success_criteria text,
  warmup jsonb default '[]'::jsonb,
  main_block jsonb default '[]'::jsonb,
  cooldown jsonb default '[]'::jsonb,
  source text,
  nutrition_tip text,
  completed bool default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (plan_id, week_number, day_number)
);

create index if not exists sessions_plan_id_idx on public.sessions(plan_id);
create index if not exists sessions_plan_week_idx on public.sessions(plan_id, week_number);

-- =========================================================================
-- check_ins
-- =========================================================================
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  date timestamptz default now(),
  rpe int,
  finger_pain int,
  energy int,
  sleep int,
  notes text,
  manual_activity jsonb,
  created_at timestamptz default now()
);

create index if not exists check_ins_profile_id_idx on public.check_ins(profile_id, date desc);

-- =========================================================================
-- subscriptions (Mercado Pago + Stripe)
-- =========================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago', 'stripe')),
  provider_subscription_id text not null,
  payer_email text,
  status text not null check (status in ('active', 'canceled', 'past_due', 'pending')),
  current_period_end timestamptz,
  amount_cents int default 100,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists subscriptions_profile_id_idx on public.subscriptions(profile_id);
create index if not exists subscriptions_active_idx on public.subscriptions(profile_id)
  where status = 'active';

-- =========================================================================
-- sources (canales, blogs, PDFs) y su contenido vectorizado
-- =========================================================================
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'youtube_channel', 'youtube_video', 'blog', 'blog_post', 'pdf'
  )),
  parent_id uuid references public.sources(id) on delete cascade,
  name text not null,
  url text,
  language text check (language in ('es', 'en', 'multi')),
  author text,
  description text,
  metadata jsonb default '{}'::jsonb,
  last_indexed_at timestamptz,
  active bool default true,
  created_at timestamptz default now()
);

create index if not exists sources_kind_idx on public.sources(kind);
create index if not exists sources_parent_idx on public.sources(parent_id);

-- chunks vectorizados con pgvector (text-embedding-3-small = 1536 dims)
create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding extensions.vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists source_chunks_source_idx on public.source_chunks(source_id);
create index if not exists source_chunks_embedding_idx
  on public.source_chunks using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- Función helper para búsqueda semántica
create or replace function public.match_source_chunks(
  query_embedding extensions.vector(1536),
  match_count int default 8,
  filter_language text default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_name text,
  source_url text,
  chunk_text text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id as chunk_id,
    c.source_id,
    s.name as source_name,
    s.url as source_url,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.source_chunks c
  join public.sources s on s.id = c.source_id
  where (filter_language is null or s.language = filter_language or s.language = 'multi')
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- =========================================================================
-- Row Level Security
-- Cada usuario solo ve sus propios datos. Sources son lectura pública.
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.sessions enable row level security;
alter table public.check_ins enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sources enable row level security;
alter table public.source_chunks enable row level security;

-- profiles: dueño puede leer/editar lo suyo
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- plans
create policy "plans_select_own" on public.plans
  for select using (auth.uid() = profile_id);
create policy "plans_insert_own" on public.plans
  for insert with check (auth.uid() = profile_id);
create policy "plans_update_own" on public.plans
  for update using (auth.uid() = profile_id);
create policy "plans_delete_own" on public.plans
  for delete using (auth.uid() = profile_id);

-- sessions: a través de plan
create policy "sessions_select_own" on public.sessions
  for select using (
    exists (select 1 from public.plans p where p.id = plan_id and p.profile_id = auth.uid())
  );
create policy "sessions_insert_own" on public.sessions
  for insert with check (
    exists (select 1 from public.plans p where p.id = plan_id and p.profile_id = auth.uid())
  );
create policy "sessions_update_own" on public.sessions
  for update using (
    exists (select 1 from public.plans p where p.id = plan_id and p.profile_id = auth.uid())
  );
create policy "sessions_delete_own" on public.sessions
  for delete using (
    exists (select 1 from public.plans p where p.id = plan_id and p.profile_id = auth.uid())
  );

-- check_ins
create policy "check_ins_select_own" on public.check_ins
  for select using (auth.uid() = profile_id);
create policy "check_ins_insert_own" on public.check_ins
  for insert with check (auth.uid() = profile_id);
create policy "check_ins_update_own" on public.check_ins
  for update using (auth.uid() = profile_id);
create policy "check_ins_delete_own" on public.check_ins
  for delete using (auth.uid() = profile_id);

-- subscriptions: solo lectura para el dueño (webhooks escriben con service_role)
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = profile_id);

-- sources y chunks: lectura pública (cualquier usuario autenticado puede buscar)
create policy "sources_select_all" on public.sources
  for select using (auth.role() = 'authenticated');
create policy "source_chunks_select_all" on public.source_chunks
  for select using (auth.role() = 'authenticated');

-- =========================================================================
-- updated_at automático
-- =========================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
