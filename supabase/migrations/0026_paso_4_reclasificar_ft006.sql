-- ============================================================================
-- 0026 · Cabo suelto del Paso 4 · reclasificación de FT-006
--
-- FT-006 "Bloqueo con una mano (one-arm lock-off)" tenía tipo_registro='regla'
-- en el CSV curado, pero al revisar la fila cruda todos los otros campos son
-- de EJERCICIO (Tipo='Ejercicio', Descripción con protocolo de ejecución,
-- Progresión + Regresión, Precauciones, Señales detener, Riesgo='Alto',
-- Equipo='Barra', Categoría='Fuerza de tracción'). La única señal de "regla"
-- era el campo tipo_registro, resultado de mis-tag durante la curación.
--
-- La Nota de la fila dice literal: "Referenciado por Doc 02 regla 2.4
-- (bloqueo unilateral)." — es DECIR referenciado POR §2.4, no ES §2.4.
-- §2.4 vive en Doc 02 y dice: "Condición: ejercicio FT-006 o equivalente.
-- Acción: desbloquear sólo si usuario completa ≥15 dominadas estrictas
-- por serie."
--
-- Grep en lib/brain/rules/ (2026-07-11) confirmó cero matches para FT-006,
-- "one-arm", "15 dominadas" como gating, y "§2.4" como número de regla.
-- Cierre honesto:
--   - FT-006 es el EJERCICIO → se reclasifica a tipo_registro='ejercicio'
--     y se canonicaliza con las 5 dimensiones (nivel, categoria, proposito,
--     momento, equipo).
--   - §2.4 es la REGLA → se registra como Deuda #12 en canonicalization-debt.md
--     y se agrega al checklist de aceptación del Paso 5.
--
-- Decisiones aprobadas por Giuliana (2026-07-11):
--   - categoria_canonica = 'fuerza-traccion' (categoría original)
--   - nivel_canonico     = 'avanzado' (Nivel raw='Avanzado' en CSV).
--                          CRÍTICO: mientras §2.4 no exista en código, este
--                          nivel es la ÚNICA barrera que impide que FT-006
--                          llegue a un principiante. No bajar a intermedio.
--   - proposito          = 'entrenamiento' (default de las tandas 0017-0022;
--                          no es rehab ni prevención)
--   - momento            = 'principal' (trabajo de fuerza)
--   - equipo_canonico    = array['pullup_bar'] (Equipo raw='Barra')
--   - tag                = 'riesgo-lesion:pullups-weighted' (tracción de
--                          altísima carga; encaja con FT-007, FT-1ARMNEG,
--                          Frenchies que ya llevan el mismo tag en 0025)
--
-- Deltas al conteo post-0025:
--   - tipo_registro='regla':          24 → 23 (FT-006 sale del pool)
--   - tipo_registro='ejercicio':     264 → 265 (FT-006 entra al pool)
--   - Total tabla:                    462 → 462 (sin cambio; solo reclasifica)
--   - Tag riesgo-lesion:pullups-weighted:  9 → 10
--   - Tag riesgo-lesion:hangboard-intense: 25 (sin cambio)
--   - Tag riesgo-lesion:hit:                1 (sin cambio)
--
-- Idempotente: cada UPDATE tiene guardias específicas de estado esperado.
-- Guardia previa verifica estado post-0025. Guardia posterior verifica
-- los 6 cambios aplicados.
-- ============================================================================

begin;

-- ---- Guardia previa · confirmar estado post-0025 ----
do $$
declare
  cnt_reglas int;
  cnt_ejercicios int;
  cnt_total int;
  ft006_tipo text;
  ft006_nivel text;
  ft006_cat text;
  ft006_prop text;
  ft006_mom text;
  ft006_eq text[];
  ft006_ya_taggeada int;
