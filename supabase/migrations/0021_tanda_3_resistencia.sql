-- ============================================================================
-- 0021 · Tanda 3 · resistencia-aerobica + resistencia-anaerobica (Paso 2 · Fase 5)
--
-- Tercera tanda de curación row-by-row. Aprobación Giuliana turno 2026-07-10.
-- Formato editorial: pre-clasifiqué 21 filas con criterios explícitos de
-- dominio (aeróbica: ARC/Aero Cap/capilarización/duración larga; anaeróbica:
-- power endurance/4x4/6-in-6/bomba/recuperación incompleta). Giuliana revisó
-- las 21 y corrigió las de frontera + 2 sospechosos.
--
-- Contenido:
--
--   1. 11 filas → categoria_canonica='resistencia-aerobica'.
--      10 con momento='principal', 1 (CO-P003 "Aero Cap finisher suave")
--      con momento='enfriamiento'.
--      Incluye HB-REPEAT-LOW que salió de tanda 1 fuerza-dedos con
--      NULL a la espera de esta tanda (capilarización dedos = aeróbica).
--
--   2. 8 filas → categoria_canonica='resistencia-anaerobica'.
--      Todas momento='principal'.
--      Nota de frontera: CO-004 "Laps en rutas sostenidas" tenía categoría
--      origen "Continuidad / resistencia aeróbica" pero se reclasifica a
--      anaeróbica por decisión de contenido (laps = bomba = power endurance).
--
--   3. 2 filas reclasificadas de ejercicio a concepto (mismo patrón que
--      21 de 0018 + DP-P001 de 0019 + 4 de 0020):
--      - CO-007 · Sesión recreativa indoor monitorizada
--      - CO-P006 · Sesión indoor recreativa con objetivo cardiovascular
--      Ambas son sesiones libres con registro de FC/duración, no ejercicios
--      de plan. Tag introducido: 'monitoreo' — traza rows que son sesiones
--      de evaluación/registro más que ejercicios de dosis.
--
-- Radar Paso 5 (anotado en canonicalization-debt.md · deuda #8): CO-P004
-- "Bloque de base con Aero Cap" queda como resistencia-aerobica por
-- decisión de contenido, pero su descripción tiene estructura de macrociclo
-- (Base 1/Base 2/Peak/Taper). Comparte patrón con HB-P001..P004 y RE-006,
-- MO-P002. Se revisa al conectar el motor en Paso 5.
--
-- Impacto en números post-0021:
--   - ejercicios: 288 → 286 (-2 concepto)
--   - non-ejercicio: 194 → 196 (+2)
--     - concepto: 48 → 50 (+2)
--   - rows con categoria_canonica='resistencia-aerobica': 0 → 11
--   - rows con categoria_canonica='resistencia-anaerobica': 0 → 8
--   - rows con tag 'monitoreo': 0 → 2
--   - Total canonicalizados: 112 (tandas 1+2) + 19 = 131 de 286
--
-- Idempotente. Reversible sin tocar 0017-0020.
-- ============================================================================

-- ---- 3a · resistencia-aerobica (11 filas) ----
--
-- Categoria destino uniforme. Momento=principal en 10 rows; CO-P003 aparte
-- con momento=enfriamiento (finisher suave post-bloque).
update public.exercises
set categoria_canonica = 'resistencia-aerobica'
where id in (
  'CO-001',       -- Escalada continua constante (ARC / Aero Cap)
  'CO-002',       -- 10 minutos on / 10 minutos off
  'CO-003',       -- Bloques aeróbicos con ARC activo
  'CO-005',       -- Travesía larga
  'CO-006',       -- Boulder largo (long bouldering)
  'CO-40',        -- Continuidad 40 min protocolo Rhapsody MacLeod (capilarización)
  'CO-P001',      -- Protocolo ARC / Aero Cap continuo
  'CO-P002',      -- 10 on / 10 off x4
  'CO-P003',      -- Aero Cap finisher suave (momento=enfriamiento, ver 3a-bis)
  'CO-P004',      -- Bloque de base con Aero Cap (radar Paso 5)
  'HB-REPEAT-LOW' -- Repeaters baja intensidad capilarización (venía de tanda 1)
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 3a-bis · CO-P003 con momento=enfriamiento ----
--
-- Único row de la tanda con momento distinto del default. Aero Cap suave
-- de 10 min post-bloque principal — funciona como cool-down aeróbico.
update public.exercises
set momento = 'enfriamiento'
where id = 'CO-P003'
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- ---- 3b · resistencia-anaerobica (8 filas) ----
--
-- Todas con proposito='entrenamiento' y momento='principal' (defaults
-- de 0017). No requieren updates adicionales de proposito/momento.
--
-- Nota de frontera: CO-004 originalmente categoría "Continuidad /
-- resistencia aeróbica" pero se reclasifica a anaeróbica por decisión
-- de contenido — laps sostenidos son power endurance clásico (bomba +
-- ratio trabajo:descanso desfavorable).
update public.exercises
set categoria_canonica = 'resistencia-anaerobica'
where id in (
  'CO-004',      -- Laps en rutas sostenidas (RECLASSIF de aeróbica origen)
  'CO-P005',     -- Intervalos de resistencia (borderline resuelto a anaeróbica)
  'PE-1ON1',     -- 1-on-1-off Active
  'PE-45',       -- 45-20-45 resistencia específica ruta
  'PE-4X4PW',    -- 4x4s Pete Whittaker
  'PE-6IN6',     -- 6 in 6 boulder cada minuto x 6
  'PE-PAUSE',    -- Pause Drill (Ghisolfi)
  'PE-TRIPLE'    -- Triples Ondra/Schubert
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 3c · Reclasificar CO-007, CO-P006 a concepto + tag 'monitoreo' ----
--
-- Ambas son sesiones recreativas indoor con registro de FC/duración/tiempo
-- activo. No son ejercicios ejecutables con dosis prescriptiva; son
-- protocolos de monitoreo/registro. Mismo tratamiento que:
--   - 21 mental+táctica (0018, tag 'conversacional')
--   - DP-P001 checklist (0019, tag 'criterios')
--   - PR-005 respiración (0020, tag 'conversacional')
--   - RE-006, MO-P002 (0020, tag 'programa-bloque')
--   - NE-PR-003 (0020, tag 'nutricion')
--
-- Tag nuevo 'monitoreo': marca rows que son sesiones de evaluación /
-- registro de datos (FC, duración, tiempo activo) más que ejercicios de
-- dosis. Traza estos rows para futuras features de auto-tracking o
-- integración con /checkin extendido.

update public.exercises
set tipo_registro = 'concepto'
where id in ('CO-007', 'CO-P006')
and tipo_registro = 'ejercicio';

update public.exercises
set tags = tags || array['monitoreo']
where id in ('CO-007', 'CO-P006')
and tipo_registro = 'concepto'
and not ('monitoreo' = any(tags));

-- Nulear canónicas (consistency con 0016/0018/0019/0020).
update public.exercises
set nivel_canonico = null,
    categoria_canonica = null,
    proposito = null,
    momento = null
where id in ('CO-007', 'CO-P006')
and tipo_registro = 'concepto'
and (nivel_canonico is not null
  or categoria_canonica is not null
  or proposito is not null
  or momento is not null);
