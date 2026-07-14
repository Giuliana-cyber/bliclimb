-- ============================================================================
-- 0028 · Paso 5 del workstream del catálogo · columna stimulus_derivado
--
-- Agrega la columna `stimulus_derivado text` a `public.exercises`, backfill
-- determinístico desde (categoria_canonica, proposito) según la tabla de
-- mapeo aprobada, e índice para queries del matcher.
--
-- Uso: el matcher (resolveToCanonical, próxima entrega) lo consume como
-- criterio de ranking dentro del pool filtrado. Se alinea con
-- `StimulusCategorySchema` de `lib/ai/fast-plan-schema.ts:37-49` para que
-- Bill (LLM) emite el mismo vocabulario que el catálogo tiene backfilled.
--
-- Mapeo (aprobado por Giuliana 2026-07-13):
--
--   categoria_canonica          proposito                    stimulus_derivado
--   ─────────────────────────── ───────────────────────────  ─────────────────
--   fuerza-dedos                entrenamiento                strength
--   fuerza-dedos                rehab / prevencion           mobility
--   fuerza-traccion             entrenamiento                strength
--   fuerza-empuje               entrenamiento                strength
--   fuerza-tren-inferior        entrenamiento                strength
--   potencia                    entrenamiento                power
--   campus                      entrenamiento                power
--   resistencia-aerobica        entrenamiento                aerobic-base
--   resistencia-anaerobica      entrenamiento                power-endurance
--   tecnica                     entrenamiento                skill
--   movilidad                   entrenamiento                mobility
--   core                        entrenamiento                strength
--   hombros-escapulas           entrenamiento / prevencion   mobility
--   munecas-antebrazos          entrenamiento / prevencion   mobility
--   piel                        entrenamiento                mobility
--   boulder                     entrenamiento                skill
--
-- Limitación conocida (deuda menor documentada):
--   boulder → skill como default. Rows como BO-001 "Boulder de fuerza
--   máxima (Método 1 Michailov)" son semánticamente power, no skill.
--   El matcher aún filtra correctamente por perfil pero el ranking por
--   stimulus puede ser sub-óptimo. Refinar por-row en Paso 6 o posterior
--   si el ranking muestra mismatches.
--
-- Rows sin categoria_canonica (tipo_registro != 'ejercicio', o rehab
-- reclasificados con canónicas nulas) obtienen stimulus_derivado = NULL.
-- El matcher no considera esos rows en su pool.
--
-- Idempotencia: `add column if not exists`, `create index if not exists`,
-- backfill con `where stimulus_derivado is null`. Guardias antes y después.
-- ============================================================================

begin;

-- ---- Guardia previa · confirmar estado post-0027 ----
do $$
declare
  cnt_total int;
  cnt_ejercicios int;
  has_column boolean;
begin
  -- 1) Total tabla == 462.
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0028 guardia previa · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  -- 2) tipo_registro='ejercicio' == 265.
  select count(*) into cnt_ejercicios
    from public.exercises where tipo_registro = 'ejercicio';
  if cnt_ejercicios <> 265 then
    raise exception '0028 guardia previa · esperaba 265 ejercicios, hay %', cnt_ejercicios;
  end if;

  -- 3) La columna aún no existe (o si existe, es de un run previo con guard).
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'stimulus_derivado'
  ) into has_column;
  if has_column then
    raise notice '0028 guardia previa · columna stimulus_derivado YA existe (idempotente OK)';
  end if;

  raise notice '0028 guardia previa · OK · total=462, ejercicios=265';
end $$;

-- ---- Paso 2a · Agregar columna stimulus_derivado ----
alter table public.exercises
  add column if not exists stimulus_derivado text;

-- ---- Paso 2b · CHECK constraint · valores canónicos del vocabulario ----
-- Alineado con StimulusCategorySchema en lib/ai/fast-plan-schema.ts:37-49.
-- Se acepta NULL para rows fuera del scope del matcher (no-ejercicios y
-- rehab/prevención sin canónicas asignadas).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exercises_stimulus_derivado_check'
  ) then
    alter table public.exercises
      add constraint exercises_stimulus_derivado_check
      check (
        stimulus_derivado is null
        or stimulus_derivado in (
          'warmup',
          'skill',
          'strength',
          'power',
          'power-endurance',
          'aerobic-base',
          'mobility',
          'mental',
          'cooldown',
          'rest'
        )
      );
  end if;
end $$;

