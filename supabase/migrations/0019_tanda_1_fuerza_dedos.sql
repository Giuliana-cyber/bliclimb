-- ============================================================================
-- 0019 · Tanda 1: canonicalizar 34 fuerza-dedos + reclasificar DP-P001 (Paso 2 · Fase 5)
--
-- Primera tanda de curación row-by-row del workstream del catálogo.
-- Aprobación Giuliana turno 2026-07-10:
--
--   1. 34 filas → categoria_canonica='fuerza-dedos'.
--      proposito='entrenamiento' y momento='principal' se mantienen (defaults
--      de 0017, ninguna fila necesitó ajuste explícito).
--
--   2. 3 filas salen del bucket para tandas futuras — quedan con
--      categoria_canonica=NULL, se asignan en su tanda respectiva:
--        - HB-REPEAT-LOW → tanda resistencia-aerobica (capilarización, 30-40%)
--        - FD-012        → tanda campus (Campus board orientado a fuerza dedos)
--        - DP-P001       → reclasificar a concepto (checklist de requisitos
--                          para hangboard, no ejercicio ejecutable con dosis)
--
--   3. DP-P001 recibe tag 'criterios' — distinto de 'conversacional' de las
--      21 de 0018. Su función es gating/elegibilidad (verificar >2 años
--      escalando, >=16 años, libre de lesión, poder colgar 15s en 25mm
--      antes de empezar hangboard), no contenido de chat.
--
-- Radar para Paso 5 documentado en deuda #8: distinción bloque-de-semanas
-- vs ejercicio-de-sesión dentro de fuerza-dedos. Los HB-P001..P004 son
-- bloques de 4-8 semanas; el motor no debe meterlos como ejercicios de
-- una sesión en un plan corto.
--
-- Idempotente. Reversible sin tocar 0017/0018.
-- ============================================================================

-- ---- Tanda 1a · Canonicalizar 34 filas a fuerza-dedos ----
--
-- Breakdown por categoría de origen:
--   - Dedos y poleas (9): DP-001..005 + DP-P002..P005 (sale DP-P001)
--   - Fuerza de dedos (5): FD-001, FD-002, FD-003, FD-005, FD-011 (sale FD-012)
--   - Fuerza dedos (1): HB-FCURL
--   - Fuerza dedos asimétrica (1): HB-MIXED
--   - Fuerza dedos baja carga (1): HB-ABRA
--   - Fuerza dedos máxima (2): HB-BLOCK, HB-RECRUIT
--   - Fuerza-resistencia dedos (1): HB-73
--   - Hangboard (3): HB-1ARM, HB-753, HB-LOW
--   - Hangboard / Fingerboard (10): HB-001..005 + HB-P001..P004 + HB-P006
--   - Muñecas + dedos (1): MU-KNUCKLE
-- Total: 34 filas.
update public.exercises
set categoria_canonica = 'fuerza-dedos'
where id in (
  -- Dedos y poleas (9)
  'DP-001', 'DP-002', 'DP-003', 'DP-004', 'DP-005',
  'DP-P002', 'DP-P003', 'DP-P004', 'DP-P005',
  -- Fuerza de dedos (5)
  'FD-001', 'FD-002', 'FD-003', 'FD-005', 'FD-011',
  -- Fuerza dedos (1)
  'HB-FCURL',
  -- Fuerza dedos asimétrica (1)
  'HB-MIXED',
  -- Fuerza dedos baja carga (1)
  'HB-ABRA',
  -- Fuerza dedos máxima (2)
  'HB-BLOCK', 'HB-RECRUIT',
  -- Fuerza-resistencia dedos (1)
  'HB-73',
  -- Hangboard (3)
  'HB-1ARM', 'HB-753', 'HB-LOW',
  -- Hangboard / Fingerboard (10)
  'HB-001', 'HB-002', 'HB-003', 'HB-004', 'HB-005',
  'HB-P001', 'HB-P002', 'HB-P003', 'HB-P004', 'HB-P006',
  -- Muñecas + dedos (1)
  'MU-KNUCKLE'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- Tanda 1b · Reclasificar DP-P001 a concepto ----
--
-- "Criterios de inicio para hangboard": checklist de requisitos (>2 años
-- escalando, >=16 años, libre de lesión, poder colgar 15s en 25mm).
-- Todos los campos de ejecución vacíos o "No aplica". Es contenido de
-- elegibilidad/gating, no ejercicio.
update public.exercises
set tipo_registro = 'concepto'
where id = 'DP-P001'
  and tipo_registro = 'ejercicio';

-- ---- Tanda 1c · Tag 'criterios' para DP-P001 ----
--
-- Distinto de 'conversacional' (los 21 de 0018 eran rutinas invocables
-- desde chat). 'criterios' marca el row como checklist de gating/
-- elegibilidad para futuro uso en onboarding o UI de sesión.
update public.exercises
set tags = tags || array['criterios']
where id = 'DP-P001'
  and tipo_registro = 'concepto'
  and not ('criterios' = any(tags));

-- ---- Tanda 1d · Nulear canónicas de DP-P001 ----
--
-- Consistency con 0016 y 0018: ya no es ejercicio, las 4 columnas
-- canónicas no aplican. Van al pool de auditoría de Paso 4.
update public.exercises
set nivel_canonico = null,
    categoria_canonica = null,
    proposito = null,
    momento = null
where id = 'DP-P001'
  and tipo_registro = 'concepto'
  and (nivel_canonico is not null
    or categoria_canonica is not null
    or proposito is not null
    or momento is not null);

-- ---- HB-REPEAT-LOW y FD-012 quedan intactos ----
--
-- Estos 2 rows siguen como tipo_registro='ejercicio' con
-- categoria_canonica=NULL, proposito='entrenamiento' (default 0017),
-- momento='principal' (default 0017). Se asignan en sus tandas
-- respectivas (resistencia-aerobica y campus) sin necesidad de tocarlos
-- acá.
