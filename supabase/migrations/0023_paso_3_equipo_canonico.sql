-- ============================================================================
-- 0023 · Paso 3 · Canonicalizar `equipo` a los 9 tokens del onboarding
--
-- Cierra el Paso 3 del workstream del catálogo (Fase 5). Mapea los 264
-- ejercicios canonicalizados en Paso 2 a subsets de los 9 tokens que el
-- onboarding captura como `equipment: string[]`:
--   gym, hangboard, campus, weights, rock, home, bands, pullup_bar, trx
--
-- Aprobación Giuliana turno 2026-07-11.
--
-- Decisiones aplicadas:
--
--   1. Convención "opcional" = OPCIÓN A: equipment marcado como opcional
--      en el equipo original NO se incluye en el token canónico. Solo
--      lo REQUERIDO. Filtro del motor: si user tiene lo requerido, puede
--      hacer el ejercicio; el opcional es plus.
--
--   2. Regla "A o B" (alternativas dentro del mismo grupo funcional): gana
--      el token más accesible para principiante. Aplicada SOLO al grupo
--      anchor (pullup_bar > hangboard > campus). NO aplicada cross-dimensión
--      (home/gym/rock son ortogonales — un user con solo rock necesita el
--      token rock para que el filtro le llegue).
--      Orden de accesibilidad (full list): home > pullup_bar > gym > bands
--      > hangboard > weights > campus > trx > rock.
--
--   3. Overrides explícitos aprobados por Giuliana:
--      - HE-ISO-DAILY: "Peso ligero o resistencia elástica" → [bands, weights]
--        (mi heurística no matcheaba, corrección semántica)
--      - BT-P003: "Home wall..." → [gym, home] (accesible tanto al muro
--        casero como al gym)
--      - CAL-P02, DIS-005: "Variable" → [gym, home] (genérico, cualquier setup)
--      - HE-HANGSHRUG, HE-SHRUGACT: "Barra o jugs de hangboard" → [pullup_bar]
--        (los "jugs" son presas del hangboard, no del muro)
--
--   4. Coherencia obligatoria verificada: 0 incoherencias detectadas
--      pre-aplicación (chequeo automático post-mapping).
--
-- Impacto:
--   - Agrega columna `equipo_canonico text[]` con CHECK que valida subset
--     de los 9 tokens.
--   - Backfill de los 264 ejercicios con guard `tipo_registro='ejercicio'`.
--     Los 218 non-ejercicio quedan con NULL (por diseño).
--   - Distribución final:
--       gym: 125 rows
--       home: 67 rows
--       hangboard: 45 rows
--       weights: 34 rows
--       pullup_bar: 23 rows
--       rock: 16 rows
--       campus: 14 rows
--       bands: 9 rows
--       trx: 3 rows
--     (Un ejercicio puede tener múltiples tokens; totales suman >264 por eso.)
--   - Índice GIN sobre equipo_canonico para queries del motor
--     (WHERE 'campus' = ANY(equipo_canonico) etc.).
--
-- NO toca la columna `equipo` original. Se dropea en la migración de contract
-- al cerrar el workstream del catálogo (Paso 8).
--
-- Idempotente. Reversible sin tocar 0015-0022.
-- ============================================================================

-- ---- Paso 3a · Agregar columna equipo_canonico ----
alter table public.exercises
  add column if not exists equipo_canonico text[];

-- CHECK: NULL permitido (non-ejercicio), o array vacío, o subset de los 9 tokens.
-- Usar <@ (contained by) para verificar que TODOS los elementos del array
-- estén en el vocabulario canónico.
alter table public.exercises
  drop constraint if exists exercises_equipo_canonico_check;
alter table public.exercises
  add constraint exercises_equipo_canonico_check
  check (
    equipo_canonico is null or
    equipo_canonico <@ array[
      'gym', 'hangboard', 'campus', 'weights', 'rock',
      'home', 'bands', 'pullup_bar', 'trx'
    ]::text[]
  );

-- ---- Paso 3b · Backfill por grupo (25 grupos, 264 rows) ----
--
-- Cada UPDATE agrupa rows por combinación de tokens. Guards:
--   AND tipo_registro = 'ejercicio' (mismo patrón que 0015-0022)
--   AND equipo_canonico is null    (idempotencia)

