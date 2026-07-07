-- ============================================================================
-- 0013 · Audit 360 · Profile schema · EXPAND (ADD columns)
--
-- ORDEN DE DEPLOY (crítico): ESTA MIGRACIÓN CORRE **ANTES** DEL MERGE.
--
-- Patrón zero-downtime "expand → migrate → contract":
--   1. Aplicar ESTE 0013 (ADD) contra producción.
--   2. Merge de fix/audit-360 a main → Vercel auto-deploya el código nuevo.
--   3. Confirmar deploy sano: Vercel Ready + smoke test de guardar perfil OK.
--   4. Aplicar 0014_audit_360_profile_drop_columns.sql (DROP).
--
-- ¿Por qué este orden?
--   El código en producción HOY escribe y lee 8 columnas que el Bloque 4
--   recortó (bench/squat/deadlift, previous_training, energy, energy_level,
--   height, project + alias). Dropearlas antes del merge rompería CADA
--   guardado de perfil en la ventana de deploy (2-3 min) — Postgres
--   devolvería "column X does not exist" y el endpoint fallaría con 500.
--
--   Los ADDs son seguros para el código viejo: Supabase acepta columnas
--   nuevas y el código las ignora silenciosamente en `SELECT *`.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS — se puede re-correr sin efecto.
-- ============================================================================

alter table public.profiles
  -- Bloque 3 audit-360 (H-03): desglose de días.
  add column if not exists climbing_days_per_week int default 0
    check (climbing_days_per_week is null or (climbing_days_per_week between 0 and 7)),
  add column if not exists training_days_per_week int default 0
    check (training_days_per_week is null or (training_days_per_week between 0 and 7)),

  -- Bloque 4 audit-360: campos ya capturados en el onboarding que nunca
  -- se persistieron (peaje-con-uso-volátil que se perdía al reconciliar
  -- desde DB).
  add column if not exists disciplines text[] default '{}'::text[],
  add column if not exists setting text default '',
  add column if not exists available_days text[] default '{}'::text[],
  add column if not exists max_session_duration int default 90
    check (max_session_duration is null or (max_session_duration between 15 and 360)),
  add column if not exists pull_up_ability text default '',
  add column if not exists finger_training_experience text default '';

-- Fin de la migración 0013 (EXPAND).
