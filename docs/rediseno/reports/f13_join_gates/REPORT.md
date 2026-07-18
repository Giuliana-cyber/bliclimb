# Reporte JOIN Exercise → Gates (v2 · con distinción canónico/débil)

**Fuente**: `docs/biblioteca-maestra-LATEST.xlsx`
**Fecha**: 2026-07-15 · Fase 1 · Task F1.3
**Relaciones canónicas** (gate real de seguridad): ['BLOCKED_BY', 'CONTROLLED_BY', 'GOVERNED_BY']
**Relación débil** (columna aparte, uso en chat/búsqueda): ['RELATED_TO']

> Un gate de seguridad debe ser deliberado, no un vínculo casual — evitamos seguridad falsa.
> RELATED_TO se persiste en `gates_related_to` para uso en búsqueda/chat, NUNCA como gate real.
> Cuando Giuliana cure cada categoría, promueve los relevantes a canónicas.

## Cobertura por gates CANÓNICOS (los que gatean seguridad real)

- Ejercicios totales: **582**
- Ejercicios con ≥1 gate canónico: **204** (35%)
- Ejercicios con 0 gates canónicos: **378** (64%)
- De estos, con ≥1 gate débil (RELATED_TO): **164**

## Cobertura de gates (¿cuántos gates hay conectados?)

- Gates totales en catálogo: **315**
- Gates referenciados como canónico: **69**
- Gates referenciados solo como débil: **86**
- Gates huérfanos (nunca referenciados): **160**

## Relaciones consumidas

- `BLOCKED_BY` (canónica): 402
- `CONTROLLED_BY` (canónica): 36
- `GOVERNED_BY` (canónica): 19
- `RELATED_TO` (débil): 216

## Distribución de gates canónicos por ejercicio

| # gates canónicos | # ejercicios |
|---:|---:|
| 0 | 378 |
| 1 | 138 |
| 3 | 66 |

## Issues detectados

- Total issues: **173**
  - `from_id_not_exercise`: 173

## Gates huérfanos (para revisión)

Total: **160** gates definidos pero nunca referenciados desde ejercicios.

```
GT-CAMP-001
GT-CAMP-002
GT-CAMP-003
GT-CAMP-004
GT-CAMP-005
GT-CAMP-006
GT-CAMP-007
GT-CAMP-008
GT-CAMP-009
GT-CAMP-010
GT-CAMP-011
GT-CAMP-012
GT-CAMP-013
GT-CAMP-014
GT-CAMP-015
GT-CAMP-016
GT-CAMP-017
GT-CAMP-018
GT-CAMP-019
GT-CAMP-020
GT-CORE-001
GT-CORE-002
GT-CORE-003
GT-CORE-004
GT-CORE-005
GT-CORE-006
GT-CORE-007
GT-CORE-008
GT-CORE-009
GT-CORE-010
GT-CORE-011
GT-CORE-012
GT-CORE-013
GT-CORE-014
GT-CORE-015
GT-CORE-016
GT-CORE-017
GT-CORE-018
GT-CORE-019
GT-CORE-020
GT-FIN-003
GT-FIN-004
GT-FIN-005
GT-FIN-006
GT-FIN-007
GT-FIN-008
GT-FIN-009
GT-FIN-010
GT-FIN-011
GT-FIN-012
... y 110 más (ver `orphan_gates.csv`)
```

## Archivos generados

- `exercise_gates_mapping.json` — mapping completo (source of truth)
- `exercise_gates_review.csv` — CSV amigable con 582 filas para revisión editorial
- `issues.csv` — issues detectados durante el JOIN
- `orphan_gates.csv` — gates definidos sin referencias

## Próximo paso

1. Giuliana revisa `exercise_gates_review.csv` (foco: filas con 0 gates + filas con muchos gates)
2. Giuliana aprueba/ajusta antes de que el mapping se persista en `APP_ExerciseCatalog.gates`
3. Una vez aprobado, la próxima regeneración de v3.1 popula la columna `gates`