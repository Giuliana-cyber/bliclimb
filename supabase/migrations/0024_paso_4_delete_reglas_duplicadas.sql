-- ============================================================================
-- 0024 · Paso 4 del workstream del catálogo · Fase 5
--
-- Borra 20 filas con `tipo_registro='regla'` que son duplicados de reglas ya
-- implementadas end-to-end en `lib/brain/rules/*.ts`. Cada DELETE lleva un
-- comentario con el file:line del check que la cubre en código.
--
-- Método (política politica-paso4.md · turnos 2026-07-10):
--   1. Enumeré las 44 filas `tipo_registro='regla'` del catálogo (post-0015
--      donde FIL-004 se borró).
--   2. Mapeé cada una al `check_*` correspondiente en `lib/brain/rules/*.ts`.
--   3. Verifiqué end-to-end (verdict → validator.ts → route.ts → prompt+schema
--      +red / PlanRuleModule → efecto sobre exercise o retry): 20 WIRED,
--      2 con gap `block-zone→ID`, 2 con gap `§5.2 grip→prompt`, 1 con matiz
--      semántico que §3.3/§3.4 no captura, 1 mis-tagged pendiente §3.5,
--      18 editorial sin equivalente en código.
--
-- Este DELETE cubre SOLO las 20 WIRED. Las otras 24 se conservan:
--   - 5 rows con gap end-to-end → docs/brain/canonicalization-debt.md
--     Deuda #9, checklist de aceptación del Paso 5.
--   - 18 rows editorial/protocolo/deferidas → sin equivalente en código.
--   - 1 row FT-006 → 0025 aparte cuando venga el pasaje de Doc 02 §3.5.
--
-- Tabla de mapeo completa: docs/brain/paso4-reglas-evidencia.md.
--
-- Irreversibilidad: es un DELETE puro. Se agrega guardia previa (asegurar
-- que las 20 existen y que hay exactamente 44 rows `tipo_registro='regla'`)
-- y guardia posterior (confirmar 20 borradas, resto en 24, total tabla en
-- 462). Si alguna guardia falla, la transacción se aborta y no se pierde
-- ninguna fila.
-- ============================================================================

begin;

-- ---- Guardia previa · confirmar el estado esperado ----
do $$
declare
  cnt_reglas int;
  cnt_ids int;
  cnt_total int;
begin
  -- 1) Total tipo_registro='regla' == 44 (post-0015 que borró FIL-004).
  select count(*) into cnt_reglas
    from public.exercises
   where tipo_registro = 'regla';
  if cnt_reglas <> 44 then
    raise exception '0024 guardia previa · esperaba 44 tipo_registro=regla, hay %', cnt_reglas;
  end if;

  -- 2) Las 20 IDs a borrar existen todas.
  select count(*) into cnt_ids
    from public.exercises
   where id in (
      'DP-R001','DP-R002','DP-R005','DP-R008',
      'DP-S002','DP-S004',
      'FIL-001','FIL-003',
      'HB-R001','HB-R003','HB-R007','HB-R008',
      'HB-S001','HB-S002','HB-S003','HB-S006',
      'PER-003','PER-004','REP-003','APM-005'
   );
  if cnt_ids <> 20 then
    raise exception '0024 guardia previa · esperaba las 20 IDs presentes, hay %', cnt_ids;
  end if;

  -- 3) Total tabla == 482 (post-0015 que borró FIL-004, y ninguna migración
  --    intermedia insertó ni borró rows).
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 482 then
    raise exception '0024 guardia previa · esperaba 482 rows totales, hay %', cnt_total;
  end if;

  raise notice '0024 guardia previa · OK · reglas=44, ids-a-borrar=20, total=482';
end $$;

-- ---- DELETEs · 20 reglas duplicadas de código ----

-- §1.1 · Menores de 16
-- check_1_1 @ lib/brain/rules/section-01-profile-filters.ts:37-54
-- Emite block-categories [hangboard, campus, full-crimp, hit, finger-training-any]
-- → prompt (route.ts:581) + schema restringido (route.ts:623-624) + red
--   section01PlanGating (section-01-plan-gating.ts:91-140) con retry.
delete from public.exercises where id = 'DP-R005';  -- Bloquear crimp intenso en menores en crecimiento
delete from public.exercises where id = 'DP-S002';  -- Riesgo fracturas epifisarias — bloquear crimp en crecimiento
delete from public.exercises where id = 'HB-S006';  -- Bloqueo hangboard en menores de edad / crecimiento

-- §1.2 · Menos de 2 años de práctica
-- check_1_2 @ lib/brain/rules/section-01-profile-filters.ts:68-86
-- Emite block-categories [hangboard-intense, campus, hit, pullups-weighted, max-tests]
-- → mismo pipeline que §1.1 (prompt + schema + red).
-- Para HB-S002: doble camino operativo en section-02-exercise-gating.ts:96-98
-- (hangboard-intense → prefijo HB-) + section-02:132-134 (max-tests → TEST_MAXIMO_IDS).
delete from public.exercises where id = 'DP-R001';  -- Hangboard no primera opción para principiantes
delete from public.exercises where id = 'DP-R008';  -- Limitar fingerboard/campus en escaladores de menor grado
delete from public.exercises where id = 'FIL-001';  -- Filtro elegibilidad hangboard
delete from public.exercises where id = 'FIL-003';  -- Bloqueo de campus en principiantes
delete from public.exercises where id = 'HB-R003';  -- Filtro conservador antes de recomendar hangboard
delete from public.exercises where id = 'HB-R007';  -- Limitar fingerboard/campus alta intensidad en principiantes/intermedios
delete from public.exercises where id = 'HB-S001';  -- Bloqueo de dead hangs generales en principiantes
delete from public.exercises where id = 'HB-S002';  -- Bloqueo de MaxHangs
delete from public.exercises where id = 'HB-S003';  -- Bloqueo/adaptación de IntHangs / Repeaters

