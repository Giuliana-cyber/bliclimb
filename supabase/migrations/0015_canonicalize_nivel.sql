-- ============================================================================
-- 0015 · Canonicalizar `nivel` (Paso 1 del workstream del catálogo · Fase 5)
--
-- Patrón: expand→migrate→contract. Esta migración es EXPAND — agrega la
-- columna `nivel_canonico`, backfill de las 482 rows, CHECK constraint.
-- NO toca la columna `nivel` original. La vieja se dropea en la migración
-- de contract al final del workstream (después de que TODO el código
-- lea `nivel_canonico`).
--
-- Mapping aprobado por Giuliana turno 2026-07-09. Detalles en docs/roadmap.md
-- Paso 1 (workstream del catálogo).
--
-- Idempotente: cada paso usa if not exists / if exists / where guards.
-- ============================================================================

-- ---- Paso 1a · Sacar FIL-004 del catálogo ----
--
-- FIL-004 ('Bloqueo crimp y hangboard en menores') es una REGLA de gating
-- colada como fila del catálogo, no un ejercicio. Evidencia:
--   Tipo = 'Filtro / etiqueta'
--   Categoría = 'Filtros de gating'
--   tipo_registro = 'regla'
--   Series, Reps, Tiempo, TUT, Descanso, Intensidad, Frecuencia,
--     Progresión, Regresión = N/A (todos los campos de ejecución vacíos)
--   Objetivo dice 'Bloquear ejercicios...' (habla de bloquear, no ejecutar)
--
-- La regla ya vive en código en lib/brain/rules/section-01-profile-filters.ts
-- (§1.1). El row estaba duplicando su lógica en la tabla. La vista
-- exercises_eligible ya la excluye por tipo_registro, pero se saca de la
-- tabla base para no dejar ruido.
delete from public.exercises where id = 'FIL-004';

-- ---- Paso 1b · Agregar columna nivel_canonico ----
alter table public.exercises
  add column if not exists nivel_canonico text;

-- ---- Paso 1c · Backfill via CASE — SOLO ejercicios ----
--
-- 34 valores distintos de nivel → 6 buckets. Ver docs/roadmap.md para
-- razonamiento por bucket.
--
-- Guard `tipo_registro = 'ejercicio'`: los ~169 rows non-ejercicio
-- (test, regla, concepto, nota) quedan con `nivel_canonico = NULL`.
-- Se auditan en Paso 4 del workstream — por ahora los sacamos del
-- scope de nivel para no clasificar reglas/notas como principiantes.
-- La CHECK constraint permite NULL (ver Paso 1d).
--
-- Esta guard fue agregada 2026-07-09 tras descubrir que 5 rows con
-- tag `menor` mal aplicado eran todas non-ejercicio (DP-R005, DP-S002,
-- EV-RH-003, HB-F006, HB-S006). La versión anterior mapeaba también
-- non-ejercicio; se corrigió acá y en la migración 0016 para la base
-- ya aplicada.
update public.exercises set nivel_canonico = case
  -- ---- principiante (59 rows) ----
  when nivel = 'Principiante' then 'principiante'
  when nivel = 'Principiante / menos de 2 años de práctica sistemática' then 'principiante'
  when nivel = 'Principiante supervisado / salud general' then 'principiante'
  when nivel = 'Principiante / dolor / historial de lesión' then 'principiante'
  when nivel = 'Menor de edad' then 'principiante'
  when nivel = 'Menores' then 'principiante'
  when nivel = 'Menor de 16 o en estirón adolescente' then 'principiante'
  when nivel = 'Jóvenes / menores' then 'principiante'
  -- ---- principiante-intermedio (22 rows) ----
  when nivel = 'Principiante / Intermedio' then 'principiante-intermedio'
  when nivel = 'Principiante-Intermedio' then 'principiante-intermedio'
  when nivel = 'Principiante / Intermedio bajo' then 'principiante-intermedio'
  when nivel = 'Principiante / intermedio bajo / dolor' then 'principiante-intermedio'
  -- ---- intermedio (90 rows) ----
  when nivel = 'Intermedio' then 'intermedio'
  -- ---- intermedio-avanzado (49 rows) ----
  when nivel = 'Intermedio / Avanzado' then 'intermedio-avanzado'
  when nivel = 'Intermedio a Avanzado' then 'intermedio-avanzado'
  when nivel = 'Intermedio-avanzado' then 'intermedio-avanzado'
  when nivel = 'Intermedio-avanzado / avanzado' then 'intermedio-avanzado'
  when nivel = 'Intermedio en adelante' then 'intermedio-avanzado'
  -- ---- avanzado (120 rows) ----
  when nivel = 'Avanzado' then 'avanzado'
  when nivel = 'Avanzado / Elite' then 'avanzado'
  when nivel = 'Avanzado / competición' then 'avanzado'
  when nivel = 'Avanzado / competitivo' then 'avanzado'
  when nivel = 'Avanzado / élite' then 'avanzado'
  when nivel = 'Avanzado / Elite en el estudio' then 'avanzado'
  when nivel = 'Avanzado / investigación' then 'avanzado'
  when nivel = 'Intermedio a Elite' then 'avanzado'
  when nivel = 'Intermedio a élite' then 'avanzado'
  -- ---- todos (142 rows) ----
  -- Incluye 'Rehab' → todos (aprobado turno 2026-07-09: rehab no es nivel
  -- principiante, es cualquiera con lesión; el filtro de lesión decide).
  when nivel = 'Todos' then 'todos'
  when nivel = 'General' then 'todos'
  when nivel = 'Principiante / Intermedio / Avanzado' then 'todos'
  when nivel = 'No especificado en la fuente' then 'todos'
  when nivel = 'Requiere validación profesional' then 'todos'
  when nivel = 'Rehab' then 'todos'
  when nivel = '' or nivel is null then 'todos'
