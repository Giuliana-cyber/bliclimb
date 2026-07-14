-- ============================================================================
-- 0027 · Paso 5 del workstream del catálogo · tags para el matcher
--
-- Aplica 3 tags nuevos que el matcher (resolveToCanonical, próxima entrega)
-- consume como filtros de gate en toda la escalera de fallback:
--
--   carga:regleta-pequena     (9 rows)  → filtro A.2 (§5.2 grip restriction)
--   prerequisito:15-pullups   (1 row)   → filtro C.1 (§2.4 maxPullupReps)
--   riesgo-lesion:power-max   (2 rows)  → filtro B.1 (Deuda #10)
--
-- Decisiones editoriales aprobadas por Giuliana (2026-07-13):
--   carga:regleta-pequena — definición: "profundidad ≤15mm o reduce
--     profundidad como parámetro de intensidad". NO intensidad general
--     (esa ya está en riesgo-lesion:hangboard-intense).
--   Los 9 firmes salieron de grep contra descripción literal del CSV.
--   Los 6 ambivalentes rechazados: HB-73 dice 20mm explícito, HB-005/HB-753/
--   HB-P006 no mencionan profundidad (intensidad general), HB-P003/HB-P004
--   son programas-bloque que heredan de sus componentes.
--
-- prerequisito:15-pullups aplica SOLO a FT-006 (ejercicio, post-0026).
--   Corrección respecto a la versión inicial (2026-07-13): FTP-004 NO lleva
--   el tag. FTP-004 es una REGLA legítima (§2.4 escrita como fila del
--   catálogo — "Sólo iniciar bloqueo a una mano con ≥15 dominadas por
--   serie"), no un ejercicio. El matcher filtra ejercicios contra el pool
--   `tipo_registro='ejercicio'`; taggear una fila `tipo_registro='regla'`
--   no le sirve al matcher. FTP-004 se conserva como constancia en catálogo
--   de §2.4 (Deuda #12 en canonicalization-debt.md) — mismo patrón que las
--   5 reglas conservadas por gap en Paso 4.
--
-- riesgo-lesion:power-max aplica a los 2 rows identificados en la Deuda #10:
--   PO-DEADSTOP y PO-POWERPU. Requiere ampliación paralela del enum
--   BlockedCategory en lib/brain/types.ts (cambio de código, no SQL).
--   Esa extensión + los 2 tags cierran el hueco B.1 del checklist.
--
-- Deltas al conteo post-0026:
--   tipo_registro='regla' :          23 (sin cambio — FTP-004 sigue como regla)
--   tipo_registro='ejercicio' :      265 (sin cambio)
--   tipo_registro='concepto' :       XX (sin cambio)
--   Total tabla :                    462 (sin cambio; solo se agregan tags)
--
--   carga:regleta-pequena :          0 → 9
--   prerequisito:15-pullups :        0 → 1  (solo FT-006 ejercicio)
--   riesgo-lesion:power-max :        0 → 2
--   Total tags aplicados :           12 sobre 12 filas distintas
--
-- Idempotencia: cada UPDATE tiene guardia `NOT (<tag> = any(tags))`.
-- Guardia previa verifica estado post-0026. Guardia posterior verifica
-- los 3 conteos por tag.
-- ============================================================================

begin;

-- ---- Guardia previa · confirmar estado post-0026 ----
do $$
declare
  cnt_reglas int;
  cnt_ejercicios int;
  cnt_total int;
  cnt_carga_regleta int;
  cnt_prereq int;
  cnt_powermax int;
  cnt_ids_carga int;
  cnt_ids_prereq int;
  cnt_ids_powermax int;
begin
  -- 1) tipo_registro='regla' == 23 (post-0026 sin cambio).
  select count(*) into cnt_reglas
    from public.exercises where tipo_registro = 'regla';
  if cnt_reglas <> 23 then
    raise exception '0027 guardia previa · esperaba 23 tipo_registro=regla, hay %', cnt_reglas;
  end if;

  -- 2) tipo_registro='ejercicio' == 265 (post-0026 sin cambio).
  select count(*) into cnt_ejercicios
    from public.exercises where tipo_registro = 'ejercicio';
  if cnt_ejercicios <> 265 then
    raise exception '0027 guardia previa · esperaba 265 tipo_registro=ejercicio, hay %', cnt_ejercicios;
  end if;

  -- 3) Total == 462.
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0027 guardia previa · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  -- 4) Ninguna fila tiene ya los tags nuevos.
  select count(*) into cnt_carga_regleta
    from public.exercises where 'carga:regleta-pequena' = any(tags);
  if cnt_carga_regleta <> 0 then
    raise exception '0027 guardia previa · esperaba 0 rows con carga:regleta-pequena, hay %', cnt_carga_regleta;
  end if;

  select count(*) into cnt_prereq
    from public.exercises where 'prerequisito:15-pullups' = any(tags);
  if cnt_prereq <> 0 then
    raise exception '0027 guardia previa · esperaba 0 rows con prerequisito:15-pullups, hay %', cnt_prereq;
  end if;

  select count(*) into cnt_powermax
    from public.exercises where 'riesgo-lesion:power-max' = any(tags);
  if cnt_powermax <> 0 then
    raise exception '0027 guardia previa · esperaba 0 rows con riesgo-lesion:power-max, hay %', cnt_powermax;
  end if;

  -- 5) Las 9 IDs de carga:regleta-pequena existen como tipo_registro='ejercicio'.
  select count(*) into cnt_ids_carga
    from public.exercises
   where id in ('DP-004','DP-005','DP-P003','DP-P004','FD-003','HB-003','HB-004','HB-P001','HB-P002')
     and tipo_registro = 'ejercicio';
  if cnt_ids_carga <> 9 then
    raise exception '0027 guardia previa · esperaba 9 IDs ejercicio para carga:regleta-pequena, hay %', cnt_ids_carga;
  end if;

  -- 6) FT-006 existe como ejercicio (único taggeado con prerequisito:15-pullups).
  -- FTP-004 se conserva como regla (Deuda #12 · constancia de §2.4) pero NO
  -- lleva el tag porque el matcher no consume filas tipo_registro='regla'.
  select count(*) into cnt_ids_prereq
    from public.exercises
   where id = 'FT-006' and tipo_registro = 'ejercicio';
  if cnt_ids_prereq <> 1 then
    raise exception '0027 guardia previa · esperaba FT-006 ejercicio (=1), hay %', cnt_ids_prereq;
  end if;

  -- 7) PO-DEADSTOP y PO-POWERPU existen como ejercicios.
  select count(*) into cnt_ids_powermax
    from public.exercises
   where id in ('PO-DEADSTOP','PO-POWERPU')
     and tipo_registro = 'ejercicio';
  if cnt_ids_powermax <> 2 then
    raise exception '0027 guardia previa · esperaba PO-DEADSTOP + PO-POWERPU ejercicio (=2), hay %', cnt_ids_powermax;
  end if;

  raise notice '0027 guardia previa · OK · reglas=23, ejercicios=265, total=462, IDs presentes (9 carga + 1 prereq + 2 power-max = 12), tags nuevos = 0';
