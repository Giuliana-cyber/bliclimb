-- ============================================================================
-- 0020 · Tanda 2 multi-bloque · movilidad + core + hombros-escapulas +
--                                munecas-antebrazos + piel (Paso 2 · Fase 5)
--
-- Segunda tanda de curación row-by-row del workstream del catálogo, en
-- formato editorial: yo pre-clasifiqué 102 filas, Giuliana revisó y corrigió.
-- Aprobación Giuliana turno 2026-07-10.
--
-- Contenido:
--
--   1. 78 filas canonicalizadas (categoria_canonica ← 5 destinos):
--      - movilidad (38): flexibilidad, movilidad general, algunos
--        calentamientos genéricos, estiramientos upper-body movidos aquí
--      - core (12): planks, hollow, cuadrupedia + glute bridge prevención
--      - hombros-escapulas (16): activación/fuerza real de hombros (los
--        estiramientos salieron a movilidad por decisión de contenido)
--      - munecas-antebrazos (10): estiramientos + curls + rotaciones +
--        prehab extensor + rehab miofascial
--      - piel (2): higiene y sanding
--
--   2. 4 filas reclasificadas de ejercicio a concepto (no son ejercicios
--      ejecutables con dosis, mismo patrón que 21 de 0018 + DP-P001 de 0019):
--      - PR-005 · Respiración lenta pre-escalada → tag 'conversacional'
--        (rutina de respiración invocable desde chat, misma familia que
--        los ME-* de mental)
--      - RE-006 · Semana de descanso post-ciclo → tag 'programa-bloque'
--        (unidad de mesociclo, no ejercicio de sesión)
--      - MO-P002 · Programa indoor 8 semanas para movilidad de tronco →
--        tag 'programa-bloque' (protocolo N semanas, mismo patrón que
--        HB-P001..P004 del radar Paso 5)
--      - NE-PR-003 · Nutrición post-entrenamiento → tag 'nutricion'
--        (contenido nutricional, no ejercicio)
--
--   3. 20 filas quedan con categoria_canonica=NULL para tandas futuras
--      (no las tocamos en esta migración, se resuelven en su tanda):
--      - Fuerza-dedos (10): 9 rehab/prevención de polea + RH-P002 protocolo
--      - Técnica (5): CR-003, CAL-RAMP, CAL-WUP, CR-004, RE-001, MO-ONESIZE
--      - Boulder (1): TC-FOFF
--      - Core (1): MU-TURKISH → categoria destino en tanda core-2
--      - Fuerza-tracción (1): CAL-001 (push-up de calentamiento)
--      - Potencia (1): CAL-002 (saltos de calentamiento)
--
-- Impacto en números post-0020:
--   - ejercicios: 292 → 288 (-4 reclasificados a concepto)
--   - non-ejercicio: 190 → 194 (+4 concepto)
--     - concepto: 44 → 48 (+4)
--   - rows con categoria_canonica='movilidad': 0 → 38
--   - rows con categoria_canonica='core': 0 → 12
--   - rows con categoria_canonica='hombros-escapulas': 0 → 16
--   - rows con categoria_canonica='munecas-antebrazos': 0 → 10
--   - rows con categoria_canonica='piel': 0 → 2
--   - Total canonicalizadas: 34 (tanda 1) + 78 (tanda 2) = 112 de 288
--   - Rows con tag 'conversacional': 21 → 22 (+PR-005)
--   - Rows con tag 'programa-bloque': 0 → 2 (RE-006, MO-P002)
--   - Rows con tag 'nutricion': 0 → 1 (NE-PR-003)
--
-- Idempotente. Reversible sin tocar 0017/0018/0019.
-- ============================================================================

