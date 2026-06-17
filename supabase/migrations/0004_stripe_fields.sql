-- 0004 — Campos de Stripe en entitlements.
--
-- Migramos el proveedor de pagos de Mercado Pago a Stripe. Las columnas viejas
-- (provider, provider_subscription_id) quedan en la tabla por compatibilidad
-- con datos históricos pero la escritura nueva va a las columnas stripe_*.
--
-- Idempotente.

alter table public.entitlements
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

-- Un cliente Stripe es 1-a-1 con un usuario; el unique index previene rows
-- duplicadas si por race condition dos requests llegan a crear customer.
create unique index if not exists entitlements_stripe_customer_idx
  on public.entitlements(stripe_customer_id)
  where stripe_customer_id is not null;

-- Index secundario por subscription_id para que el webhook resuelva la fila
-- por el id de la suscripción cuando metadata.supabase_user_id no esté.
create index if not exists entitlements_stripe_subscription_idx
  on public.entitlements(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Ampliamos el enum lógico de `provider` para incluir el valor 'stripe' por
-- si los lookups por provider+id se reusan. El CHECK original ya incluía
-- 'stripe', pero algunos entornos lo perdieron en 0003; lo restauramos sin
-- pisar nada existente.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.entitlements'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%provider%'
      and pg_get_constraintdef(oid) not ilike '%stripe%'
  loop
    execute format('alter table public.entitlements drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.entitlements
  add constraint entitlements_provider_check
  check (provider is null or provider in ('mercado_pago', 'stripe'));
