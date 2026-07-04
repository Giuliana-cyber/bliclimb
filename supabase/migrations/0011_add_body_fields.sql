-- 0011 — Agregar columnas de cuerpo (sex, weight, height) a public.profiles.
--
-- Los 3 campos ya se capturan en el onboarding (paso 3 "Sobre ti") y viven
-- en el UserProfile de localStorage, pero nunca llegaron a la DB porque:
--   1. el dbPayload del onboarding los omitía,
--   2. el mapper de /api/profile no los conocía,
--   3. no existían las columnas.
-- Este PR arregla las 3 capas.
--
-- Bill/Senda usan estos datos legítimamente:
--   - sex: dirigir el tono y el género gramatical de la conversación.
--   - weight/height: calcular fuerza relativa (dominadas con peso adicional,
--     hangboard con peso adicional se comparan como % del peso corporal).
--
-- Sin CHECK constraint, coherente con el diseño legacy-compat del resto
-- de columnas de profiles. Valores esperados de `sex` (no forzados):
-- 'male', 'female', 'na'. `weight` y `height` son numeric (permite decimales
-- como 72.5 kg o 1.68 m). Sin backfill — los 9 profiles existentes quedan
-- con NULL, se pueblan en el próximo onboarding o edición.
--
-- Idempotente.

alter table public.profiles
  add column if not exists sex text,
  add column if not exists weight numeric,
  add column if not exists height numeric;
