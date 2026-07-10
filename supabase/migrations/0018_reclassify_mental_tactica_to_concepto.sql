-- ============================================================================
-- 0018 · Reclasificar 21 mental+táctica de ejercicio a concepto (Paso 2 · Fase 5)
--
-- Contexto: al enumerar categoria en Paso 2 (turno 2026-07-10), las 21
-- filas con categorías "Trabajo mental" (15) y "Táctica*/Autoconocimiento"
-- (6) resultaron ser todas contenido conversacional, no ejercicios
-- ejecutables con dosis. Ninguna tiene series/reps + tiempo definidos
-- como estímulo de plan. Son cosas que Bill/Senda dice en el chat o tips
-- de UI.
--
-- Reclasificación aprobada por Giuliana turno 2026-07-10:
--   1. tipo_registro: 'ejercicio' → 'concepto'
--   2. Tag: agregar 'conversacional' para diferenciarlas de conceptos de
--      dominio (TA-C*, tipos de agarre) que existen como definiciones estáticas
--   3. Nulear las 4 columnas canónicas (nivel_canonico, categoria_canonica,
--      proposito, momento) — ya no son ejercicios, no aplican
--
-- Impacto en números:
--   - ejercicios: 314 → 293
--   - non-ejercicio: 168 → 189 (+21)
--     - concepto: 22 → 43 (+21)
--   - Rows con tag 'conversacional': 0 → 21
--
-- Reversible sin tocar 0017: si se revierte esta migración (UPDATE
-- inverso), los 21 vuelven a ejercicio con las 4 columnas canónicas
-- en NULL. El backfill de defaults de 0017 no se re-aplica automáticamente
-- (habría que correr 0017 de nuevo, que es idempotente).
--
-- Idempotente: guards WHERE para no re-tocar rows ya reclasificadas.
-- ============================================================================

-- ---- Paso 2e · Reclasificar tipo_registro a concepto ----
--
-- Los 21 IDs específicos:
--   - Trabajo mental (15): ME-001..010 + ME-P001..P005
--   - Táctica (2): TA-001, TA-002
--   - Táctica / Mental (1): TA-003
--   - Táctica de escalada (1): TA-004
--   - Tácticas (1): TA-10MIN
--   - Autoconocimiento (1): TC-FREEZE
update public.exercises
set tipo_registro = 'concepto'
where id in (
  -- mental (15)
  'ME-001', 'ME-002', 'ME-003', 'ME-004', 'ME-005',
  'ME-006', 'ME-007', 'ME-008', 'ME-009', 'ME-010',
  'ME-P001', 'ME-P002', 'ME-P003', 'ME-P004', 'ME-P005',
  -- táctica y autoconocimiento (6)
  'TC-FREEZE', 'TA-001', 'TA-002', 'TA-003', 'TA-004', 'TA-10MIN'
)
and tipo_registro = 'ejercicio';

-- ---- Paso 2f · Tag `conversacional` ----
--
-- Marca las filas como contenido invocable desde chat/UI (rutinas de
-- respiración, tips tácticos), distinto de los `concepto` de
-- definiciones estáticas (TA-C* tipos de agarre). Traza para cuando
-- el hilo narrativo (3.1) o el chat de Bill los necesite en Paso 4.
--
-- Guard `tipo_registro = 'concepto'`: solo se aplica tras la
-- reclasificación exitosa del paso anterior. Idempotencia por
-- `not ('conversacional' = any(tags))`.
update public.exercises
set tags = tags || array['conversacional']
where id in (
  'ME-001', 'ME-002', 'ME-003', 'ME-004', 'ME-005',
  'ME-006', 'ME-007', 'ME-008', 'ME-009', 'ME-010',
  'ME-P001', 'ME-P002', 'ME-P003', 'ME-P004', 'ME-P005',
  'TC-FREEZE', 'TA-001', 'TA-002', 'TA-003', 'TA-004', 'TA-10MIN'
)
and tipo_registro = 'concepto'
and not ('conversacional' = any(tags));

-- ---- Paso 2g · Nulear columnas canónicas ----
--
-- Consistency con 0016 (nulear nivel_canonico en non-ejercicio) y con
-- los guards `tipo_registro='ejercicio'` de 0015 + 0017. Estas 21 filas
-- dejan de ser ejercicios; las 4 columnas no aplican y quedan NULL
-- como marca de "no clasificado por este workstream". Van al pool de
-- ~205 filas a auditar en Paso 4.
--
-- Idempotencia: WHERE incluye chequeo de que alguna de las 4 esté no-NULL.
update public.exercises
set nivel_canonico = null,
    categoria_canonica = null,
    proposito = null,
    momento = null
where id in (
  'ME-001', 'ME-002', 'ME-003', 'ME-004', 'ME-005',
  'ME-006', 'ME-007', 'ME-008', 'ME-009', 'ME-010',
  'ME-P001', 'ME-P002', 'ME-P003', 'ME-P004', 'ME-P005',
  'TC-FREEZE', 'TA-001', 'TA-002', 'TA-003', 'TA-004', 'TA-10MIN'
)
and tipo_registro = 'concepto'
and (nivel_canonico is not null
  or categoria_canonica is not null
  or proposito is not null
  or momento is not null);
