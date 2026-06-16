-- 0002 — Entitlements
-- Renombra public.subscriptions a public.entitlements y extiende para alojar
-- el estado del gate freemium (free_plan_used_at).
--
-- Idempotente: si la migración corre dos veces o si subscriptions ya fue renombrada
-- en un entorno previo, los bloques DO IF EXISTS evitan errores.

-- ---------------------------------------------------------------------------
-- 1. Rename subscriptions → entitlements (preserva filas)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'subscriptions'
  ) and not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'entitlements'
  ) then
    alter table public.subscriptions rename to entitlements;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Crear la tabla si no existe (caso fresh install)
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text check (provider in ('mercado_pago', 'stripe')),
  provider_subscription_id text,
  payer_email text,
  status text check (status in ('active', 'cancelled', 'past_due', 'pending', 'paused')),
  current_period_end timestamptz,
  amount_cents int default 100,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 3. Añadir columna free_plan_used_at (idempotente)
-- ---------------------------------------------------------------------------
alter table public.entitlements
  add column if not exists free_plan_used_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Garantizar PK por profile_id (un row por usuario)
--    La tabla original tenía id como PK y permitía múltiples filas por profile.
--    Como entitlements debe ser 1-a-1 con auth.users, agregamos UNIQUE.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entitlements_profile_id_key'
  ) then
    -- Limpia duplicados antes de aplicar UNIQUE — nos quedamos con el más reciente
    delete from public.entitlements e
    using (
      select profile_id, max(created_at) as keep_at
      from public.entitlements
      group by profile_id
      having count(*) > 1
    ) dupes
    where e.profile_id = dupes.profile_id and e.created_at < dupes.keep_at;

    alter table public.entitlements
      add constraint entitlements_profile_id_key unique (profile_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Status: ampliar enum lógico (subscription_status del spec se mapea a 'status')
--    Reemplazamos el CHECK viejo (que permitía 'canceled' sin 'l' y no incluía 'paused')
--    por uno que cubre los 5 estados del spec.
-- ---------------------------------------------------------------------------
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.entitlements'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.entitlements drop constraint %I', con.conname);
  end loop;
end;
$$;

-- Normaliza 'canceled' (legacy) → 'cancelled'
update public.entitlements
set status = 'cancelled'
where status = 'canceled';

alter table public.entitlements
  add constraint entitlements_status_check
  check (status is null or status in ('active', 'paused', 'cancelled', 'past_due', 'pending'));

-- ---------------------------------------------------------------------------
-- 6. Índices nuevos (drop de los viejos de subscriptions si existen)
-- ---------------------------------------------------------------------------
drop index if exists public.subscriptions_profile_id_idx;
drop index if exists public.subscriptions_active_idx;

create index if not exists entitlements_active_idx
  on public.entitlements(profile_id)
  where status = 'active';

create index if not exists entitlements_provider_sub_idx
  on public.entitlements(provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- 7. RLS — SELECT solo dueño, mutaciones bloqueadas (solo service_role)
-- ---------------------------------------------------------------------------
alter table public.entitlements enable row level security;

-- Borra políticas viejas heredadas del rename
drop policy if exists "subscriptions_select_own" on public.entitlements;
drop policy if exists "entitlements_select_own" on public.entitlements;

create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = profile_id);

-- INSERT/UPDATE/DELETE: sin políticas → bloqueado para anon/auth.
-- Solo service_role bypassa RLS.

-- ---------------------------------------------------------------------------
-- 8. Trigger updated_at (el viejo de subscriptions ya se renombró por el rename;
--    si por algún motivo no existe, lo creamos)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'entitlements_touch'
      and tgrelid = 'public.entitlements'::regclass
  ) then
    create trigger entitlements_touch before update on public.entitlements
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Tabla webhook_events para idempotencia de Mercado Pago (B3)
--    La creamos acá para mantener un solo migration por bloque conceptual
--    "billing infra"; el código que la usa llega en B3.
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  request_id text primary key,
  provider text not null,
  event_type text,
  payload jsonb,
  processed_at timestamptz default now()
);
