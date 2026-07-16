# Vocabularios canónicos · BilClimb v-next

**Versión**: 1.0 · Aprobados por Giuliana el 2026-07-15 · Cerrados.
**Base**: [BilClimb Documento Canónico del Rediseño](../bilclimb-documento-canonico-rediseno.md) · Biblioteca Maestra v3.0 CONSOLIDADA.
**Uso**: fuente única de verdad para el motor invertido. Cualquier valor fuera de estos vocabularios en el catálogo v3.0 falla el QA_AUDIT extendido.

Los 7 vocabularios son **cerrados** — cualquier ampliación requiere aprobación editorial de Giuliana y bump de versión de este documento.

---

## 1 · `equipment_token` (9 tokens · español)

Alineado con los 9 tokens del catálogo actual de Supabase. El catálogo y la app hablan el mismo idioma.

```
gym, hangboard, campus, weights, rock, home, bands, pullup_bar, trx
```

**Regla de aplicación**: cada ejercicio tiene un array `equipment_tokens[]` con subset de estos 9. `gym` es implícito por decisión de producto (BilClimb requiere acceso a rocódromo, ver Decisión #1 del canónico) — se persiste igual en el array por consistencia.

---

## 2 · `category` (15 valores · español · kebab-case)

Única excepción en español porque es la categoría más cercana a la UI.

```
fuerza-dedos
traccion
antebrazo-muneca-codo
fuerza-general
resistencia-fuerza
power-endurance
hombros-escapulas
core
tecnica-escalada
calentamiento
recuperacion
campus-potencia
movilidad
prevencion
mental
```

**Reglas de fusión aplicadas** (versus 62 valores actuales en v3.1):
- `Hombros / Escápulas` + `Escápulas / Hombros` + `Hombros / Manguito rotador` + `Hombros / Movilidad activa` → `hombros-escapulas`
- `ARC` + `ARC/Técnica` → `tecnica-escalada` (con tag `arc` si aplica)
- `Hangboard` NO es categoría (es equipo) — se elimina como valor de category
- `Calentamientos` (plural) → `calentamiento`
- `Trabajo mental` → `mental`
- `Prevención de lesiones general` → `prevencion`

---

## 3 · `subcategory` — ELIMINADA

Decisión editorial: 235 valores únicos en 582 filas (40% cardinalidad) equivalen a identificador por fila. **No sirve como enum**.

La granularidad que aportaba vive en:
- `GripTypes` (13 valores) — tipo de agarre
- `EdgeTypes` (12 valores) — tipo de borde
- `objective` — texto libre editorial

Si en el futuro se necesita más granularidad, se agrega vía tags controlados en `Tags` (ya existe).

---

## 4 · `severity` (4 valores · inglés) + `is_warning` (boolean)

Consolida 15 valores actuales (3 idiomas × 2 casings). Escala en inglés para alinear con `action`, `risk_level`, `equipment_token`.

```
critical
high
medium
low
```

**Reglas de fusión aplicadas**:
- `Crítico` + `Crítica` + `critical` + `blocker` → `critical` (106 filas hoy)
- `Alto` + `Alta` + `high` → `high` (79 filas hoy)
- `Medio` + `Media` + `medium` → `medium` (62 filas hoy)
- `Bajo` + `Bajo-medio` + `low` + `Media-alta` → `low` (8 filas hoy)

### `is_warning` boolean separado

`warning` (60 filas en v3.1) **no es severidad** — es un flag que indica que el gate emite advertencia en UI sin bloquear ni regresar. Se persiste en columna separada `is_warning: boolean`.

---

## 5 · `action` (13 valores · inglés) — extiende `GatePrecedence`

Consolida 83 actions distintas usadas en Gates v3.1 al vocabulario canónico del `GatePrecedence` extendido. Cierra la Deuda #13 (GatePrecedence desactualizado vs actions usadas).

| Action | Semántica | Mapeo a CandidateState |
|---|---|---|
| `STOP_SESSION` | Parar sesión inmediatamente | `BLOCKED` (terminal) |
| `BLOCK` | No incluir candidato en el plan | `BLOCKED` (terminal) |
| `MANUAL_REVIEW` | No automatizar; requiere coach | `MANUAL_REVIEW` (terminal) |
| `STOP_OR_REGRESS` | Ambigua: dolor→stop, técnica→regress (condicional) | `BLOCKED` o `ADAPTED` según sub-señal |
| `REGRESS` | Sustituir por versión más fácil (via `regression_target_id`) | `ADAPTED` |
| `ADJUST_VOLUME` | Reducir sets/reps/intensidad | `ADAPTED` |
| `HOLD` | No usar hoy, reevaluar | `HELD` |
| `SUBSTITUTE` | Cambiar por otro ejercicio del pool | `ADAPTED` |
| `DEPRIORITIZE` | Mantener elegible con menor rank | `ELIGIBLE` (bajo rank) |
| `REQUIRE_TECHNIQUE_DRILL` | Antes de habilitar, exigir drill técnico | `ADAPTED` |
| `REORDER` | Reordenar en la sesión (SessionBuilder) | `ADAPTED` |
| `CUE_ONLY` | Mostrar cue educativo, sin bloquear | `ELIGIBLE` |
| `ALLOW_ONE_VARIABLE_ONLY` | Permitir progresión de una sola variable | `ELIGIBLE` (con restricción) |

**Mapeo de variantes actuales a canónicos**: documentado en el script `scripts/rediseno/qa_audit_v30.py` (tabla `ACTION_ALIASES`).

---

## 6 · `structure` en Protocols (5 valores · inglés)

Reemplaza 55 valores prosa actuales.

```
warmup      · calentamiento previo
main        · bloque principal (carga específica del enfoque)
finisher    · bloque final (accesorio/complemento)
cooldown    · enfriamiento
standalone  · protocolo que ES la sesión completa (ej: ARC continuo, test day)
```

---

## 8 · `status` (4 valores · inglés) — nuevo, aprobado 2026-07-15

Consolida los valores actuales de `status` / `app_status` (mezcla de idiomas
y frases: `Activo`, `active`, `Lista con restricciones`, `restricted`,
`MVP`, `Producción restringida`, `Serrato anterior`, etc. — 40+ valores).

```
active          · publicable a usuarios, motor puede prescribir
manual_review   · existe pero requiere coach humano (dosis vacía, riesgo alto sin señales_detener, etc.)
draft           · en curación, no publicable
deprecated      · retirado, solo referencia histórica
```

**Corto plazo**: la heurística del QA infiere `active` cuando el valor
crudo contiene "MVP" / "Producción" / "Activo" / "Lista", y `manual_review`
cuando contiene "Manual" / "Bloqueado" / "No automático". `dosage_completeness`
promueve a `manual_review` si un protocolo tiene 0/5 dosis.

**Siguiente sprint**: el regenerador aplica el enum canónico en v3.1 y el
QA lee de ahí directamente (no de la heurística). Cuando eso esté firme,
Giuliana adopta el enum en v3.0 también.

Aplica a: Exercises, Protocols, Tests, Gates, Sources.

---

## 7 · `risk_level` (5 valores · inglés)

Reemplaza 75 valores actuales (Exercises) + 9 (Protocols). Mismo idioma que `severity` — son la misma escala de riesgo.

```
low          · nulo riesgo lesión
low-medium   · bajo con precaución
medium       · moderado (requiere stop_signals obligatorio)
medium-high  · elevado (requiere gates activos)
high         · alto (requiere MANUAL_REVIEW o gate crítico)
```

**Reglas de fusión aplicadas** (versus 75 valores en Exercises v3.1):
- `medio` + `Medio` → `medium`
- `Alto` + `alto` → `high`
- `Bajo` + `Bajo-medio` → `low` o `low-medium` según caso
- `Medio-alto` → `medium-high`
- IDs de protocolo (`PR-SHO-003` en 32 filas, `PR-SCAP-*`, `PR-SHO-*`) → **erratas de columna cruzada** (ver QA `cross_column_contamination`)

---

## Contra-referencia con QA_AUDIT extendido

Los 8 vocabularios son la fuente de verdad para los checks:

| QA check | Vocabulario que valida |
|---|---|
| `domain_check_category` | #2 · 15 valores |
| `domain_check_equipment` | #1 · 9 tokens |
| `domain_check_severity` | #4 · 4 valores + is_warning bool |
| `action_vocabulary_check` | #5 · 13 canónicos |
| `domain_check_structure` | #6 · 5 valores |
| `domain_check_risk_level` | #7 · 5 valores |
| `subcategory_removed` | #3 · columna eliminada del schema |
| `casing_normalization` | Aplica a todos (case-sensitive checks) |

---

## Cambios respecto de v3.1 APP_READY

| Vocabulario | Actual v3.1 | Este documento | Reducción |
|---|---:|---:|---:|
| `equipment` | 211 valores | 9 tokens | ×0.04 |
| `category` | 62 | 15 | ×0.24 |
| `subcategory` | 235 | eliminada | 0 |
| `severity` | 15 | 4 + is_warning | ×0.27 |
| `action` | 83 | 13 | ×0.16 |
| `structure` | 55 | 5 | ×0.09 |
| `risk_level` | 75 | 5 | ×0.07 |

---

## Cambios futuros

Cualquier ampliación (agregar un valor a un vocabulario cerrado) requiere:
1. Aprobación editorial de Giuliana
2. Bump de versión de este documento (`1.0` → `1.1` mínor / `2.0` si es breaking)
3. Actualización paralela del QA_AUDIT extendido
4. Migración de las filas afectadas al nuevo vocabulario en la misma sesión

No se aceptan valores "de facto" — cualquier valor fuera del vocabulario canónico falla el QA en el CI de curación de Giuliana.
