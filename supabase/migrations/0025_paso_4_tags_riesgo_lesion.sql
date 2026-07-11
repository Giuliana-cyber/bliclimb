-- ============================================================================
-- 0025 · Paso 4 (b) del workstream del catálogo · Fase 5
--
-- Aplica tags `riesgo-lesion:<subtipo>` a 35 ejercicios del catálogo que
-- corresponden a las BlockedCategory del enum `BlockedCategory` en
-- `lib/brain/types.ts:16-24`. El mapping surgió de un análisis de datos
-- crudos (turnos 2026-07-10), no de suposición.
--
-- Vocabulario de tag (valor literal compuesto para grep-friendly):
--   riesgo-lesion:hangboard-intense  →  max hangs + repeaters intensos +
--                                       one-arm hang + recruitment + fingerboard
--                                       competitivo (25 rows)
--   riesgo-lesion:pullups-weighted   →  dominadas con lastre + lock-offs +
--                                       one-arm negatives + Frenchies +
--                                       dominadas desiguales + pull-up pesado
--                                       (9 rows)
--   riesgo-lesion:hit                →  Hypergravity Isolation Training
--                                       (1 row · FM-014)
--
-- Categorías del enum SIN filas para taggear (por regla operativa):
--   - full-crimp        → catálogo no prescribe crimp cerrado (verificado)
--   - finger-training-any → gatillado por categoria_canonica='fuerza-dedos'
--   - campus            → gatillado por categoria_canonica='campus'
--   - hangboard         → gatillado por equipo_canonico @> array['hangboard']
--   - max-tests         → TEST_MAXIMO_IDS son 15/15 tipo_registro='test',
--                         ninguno ejercicio; el bloqueo opera contra tests
--                         inventados por el LLM, no contra filas del catálogo
--
-- Ejercicios revisados uno por uno y confirmados como seguros (78 sin-tag
-- del pool de 5 categorías bloqueables): `docs/brain/paso4-seguros-verificacion.md`
-- (registro en canonicalization-debt.md · Deuda #9 · Checklist Paso 5).
--
-- Deudas descubiertas en el audit (registradas en canonicalization-debt.md):
--   1. PO-DEADSTOP + PO-POWERPU (potencia máxima con contact strength) no
--      tienen ninguna BlockedCategory que los cubra. Deuda de motor: falta
--      categoría tipo `power-max`. Se resuelve en Paso 5 con ampliación del
--      enum, no acá.
--   2. `proposito='rehab'` no está filtrado en `app/api/generate-plan/` ni
--      en `lib/brain/`. Rows RH-* pueden llegar al pool del LLM. Deuda de
--      motor: filtro por proposito, o regla "sólo ofrecer rehab a perfiles
--      con lesión declarada". Se resuelve en Paso 5.
--
-- Irreversibilidad: es un UPDATE que agrega tags al array. Idempotente por
-- construcción — cada UPDATE tiene guardia `NOT (<tag> = any(tags))` que
-- evita duplicar tags si se corre dos veces. Guardia previa verifica estado
-- post-0024. Guardia posterior verifica los tres tags aplicados.
-- ============================================================================

begin;

-- ---- Guardia previa · confirmar estado post-0024 ----
do $$
declare
  cnt_reglas int;
  cnt_total int;
  cnt_ids int;
  cnt_ya_taggeados int;
begin
  -- 1) tipo_registro='regla' == 24 (post-0024 que borró 20 duplicadas).
  select count(*) into cnt_reglas
    from public.exercises
   where tipo_registro = 'regla';
  if cnt_reglas <> 24 then
    raise exception '0025 guardia previa · esperaba 24 tipo_registro=regla (post-0024), hay %', cnt_reglas;
  end if;

  -- 2) Total tabla == 462 (post-0024).
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0025 guardia previa · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  -- 3) Las 35 IDs a taggear existen (25 + 9 + 1).
  select count(*) into cnt_ids
    from public.exercises
   where id in (
      -- hangboard-intense (25)
      'DP-003','DP-004','DP-005','DP-P002','DP-P003','DP-P004','DP-P005',
      'FD-002','FD-003','FD-005','FD-011',
      'HB-002','HB-003','HB-004','HB-005','HB-753','HB-1ARM','HB-73',
      'HB-ABRA',
      'HB-P001','HB-P002','HB-P003','HB-P004','HB-P006','HB-RECRUIT',
      -- pullups-weighted (9)
      'FT-002','FT-003','FT-007','FT-1ARMNEG',
      'FM-003','FM-013',
      'FTP-001','FTP-002','FTP-005',
      -- hit (1)
      'FM-014'
   );
  if cnt_ids <> 35 then
    raise exception '0025 guardia previa · esperaba 35 IDs presentes, hay %', cnt_ids;
  end if;

  -- 4) Ninguna de las 35 tiene ya un tag riesgo-lesion:* aplicado (para no
  --    tocar rows que ya fueron intervenidas por un run previo o manual).
  select count(*) into cnt_ya_taggeados
    from public.exercises
   where id in (
      'DP-003','DP-004','DP-005','DP-P002','DP-P003','DP-P004','DP-P005',
      'FD-002','FD-003','FD-005','FD-011',
      'HB-002','HB-003','HB-004','HB-005','HB-753','HB-1ARM','HB-73',
      'HB-ABRA',
      'HB-P001','HB-P002','HB-P003','HB-P004','HB-P006','HB-RECRUIT',
      'FT-002','FT-003','FT-007','FT-1ARMNEG',
      'FM-003','FM-013',
      'FTP-001','FTP-002','FTP-005',
      'FM-014'
   )
     and exists (
       select 1 from unnest(tags) as t
        where t like 'riesgo-lesion:%'
     );
  if cnt_ya_taggeados <> 0 then
    raise exception '0025 guardia previa · % rows ya tienen tag riesgo-lesion:*; abortando', cnt_ya_taggeados;
  end if;

  raise notice '0025 guardia previa · OK · reglas=24, total=462, ids-a-taggear=35, ya-taggeados=0';
