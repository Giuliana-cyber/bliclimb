# QA_AUDIT extendido · Biblioteca Maestra v3.0

**Fuente**: `docs/biblioteca-maestra-v3.1.xlsx`
**Fecha**: 2026-07-15 · Fase 1 · Task F1.2
**Política aprobada**: nivel estricto · todos los checks técnicos como ERROR

## Resumen

- Checks corridos: **15**
- Errores totales: **408**
- Warnings totales: **205**
- Categorías curadas (≥50% con gates): **0**

## Categorías curadas detectadas


## Detalle por check

### xlsx_integrity_check · error · ✅ OK

### subcategory_removed · error · ✅ OK

### casing_normalization · error · ✅ OK

### domain_check_category · error · ✅ OK

### domain_check_severity · error · ✅ OK

### domain_check_structure · error · ❌ 4 findings

Sample:

- `kind=off_canon` · `sheet=Protocols` · `column=structure` · `value=Inicio específico o test ligero` · `count=1` · `example_ids=PR-FOR-012`
- `kind=off_canon` · `sheet=Protocols` · `column=structure` · `value=Rehabilitación general no diagnóstica` · `count=1` · `example_ids=PR-FOR-014`
- `kind=off_canon` · `sheet=Protocols` · `column=structure` · `value=Rehabilitación supervisada` · `count=1` · `example_ids=PR-FOR-015`
- `kind=off_canon` · `sheet=Protocols` · `column=structure` · `value=Después de sesiones intensas` · `count=1` · `example_ids=PR-FOR-016`

### domain_check_risk_level_exercises · error · ❌ 30 findings

Sample:

- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor anterior hombro` · `count=3` · `example_ids=EX-MOB-019, EX-FLX-003, EX-FLX-017`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor lumbar/cadera` · `count=2` · `example_ids=EX-MOB-012, EX-MOB-021`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor lumbar/rodilla` · `count=2` · `example_ids=EX-MOB-020, EX-FLX-006`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor ciático` · `count=2` · `example_ids=EX-MOB-026, EX-FLX-012`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor lumbar/hombro` · `count=2` · `example_ids=EX-MOB-028, EX-FLX-023`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Hormigueo, dolor punzante` · `count=2` · `example_ids=EX-FLX-001, EX-FLX-002`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Pinzamiento hombro` · `count=2` · `example_ids=EX-FLX-004, EX-FLX-018`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor rodilla/lumbar` · `count=2` · `example_ids=EX-FLX-007, EX-FLX-021`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor lumbar/ciático` · `count=2` · `example_ids=EX-FLX-009, EX-FLX-019`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor ingle/rodilla` · `count=2` · `example_ids=EX-FLX-011, EX-FLX-022`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor agudo, hormigueo, pérdida de fuerza` · `count=1` · `example_ids=EX-MOB-001`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor punzante` · `count=1` · `example_ids=EX-MOB-002`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor, chasquido doloroso` · `count=1` · `example_ids=EX-MOB-003`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor de hombro/cuello` · `count=1` · `example_ids=EX-MOB-004`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Dolor lumbar o mareo` · `count=1` · `example_ids=EX-MOB-005`
- ... y 15 más

### domain_check_risk_level_protocols · error · ✅ OK

### domain_check_equipment · error · ❌ 20 findings

Sample:

- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=pinch_block` · `off_token=pinch_block` · `row_id=EX-FIN-031`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=dynamometer` · `off_token=dynamometer` · `row_id=EX-FIN-061`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=dynamometer` · `off_token=dynamometer` · `row_id=EX-FIN-062`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Cuerda` · `off_token=cuerda` · `row_id=EX-PULL-028`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Escalera Bachar` · `off_token=escalera bachar` · `row_id=EX-PULL-029`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Activación en espalda alta.` · `off_token=activación en espalda alta.` · `row_id=EX-SCAP-004`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Movilidad/activación suave.` · `off_token=movilidad` · `row_id=EX-SHO-004`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Cubeta con arroz` · `off_token=cubeta con arroz` · `row_id=EX-FOR-011`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Cubeta con arroz` · `off_token=cubeta con arroz` · `row_id=EX-FOR-012`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=pinch_block` · `off_token=pinch_block` · `row_id=EX-FOR-026`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Pelota blanda` · `off_token=pelota blanda` · `row_id=EX-FOR-027`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Mesa` · `off_token=mesa` · `row_id=EX-FOR-038`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=balón medicinal` · `off_token=balón medicinal` · `row_id=EX-CAMP-023`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=balón medicinal` · `off_token=balón medicinal` · `row_id=EX-CAMP-024`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=dynamometer` · `off_token=dynamometer` · `row_id=EX-CAMP-030`
- ... y 5 más