-- [gym] · 83 rows (mayoritariamente boulder/muro + técnicas + potencia + PE)
update public.exercises set equipo_canonico = array['gym']
where id in (
  'APM-003','APM-006','APM-009','APM-010','APM-011',
  'BO-001','BO-002','BO-003','BO-004',
  'BT-001','BT-002','BT-003','BT-P001','BT-P002','BT-PAUSE',
  'CAL-005','CAL-006','CAL-008','CAL-RAMP','CAL-WUP',
  'CO-002','CO-003','CO-005','CO-006','CO-40','CO-P001','CO-P002','CO-P003',
  'CR-003','CR-004',
  'DIS-001','DIS-002','DIS-003','DIS-004','DIS-006',
  'FL-003','FM-012','FT-008','MO-ONESIZE',
  'PE-1ON1','PE-45','PE-4X4PW','PE-6IN6','PE-PAUSE','PE-TRIPLE',
  'PO-002','PO-003','PO-004','PO-007','PO-CAMPUS-WALL','PO-CLAP','PO-DEADSTOP',
  'PO-HIPDRIVE','PO-INWARDBOUNCE','PO-PADDLE','POP-002','POP-003',
  'RE-001','RH-005',
  'TC-001','TC-1ARM','TC-1FOOT','TC-ANK','TC-CJ','TC-COUNTER','TC-DS',
  'TC-EXEC','TC-EXPLORE','TC-FOFF','TC-GRIPISO','TC-HEELHOOK','TC-HOV',
  'TC-OFD','TC-OSFA','TC-PIVOT','TC-QUIET','TC-SLO','TC-SOSO','TC-SQVSHIP',
  'TC-STK','TC-TOEHOOK','TC-UPFALL','TC-WCRAWL'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [home] · 53 rows (movilidad, flex, core, munecas, piel)
update public.exercises set equipo_canonico = array['home']
where id in (
  'CAL-001','CAL-002','CAL-003','CAL-004','CAL-007',
  'CD-004','CD-005','CD-006','CD-007',
  'CR-001','CR-002','CR-COPEN','CR-HOLLOW','CR-PIKE','CR-SUPERMAN',
  'FL-001','FL-002','FL-006','FL-008','FL-010','FL-011','FL-012',
  'FL-014','FL-015','FL-016','FL-017','FL-018','FL-020','FL-COUCH',
  'FM-004','FM-005',
  'HE-IYTW','HE-SCAP-PU','HE-WTOI',
  'MO-001','MO-002','MO-009','MO-010','MO-COSSACK','MO-ELEPHANT',
  'MO-PNFPANCAKE','MO-ROCKOVER',
  'MU-CIRCLES','MU-KNUCKLE',
  'PR-GLUTE',
  'RE-002','RE-RWPU',
  'RH-001','RH-003','RH-004','RH-NRVFLOSS',
  'TA-HYGIENE','TA-SKIN'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [hangboard] · 31 rows (fuerza-dedos puros)
update public.exercises set equipo_canonico = array['hangboard']
where id in (
  'AG-PINCHBLOCK',
  'DP-001','DP-004','DP-005','DP-P003','DP-P004',
  'FD-001','FD-003','FD-005','FD-011','FT-007',
  'HB-001','HB-003','HB-004','HB-005','HB-1ARM','HB-73','HB-753',
  'HB-ABRA','HB-DENS','HB-ISO-RECOV','HB-MIXED',
  'HB-P001','HB-P002','HB-P003','HB-P006','HB-RECRUIT','HB-REPEAT-LOW',
  'PO-005','PR-003','RH-P002'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [gym, rock] · 16 rows (técnica y aeróbica que se puede hacer en muro o roca)
update public.exercises set equipo_canonico = array['gym','rock']
where id in (
  'APM-001','APM-002','APM-004','APM-007','APM-013',
  'CO-001','CO-004','CO-P004','CO-P005',
  'MU-BAT',
  'TC-002','TC-003','TC-004','TC-006','TC-007','TC-008'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [weights] · 15 rows (fuerza con pesas / mancuernas / kettlebell)
update public.exercises set equipo_canonico = array['weights']
where id in (
  'FM-006','FM-007','FM-008','FM-009','FM-STEPUP',
  'HE-CUFF10','HE-EXTROT','HE-HALO','HE-SCAPTION','HE-SHRUG-LEAN',
  'MO-INT-HIP','MU-TURKISH','MU-WRISTROT','PR-PRO-001','RE-003'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [campus, gym] · 14 rows (todos los CB-* + FD-012)
update public.exercises set equipo_canonico = array['campus','gym']
where id in (
  'CB-001','CB-002','CB-003','CB-004','CB-005',
  'CB-006','CB-007','CB-008','CB-009',
  'CB-P001','CB-P002','CB-P003','CB-P004','FD-012'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [pullup_bar] · 12 rows (dominadas, remo, lock-off, PO en barra)
update public.exercises set equipo_canonico = array['pullup_bar']
where id in (
  'CR-LEGRAISE','FM-013','FT-001','FT-1ARMNEG','FT-LADDERS',
  'FTP-001','FTP-002',
  'HE-ACTHANG','HE-HANGSHRUG','HE-SHRUGACT',
  'PO-POWERPU','PO-SPEEDPU'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [hangboard, weights] · 6 rows (hangboard con lastre)
update public.exercises set equipo_canonico = array['hangboard','weights']
where id in (
  'DP-003','DP-P002','FD-002','HB-002','HB-BLOCK','HB-FCURL'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [gym, home] · 6 rows (variables genéricos + BT-P003 home wall)
update public.exercises set equipo_canonico = array['gym','home']
where id in (
  'APM-008','BT-P003','CAL-P01','CAL-P02','DIS-005','RH-P001'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [pullup_bar, weights] · 6 rows (dominadas con lastre, deadlift)
update public.exercises set equipo_canonico = array['pullup_bar','weights']
where id in (
  'FM-002','FM-003','FM-DEADLIFT','FT-002','FT-ECCPU','HE-CUBAN'
) and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [hangboard, pullup_bar] · 2 rows
update public.exercises set equipo_canonico = array['hangboard','pullup_bar']
where id in ('FTP-005','HB-P004')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [bands, weights] · 2 rows (HE-ISO-DAILY override + RE-004)
update public.exercises set equipo_canonico = array['bands','weights']
where id in ('HE-ISO-DAILY','RE-004')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [gym, weights] · 2 rows
update public.exercises set equipo_canonico = array['gym','weights']
where id in ('FM-014','REP-001')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [bands, hangboard] · 2 rows (rehab/prehab de dedos con banda)
update public.exercises set equipo_canonico = array['bands','hangboard']
where id in ('HB-PROT','HB-REHAB-A2A4')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [bands, home] · 2 rows
update public.exercises set equipo_canonico = array['bands','home']
where id in ('CR-CHOP','HE-FLOSS')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [trx] · 2 rows (TRX puro / anillas)
update public.exercises set equipo_canonico = array['trx']
where id in ('FT-RINGDIP','HE-YTWL')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- [home, weights] · 2 rows
update public.exercises set equipo_canonico = array['home','weights']
where id in ('CR-WGHTPLK','FM-SPLIT')
and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- Grupos únicos (1 row cada uno) — 9 rows totales.
update public.exercises set equipo_canonico = array['bands','hangboard','home']
where id = 'DP-002' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['gym','hangboard','pullup_bar']
where id = 'DP-P005' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['gym','hangboard']
where id = 'HE-SCORPION' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['home','pullup_bar']
where id = 'FT-003' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['pullup_bar','trx']
where id = 'HE-SKINCAT' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['hangboard','home']
where id = 'HB-LOW' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['bands']
where id = 'CR-HARDSIT' and tipo_registro = 'ejercicio' and equipo_canonico is null;

update public.exercises set equipo_canonico = array['bands','home','weights']
where id = 'PR-IPP' and tipo_registro = 'ejercicio' and equipo_canonico is null;

-- ---- Paso 3c · Índice GIN para queries del motor ----
--
-- El motor filtra por `WHERE 'campus' = ANY(equipo_canonico)` o
-- `WHERE equipo_canonico && ARRAY[<9 tokens del perfil>]::text[]`.
-- Índice GIN sobre array text[] acelera ambos patrones.
create index if not exists idx_exercises_equipo_canonico_gin
  on public.exercises using gin (equipo_canonico);

-- ---- NO drop de `equipo` original ----
-- Patrón expand→migrate→contract. `equipo` sigue viva por compat mientras
-- el código migra a leer `equipo_canonico`. Se dropea en la migración de
-- contract al final del workstream (Paso 8).
