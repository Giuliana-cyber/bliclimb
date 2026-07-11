-- ============================================================================
-- 0022 · CIERRE DE PASO 2 · Tanda de cierre + expansión de vocabulario (Fase 5)
--
-- Última tanda del workstream del catálogo (Paso 2). Cierra la
-- canonicalización de las 155 filas ejercicio que quedaban sin curar
-- tras las tandas 1-3.
--
-- Aprobación Giuliana turno 2026-07-10.
--
-- Expansión de vocabulario aprobada: 13 → 15 buckets. Nuevos:
--
--   - fuerza-empuje: bench press, shoulder press, push-ups. Antagonistas
--     de tracción / balance postural / auxiliares de escalada.
--   - fuerza-tren-inferior: deadlift, split squat, step-up. Ejercicios de
--     piernas puros sin categoría en el vocabulario original.
--
-- Contenido:
--
--   1. ALTER CHECK constraint de categoria_canonica → 15 valores.
--
--   2. 133 filas canonicalizadas (12 destinos):
--        tecnica              46  (incluye 3 calentamiento + 1 enfriamiento)
--        fuerza-traccion      18
--        potencia             16  (incluye 1 calentamiento CAL-002)
--        campus               14  (incluye FD-012 de tanda 1)
--        boulder              13  (incluye TC-FOFF rehab)
--        fuerza-dedos         13  (10 rehab/prevención + AG-PINCHBLOCK
--                                  correcion + FM-012 + FM-014)
--        potencia             16
--        fuerza-empuje         3  (nuevo bucket: FM-006, FM-007, CAL-001)
--        fuerza-tren-inferior  3  (nuevo bucket: FM-DEADLIFT, FM-SPLIT, FM-STEPUP)
--        resistencia-aerobica  3  (DIS-003, DIS-004, DIS-006)
--        resistencia-anaerobica 2 (DIS-002, DIS-005)
--        munecas-antebrazos    1  (FM-009 forearm curl)
--        core                  1  (MU-TURKISH cuerpo entero)
--
--   3. 22 filas reclasificadas de ejercicio a concepto con tags:
--
--        tag 'programa-bloque' (17): frameworks/protocolos multi-semana
--          - ADN-001..005 (Programas por nivel)
--          - ADO-003, ADO-004, ADO-005, ADO-006 (Bloques por objetivo)
--          - BO-BOARD-PROG (Progresión Board 3 bloques)
--          - PER-001, PER-002, PER-005, PER-DELOAD (Periodización)
--          - PF-FM-001, PF-FM-002, PF-FM-005 (Fuerza máxima protocolos
--            10 semanas / 2 días/semana / 3 semanas HIT)
--
--        tag 'concepto-dominio' (3): definiciones de tipo de agarre
--          - AG-001 (Mano abierta como agarre dominante)
--          - AG-002 (Uso limitado de crimp / regla 25%)
--          - AG-003 (Alternancia open hand ↔ crimp)
--
--        tag 'regla-catalogo' (1): regla colada como fila
--          - FIL-006 (Campus near maximum Michailov)
--
--        tag 'nutricion' (1): contenido nutricional
--          - NE-PR-001 (Ajuste de carbohidratos según carga semanal)
--
-- Impacto en números post-0022:
--   - ejercicios: 286 → 264 (-22 reclasificados a concepto)
--   - non-ejercicio: 196 → 218 (+22)
--     - concepto: 50 → 72 (+22)
--   - CATEGORIA_CANONICA CANONICALIZADOS TOTAL: 264 de 264 ejercicios = **100%**
--     (tanda 1: 34, tanda 2: 78, tanda 3: 19, cierre: 133 = 264 canonicalizados)
--   - Rows con NULL en categoria_canonica (ejercicios): 0
--   - Rows con NULL en categoria_canonica (non-ejercicio): 218 (por diseño)
--
-- Radar Paso 5 completo · rows con tag 'programa-bloque' post-0022 (22 rows):
--   fuerza-dedos:      HB-P001..P004, DP-P005 (5, ya trazados no con tag)
--   resistencia-aerob: CO-P004 (ya trazada no con tag)
--   movilidad:         RE-006, MO-P002 (2, con tag desde 0020)
--   fuerza-traccion:   PF-FM-001, PF-FM-002, PF-FM-005 (3 nuevos)
--   framework:         ADN-001..005 (5), ADO-003..006 (4), BO-BOARD-PROG (1)
--   periodizaci:       PER-001, PER-002, PER-005, PER-DELOAD (4)
--   campus:            CB-P001, CB-P002 (2, viene de tandas anteriores, chequear)
--
-- Cierra el Paso 2 completo del workstream del catálogo. Pasa a Paso 3
-- (canonicalización de `equipo` a los 9 tokens del onboarding).
--
-- Idempotente. Reversible sin tocar 0017-0021.
-- ============================================================================

-- ---- 4a · Expansión del CHECK constraint a 15 buckets ----
alter table public.exercises
  drop constraint if exists exercises_categoria_canonica_check;
