-- ============================================================================
-- 0014 · Audit 360 · Profile schema · CONTRACT (DROP columns)
--
-- ORDEN DE DEPLOY (crítico): ESTA MIGRACIÓN CORRE **DESPUÉS** DEL MERGE
-- Y DESPUÉS DE CONFIRMAR QUE VERCEL ESTÁ READY + SMOKE TEST DE GUARDAR
-- PERFIL OK.
--
-- Precondiciones antes de correr este archivo:
--   ✓ 0013_audit_360_profile_add_columns.sql ya aplicado.
--   ✓ fix/audit-360 mergeado a main.
--   ✓ Vercel deploy status = Ready para el commit merged.
--   ✓ Smoke test manual: abrir /onboarding con una cuenta de prueba,
--     completar los 7 pasos, generar plan, y verificar en Supabase que
--     public.profiles tiene climbing_days_per_week y training_days_per_week
--     poblados. Sin ese check, NO CORRAS este archivo.
--
-- ¿Por qué DROP ahora y no antes?
--   El código en producción HOY escribe y lee estas 8 columnas activamente.
--   Dropearlas antes del deploy rompería cada guardado de perfil en la
--   ventana de 2-3 min que Vercel tarda en propagar el código nuevo.
--
--   Una vez que el código nuevo está deployado y verificado, estas
--   columnas quedan huérfanas — el código nuevo ya no las mapea ni las
--   consulta. Es seguro dropear.
--
-- ATENCIÓN — DATOS QUE SE PIERDEN:
--
--   Estas 8 columnas eliminadas contienen datos históricos reales de los
--   usuarios de producción. Se pierden intencionalmente. Esta es la
--   decisión explícita del producto (docs/audit-360.md § Bloque 4), no
--   un bug ni un accidente. Rastro auditable línea por línea:
--
--   • bench_press_1rm       Cortado por: no es ejercicio core-climbing;
--                           el prompt lo mostraba sin instrucción de uso.
--   • squat_1rm             Ídem.
--   • deadlift_1rm          Ídem.
--   • previous_training     Cortado por: enum de "historia" sin efecto
--                           demostrable en el plan generado.
--   • outdoor_frequency     No existe en producción (el nombre nunca se
--                           agregó en migraciones previas). DROP defensivo
--                           por si algún environment lo tuviera.
--   • campus_experience     Ídem — nunca existió como columna.
--   • warmup                Ídem — nunca existió a nivel profile (existe
--                           en public.sessions.warmup, que es otro concepto).
--   • energy                Cortado + duplicado con energy_level.
--   • energy_level          Cortado — el user auto-reporta energía en cada
--                           check-in; guardarla en el perfil no aporta.
--   • height                Cortado — sin uso en el motor ni safety.
--   • project               Cortado — fusionado con goal_description
--                           (una sola textarea en el Paso 6).
--   • project_description   Ídem — alias legacy que ya no se lee.
--
-- Idempotente: DROP COLUMN IF EXISTS — se puede re-correr sin efecto.
-- ============================================================================

alter table public.profiles
  drop column if exists bench_press_1rm,
  drop column if exists squat_1rm,
  drop column if exists deadlift_1rm,
  drop column if exists previous_training,
  drop column if exists outdoor_frequency,
  drop column if exists campus_experience,
  drop column if exists warmup,
  drop column if exists energy,
  drop column if exists energy_level,
  drop column if exists height,
  drop column if exists project,
  drop column if exists project_description;

-- Fin de la migración 0014 (CONTRACT).
