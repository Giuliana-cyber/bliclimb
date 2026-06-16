-- 0003 — Cleanup de constraints legacy de la tabla `subscriptions` (ahora
-- renombrada a `entitlements`). Estos drops ya se aplicaron a mano en algunos
-- entornos durante la migración inicial; este archivo los persiste en el repo
-- para que un fresh install reproduzca el mismo estado sin tener que tocar
-- la base por la UI.
--
-- Idempotente: todos los DROP CONSTRAINT son IF EXISTS y los nombres
-- corresponden a los originales de `0001_init.sql` antes del rename.

-- 1. NOT NULL legacy en `provider`, `provider_subscription_id` y `status`
--    En el modelo nuevo, un row puede existir solo para llevar `free_plan_used_at`
--    sin que el usuario tenga proveedor de pagos configurado todavía.
alter table public.entitlements
  alter column provider drop not null,
  alter column provider_subscription_id drop not null,
  alter column status drop not null;

-- 2. CHECK legacy de status (con 'canceled' sin doble L) — si por alguna razón
--    quedó pegado tras 0002, lo barremos.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.entitlements'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%canceled%'
  loop
    execute format('alter table public.entitlements drop constraint %I', con.conname);
  end loop;
end;
$$;

-- 3. UNIQUE legacy (provider, provider_subscription_id) bloquearía rows
--    cuando ambos son null (un usuario sin proveedor). El check ya queda
--    cubierto por el partial index `entitlements_provider_sub_idx` creado
--    en 0002. Si quedó un UNIQUE de la migración inicial, lo soltamos.
alter table public.entitlements
  drop constraint if exists subscriptions_provider_provider_subscription_id_key;

-- 4. CHECK viejo de status (constraint nombrado al renombrar la tabla)
alter table public.entitlements
  drop constraint if exists subscriptions_status_check;