end $$;

-- ---- UPDATE 1 · riesgo-lesion:hangboard-intense (25 rows) ----
--
-- Cubre max hangs canónicos (DP-003/004/P002/P003, HB-002/003, FD-003), sus
-- variantes en bloques 4-8 semanas (DP-P002/P003/P004/P005 + HB-P001..P006),
-- repeaters/IntHangs intensos (DP-005, HB-004, HB-73, HB-P002), submáximos
-- de dedos (HB-005 SubHangs 70-80%, HB-753 Lattice ~80%, HB-ABRA 60-70% TUL
-- alto), one-arm hang (HB-1ARM), recruitment pulls (HB-RECRUIT), fingerboard
-- multigrip competitivo (FD-011), fingerboard competitivo de boulder (DP-P005),
-- fingerboard competitivo 4 semanas (HB-P004), y repeaters Hörst
-- intermedio-avanzado (FD-002, FD-005).
--
-- Categoría subyacente: todos categoria_canonica='fuerza-dedos'. La
-- separación intenso/suave la resolvió el Paso 2 al canonicalizar — los
-- repeaters de baja intensidad (HB-REPEAT-LOW, CO-40, CO-P002) están en
-- categoria_canonica='resistencia-aerobica' y quedan fuera de este tag por
-- diseño. HB-PROT (proteccionista rutina diaria nivel=principiante) queda
-- fuera por scope de nivel (intermedio-avanzado + avanzado).
update public.exercises
set tags = tags || array['riesgo-lesion:hangboard-intense']
where id in (
  'DP-003','DP-004','DP-005',
  'DP-P002','DP-P003','DP-P004','DP-P005',
  'FD-002','FD-003','FD-005','FD-011',
  'HB-002','HB-003','HB-004',
  'HB-005','HB-753','HB-ABRA',
  'HB-1ARM','HB-73',
  'HB-P001','HB-P002','HB-P003','HB-P004','HB-P006',
  'HB-RECRUIT'
)
and tipo_registro = 'ejercicio'
and not ('riesgo-lesion:hangboard-intense' = any(tags));