end $$;

-- ---- UPDATE 1 · carga:regleta-pequena (9 rows) ----
--
-- Aplica el tag a los 9 ejercicios que exigen profundidad ≤15mm o reducen
-- profundidad como parámetro (evidencia literal en descripción):
--
--   DP-004  "Ajustar intensidad reduciendo profundidad de regleta"
--   DP-005  "ajustar profundidad para fallar o casi fallar al final"
--   DP-P003 "Misma estructura que MaxHangs, pero ajustando profundidad"
--   DP-P004 "regleta ajustada para casi fallo al final del set"
--   FD-003  "MaxHangs con mínima profundidad — MED"
--   HB-003  "Ajustar la profundidad en vez del peso"
--   HB-004  "regleta que permita completar el set, buscando fallo"
--   HB-P001 "fase con peso añadido en 18 mm y fase con profundidad mínima"
--   HB-P002 "Bloque de 8 semanas de suspensiones intermitentes en regleta ajustable"
update public.exercises
set tags = tags || array['carga:regleta-pequena']
where id in ('DP-004','DP-005','DP-P003','DP-P004','FD-003','HB-003','HB-004','HB-P001','HB-P002')
  and tipo_registro = 'ejercicio'
  and not ('carga:regleta-pequena' = any(tags));

-- ---- UPDATE 2 · prerequisito:15-pullups (1 row · SOLO FT-006) ----
--
-- FTP-004 explícitamente NO lleva el tag. Es una REGLA (§2.4 escrita como
-- fila de catálogo), no un ejercicio. El matcher filtra pool
-- tipo_registro='ejercicio' → taggear una regla no sirve al gating.
-- FTP-004 se conserva como constancia editorial de §2.4 (Deuda #12).
update public.exercises
set tags = tags || array['prerequisito:15-pullups']
where id = 'FT-006'
  and tipo_registro = 'ejercicio'
  and not ('prerequisito:15-pullups' = any(tags));

-- ---- UPDATE 3 · riesgo-lesion:power-max (2 rows) ----
--
-- Deuda #10: potencia máxima con contact strength no cubierta por ninguna
-- BlockedCategory del enum actual. El tag aparece en 2 rows del pool que
-- coinciden con esa semántica:
--   PO-DEADSTOP  "detenerse INMEDIATAMENTE sin 'chocar' contra ella"
--   PO-POWERPU   "cada rep debe ser máxima velocidad de subida"
--
-- Requiere ampliación PARALELA del enum BlockedCategory en
-- lib/brain/types.ts (cambio de código, no SQL) para que §1.1/§1.2 emitan
-- 'power-max' en sus verdicts. Sin ese cambio, el tag existe pero nadie
-- lo consume.
update public.exercises
set tags = tags || array['riesgo-lesion:power-max']
where id in ('PO-DEADSTOP','PO-POWERPU')
  and tipo_registro = 'ejercicio'
  and not ('riesgo-lesion:power-max' = any(tags));

-- ---- Guardia posterior · confirmar los 13 tags aplicados (9 + 2 + 2) ----
do $$
declare
  cnt_carga_regleta int;
  cnt_prereq int;
  cnt_powermax int;
  cnt_total int;
begin
  -- 1) 9 rows con carga:regleta-pequena.
  select count(*) into cnt_carga_regleta
    from public.exercises where 'carga:regleta-pequena' = any(tags);
  if cnt_carga_regleta <> 9 then
    raise exception '0027 guardia posterior · esperaba 9 rows con carga:regleta-pequena, hay %', cnt_carga_regleta;
  end if;

  -- 2) 1 row con prerequisito:15-pullups (SOLO FT-006 ejercicio).
  -- FTP-004 se conserva como regla sin tag (constancia de §2.4 · Deuda #12).
  select count(*) into cnt_prereq
    from public.exercises where 'prerequisito:15-pullups' = any(tags);
  if cnt_prereq <> 1 then
    raise exception '0027 guardia posterior · esperaba 1 row con prerequisito:15-pullups (solo FT-006), hay %', cnt_prereq;
  end if;

  -- 3) 2 rows con riesgo-lesion:power-max.
  select count(*) into cnt_powermax
    from public.exercises where 'riesgo-lesion:power-max' = any(tags);
  if cnt_powermax <> 2 then
    raise exception '0027 guardia posterior · esperaba 2 rows con riesgo-lesion:power-max, hay %', cnt_powermax;
  end if;

  -- 4) Total tabla sin cambio (solo se agregaron tags, no rows).
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0027 guardia posterior · esperaba 462 rows totales sin cambio, hay %', cnt_total;
  end if;

  raise notice '0027 guardia posterior · OK · carga:regleta-pequena=9, prerequisito:15-pullups=1 (solo FT-006), riesgo-lesion:power-max=2 (total 12 tags aplicados sobre 12 filas distintas)';
end $$;

commit;
