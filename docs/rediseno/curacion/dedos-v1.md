# Curación · fuerza-dedos (62 EX) · v1

**Archivo base:** `docs/biblioteca-maestra-v3.1.xlsx` → `APP_ExerciseCatalog`
**Rebanada de validación (vertical slice).** Todo lo demás espera.
**Estado:** equipment resuelto · niveles/gates = decisión de arquitectura (ver §3, confirmada 2026-07-19).

---

## 1. Equipment — 6 filas fuera de catálogo (RESUELTAS)

| exercise_id | valor viejo | → valor nuevo | nota |
|---|---|---|---|
| EX-FIN-027 | Borde estable | `hangboard` | es un borde, mapeo directo |
| EX-FIN-031 | Pinch ball/block | `pinch_block` | **enum NUEVO** |
| EX-FIN-033 | Bloque/volumen | `pinch_block` | **enum NUEVO** (misma familia pinza) |
| EX-FIN-043 | System wall | `gym` | colapsado; no abrimos `system_board` |
| EX-FIN-061 | Dinamómetro | `dynamometer` | **enum NUEVO**, solo-test |
| EX-FIN-062 | Dinamómetro específico | `dynamometer` | **enum NUEVO**, solo-test |

**Enums a agregar al vocabulario `equipment`:** `pinch_block`, `dynamometer`.
Las otras 56 filas de equipment ya están limpias (`hangboard`, `bands`, `weights`, `pullup_bar`, `gym`, `rock`, `home`).

## 2. Contaminación — 1 fila (a MANUAL_REVIEW · dev)

- **EX-FIN-057** · `dosage_default = "GT-FIN-002"` → es un **ID de gate metido en el campo de dosis**. Inválido. Necesita el ID correcto de protocolo/test. No lo invento — lo dejo marcado para el dev.

## 3. Niveles y gates — la simplificación (CONFIRMADA 2026-07-19)

- Los 62 tienen `level_min/max` **vacíos** y `gates` **vacíos**.
- Pero los 62 tienen `risk_level` **limpio** (`low-medium` / `medium` / `medium-high` / `high`).
- **Confirmado con dev:** `lib/brain/motor-inverted/restrict-pool.ts:68` filtra por `riskWithinMax(ex.riskLevel, focus.maxRiskLevel)`. Con `risk_level` limpio + focus (FR-001/002/004) + flujo dolor semáforo, dedos queda cubierto. NO se llenan niveles ni gates fila-por-fila para el MVP.
- **Excepción futura:** condiciones que `risk_level` no captura (ej. edad<16 → bloquear todo `high` y `medium-high`) sí requieren gate específico, pero no aplica al set inicial de dedos.

## 4. Resto de la categoría — ya limpio (no tocar)

- `risk_level`: canónico en los 62. ✓
- `dosage_default`: son referencias a protocolos/tests (`PR-HB-*`, `TS-FIN-*`, `PR-WALL-*`, etc.) — diseño esperado, la dosis vive en `APP_ProtocolCatalog`. ✓ (salvo EX-FIN-057, §2)
- `status`: `active` en los 62 (bajará a 61 activos + 1 manual_review tras aplicar §2). ✓

---

**Definition of done de esta hoja:** §1 aplicado + §2 resuelto por dev + §3 confirmado. Con eso dedos entra al mini-test end-to-end.

## Cambios aplicados por dev (2026-07-19)

- `scripts/rediseno/regenerate_v31.py`:
  - `EQUIPMENT_SUBSTRING_MAP`: "bloque/volumen" y "bloque / volumen" apuntan a `pinch_block` (antes → `gym` por error de regen v1). "borde estable" → `hangboard`, "system wall" → `gym`, "dinamómetro" y "dinamómetro específico" → `dynamometer`, "pinch ball/block" → `pinch_block` ya estaban.
  - `FORCED_MANUAL_REVIEW_IDS`: agrega `EX-FIN-057` (deload de dedos con dosage inválido).
- Re-corrido regenerador → `docs/biblioteca-maestra-v3.1.xlsx` actualizado.
- Re-generado `data/catalog-v3.1.json` (bundled del motor) con los mapeos aplicados.