-- ---- UPDATE 2 · riesgo-lesion:pullups-weighted (9 rows) ----
--
-- Cubre dominadas con lastre reales (FT-002 progresión Hörst, FM-003 pull-up
-- pesado / 5RM, FTP-001 progresión con lastre al final), tracción cargada
-- por biomecánica (FT-007 lock-offs en fingerboard, FT-1ARMNEG one-arm
-- chin-up negatives, FT-003 dominadas desiguales / uneven), Frenchies
-- (FM-013 + FTP-002), y FTP-005 régimen complejo que mezcla lock-offs +
-- uneven + repeaters.
--
-- Nota semántica: el nombre `pullups-weighted` se extiende para cubrir
-- tracción con carga alta/asimétrica en codo-hombro, no sólo lastre externo.
-- Decisión de Giuliana: reutilizar categoría existente en vez de agregar
-- una nueva al enum (menos deuda en Paso 5).
--
-- Categoría subyacente: todos categoria_canonica='fuerza-traccion'.
update public.exercises
set tags = tags || array['riesgo-lesion:pullups-weighted']
where id in (
  'FT-002','FT-003','FT-007','FT-1ARMNEG',
  'FM-003','FM-013',
  'FTP-001','FTP-002','FTP-005'
)
and tipo_registro = 'ejercicio'
and not ('riesgo-lesion:pullups-weighted' = any(tags));

-- ---- UPDATE 3 · riesgo-lesion:hit (1 row) ----
--
-- FM-014 Hypergravity Isolation Training. PF-FM-005 (que también aparece
-- como HIT en section-02-exercise-gating.ts:35 HIT_IDS) fue reclasificado a
-- tipo_registro='concepto' en 0022:279-295 con tag 'programa-bloque' —
-- ya no es ejercicio ejecutable, no lleva riesgo-lesion.
update public.exercises
set tags = tags || array['riesgo-lesion:hit']
where id = 'FM-014'
and tipo_registro = 'ejercicio'
and not ('riesgo-lesion:hit' = any(tags));

-- ---- Guardia posterior · confirmar estado esperado ----
do $$
declare
  cnt_hb_int int;
  cnt_pull_w int;
  cnt_hit int;
begin
  -- 1) 25 rows con tag riesgo-lesion:hangboard-intense.
  select count(*) into cnt_hb_int
    from public.exercises
   where 'riesgo-lesion:hangboard-intense' = any(tags);
  if cnt_hb_int <> 25 then
    raise exception '0025 guardia posterior · esperaba 25 rows con riesgo-lesion:hangboard-intense, hay %', cnt_hb_int;
  end if;

  -- 2) 9 rows con tag riesgo-lesion:pullups-weighted.
  select count(*) into cnt_pull_w
    from public.exercises
   where 'riesgo-lesion:pullups-weighted' = any(tags);
  if cnt_pull_w <> 9 then
    raise exception '0025 guardia posterior · esperaba 9 rows con riesgo-lesion:pullups-weighted, hay %', cnt_pull_w;
  end if;

  -- 3) 1 row con tag riesgo-lesion:hit.
  select count(*) into cnt_hit
    from public.exercises
   where 'riesgo-lesion:hit' = any(tags);
  if cnt_hit <> 1 then
    raise exception '0025 guardia posterior · esperaba 1 row con riesgo-lesion:hit, hay %', cnt_hit;
  end if;

  raise notice '0025 guardia posterior · OK · hangboard-intense=25, pullups-weighted=9, hit=1 (total 35 tags aplicados)';
end $$;

commit;
