-- 0005 — Campos de fuerza absoluta en perfiles
-- Datos para calibrar intensidades reales en planes (dominadas, hangboard,
-- 1RM). Permite que Bill y Senda no inventen prescripciones.
-- Idempotente.

alter table public.profiles
  add column if not exists pullups_bodyweight integer,
  add column if not exists pullups_added_weight_5reps integer,
  add column if not exists hangboard_20mm_seconds integer,
  add column if not exists hangboard_20mm_added_weight_7s integer,
  add column if not exists bench_press_1rm integer,
  add column if not exists squat_1rm integer,
  add column if not exists deadlift_1rm integer;

-- Constraints suaves: nada de negativos. Mantienen el filtro en la base
-- aunque el cliente fallara. Idempotentes via DO/IF NOT EXISTS porque
-- ADD CONSTRAINT no soporta IF NOT EXISTS en Postgres 14.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_strength_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_strength_nonneg check (
        (pullups_bodyweight is null or pullups_bodyweight >= 0) and
        (pullups_added_weight_5reps is null or pullups_added_weight_5reps >= 0) and
        (hangboard_20mm_seconds is null or hangboard_20mm_seconds >= 0) and
        (hangboard_20mm_added_weight_7s is null or hangboard_20mm_added_weight_7s >= 0) and
        (bench_press_1rm is null or bench_press_1rm >= 0) and
        (squat_1rm is null or squat_1rm >= 0) and
        (deadlift_1rm is null or deadlift_1rm >= 0)
      );
  end if;
end;
$$;