### action_vocabulary_check · error · ❌ 4 findings

Sample:

- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=No tests máximos; bajar carga y recomendar validación.` · `count=1`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=Usar progresión asistida y aprendizaje técnico.` · `count=1`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=Limitar volumen de fuerza; priorizar técnica en muro.` · `count=1`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=Plan conservador; no máximos.` · `count=1`

### cross_column_contamination · error · ❌ 348 findings

Sample:

- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard; bands` · `row_id=EX-FIN-001`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-002`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-003`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-004`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=hangboard; gym` · `row_id=EX-FIN-005`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard; weights` · `row_id=EX-FIN-006`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-007`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-008`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard; weights` · `row_id=EX-FIN-009`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-010`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-011`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-012`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-013`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-014`
- `kind=equipment_has_prose` · `sheet=Exercises` · `column=equipment` · `value=gym; hangboard` · `row_id=EX-FIN-015`
- ... y 333 más

### gates_column_populated · error · ✅ OK

**Pendientes (categorías no-curadas, info · no bloquean):**

- `tecnica-escalada` · 66 ejercicios sin gate
- `fuerza-dedos` · 62 ejercicios sin gate
- `hombros-escapulas` · 52 ejercicios sin gate
- `antebrazo-muneca-codo` · 44 ejercicios sin gate
- `traccion` · 42 ejercicios sin gate
- `fuerza-general` · 36 ejercicios sin gate
- `resistencia-fuerza` · 36 ejercicios sin gate
- `power-endurance` · 36 ejercicios sin gate
- `movilidad` · 33 ejercicios sin gate
- `mental` · 33 ejercicios sin gate
- `core` · 32 ejercicios sin gate
- `campus-potencia` · 30 ejercicios sin gate
- `calentamiento` · 30 ejercicios sin gate
- `recuperacion` · 30 ejercicios sin gate

### dosage_completeness · error · ✅ OK

**Warnings (205):**

- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-001` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-002` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-003` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-004` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-005` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-006` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-007` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-008` · `populated=reps, intensity` · `missing=work_interval, rest_interval, sets`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-009` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-010` · `populated=sets, reps, intensity` · `missing=work_interval, rest_interval`
- ... y 195 más

### relationships_orphans · error · ❌ 2 findings

Sample:

- `kind=from_id_orphan` · `sheet=Relationships` · `count=129` · `sample=REL-336: TS-PULL-001 | REL-337: TS-PULL-002 | REL-338: TS-PULL-003 | REL-339-1: TS-PULL-004 | REL-339-2: TS-PULL-004 | REL-340: TS-PULL-005 | REL-341: TS-PULL-006 | REL-342: TS-PULL-007 | REL-343: TS-PULL-008 | REL-344: TS-PULL-009 | REL-345: TS-PULL-010 | REL-346: TS-PULL-011 | REL-347: TS-PULL-012 | REL-S8-001: uses_category | REL-S8-002: uses_category | REL-S8-003: uses_category | REL-S8-004: uses_category | REL-S8-005: uses_category | REL-S8-006: uses_category | REL-S8-007: uses_category`
- `kind=to_id_orphan` · `sheet=Relationships` · `count=478` · `sample=REL-S6-167: PR-WALL-001 | REL-S6-171: PR-WALL-002 | REL-S6-175: PR-WALL-003 | REL-S6-179: PR-WALL-001 | REL-S6-183: PR-WALL-001 | REL-S6-187: PR-GEN-001 | REL-S6-191: PR-PREHAB-001 | REL-S6-195: PR-GEN-001 | REL-S6-250: SRC-001 | REL-S6-251: SRC-001 | REL-S6-252: SRC-005 | REL-S6-253: SRC-001 | REL-S6-254: SRC-005 | REL-S6-255: SRC-001 | REL-S6-256: SRC-001 | REL-S6-257: SRC-001 | REL-S6-258: SRC-005 | REL-S6-259: SRC-006 | REL-S6-260: SRC-001 | REL-S6-261: SRC-005`

### golden_cases_smoke · error · ✅ OK

> PENDIENTE post-Fase-2. GC-001 a GC-007 deben producir su expected_focus.