-- ---- Paso 2c · Backfill del stimulus_derivado ----
--
-- CASE determinístico sobre (categoria_canonica, proposito). Guard
-- `stimulus_derivado is null` para idempotencia — si se corre dos veces,
-- la segunda no toca nada.
--
-- Guard `tipo_registro = 'ejercicio'`: rehab/prevención de fuerza-dedos
-- tienen categoria_canonica='fuerza-dedos' pero proposito!='entrenamiento',
-- van al bucket mobility. Los non-ejercicio (test/regla/concepto/nota) NO
-- tienen categoria_canonica (guard de 0017-0022 los excluyó); su
-- stimulus_derivado queda NULL — correcto porque no están en el pool del
-- matcher.
update public.exercises
set stimulus_derivado = case
  -- Fuerza pura (categoria + entrenamiento) → strength
  when categoria_canonica = 'fuerza-dedos' and proposito = 'entrenamiento' then 'strength'
  when categoria_canonica = 'fuerza-traccion' and proposito = 'entrenamiento' then 'strength'
  when categoria_canonica = 'fuerza-empuje' and proposito = 'entrenamiento' then 'strength'
  when categoria_canonica = 'fuerza-tren-inferior' and proposito = 'entrenamiento' then 'strength'
  when categoria_canonica = 'core' and proposito = 'entrenamiento' then 'strength'

  -- Fuerza-dedos con propósito distinto (rehab/prevencion) → mobility
  when categoria_canonica = 'fuerza-dedos' and proposito in ('rehab','prevencion') then 'mobility'

  -- Potencia y campus → power
  when categoria_canonica = 'potencia' and proposito = 'entrenamiento' then 'power'
  when categoria_canonica = 'campus' and proposito = 'entrenamiento' then 'power'

  -- Resistencia → aerobic-base / power-endurance
  when categoria_canonica = 'resistencia-aerobica' and proposito = 'entrenamiento' then 'aerobic-base'
  when categoria_canonica = 'resistencia-anaerobica' and proposito = 'entrenamiento' then 'power-endurance'

  -- Skill / técnica
  when categoria_canonica = 'tecnica' and proposito = 'entrenamiento' then 'skill'
  when categoria_canonica = 'boulder' and proposito = 'entrenamiento' then 'skill'

  -- Movilidad y afines → mobility
  when categoria_canonica = 'movilidad' then 'mobility'
  when categoria_canonica = 'hombros-escapulas' then 'mobility'
  when categoria_canonica = 'munecas-antebrazos' then 'mobility'
  when categoria_canonica = 'piel' then 'mobility'

  -- Cualquier otra combinación (proposito='rehab' en fuerza-traccion, etc)
  -- → mobility como default seguro. No debería aparecer con las 15 canónicas
  -- actuales pero deja el fallback explícito.
  else 'mobility'
end
where tipo_registro = 'ejercicio'
  and categoria_canonica is not null
  and stimulus_derivado is null;

-- ---- Paso 2d · Índice B-tree para queries del matcher ----
--
-- El matcher filtra por (categoria_canonica, nivel_canonico, proposito,
-- momento, stimulus_derivado) principalmente. Índice compuesto conservador
-- que sirve varios filtros a la vez.
create index if not exists idx_exercises_matcher_pool
  on public.exercises (
    categoria_canonica,
    nivel_canonico,
    proposito,
    momento,
    stimulus_derivado
  )
  where tipo_registro = 'ejercicio' and categoria_canonica is not null;

-- ---- Guardia posterior · verificación del backfill ----
do $$
declare
  cnt_ejercicios int;
  cnt_con_stimulus int;
  cnt_sin_stimulus int;
  cnt_strength int;
  cnt_power int;
  cnt_aerobic int;
  cnt_pe int;
  cnt_skill int;
  cnt_mobility int;
  cnt_null int;
begin
  select count(*) into cnt_ejercicios
    from public.exercises where tipo_registro = 'ejercicio';

  select count(*) into cnt_con_stimulus
    from public.exercises
   where tipo_registro = 'ejercicio' and stimulus_derivado is not null;

  select count(*) into cnt_sin_stimulus
    from public.exercises
   where tipo_registro = 'ejercicio' and stimulus_derivado is null;

  -- Los ejercicios con categoria_canonica='no_es_null' + stimulus_derivado='no_es_null'
  -- deberían coincidir con los que tienen categoria_canonica asignada.
  --
  -- Post-0022: 264 ejercicios canonicalizados en las 15 categorías. Post-0026:
  -- +1 (FT-006) → 265 ejercicios. TODOS con categoria_canonica poblada.
  -- Todos deberían recibir stimulus_derivado.
  if cnt_con_stimulus <> 265 then
    raise exception '0028 guardia posterior · esperaba 265 ejercicios con stimulus_derivado, hay %', cnt_con_stimulus;
  end if;

  -- Los con NULL deben ser 0 (todos los ejercicios canonicalizados tienen
  -- categoria_canonica no nula).
  if cnt_sin_stimulus <> 0 then
    raise exception '0028 guardia posterior · esperaba 0 ejercicios sin stimulus_derivado, hay % (posible drift entre 0022 y 0028)', cnt_sin_stimulus;
  end if;

  -- Distribución por bucket (informativa, no bloqueante).
  select count(*) into cnt_strength
    from public.exercises where stimulus_derivado = 'strength';
  select count(*) into cnt_power
    from public.exercises where stimulus_derivado = 'power';
  select count(*) into cnt_aerobic
    from public.exercises where stimulus_derivado = 'aerobic-base';
  select count(*) into cnt_pe
    from public.exercises where stimulus_derivado = 'power-endurance';
  select count(*) into cnt_skill
    from public.exercises where stimulus_derivado = 'skill';
  select count(*) into cnt_mobility
    from public.exercises where stimulus_derivado = 'mobility';
  select count(*) into cnt_null
    from public.exercises where stimulus_derivado is null;

  raise notice '0028 guardia posterior · OK · 265 ejercicios con stimulus_derivado. Distribución: strength=%, power=%, aerobic-base=%, power-endurance=%, skill=%, mobility=%, NULL (non-ejercicio)=%', cnt_strength, cnt_power, cnt_aerobic, cnt_pe, cnt_skill, cnt_mobility, cnt_null;
end $$;

commit;