-- ---- 2a · movilidad (38 filas) ----
--
-- Base: categoria_canonica='movilidad'. Momentos y propósitos varían.
update public.exercises
set categoria_canonica = 'movilidad'
where id in (
  -- calentamiento (10)
  'CAL-004', 'CAL-005', 'CAL-006', 'CAL-007', 'CAL-008',
  'CAL-P01', 'CAL-P02',
  'MO-001', 'MO-002', 'MO-009',
  -- principal entrenamiento (8)
  'FL-001', 'FL-003', 'FL-012',
  'MO-COSSACK', 'MO-ELEPHANT', 'MO-INT-HIP', 'MO-PNFPANCAKE', 'MO-ROCKOVER',
  -- principal prevencion (2)
  'HE-ISO-DAILY', 'PR-IPP',
  -- principal rehab (1)
  'RH-NRVFLOSS',
  -- enfriamiento (17)
  'FL-002', 'FL-010', 'FL-011', 'FL-014', 'FL-015',
  'FL-016', 'FL-017', 'FL-018', 'FL-020', 'FL-COUCH',
  'CD-006', 'CD-007', 'FL-006', 'FL-008',
  'RE-002', 'RE-004', 'REP-001'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Momento=calentamiento (10) — se sobreescribe el default 'principal'.
update public.exercises
set momento = 'calentamiento'
where id in (
  'CAL-004', 'CAL-005', 'CAL-006', 'CAL-007', 'CAL-008',
  'CAL-P01', 'CAL-P02',
  'MO-001', 'MO-002', 'MO-009'
)
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Momento=enfriamiento (17).
update public.exercises
set momento = 'enfriamiento'
where id in (
  'FL-002', 'FL-010', 'FL-011', 'FL-014', 'FL-015',
  'FL-016', 'FL-017', 'FL-018', 'FL-020', 'FL-COUCH',
  'CD-006', 'CD-007', 'FL-006', 'FL-008',
  'RE-002', 'RE-004', 'REP-001'
)
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Proposito=prevencion (2).
update public.exercises
set proposito = 'prevencion'
where id in ('HE-ISO-DAILY', 'PR-IPP')
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- Proposito=rehab (1).
update public.exercises
set proposito = 'rehab'
where id = 'RH-NRVFLOSS'
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 2b · core (12 filas) ----
update public.exercises
set categoria_canonica = 'core'
where id in (
  'CAL-003',
  'CR-001', 'CR-002', 'CR-CHOP', 'CR-COPEN', 'CR-HARDSIT',
  'CR-HOLLOW', 'CR-LEGRAISE', 'CR-PIKE', 'CR-SUPERMAN', 'CR-WGHTPLK',
  'PR-GLUTE'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Momento=calentamiento (1): CAL-003 cuadrupedia calentamiento.
update public.exercises
set momento = 'calentamiento'
where id = 'CAL-003'
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Proposito=prevencion (1): PR-GLUTE Glute Bridge prevención.
update public.exercises
set proposito = 'prevencion'
where id = 'PR-GLUTE'
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 2c · hombros-escapulas (16 filas) ----
--
-- Los estiramientos upper-body (CD-006, CD-007, FL-006, FL-008) NO están
-- aquí — se movieron a movilidad por decisión de contenido: estirar es
-- movilidad, no trabajo de hombros-escapulas. Quedan solo activación/fuerza.
update public.exercises
set categoria_canonica = 'hombros-escapulas'
where id in (
  -- principal entrenamiento (11)
  'HE-ACTHANG', 'HE-CUFF10', 'HE-EXTROT',
  'HE-HANGSHRUG', 'HE-IYTW', 'HE-SCAP-PU', 'HE-SCAPTION',
  'HE-SHRUGACT', 'HE-SKINCAT', 'HE-WTOI', 'HE-YTWL',
  -- principal prevencion (3)
  'HE-CUBAN', 'HE-SHRUG-LEAN', 'HE-SCORPION',
  -- calentamiento entrenamiento (2)
  'HE-FLOSS', 'HE-HALO'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Momento=calentamiento (2).
update public.exercises
set momento = 'calentamiento'
where id in ('HE-FLOSS', 'HE-HALO')
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Proposito=prevencion (3).
update public.exercises
set proposito = 'prevencion'
where id in ('HE-CUBAN', 'HE-SHRUG-LEAN', 'HE-SCORPION')
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 2d · munecas-antebrazos (10 filas) ----
--
-- MO-010 se incluye acá (activación intrínseca de mano pre-hangboard),
-- categoría origen "Movilidad" pero función es prehab dedos.
update public.exercises
set categoria_canonica = 'munecas-antebrazos'
where id in (
  -- principal entrenamiento (1)
  'MU-BAT',
  -- calentamiento entrenamiento (2)
  'MU-CIRCLES', 'MU-WRISTROT',
  -- calentamiento prevencion (1)
  'MO-010',
  -- principal prevencion (2)
  'PR-PRO-001', 'RE-RWPU',
  -- enfriamiento entrenamiento (2)
  'CD-004', 'CD-005',
  -- enfriamiento prevencion (1)
  'RE-003',
  -- principal rehab (1)
  'RH-003'
)
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- Momento=calentamiento (3).
update public.exercises
set momento = 'calentamiento'
where id in ('MU-CIRCLES', 'MU-WRISTROT', 'MO-010')
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Momento=enfriamiento (3).
update public.exercises
set momento = 'enfriamiento'
where id in ('CD-004', 'CD-005', 'RE-003')
and tipo_registro = 'ejercicio'
and momento = 'principal';

-- Proposito=prevencion (4).
update public.exercises
set proposito = 'prevencion'
where id in ('MO-010', 'PR-PRO-001', 'RE-RWPU', 'RE-003')
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- Proposito=rehab (1).
update public.exercises
set proposito = 'rehab'
where id = 'RH-003'
and tipo_registro = 'ejercicio'
and proposito = 'entrenamiento';

-- ---- 2e · piel (2 filas) ----
update public.exercises
set categoria_canonica = 'piel'
where id in ('TA-HYGIENE', 'TA-SKIN')
and tipo_registro = 'ejercicio'
and categoria_canonica is null;

-- ---- 2f · Reclasificar 4 filas a concepto + tags apropiados ----
--
-- Todas son contenido no-ejecutable con dosis (mismo patrón que las 21 de
-- 0018 + DP-P001 de 0019). Cada una con un tag distinto que traza su
-- función:
--   - PR-005: 'conversacional' (respiración, invocable desde chat)
--   - RE-006, MO-P002: 'programa-bloque' (protocolos N semanas)
--   - NE-PR-003: 'nutricion' (contenido nutricional)

-- Cambio tipo_registro a concepto.
update public.exercises
set tipo_registro = 'concepto'
where id in ('PR-005', 'RE-006', 'MO-P002', 'NE-PR-003')
and tipo_registro = 'ejercicio';

-- Tag conversacional (PR-005). Idempotente por not any(tags).
update public.exercises
set tags = tags || array['conversacional']
where id = 'PR-005'
and tipo_registro = 'concepto'
and not ('conversacional' = any(tags));

-- Tag programa-bloque (RE-006, MO-P002). Nuevo tag introducido acá para
-- marcar rows que son unidades de mesociclo, no ejercicios de sesión.
-- Comparte semántica con el radar Paso 5 (HB-P001..P004).
update public.exercises
set tags = tags || array['programa-bloque']
where id in ('RE-006', 'MO-P002')
and tipo_registro = 'concepto'
and not ('programa-bloque' = any(tags));

-- Tag nutricion (NE-PR-003). Nuevo tag para contenido de nutrición.
update public.exercises
set tags = tags || array['nutricion']
where id = 'NE-PR-003'
and tipo_registro = 'concepto'
and not ('nutricion' = any(tags));

-- Nulear canónicas de los 4 reclasificados (consistency con 0016/0018/0019).
update public.exercises
set nivel_canonico = null,
    categoria_canonica = null,
    proposito = null,
    momento = null
where id in ('PR-005', 'RE-006', 'MO-P002', 'NE-PR-003')
and tipo_registro = 'concepto'
and (nivel_canonico is not null
  or categoria_canonica is not null
  or proposito is not null
  or momento is not null);

-- ---- Rows que quedan intactos (20 filas para tandas futuras) ----
--
-- Estos siguen con tipo_registro='ejercicio', categoria_canonica=NULL y
-- defaults de 0017 (proposito='entrenamiento', momento='principal'). Se
-- asignan en sus tandas respectivas o en Paso 5 (protocolos de bloque):
--
--   - CR-003 (Escalada indoor top-rope progresiva) → tanda tecnica
--   - MU-TURKISH (Turkish Get-Up) → tanda core-2 (cuerpo entero, borderline)
--   - CAL-001 (Push-ups calentamiento) → tanda fuerza-traccion (bajo volumen)
--   - CAL-002 (Saltos calentamiento) → tanda potencia (bajo volumen)
--   - MO-ONESIZE (One Size Fits All) → tanda tecnica (drill escalada)
--   - RH-P002 (Carga progresiva hangboard rehab) → tanda fuerza-dedos revisión
--   - HB-DENS, HB-ISO-RECOV, HB-PROT, HB-REHAB-A2A4, PR-003, RH-001, RH-004,
--     RH-005, RH-P001 (9 rehab/prevención dedos) → tanda fuerza-dedos revisión
--   - TC-FOFF (Foot-off Bouldering rehab) → tanda boulder
--   - CAL-RAMP, CAL-WUP, CR-004, RE-001 (4 protocolos calentamiento/
--     enfriamiento de escalada) → tanda tecnica o Paso 5