alter table public.exercises
  add constraint exercises_categoria_canonica_check
  check (categoria_canonica is null or categoria_canonica in (
    'fuerza-dedos',
    'fuerza-traccion',
    'fuerza-empuje',           -- NUEVO
    'fuerza-tren-inferior',    -- NUEVO
    'potencia',
    'campus',
    'resistencia-aerobica',
    'resistencia-anaerobica',
    'tecnica',
    'boulder',
    'movilidad',
    'core',
    'hombros-escapulas',
    'munecas-antebrazos',
    'piel'
  ));

-- ---- 4b · tecnica (46 filas) ----
update public.exercises
set categoria_canonica = 'tecnica'
where id in (
  'APM-001', 'APM-002', 'APM-003', 'APM-004', 'APM-006',
  'APM-007', 'APM-008', 'APM-009', 'APM-010', 'APM-011', 'APM-013',
  'CAL-RAMP', 'CAL-WUP', 'CR-003', 'CR-004', 'MO-ONESIZE', 'RE-001',
  'TC-001', 'TC-002', 'TC-003', 'TC-004', 'TC-006', 'TC-007', 'TC-008',
  'TC-1ARM', 'TC-1FOOT', 'TC-ANK', 'TC-CJ', 'TC-COUNTER', 'TC-DS',
  'TC-EXEC', 'TC-EXPLORE', 'TC-GRIPISO', 'TC-HEELHOOK', 'TC-HOV',
  'TC-OFD', 'TC-OSFA', 'TC-PIVOT', 'TC-QUIET', 'TC-SLO', 'TC-SOSO',
  'TC-SQVSHIP', 'TC-STK', 'TC-TOEHOOK', 'TC-UPFALL', 'TC-WCRAWL'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Momento overrides para tecnica.
update public.exercises
set momento = 'calentamiento'
where id in ('CAL-RAMP', 'CAL-WUP', 'CR-004')
and tipo_registro = 'ejercicio'
and momento = 'principal';

update public.exercises
set momento = 'enfriamiento'
where id = 'RE-001'
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- ---- 4c · fuerza-traccion (18 filas) ----
update public.exercises
set categoria_canonica = 'fuerza-traccion'
where id in (
  'FM-002', 'FM-003', 'FM-004', 'FM-005', 'FM-008', 'FM-013',
  'FT-001', 'FT-002', 'FT-003', 'FT-007', 'FT-008',
  'FT-1ARMNEG', 'FT-ECCPU', 'FT-LADDERS', 'FT-RINGDIP',
  'FTP-001', 'FTP-002', 'FTP-005'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4d · potencia (16 filas) ----
update public.exercises
set categoria_canonica = 'potencia'
where id in (
  'CAL-002',
  'PO-002', 'PO-003', 'PO-004', 'PO-005', 'PO-007',
  'PO-CAMPUS-WALL', 'PO-CLAP', 'PO-DEADSTOP', 'PO-HIPDRIVE',
  'PO-INWARDBOUNCE', 'PO-PADDLE', 'PO-POWERPU', 'PO-SPEEDPU',
  'POP-002', 'POP-003'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

update public.exercises
set momento = 'calentamiento'
where id = 'CAL-002'
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- ---- 4e · campus (14 filas) ----
update public.exercises
set categoria_canonica = 'campus'
where id in (
  'CB-001', 'CB-002', 'CB-003', 'CB-004', 'CB-005',
  'CB-006', 'CB-007', 'CB-008', 'CB-009',
  'CB-P001', 'CB-P002', 'CB-P003', 'CB-P004',
  'FD-012'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4f · boulder (13 filas) ----
update public.exercises
set categoria_canonica = 'boulder'
where id in (
  'BO-001', 'BO-002', 'BO-003', 'BO-004',
  'BT-001', 'BT-002', 'BT-003', 'BT-P001', 'BT-P002', 'BT-P003',
  'BT-PAUSE',
  'DIS-001',
  'TC-FOFF'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

update public.exercises
set proposito = 'rehab'
where id = 'TC-FOFF'
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 4g · fuerza-dedos (13 filas: 10 rehab/prevención + AG-PINCHBLOCK
--                        corrección heurística + FM-012 + FM-014) ----
update public.exercises
set categoria_canonica = 'fuerza-dedos'
where id in (
  'AG-PINCHBLOCK', 'FM-012', 'FM-014',
  'HB-DENS', 'HB-ISO-RECOV', 'HB-PROT', 'PR-003',
  'HB-REHAB-A2A4', 'RH-001', 'RH-004', 'RH-005', 'RH-P001', 'RH-P002'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Prevencion (4 rows en fuerza-dedos).
update public.exercises
set proposito = 'prevencion'
where id in ('HB-DENS', 'HB-ISO-RECOV', 'HB-PROT', 'PR-003')
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- Rehab (6 rows en fuerza-dedos).
update public.exercises
set proposito = 'rehab'
where id in ('HB-REHAB-A2A4', 'RH-001', 'RH-004', 'RH-005', 'RH-P001', 'RH-P002')
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 4h · fuerza-empuje (bucket nuevo, 3 filas) ----
update public.exercises
set categoria_canonica = 'fuerza-empuje'
where id in ('CAL-001', 'FM-006', 'FM-007')
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- CAL-001 con momento=calentamiento.
update public.exercises
set momento = 'calentamiento'
where id = 'CAL-001'
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- ---- 4i · fuerza-tren-inferior (bucket nuevo, 3 filas) ----
update public.exercises
set categoria_canonica = 'fuerza-tren-inferior'
where id in ('FM-DEADLIFT', 'FM-SPLIT', 'FM-STEPUP')
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4j · resistencia-aerobica (3 filas: DIS-* de disciplina lead/top-rope) ----
update public.exercises
set categoria_canonica = 'resistencia-aerobica'
where id in ('DIS-003', 'DIS-004', 'DIS-006')
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4k · resistencia-anaerobica (2 filas: DIS-002 hipertrofia, DIS-005 microdosis) ----
update public.exercises
set categoria_canonica = 'resistencia-anaerobica'
where id in ('DIS-002', 'DIS-005')
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4l · munecas-antebrazos (1 fila: FM-009 forearm curl) ----
update public.exercises
set categoria_canonica = 'munecas-antebrazos'
where id = 'FM-009'
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4m · core (1 fila: MU-TURKISH cuerpo entero) ----
update public.exercises
set categoria_canonica = 'core'
where id = 'MU-TURKISH'
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 4n · Reclasificar 22 filas de ejercicio a concepto ----
--
-- Divisiones por tag:
--   programa-bloque (17): ADN + ADO + BO-BOARD-PROG + PER + PF-FM-*
--   concepto-dominio (3): AG-001, AG-002, AG-003
--   regla-catalogo (1):   FIL-006
--   nutricion (1):        NE-PR-001

update public.exercises
set tipo_registro = 'concepto'
where id in (
  -- programa-bloque (17)
  'ADN-001', 'ADN-002', 'ADN-003', 'ADN-004', 'ADN-005',
  'ADO-003', 'ADO-004', 'ADO-005', 'ADO-006',
  'BO-BOARD-PROG',
  'PER-001', 'PER-002', 'PER-005', 'PER-DELOAD',
  'PF-FM-001', 'PF-FM-002', 'PF-FM-005',
  -- concepto-dominio (3)
  'AG-001', 'AG-002', 'AG-003',
  -- regla-catalogo (1)
  'FIL-006',
  -- nutricion (1)
  'NE-PR-001'
)
and tipo_registro = 'ejercicio';

-- Tag programa-bloque (17 rows).
update public.exercises
set tags = tags || array['programa-bloque']
where id in (
  'ADN-001', 'ADN-002', 'ADN-003', 'ADN-004', 'ADN-005',
  'ADO-003', 'ADO-004', 'ADO-005', 'ADO-006',
  'BO-BOARD-PROG',
  'PER-001', 'PER-002', 'PER-005', 'PER-DELOAD',
  'PF-FM-001', 'PF-FM-002', 'PF-FM-005'
)
and tipo_registro = 'concepto'
and not ('programa-bloque' = any(tags));

-- Tag concepto-dominio (3 rows).
update public.exercises
set tags = tags || array['concepto-dominio']
where id in ('AG-001', 'AG-002', 'AG-003')
and tipo_registro = 'concepto'
and not ('concepto-dominio' = any(tags));

-- Tag regla-catalogo (1 row).
update public.exercises
set tags = tags || array['regla-catalogo']
where id = 'FIL-006'
and tipo_registro = 'concepto'
and not ('regla-catalogo' = any(tags));

-- Tag nutricion (1 row: NE-PR-001; NE-PR-003 ya tiene el tag desde 0020).
update public.exercises
set tags = tags || array['nutricion']
where id = 'NE-PR-001'
and tipo_registro = 'concepto'
and not ('nutricion' = any(tags));

-- Nulear canónicas para las 22 reclasificadas (consistency con
-- 0016/0018/0019/0020/0021).
update public.exercises
set nivel_canonico = null,
    categoria_canonica = null,
    proposito = null,
    momento = null
where id in (
  'ADN-001', 'ADN-002', 'ADN-003', 'ADN-004', 'ADN-005',
  'ADO-003', 'ADO-004', 'ADO-005', 'ADO-006',
  'BO-BOARD-PROG',
  'PER-001', 'PER-002', 'PER-005', 'PER-DELOAD',
  'PF-FM-001', 'PF-FM-002', 'PF-FM-005',
  'AG-001', 'AG-002', 'AG-003',
  'FIL-006', 'NE-PR-001'
)
and tipo_registro = 'concepto'
and (nivel_canonico is not null
  or categoria_canonica is not null
  or proposito is not null
  or momento is not null);
