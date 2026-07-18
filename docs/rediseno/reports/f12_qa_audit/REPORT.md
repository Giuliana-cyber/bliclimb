# QA_AUDIT extendido · Biblioteca Maestra v3.0

**Fuente**: `docs/biblioteca-maestra-v3.0-consolidada.xlsx`
**Fecha**: 2026-07-15 · Fase 1 · Task F1.2
**Política aprobada**: nivel estricto · todos los checks técnicos como ERROR

## Resumen

- Checks corridos: **15**
- Errores totales: **481**
- Warnings totales: **63**
- Categorías curadas (≥50% con gates): **0**

## Categorías curadas detectadas


## Detalle por check

### xlsx_integrity_check · error · ❌ 1 findings

Sample:

- `kind=workbook_load_error` · `detail=Unable to read workbook: could not read worksheets from docs/biblioteca-maestra-v3.0-consolidada.xlsx.
This is most probably because the workbook source files contain some invalid XML.
Please see the exception for more details.`

### subcategory_removed · error · ❌ 1 findings

Sample:

- `kind=subcategory_present` · `sheet=Exercises` · `detail=columna subcategory sigue existiendo · debería estar eliminada`

### casing_normalization · error · ❌ 11 findings

Sample:

- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=barra` · `variants=Barra|barra` · `count_by_variant=Barra=15, barra=6`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=barra/mancuernas` · `variants=Barra/mancuernas|barra/mancuernas` · `count_by_variant=Barra/mancuernas=3, barra/mancuernas=2`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=banda/polea` · `variants=Banda/polea|banda/polea` · `count_by_variant=Banda/polea=1, banda/polea=1`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=suelo` · `variants=Suelo|suelo` · `count_by_variant=Suelo=1, suelo=13`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=mancuernas/barra` · `variants=Mancuernas/barra|mancuernas/barra` · `count_by_variant=Mancuernas/barra=1, mancuernas/barra=1`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=banda` · `variants=Banda|banda` · `count_by_variant=Banda=4, banda=5`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=peso corporal` · `variants=Peso corporal|peso corporal` · `count_by_variant=Peso corporal=3, peso corporal=1`
- `kind=casing_duplicate` · `sheet=Exercises` · `column=equipment` · `canonical_key=mancuernas/kettlebells` · `variants=Mancuernas/kettlebells|mancuernas/kettlebells` · `count_by_variant=Mancuernas/kettlebells=1, mancuernas/kettlebells=1`
- `kind=casing_duplicate` · `sheet=Gates` · `column=action` · `canonical_key=block` · `variants=BLOCK|block` · `count_by_variant=BLOCK=21, block=28`
- `kind=casing_duplicate` · `sheet=Gates` · `column=action` · `canonical_key=regress_or_block` · `variants=REGRESS_OR_BLOCK|regress_or_block` · `count_by_variant=REGRESS_OR_BLOCK=1, regress_or_block=4`
- `kind=casing_duplicate` · `sheet=Gates` · `column=action` · `canonical_key=regress` · `variants=REGRESS|regress` · `count_by_variant=REGRESS=15, regress=14`

### domain_check_category · error · ❌ 10 findings

Sample:

- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Fuerza de dedos / Hangboard` · `count=62` · `example_ids=EX-FIN-001, EX-FIN-002, EX-FIN-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Tracción y dominadas` · `count=42` · `example_ids=EX-PULL-001, EX-PULL-002, EX-PULL-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Antebrazo, muñeca y codo` · `count=38` · `example_ids=EX-FOR-001, EX-FOR-002, EX-FOR-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Fuerza general / piernas / acondicionamiento` · `count=36` · `example_ids=EX-STR-001, EX-STR-002, EX-STR-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Hombros / Escápulas` · `count=33` · `example_ids=EX-SHO-003, EX-SHO-005, EX-SHO-006`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Core` · `count=32` · `example_ids=EX-CORE-001, EX-CORE-002, EX-CORE-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Campus y potencia específica` · `count=30` · `example_ids=EX-CAMP-001, EX-CAMP-002, EX-CAMP-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Escápulas / Hombros` · `count=4` · `example_ids=EX-SCAP-001, EX-SCAP-002, EX-SCAP-003`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Hombros / Manguito rotador` · `count=2` · `example_ids=EX-SHO-001, EX-SHO-002`
- `kind=off_canon` · `sheet=Exercises` · `column=category` · `value=Hombros / Movilidad activa` · `count=1` · `example_ids=EX-SHO-004`

### domain_check_severity · error · ❌ 9 findings

Sample:

- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Crítico` · `count=27` · `example_ids=GT-FIN-001, GT-FIN-002, GT-FIN-003`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Medio` · `count=25` · `example_ids=GT-FIN-007, GT-FIN-008, GT-FIN-018`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Alto` · `count=24` · `example_ids=GT-FIN-005, GT-FIN-006, GT-FIN-012`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Crítica` · `count=13` · `example_ids=GT-PULL-001, GT-PULL-002, GT-PULL-008`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Alta` · `count=12` · `example_ids=GT-PULL-003, GT-PULL-004, GT-PULL-005`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Bajo` · `count=3` · `example_ids=GT-SHO-015, GT-SHO-026, GT-FOR-015`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Media-alta` · `count=2` · `example_ids=GT-PULL-011, GT-PULL-020`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Bajo-medio` · `count=1` · `example_ids=GT-FIN-024`
- `kind=off_canon` · `sheet=Gates` · `column=severity` · `value=Media` · `count=1` · `example_ids=GT-PULL-026`

### domain_check_structure · error · ✅ OK

### domain_check_risk_level_exercises · error · ❌ 12 findings

Sample:

- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Medio` · `count=85` · `example_ids=EX-FIN-001, EX-FIN-002, EX-FIN-004`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Alto` · `count=76` · `example_ids=EX-FIN-006, EX-FIN-007, EX-FIN-008`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Bajo` · `count=49` · `example_ids=EX-PULL-024, EX-FOR-005, EX-FOR-006`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `count=32` · `example_ids=EX-SHO-005, EX-SHO-006, EX-SHO-007`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Medio-alto` · `count=15` · `example_ids=EX-FIN-003, EX-FIN-031, EX-FIN-032`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Bajo-medio` · `count=11` · `example_ids=EX-FIN-047, EX-FIN-056, EX-FIN-061`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=Regla` · `count=4` · `example_ids=EX-FIN-053, EX-FIN-054, EX-FIN-055`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-001` · `count=2` · `example_ids=EX-SCAP-001, EX-SCAP-002`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-003` · `count=2` · `example_ids=EX-SCAP-004, EX-SHO-003`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-001` · `count=2` · `example_ids=EX-SHO-001, EX-SHO-002`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-002` · `count=1` · `example_ids=EX-SCAP-003`
- `kind=off_canon` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-002` · `count=1` · `example_ids=EX-SHO-004`

### domain_check_risk_level_protocols · error · ❌ 7 findings

Sample:

- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Medio` · `count=43` · `example_ids=PR-HB-001, PR-HB-012, PR-PULL-006`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Alto` · `count=43` · `example_ids=PR-HB-002, PR-HB-003, PR-HB-004`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Bajo` · `count=22` · `example_ids=PR-SCAP-002, PR-SCAP-003, PR-SHO-002`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Medio-alto` · `count=5` · `example_ids=PR-HB-017, PR-HB-018, PR-PULL-001`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Bajo/Medio` · `count=5` · `example_ids=PR-CORE-004, PR-CORE-006, PR-STR-004`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Medio/Alto` · `count=4` · `example_ids=PR-POW-005, PR-CORE-008, PR-CORE-009`
- `kind=off_canon` · `sheet=Protocols` · `column=risk_level` · `value=Bajo-medio` · `count=3` · `example_ids=PR-PULL-008, PR-PULL-010, PR-PULL-011`

### domain_check_equipment · error · ❌ 222 findings

Sample:

- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard + banda/polea` · `off_token=hangboard + banda` · `row_id=EX-FIN-001`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard o borde estable` · `off_token=hangboard o borde estable` · `row_id=EX-FIN-005`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard + lastre` · `off_token=hangboard + lastre` · `row_id=EX-FIN-006`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard con bordes variables` · `off_token=hangboard con bordes variables` · `row_id=EX-FIN-007`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard + lastre` · `off_token=hangboard + lastre` · `row_id=EX-FIN-009`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Fingerboard` · `off_token=fingerboard` · `row_id=EX-FIN-014`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Fingerboard` · `off_token=fingerboard` · `row_id=EX-FIN-015`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard + polea/banda` · `off_token=hangboard + polea` · `row_id=EX-FIN-016`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard/pocket board` · `off_token=pocket board` · `row_id=EX-FIN-021`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard/pocket board` · `off_token=pocket board` · `row_id=EX-FIN-022`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard/pocket board` · `off_token=pocket board` · `row_id=EX-FIN-023`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard/pocket board` · `off_token=pocket board` · `row_id=EX-FIN-024`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Hangboard + polea/lastre` · `off_token=hangboard + polea` · `row_id=EX-FIN-025`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Barra` · `off_token=barra` · `row_id=EX-FIN-026`
- `kind=off_canon` · `sheet=Exercises` · `column=equipment` · `value=Borde estable` · `off_token=borde estable` · `row_id=EX-FIN-027`
- ... y 185 más

### action_vocabulary_check · error · ❌ 50 findings

Sample:

- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=stop` · `count=6`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=require_coach_validation` · `count=5`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=Bloquear.` · `count=4`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=regress_or_block` · `count=4`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=ADJUST_LOAD` · `count=3`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=professional_validation` · `count=3`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=require_professional_validation` · `count=3`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=BLOCK_OR_REGRESS` · `count=2`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=MANUAL_ONLY` · `count=2`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=REQUIRE_PRO_VALIDATION` · `count=2`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=avoid_extra_grip_load` · `count=2`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=regress_next` · `count=2`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=BLOCK_METHODS` · `count=1`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=REGRESS_OR_BLOCK` · `count=1`
- `kind=action_off_vocab` · `sheet=Gates` · `column=action` · `value=BLOCK_UNTIL_WARMUP` · `count=1`
- ... y 35 más

### cross_column_contamination · error · ❌ 104 findings

Sample:

- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-001` · `row_id=EX-SCAP-001`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-001` · `row_id=EX-SCAP-002`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-002` · `row_id=EX-SCAP-003`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-003` · `row_id=EX-SCAP-004`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-001` · `row_id=EX-SHO-001`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-001` · `row_id=EX-SHO-002`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SCAP-003` · `row_id=EX-SHO-003`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-002` · `row_id=EX-SHO-004`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-005`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-006`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-007`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-008`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-009`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-010`
- `kind=risk_level_has_id` · `sheet=Exercises` · `column=risk_level` · `value=PR-SHO-003` · `row_id=EX-SHO-011`
- ... y 89 más

### gates_column_populated · error · ✅ OK

**Pendientes (categorías no-curadas, info · no bloquean):**

- `Fuerza de dedos / Hangboard` · 62 ejercicios sin gate
- `Tracción y dominadas` · 42 ejercicios sin gate
- `Antebrazo, muñeca y codo` · 38 ejercicios sin gate
- `Fuerza general / piernas / acondicionamiento` · 36 ejercicios sin gate
- `Hombros / Escápulas` · 33 ejercicios sin gate
- `Core` · 32 ejercicios sin gate
- `Campus y potencia específica` · 30 ejercicios sin gate
- `Escápulas / Hombros` · 4 ejercicios sin gate
- `Hombros / Manguito rotador` · 2 ejercicios sin gate
- `Hombros / Movilidad activa` · 1 ejercicios sin gate

### dosage_completeness · error · ❌ 52 findings

Sample:

- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-001` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-002` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-003` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-004` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-005` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-006` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-CAMP-007` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-001` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-002` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-003` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-004` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-005` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-006` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-007` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- `kind=active_no_dosage` · `sheet=Protocols` · `row_id=PR-POW-008` · `status=Lista con restricciones` · `detail=Activo sin ningún campo de dosis poblado` · `level=error`
- ... y 37 más

**Warnings (63):**

- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-001` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-008` · `populated=work_interval, rest_interval, reps, intensity` · `missing=sets`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-011` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-012` · `populated=work_interval, sets, reps, intensity` · `missing=rest_interval`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-013` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-014` · `populated=work_interval, intensity` · `missing=rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-015` · `populated=work_interval, intensity` · `missing=rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-016` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-017` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- `kind=partial_dosage` · `sheet=Protocols` · `row_id=PR-HB-018` · `populated=intensity` · `missing=work_interval, rest_interval, sets, reps`
- ... y 53 más