-- §3.1 · Orden intra-sesión por intensidad
-- check_3_1 @ lib/brain/rules/section-03-session-programming.ts:163-209
-- Constante INTRA_SESSION_ORDER @ section-03-session-programming.ts:119-130.
-- PlanRuleModule → evaluate-generated-plan.ts:40 → brainEval.blocking →
-- retry route.ts:987. Además post-processor reorderMainBlockBySafety @
-- lib/ai/plan-post-process.ts:49-90 wired en route.ts:966 (idempotente).
delete from public.exercises where id = 'PER-003';  -- Orden diario de sesión — estímulos por calidad y seguridad
delete from public.exercises where id = 'HB-R001';  -- Hangboard después del calentamiento y al inicio (§3.1 + §3.6)

-- §3.2 · Skills en primeros ~30% del mainBlock
-- check_3_2 @ lib/brain/rules/section-03-session-programming.ts:224-264
-- PlanRuleModule → evaluate-generated-plan.ts:40 → retry.
delete from public.exercises where id = 'APM-005';  -- Habilidades nuevas en estado fresco

-- §3.3 · No 3 días duros consecutivos
-- check_3_3 @ lib/brain/rules/section-03-session-programming.ts:279-306
-- PlanRuleModule → evaluate-generated-plan.ts:40 → retry.
delete from public.exercises where id = 'REP-003';  -- Regla "no 3 días seguidos"

-- §3.4 · Recuperación entre sesiones del mismo stimulus
-- check_3_4 @ lib/brain/rules/section-03-session-programming.ts:318-351
-- Tabla MIN_RECOVERY_DAYS @ section-03-session-programming.ts:148-153
-- (strength: 2, power: 2, power-endurance: 3, aerobic-base: 1).
-- PlanRuleModule → evaluate-generated-plan.ts:40 → retry.
delete from public.exercises where id = 'PER-004';  -- Programación semanal fuerza/recuperación
delete from public.exercises where id = 'HB-R008';  -- No programar dedos máximos días consecutivos

-- §3.6 · Strength/power/PE fuera de warmup y cooldown
-- check_3_6 @ lib/brain/rules/section-03-session-programming.ts:361-399
-- PlanRuleModule → evaluate-generated-plan.ts:40 → retry.
-- Además garantizada en generación por schema warmup/cooldown restringidos
-- (WarmupStimulusSchema/CooldownStimulusSchema en lib/ai/fast-plan-schema.ts).
delete from public.exercises where id = 'DP-R002';  -- Dead hangs después del calentamiento y antes del bloque principal

-- §14.2 · Extensores si 3+ sesiones de tracción (o 1+ con historial de codo)
-- check_14_2 @ lib/brain/rules/section-14-elbow-prevention.ts:104-131
-- PlanRuleModule → evaluate-generated-plan.ts:41 → retry.
-- Además post-processor proactivo ensureExtensorWork @
-- lib/ai/plan-post-process.ts:143-179 wired en route.ts:966 (inyecta si
-- falta, con `injuries.includes('elbows')` bajando el umbral a 1).
delete from public.exercises where id = 'DP-S004';  -- Riesgo tendinopatía / codo / cuello

-- ---- Guardia posterior · confirmar el estado esperado ----
do $$
declare
  cnt_reglas int;
  cnt_ids int;
  cnt_total int;
begin
  -- 1) Las 20 IDs no existen más.
  select count(*) into cnt_ids
    from public.exercises
   where id in (
      'DP-R001','DP-R002','DP-R005','DP-R008',
      'DP-S002','DP-S004',
      'FIL-001','FIL-003',
      'HB-R001','HB-R003','HB-R007','HB-R008',
      'HB-S001','HB-S002','HB-S003','HB-S006',
      'PER-003','PER-004','REP-003','APM-005'
   );
  if cnt_ids <> 0 then
    raise exception '0024 guardia posterior · quedaron % de las 20 IDs sin borrar', cnt_ids;
  end if;

  -- 2) tipo_registro='regla' == 24 (44 − 20 borradas).
  select count(*) into cnt_reglas
    from public.exercises
   where tipo_registro = 'regla';
  if cnt_reglas <> 24 then
    raise exception '0024 guardia posterior · esperaba 24 tipo_registro=regla, hay %', cnt_reglas;
  end if;

  -- 3) Total tabla == 462 (482 − 20).
  select count(*) into cnt_total from public.exercises;
  if cnt_total <> 462 then
    raise exception '0024 guardia posterior · esperaba 462 rows totales, hay %', cnt_total;
  end if;

  raise notice '0024 guardia posterior · OK · borradas=20, reglas=24, total=462';
end $$;

commit;