end
where nivel_canonico is null
  and tipo_registro = 'ejercicio';

-- ---- Paso 1d · CHECK constraint ----
--
-- Idempotencia: drop → add.
-- Permitimos NULL para que el seeder (que aún no llena nivel_canonico) no
-- rompa al insertar filas nuevas. En una migración futura, cuando el seeder
-- esté actualizado, se pasa a NOT NULL.
alter table public.exercises
  drop constraint if exists exercises_nivel_canonico_check;
alter table public.exercises
  add constraint exercises_nivel_canonico_check
  check (nivel_canonico is null or nivel_canonico in (
    'principiante',
    'principiante-intermedio',
    'intermedio',
    'intermedio-avanzado',
    'avanzado',
    'todos'
  ));

-- ---- Paso 1e · Tags de trazabilidad ----
--
-- 'menor' para los 5 rows con nivel referente a menores. La decisión de
-- producto sobre si BilClimb atiende a menores queda pendiente aparte;
-- este tag traza los rows para retomarla sin volver a buscarlos.
update public.exercises
set tags = tags || array['menor']
where nivel in (
  'Menor de edad',
  'Menores',
  'Menor de 16 o en estirón adolescente',
  'Jóvenes / menores'
)
and tipo_registro = 'ejercicio'
and not ('menor' = any(tags));

-- 'rehab' para HB-REHAB-A2A4 (protocolo rehab polea A2/A4 fase inicial).
-- El row es un ejercicio real de rehab, no una regla — se conserva.
update public.exercises
set tags = tags || array['rehab']
where nivel = 'Rehab'
and tipo_registro = 'ejercicio'
and not ('rehab' = any(tags));

-- ---- Paso 1f · Índice para filtros futuros ----
create index if not exists idx_exercises_nivel_canonico
  on public.exercises (nivel_canonico);

-- ---- NO drop de `nivel` original ----
-- Patrón expand→migrate→contract. `nivel` sigue viva por compat mientras el
-- código migra a leer `nivel_canonico`. Se dropea en la migración de
-- contract al final del workstream del catálogo (Paso 8).