begin
  -- 1) tipo_registro='regla' == 24 (post-0025 sin cambio, post-0024 borró 20).
  select count(*) into cnt_reglas
    from public.exercises
   where tipo_registro = 'regla';
  if cnt_reglas <> 24 then
    raise exception '0026 guardia previa · esperaba 24 tipo_registro=regla, hay %', cnt_reglas;
  end if;

  -- 2) tipo_registro='ejercicio' == 264 (base post-0022 sin cambio).
  select count(*) into cnt_ejercicios
    from public.exercises
   where tipo_registro = 'ejercicio';
  if cnt_ejercicios <> 264 then
    raise exception '0026 guardia previa · esperaba 264 tipo_registro=ejercicio, hay %', cnt_ejercicios;
  end if;

  -- 3) Total tabla == 462.
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0026 guardia previa · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  -- 4) FT-006 existe con tipo_registro='regla' y todas las canónicas nulas.
  select tipo_registro, nivel_canonico, categoria_canonica, proposito, momento, equipo_canonico
    into ft006_tipo, ft006_nivel, ft006_cat, ft006_prop, ft006_mom, ft006_eq
    from public.exercises
   where id = 'FT-006';
  if ft006_tipo is null then
    raise exception '0026 guardia previa · FT-006 no existe en la tabla';
  end if;
  if ft006_tipo <> 'regla' then
    raise exception '0026 guardia previa · FT-006 tipo_registro esperado=regla, hay %', ft006_tipo;
  end if;
  if ft006_nivel is not null or ft006_cat is not null or ft006_prop is not null or ft006_mom is not null or ft006_eq is not null then
    raise exception '0026 guardia previa · FT-006 debía tener las 5 canónicas nulas (guard tipo_registro=ejercicio de 0015-0023); ya tiene nivel=%, cat=%, prop=%, mom=%, eq=%', ft006_nivel, ft006_cat, ft006_prop, ft006_mom, ft006_eq;
  end if;

  -- 5) FT-006 no tiene ya ningún tag riesgo-lesion:* aplicado.
  select count(*) into ft006_ya_taggeada
    from public.exercises
   where id = 'FT-006'
     and exists (
       select 1 from unnest(tags) as t
        where t like 'riesgo-lesion:%'
     );
  if ft006_ya_taggeada <> 0 then
    raise exception '0026 guardia previa · FT-006 ya tiene tag riesgo-lesion:*; abortando';
  end if;

  raise notice '0026 guardia previa · OK · reglas=24, ejercicios=264, total=462, FT-006 en estado esperado';
end $$;

-- ---- UPDATE único · reclasifica FT-006 a ejercicio + canonicaliza + taggea ----
--
-- Un solo UPDATE por atomicidad. La fila pasa de "regla mis-taggeada sin
-- canónicas" a "ejercicio canónicamente clasificado con riesgo taggeado" en
-- una sola escritura. Fallback: si la fila no matcheara la WHERE (por drift
-- entre esta corrida y la guardia previa), la guardia posterior lo atrapa.
update public.exercises
set tipo_registro     = 'ejercicio',
    categoria_canonica = 'fuerza-traccion',
    nivel_canonico     = 'avanzado',
    proposito          = 'entrenamiento',
    momento            = 'principal',
    equipo_canonico    = array['pullup_bar'],
    tags               = tags || array['riesgo-lesion:pullups-weighted']
where id = 'FT-006'
  and tipo_registro = 'regla'
  and nivel_canonico is null
  and categoria_canonica is null;

-- ---- Guardia posterior · confirmar los 6 cambios ----
do $$
declare
  cnt_reglas int;
  cnt_ejercicios int;
  cnt_total int;
  ft006_tipo text;
  ft006_nivel text;
  ft006_cat text;
  ft006_prop text;
  ft006_mom text;
  ft006_eq text[];
  ft006_tag_ok boolean;
  cnt_pull_w int;
  cnt_hb_int int;
  cnt_hit int;
