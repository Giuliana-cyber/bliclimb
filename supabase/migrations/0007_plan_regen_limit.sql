-- 0007 — Límite de 2 planes generados por mes.
--
-- El contador `plans_generated_this_month` se incrementa después de cada
-- generación exitosa (al mismo nivel que `markFreePlanUsed`). Cuando el
-- contador llega a 2 el gate devuelve 429.
--
-- `plan_month_reset_at` guarda el inicio del período actual. Si su mes
-- calendario es anterior al de `now()`, el helper resetea el contador a 0
-- y actualiza el timestamp.
--
-- Idempotente (`if not exists`).

alter table public.entitlements
  add column if not exists plans_generated_this_month integer not null default 0,
  add column if not exists plan_month_reset_at timestamptz default now();

-- Pequeño backfill defensivo: filas previas a esta migración tienen el default
-- aplicado por la column add. No hace falta backfill manual.
