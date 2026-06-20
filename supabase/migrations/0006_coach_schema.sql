-- 0006 — Coach panel
-- Agrega:
--   1. profiles.role ('athlete' | 'coach' | 'admin')
--   2. coach_clients (relación coach ↔ cliente con invitación por token)
--   3. coach_plans (borradores manuales del coach; al publicar se materializan
--      en public.plans + public.sessions para que la UI del cliente no cambie)
--   4. plans.source ('ai' | 'coach') + plans.coach_id (apuntan al origen del
--      plan que ve el atleta)
--   5. entitlements.coach_tier + entitlements.coach_max_clients (suscripción
--      del coach al panel)
--
-- Todo idempotente: re-ejecutar la migración no rompe nada.

-- ---------------------------------------------------------------------------
-- 1. profiles.role
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'athlete';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('athlete', 'coach', 'admin'));
  end if;
end;
$$;

create index if not exists profiles_role_idx on public.profiles(role)
  where role <> 'athlete';

-- ---------------------------------------------------------------------------
-- 2. coach_clients
-- ---------------------------------------------------------------------------
create table if not exists public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  invite_token text not null unique,
  invite_email text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'removed')),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Un coach no puede tener al mismo cliente dos veces (cuando ya aceptó).
create unique index if not exists coach_clients_coach_client_unique
  on public.coach_clients(coach_id, client_id)
  where client_id is not null and status <> 'removed';

create index if not exists coach_clients_coach_idx on public.coach_clients(coach_id);
create index if not exists coach_clients_client_idx on public.coach_clients(client_id);
create index if not exists coach_clients_token_idx on public.coach_clients(invite_token);

alter table public.coach_clients enable row level security;

drop policy if exists coach_clients_coach_read on public.coach_clients;
create policy coach_clients_coach_read on public.coach_clients
  for select using (auth.uid() = coach_id);

drop policy if exists coach_clients_client_read on public.coach_clients;
create policy coach_clients_client_read on public.coach_clients
  for select using (auth.uid() = client_id);

-- Mutaciones: solo service_role (server-side endpoints validados).

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'coach_clients_touch'
      and tgrelid = 'public.coach_clients'::regclass
  ) then
    create trigger coach_clients_touch before update on public.coach_clients
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. coach_plans (borradores del editor manual)
-- ---------------------------------------------------------------------------
create table if not exists public.coach_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  objective text,
  duration_weeks integer not null default 4
    check (duration_weeks between 1 and 12),
  -- plan_data: shape `{ weeks: Week[] }` compatible con TrainingPlan (lib/plan.ts).
  -- Al publicar se materializa a public.plans + public.sessions.
  plan_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  -- ID del plan materializado en public.plans (cuando status='published').
  published_plan_id uuid references public.plans(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists coach_plans_coach_idx on public.coach_plans(coach_id);
create index if not exists coach_plans_client_idx on public.coach_plans(client_id);
create index if not exists coach_plans_status_idx on public.coach_plans(client_id, status);

alter table public.coach_plans enable row level security;

drop policy if exists coach_plans_coach_rw on public.coach_plans;
create policy coach_plans_coach_rw on public.coach_plans
  for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

drop policy if exists coach_plans_client_read on public.coach_plans;
create policy coach_plans_client_read on public.coach_plans
  for select using (auth.uid() = client_id and status = 'published');

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'coach_plans_touch'
      and tgrelid = 'public.coach_plans'::regclass
  ) then
    create trigger coach_plans_touch before update on public.coach_plans
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. plans.source + plans.coach_id
--    Para que el cliente pueda ver de dónde viene su plan activo.
-- ---------------------------------------------------------------------------
alter table public.plans
  add column if not exists source text not null default 'ai',
  add column if not exists coach_id uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.plans'::regclass
      and conname = 'plans_source_check'
  ) then
    alter table public.plans
      add constraint plans_source_check
      check (source in ('ai', 'coach'));
  end if;
end;
$$;

create index if not exists plans_coach_idx on public.plans(coach_id)
  where coach_id is not null;

-- ---------------------------------------------------------------------------
-- 5. entitlements: campos de suscripción del coach
-- ---------------------------------------------------------------------------
alter table public.entitlements
  add column if not exists coach_tier text,
  add column if not exists coach_max_clients integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.entitlements'::regclass
      and conname = 'entitlements_coach_tier_check'
  ) then
    alter table public.entitlements
      add constraint entitlements_coach_tier_check
      check (coach_tier is null or coach_tier in ('starter', 'pro', 'gym'));
  end if;
end;
$$;