### relationships_orphans · error · ❌ 2 findings

Sample:

- `kind=from_id_orphan` · `sheet=Relationships` · `count=76` · `sample=REL-S8-001: uses_category | REL-S8-002: uses_category | REL-S8-003: uses_category | REL-S8-004: uses_category | REL-S8-005: uses_category | REL-S8-006: uses_category | REL-S8-007: uses_category | REL-S8-008: uses_category | REL-S8-009: uses_category | REL-S8-010: uses_category | REL-S8-011: uses_category | REL-S8-012: uses_category | REL-S8-013: uses_category | REL-S8-014: uses_category | REL-S8-015: uses_category | REL-S8-016: uses_category | REL-S8-017: uses_category | REL-S8-018: uses_category | REL-S8-019: uses_category | REL-S8-020: uses_category`
- `kind=to_id_orphan` · `sheet=Relationships` · `count=195` · `sample=REL-S6-167: PR-WALL-001 | REL-S6-171: PR-WALL-002 | REL-S6-175: PR-WALL-003 | REL-S6-179: PR-WALL-001 | REL-S6-183: PR-WALL-001 | REL-S6-187: PR-GEN-001 | REL-S6-191: PR-PREHAB-001 | REL-S6-195: PR-GEN-001 | REL-285: SRC-017; SRC-020 | REL-287: SRC-015; SRC-016 | REL-288: SRC-015; SRC-016 | REL-289: SRC-015; SRC-016 | REL-291: SRC-016; SRC-CONV-TRACCION | REL-292: SRC-018; SRC-CONV-TRACCION | REL-293: SRC-018; SRC-CONV-TRACCION | REL-306: SRC-013; SRC-016 | REL-307: SRC-013; SRC-CONV-TRACCION | REL-310: SRC-015; SRC-CONV-TRACCION | REL-318: EX-PULL-001; EX-PULL-039 | REL-320: EX-PULL-014; EX-PULL-015`

### golden_cases_smoke · error · ✅ OK

> PENDIENTE post-Fase-2. GC-001 a GC-007 deben producir su expected_focus.
