-- ============================================================================
-- 0017 · Paso 2 · Canonicalizar categoría + propósito + momento (workstream Fase 5)
--
-- Patrón: expand→migrate→contract. Esta migración es EXPAND — agrega
-- tres columnas ortogonales para las 3 dimensiones aprobadas turno
-- 2026-07-10:
--
--   categoria_canonica  — estímulo puro (13 buckets)
--   proposito           — para qué se hace (entrenamiento/prevencion/rehab)
--   momento             — cuándo va en la sesión (calentamiento/principal/enfriamiento)
--
-- NO toca la columna `categoria` original. Se dropea en la migración de
-- contract al cerrar el workstream (Paso 8).
--
-- Vocabulario aprobado en docs/roadmap.md Paso 2. Justificación de la
-- separación en 3 columnas: la categoria plana con "prevencion-hombros"
-- mezclaba objetivo con zona con propósito; el split ortogonal deja al
-- motor filtrar por perfil sin construir buckets compuestos.
--
-- Backfill en esta migración:
--   - proposito = 'entrenamiento'  para tipo_registro='ejercicio' (default)
--   - momento   = 'principal'      para tipo_registro='ejercicio' (default)
--   - categoria_canonica NO se rellena acá — se cura row-by-row en tandas
--     posteriores agrupadas por categoría de origen (fuerza-dedos primero,
--     37 rows). Ver docs/roadmap.md Paso 2 para el flujo de curación.
--
-- Todos los UPDATE tienen guard `AND tipo_registro = 'ejercicio'` para que
-- los 168 non-ejercicio queden con NULL en las 3 columnas (mismo patrón
-- que 0015/0016 con nivel_canonico).
--
-- Idempotente: if not exists / drop constraint if exists / where guards.
-- ============================================================================

-- ---- Paso 2a · Agregar columna categoria_canonica ----
alter table public.exercises
  add column if not exists categoria_canonica text;

-- CHECK: NULL permitido (mientras se cura tanda por tanda) o uno de los 13.
alter table public.exercises
  drop constraint if exists exercises_categoria_canonica_check;
alter table public.exercises
  add constraint exercises_categoria_canonica_check
  check (categoria_canonica is null or categoria_canonica in (
    'fuerza-dedos',
    'fuerza-traccion',
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

-- ---- Paso 2b · Agregar columna proposito ----
alter table public.exercises
  add column if not exists proposito text;

alter table public.exercises
  drop constraint if exists exercises_proposito_check;
alter table public.exercises
  add constraint exercises_proposito_check
  check (proposito is null or proposito in (
    'entrenamiento',
    'prevencion',
    'rehab'
  ));

-- Backfill: los ejercicios reciben default 'entrenamiento'. Las tandas
-- de curación ajustan solo los ~15-20 rows que son 'prevencion' o 'rehab'.
-- WHERE proposito IS NULL para idempotencia.
update public.exercises
set proposito = 'entrenamiento'
where tipo_registro = 'ejercicio'
  and proposito is null;

-- ---- Paso 2c · Agregar columna momento ----
alter table public.exercises
  add column if not exists momento text;

alter table public.exercises
  drop constraint if exists exercises_momento_check;
alter table public.exercises
  add constraint exercises_momento_check
  check (momento is null or momento in (
    'calentamiento',
    'principal',
    'enfriamiento'
  ));

-- Backfill: los ejercicios reciben default 'principal'. Las tandas ajustan
-- solo los ~25 rows explícitos de calentamiento/enfriamiento.
update public.exercises
set momento = 'principal'
where tipo_registro = 'ejercicio'
  and momento is null;

-- ---- Paso 2d · Índices para filtros del motor ----
--
-- El motor va a filtrar por combinaciones (ej: categoria='fuerza-dedos'
-- AND proposito IN ('entrenamiento', 'prevencion') AND momento='principal'
-- para user con lesión activa). 3 índices btree individuales cubren los
-- casos típicos; postgres puede combinarlos con bitmap scan si hace falta.
create index if not exists idx_exercises_categoria_canonica
  on public.exercises (categoria_canonica);
create index if not exists idx_exercises_proposito
  on public.exercises (proposito);
create index if not exists idx_exercises_momento
  on public.exercises (momento);

-- ---- NO drop de `categoria` original ----
-- Patrón expand→migrate→contract. `categoria` sigue viva por compat
-- mientras el código migra a leer `categoria_canonica`. Se dropea en la
-- migración de contract al final del workstream (Paso 8).
