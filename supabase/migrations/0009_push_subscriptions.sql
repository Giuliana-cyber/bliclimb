-- 0009 — Push subscriptions
-- Cada navegador del usuario que aceptó notificaciones inserta acá una
-- fila. Si el navegador se reinstala o el endpoint cambia, se crea una
-- fila distinta — se dedupea por (profile_id, endpoint).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_used_at timestamptz default now(),
  unique (profile_id, endpoint)
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions(profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_owner_rw on public.push_subscriptions;
create policy push_subs_owner_rw on public.push_subscriptions
  for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