begin
  -- 1) tipo_registro='regla' == 23 (24 − 1).
  select count(*) into cnt_reglas
    from public.exercises
   where tipo_registro = 'regla';
  if cnt_reglas <> 23 then
    raise exception '0026 guardia posterior · esperaba 23 tipo_registro=regla, hay %', cnt_reglas;
  end if;

  -- 2) tipo_registro='ejercicio' == 265 (264 + 1).
  select count(*) into cnt_ejercicios
    from public.exercises
   where tipo_registro = 'ejercicio';
  if cnt_ejercicios <> 265 then
    raise exception '0026 guardia posterior · esperaba 265 tipo_registro=ejercicio, hay %', cnt_ejercicios;
  end if;

  -- 3) Total tabla == 462 (sin cambio, es reclasificación).
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0026 guardia posterior · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  -- 4) FT-006 tiene los valores esperados en las 5 canónicas + tag.
  select tipo_registro, nivel_canonico, categoria_canonica, proposito, momento, equipo_canonico,
         'riesgo-lesion:pullups-weighted' = any(tags)
    into ft006_tipo, ft006_nivel, ft006_cat, ft006_prop, ft006_mom, ft006_eq, ft006_tag_ok
    from public.exercises
   where id = 'FT-006';
  if ft006_tipo <> 'ejercicio' then
    raise exception '0026 guardia posterior · FT-006 tipo_registro esperado=ejercicio, hay %', ft006_tipo;
  end if;
  if ft006_nivel <> 'avanzado' then
    raise exception '0026 guardia posterior · FT-006 nivel_canonico esperado=avanzado, hay %', ft006_nivel;
  end if;
  if ft006_cat <> 'fuerza-traccion' then
    raise exception '0026 guardia posterior · FT-006 categoria_canonica esperada=fuerza-traccion, hay %', ft006_cat;
  end if;
  if ft006_prop <> 'entrenamiento' then
    raise exception '0026 guardia posterior · FT-006 proposito esperado=entrenamiento, hay %', ft006_prop;
  end if;
  if ft006_mom <> 'principal' then
    raise exception '0026 guardia posterior · FT-006 momento esperado=principal, hay %', ft006_mom;
  end if;
  if ft006_eq is null or array_length(ft006_eq, 1) <> 1 or ft006_eq[1] <> 'pullup_bar' then
    raise exception '0026 guardia posterior · FT-006 equipo_canonico esperado={pullup_bar}, hay %', ft006_eq;
  end if;
  if not ft006_tag_ok then
    raise exception '0026 guardia posterior · FT-006 no tiene el tag riesgo-lesion:pullups-weighted';
  end if;

  -- 5) Conteo por tag riesgo-lesion:* (los otros dos sin cambio).
  select count(*) into cnt_pull_w
    from public.exercises where 'riesgo-lesion:pullups-weighted' = any(tags);
  if cnt_pull_w <> 10 then
    raise exception '0026 guardia posterior · esperaba 10 rows con riesgo-lesion:pullups-weighted (9 de 0025 + FT-006), hay %', cnt_pull_w;
  end if;

  select count(*) into cnt_hb_int
    from public.exercises where 'riesgo-lesion:hangboard-intense' = any(tags);
  if cnt_hb_int <> 25 then
    raise exception '0026 guardia posterior · esperaba 25 rows con riesgo-lesion:hangboard-intense (sin cambio), hay %', cnt_hb_int;
  end if;

  select count(*) into cnt_hit
    from public.exercises where 'riesgo-lesion:hit' = any(tags);
  if cnt_hit <> 1 then
    raise exception '0026 guardia posterior · esperaba 1 row con riesgo-lesion:hit (sin cambio), hay %', cnt_hit;
  end if;

  raise notice '0026 guardia posterior · OK · reglas=23, ejercicios=265, total=462, FT-006 reclasificado a ejercicio con 5 canónicas + tag pullups-weighted';
end $$;

commit;
