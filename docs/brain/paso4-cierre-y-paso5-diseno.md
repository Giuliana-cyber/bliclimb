# Paso 4 · Cierre completo + Paso 5 · Diseño del matcher aprobado

**Snapshot:** 2026-07-13
**Propósito:** documento auto-contenido para offline. Consolida el cierre del Paso 4 (limpieza reglas + mapping BlockedCategory + FT-006), las 4 deudas descubiertas (#9-#12), el checklist de aceptación del Paso 5 (6 huecos), y el diseño del matcher híbrido aprobado por Giuliana.

---

## Tabla de contenidos

1. [Cierre del Paso 4](#1-cierre-del-paso-4)
2. [Deudas nuevas descubiertas](#2-deudas-nuevas-descubiertas-9-12)
3. [Checklist de aceptación del Paso 5](#3-checklist-de-aceptación-del-paso-5-6-huecos)
4. [Diseño del matcher híbrido](#4-diseño-del-matcher-híbrido-paso-5)
5. [Cómo cada nivel de fallback respeta los 6 huecos](#5-cómo-cada-nivel-de-fallback-respeta-los-6-huecos)
6. [Metadata nueva a agregar en Paso 5](#6-metadata-nueva-a-agregar-en-paso-5)
7. [Plan de implementación](#7-plan-de-implementación-del-bloque-completo-del-paso-5)

---

## 1) Cierre del Paso 4

**Estado:** cerrado del todo con 3 migraciones aplicadas.

### 1.1 · Migraciones aplicadas

| Migración | Objetivo | Verificación |
|---|---|---|
| `0024_paso_4_delete_reglas_duplicadas.sql` | DELETE de 20 filas `tipo_registro='regla'` verificadas WIRED end-to-end en `lib/brain/rules/*.ts` con evidencia file:line por row | Aplicada · reglas 44 → 24, total 482 → 462 |
| `0025_paso_4_tags_riesgo_lesion.sql` | 35 tags `riesgo-lesion:<subtipo>` aplicados: 25 `hangboard-intense`, 9 `pullups-weighted`, 1 `hit` | Aplicada · conteos verificados |
| `0026_paso_4_reclasificar_ft006.sql` | FT-006 mis-tag regla→ejercicio + 5 canónicas (`fuerza-traccion` / `avanzado` / `entrenamiento` / `principal` / `[pullup_bar]`) + tag `riesgo-lesion:pullups-weighted` | Aplicada · reglas 24 → 23, ejercicios 264 → 265 |

### 1.2 · Método aplicado (durabilidad sobre velocidad)

- **44 filas `tipo_registro='regla'` (post-FIL-004)** analizadas una por una con evidencia file:line contra `lib/brain/rules/`.
- Corte final: **20 borradas** (WIRED end-to-end), **23 conservadas** (18 editorial + 5 por gap de motor), **1 reclasificada** (FT-006).
- Verificación cruzada por Giuliana en 3 iteraciones antes de cada DELETE: primero corte de 14 arrastrado, luego reconciliado a 15, finalmente a 20 tras audit fila por fila.
- Regla de oro que emergió: **nunca borrar la constancia de una regla cuya lógica no llega a ejecutarse**. Aunque el check exista en código, si su verdict se descarta antes de tocar un ejercicio, la fila se conserva como recordatorio del gap.

### 1.3 · Mapping BlockedCategory → catálogo (0025)

Las 8 categorías del enum `BlockedCategory` (`lib/brain/types.ts:16-24`) se materializan de dos formas:

| Categoría enum | Se identifica por | Filas en catálogo |
|---|---|---|
| `hangboard-intense` | Tag `riesgo-lesion:hangboard-intense` | 25 (max hangs + repeaters intensos + one-arm + recruitment) |
| `pullups-weighted` | Tag `riesgo-lesion:pullups-weighted` | 10 (dominadas con lastre + lock-offs + Frenchies + uneven + FT-006 post-0026) |
| `hit` | Tag `riesgo-lesion:hit` | 1 (FM-014) |
| `full-crimp` | Sin filas — catálogo no prescribe crimp cerrado | 0 |
| `finger-training-any` | `categoria_canonica='fuerza-dedos'` | 47 (por categoría, sin tag propio) |
| `campus` | `categoria_canonica='campus'` | 14 (por categoría) |
| `hangboard` | `equipo_canonico @> array['hangboard']` | ~35 (por equipo) |
| `max-tests` | `tipo_registro='test'` con IDs específicos | 0 ejercicios (todos son tests, no llegan al pool) |

### 1.4 · Verificación de "sin tag riesgo-lesion" (78 rows)

Revisión row-by-row con Giuliana de los 78 ejercicios de las 5 categorías bloqueables (fuerza-dedos, fuerza-traccion, campus, potencia, boulder) que NO llevan tag `riesgo-lesion:*`. Categorías obviamente seguras (movilidad, técnica, core, hombros-escapulas, muñecas-antebrazos, piel, resistencia-aerobica, resistencia-anaerobica) excluidas por diseño — no cargan polea/tendón/codo.

Correcciones aplicadas post-revisión:
- Añadidos a `hangboard-intense`: HB-ABRA (60-70% TUL alto), HB-005 (SubHangs 70-80%), HB-753 (Lattice ~80%).
- Añadidos a `pullups-weighted`: FTP-001 (añade lastre al final), FM-003 (pull-up pesado 5RM).
- Confirmados sin tag: RH-004, RH-005 (rehab por dimensión propósito), FM-012 (system training cubierto por finger-training-any), FT-008 (boulder sin pies — hueco del enum), FT-RINGDIP (push fuera de scope).

---

## 2) Deudas nuevas descubiertas (#9-#12)

### 2.1 · Deuda #9 · Fracciones del BrainContext descartadas antes de llegar al motor

`evaluateProfile()` acumula 4 tipos de output en `BlockingContext` pero **solo uno** llega a la generación real. Detectado con grep sobre `lib/` y `app/`:

```
grep -rn "gripRestrictions\|trainingPriorities\|intensityAdjustments\|blockedExercises" --include="*.ts"
```

fuera de `lib/brain/{types,validator,rules,orchestrator}` no matchea nada. Único consumo del `brainContext` en `app/api/generate-plan/route.ts:941`:

```typescript
const blockedCategoriesForPrompt = Array.from(brainContext.blockedCategories);
```

Los demás sets se computan, se persisten en el ctx, y se descartan.

**4 gaps concretos:**

1. **§1.3 `blockedZones` no se traduce a IDs.** `check_1_3` emite `block-zone: {fingers-pulleys, elbow, shoulder}` pero `translateCategoriesToGating` solo traduce `BlockedCategory`, no `BlockedZone`. Reglas afectadas: DP-R004, HB-S005.

2. **§5.2 `gripRestrictions` no se inyectan al prompt.** `check_5_2` emite `no-small-crimps-below-15mm` pero no se pasa a `generateWeek()`. Reglas afectadas: HB-S004, DP-S001.

3. **§5.3/§5.4 `trainingPriorities`/`intensityAdjustments` no se inyectan al prompt.** §5.3 tiene mitigación colateral vía §14.2. §5.4 (sueño <5h) no tiene mitigación — se descarta silenciosamente.

4. **`blockedExercises` (exactIds/prefixes) computados por section-02 no se consumen.** La red posterior `section01PlanGating` compara `exercise.blockCategory` enum, no usa el matcher de IDs. Un LLM que inventa nombre con `blockCategory='strength'` en vez de `'max-tests'` no queda atrapado.

### 2.2 · Deuda #10 · Potencia máxima con contact strength sin BlockedCategory

Rows PO-DEADSTOP y PO-POWERPU (intensidad Máxima, riesgo Alto, `categoria_canonica='potencia'`, `nivel_canonico='avanzado'`) no están cubiertos por ninguna BlockedCategory. Verificación cruzada:
- `campus` bloquea prefijo `CB-` → no matchea.
- `hit` bloquea IDs literales `['FM-014', 'PF-FM-005']` → no matchea.
- `pullups-weighted` bloquea IDs literales `['FT-002', 'FTE-002']` → no matchea.

**Consecuencia:** un menor u16 no queda bloqueado de PO-DEADSTOP ni PO-POWERPU. Solo el filtro `nivel_canonico='avanzado'` los aleja del principiante — red débil, no determinística.

**Cierre en Paso 5:** agregar `power-max` al enum `BlockedCategory` + taggear las 2 filas + extender §1.1/§1.2 `RULE_1_*_CATEGORIES`.

### 2.3 · Deuda #11 · `proposito='rehab'` no filtrado en el motor

```
grep -rEn "proposito" lib/ app/ | grep -v test | grep -v node_modules
```

retorna cero. Ningún código del motor filtra por `proposito`.

**Filas afectadas (11):** RH-001, RH-004, RH-005, RH-P001, RH-P002, HB-REHAB-A2A4, HB-ISO-RECOV, HB-DENS, HB-PROT, PR-003, TC-FOFF.

**Regla operativa (Giuliana, 2026-07-11):**
> "Los ejercicios `proposito='rehab'` solo se ofrecen a perfiles con lesión declarada, nunca a sanos."

**Cierre en Paso 5:** filtro duro en pool del motor. Excluir `proposito='rehab'` a menos que perfil cumpla al menos una de:
- `injuries` no vacío
- `currentFingerPain >= 3`, `currentElbowPain >= 3`, `currentShoulderPain >= 3`

### 2.4 · Deuda #12 · §2.4 (gating por prerrequisito de reps) sin código ni campo de perfil

Doc 02 §2.4: *"Condición: ejercicio FT-006 o equivalente. Acción: desbloquear sólo si usuario completa ≥15 dominadas estrictas por serie."*

Grep sobre `lib/brain/rules/` (2026-07-11): cero matches para FT-006, "15 dominadas", "one-arm" como gating, "§2.4" como número de regla.

**Gap doble:**
1. No hay check emisor.
2. `ProfileForRules` no captura reps de dominada — la señal no existe en runtime.

**Filas afectadas:** FT-006 (reclasificada a ejercicio en 0026), FTP-004 (concepto editorial).

**Interim:** `nivel_canonico='avanzado'` es la barrera única — débil, depende del LLM.

**Cierre:**
1. Onboarding capta `maxPullupReps`.
2. Migración schema `public.profiles` agrega `max_pullup_reps int`.
3. `ProfileForRules` incluye el campo.
4. `check_2_4` (nuevo módulo) emite `block-categories` cuando `maxPullupReps < 15`.

---

## 3) Checklist de aceptación del Paso 5 (6 huecos)

Paso 5 no está completo hasta que cada uno esté verificado cerrado con re-grep + migración de limpieza + update de deuda.

| Ítem | Filas afectadas | Gap | Cierra con |
|---|---|---|---|
| **A.1** | DP-R004, HB-S005 | §1.3 zone→ID | Extender section-02 con `BlockedZone` |
| **A.2** | HB-S004, DP-S001 | §5.2 grip→prompt | Pasar `BrainContext` completo a `generateWeek()` |
| **A.3** | REP-002 | §3.3/§3.4 no capturan frecuencia semanal | `check_3_freq_dedos` (depende Paso 6 `exerciseId`) |
| **B.1** | PO-DEADSTOP, PO-POWERPU | Falta `power-max` en enum | Ampliar `BlockedCategory` + taggear |
| **B.2** | 11 rows rehab/prevencion | `proposito` no filtrado | Filtro duro en pool del motor |
| **C.1** | FT-006, FTP-004 | §2.4 sin código + falta campo `maxPullupReps` | Nuevo campo de perfil + `check_2_4` |

**Total filas del catálogo en observación:** 20 (5 conservadas por gap end-to-end + 2 sin categoría del enum + 11 con proposito no filtrado + 2 sin prerrequisito de reps implementado). Cerrar los 6 huecos las libera todas para reevaluación / borrado en migraciones posteriores.

---

## 4) Diseño del matcher híbrido (Paso 5)

**Arquitectura general:** Bill (el LLM) razona en libertad → un resolver puro y determinístico mapea la propuesta a una fila real del catálogo → el usuario recibe siempre un ejercicio curado con `howTo/cues/commonMistakes/nivel/riesgo`. El resolver es la única vía al catálogo.

### 4.1 · Modelo mental

```
Bill (LLM)                    resolveToCanonical(exercise, ctx)              Usuario
──────────►                                                                  ──────────►
{                             ┌──────────────────────────────┐               {
  name: "Max hangs 20mm",     │ 1. GATE FILTERS (6 huecos)   │                 id: "HB-002",
  suggestedCategory:          │ 2. EQUIPO ∩ perfil            │                 name (curated),
    "fuerza-dedos",           │ 3. NIVEL ≤ perfil             │                 howTo,
  stimulusCategory:           │ 4. MOMENTO del bloque         │                 cues,
    "strength",               │ 5. RANKING semántico          │                 commonMistakes,
  blockCategory:              │ 6. TOP-1 o FALLBACK L2→L3→L5  │                 nivel: "avanzado",
    "hangboard-intense",      └──────────────────────────────┘                 riesgo: "Alto"
  momento: "principal"                                                       }
}                             pool = public.exercises
                              filtrado por matcher
                              +
                              lib/brain/rules/*.ts
                              (defensa en profundidad
                               como red posterior)
```

**Dos capas coexisten:**

1. **Matcher (materializa)** — filtra el pool que llega al usuario. Determinístico. Nadie evita esta capa. Aquí es donde se cierran operativamente los 6 huecos.
2. **Rules `lib/brain/rules/*.ts` (valida)** — recorren el plan generado y disparan retry si algo se coló. Defensa en profundidad para "el matcher tiene un bug" o "el LLM fabrica un `exerciseId` inventado".

### 4.2 · Filtros del matcher (en orden)

**Precondición:** `FastExerciseSchema` extendido para que Bill emita `suggestedCategory: CategoriaCanonicaEnum` **obligatoria** (los 15 buckets).

#### Filtro 1 · Gate (los 6 huecos)

Cada uno es un WHERE additivo sobre `public.exercises`:

| Hueco | Filtro |
|---|---|
| **A.1** zone→ID | Si `ctx.blockedZones` contiene `fingers-pulleys` → excluir `categoria_canonica='fuerza-dedos'`. Si contiene `elbow` → excluir `categoria_canonica IN ('fuerza-traccion', 'campus')`. Si contiene `shoulder` → excluir `equipo_canonico @> array['hangboard']` con `nivel_canonico ∈ ('intermedio-avanzado', 'avanzado')`. |
| **A.2** gripRestriction | Si `ctx.gripRestrictions` contiene `no-small-crimps-below-15mm` → excluir rows con tag `carga:regleta-pequena`. |
| **A.3** §3.freq-dedos | **Plan-level, NO matcher-level.** Vive en `check_3_freq_dedos` post-generación con retry. Depende de `exerciseId` persistido (Paso 6). |
| **B.1** power-max | Si `ctx.blockedCategories` contiene `power-max` → excluir rows con tag `riesgo-lesion:power-max`. |
| **B.2** proposito='rehab' | Excluir `proposito ∈ {rehab}` a menos que perfil cumpla al menos una de: `injuries` no vacío, `currentFingerPain ≥ 3`, `currentElbowPain ≥ 3`, `currentShoulderPain ≥ 3`. |
| **C.1** §2.4 maxPullupReps | Excluir rows con tag `prerequisito:15-pullups` si `profile.maxPullupReps < 15` **o es null** (conservador). |

Categorías del enum ya wired end-to-end antes del Paso 4 quedan reforzadas: `hangboard`, `hangboard-intense`, `campus`, `hit`, `pullups-weighted`, `full-crimp`, `finger-training-any`, `max-tests` → excluir por `blockCategory` enum o por tag `riesgo-lesion:<subtipo>`.

#### Filtro 2 · Equipo ∩ perfil

`equipo_canonico ⊆ perfil.equipment`. El array canónico del ejercicio tiene que estar contenido en lo que el usuario declaró en onboarding. Excepción: `equipo_canonico = array['home']` (peso corporal) pasa siempre.

#### Filtro 3 · Nivel canónico

`nivel_canonico ≤ nivel_perfil` según orden `principiante < principiante-intermedio < intermedio < intermedio-avanzado < avanzado`. Los `nivel_canonico='todos'` pasan siempre.

Para principiante (u16 o climbingTime <2 años): tope estricto en `principiante` + `principiante-intermedio`. Para adultos con más años: se relaja según años de práctica.

#### Filtro 4 · Momento del bloque

- Warmup → `momento='calentamiento'`.
- MainBlock → `momento='principal'`.
- Cooldown → `momento='enfriamiento'`.

Si Bill propone algo con `momento='calentamiento'` para el mainBlock, el matcher rechaza y dispara retry en el LLM (fallback L5).

### 4.3 · Ranking dentro del pool filtrado

Cuando hay múltiples candidatos, ordenar por:

1. **Match exacto de `categoria_canonica`** con `exercise.suggestedCategory`.
2. **Match de `stimulusCategory`** con `exercise.stimulusCategory` (columna derivada, ver §6.2).
3. **Nivel canónico**: match exacto (+2), adyacente inferior (+1), más distante (0).
4. **Proposito='entrenamiento'** > `proposito='prevencion'` — preferir el ejercicio de entrenamiento si hay ambos.
5. **Similaridad textual del nombre** (Levenshtein sobre `nombre + tags`) — SOLO tie-breaker.
6. **ID alfabético** — desempate final para determinismo.

Determinístico y explicable. Sin embeddings, sin ML.

### 4.4 · Fallback en escalera (4 niveles, SIN L4)

L4 (defaults por bloque con tabla curada) **se saltea** — decisión de Giuliana: "confiamos en L3 + L5 y medimos; si datos muestran que L4 se necesita, se agrega después".

| Nivel | Estrategia | Cuándo | Riesgo |
|---|---|---|---|
| **L1** | Match exacto: categoria + nivel + equipo + gates. Relajar similitud textual como tie-breaker si hay empate. | Camino normal | Cero |
| **L2** | Aceptar `nivel_canonico` adyacente inferior. Mantener resto. | Pool L1 = 0 | Bajo (más fácil, no más peligroso) |
| **L3** | Buscar en categoría emparentada por stimulus (`fuerza-dedos` → `fuerza-traccion`, `campus` → `potencia`, etc.) manteniendo gates. | Pool L2 = 0 | Medio (cambia el estímulo específico) |
| **L5** | Rechazar el ejercicio + disparar retry en el LLM con hint específico. | Pool L3 = 0 | Alto retry cost |

**Nunca** L6 (devolver nada). Si L5 falla dos veces → error explícito al usuario ("Tu perfil bloquea demasiado; ajustá el onboarding") con CTA para revisar edad/equipo/lesiones. Es el fallback #17 que ya existe hoy en `route.ts`.

---

## 5) Cómo cada nivel de fallback respeta los 6 huecos

**Principio invariante:** los filtros de gate son **DUROS en toda la escalera**. Nunca se relajan. Lo único que se relaja entre L1→L2→L3 son criterios de similitud/preferencia. Un ejercicio "parecido" no puede saltarse el gating por parecer más al que Bill propuso.

### 5.1 · Regla operativa

```
En cada nivel N ∈ {L1, L2, L3, L5}:
  pool_N = public.exercises
    WHERE gate_filters(A.1, A.2, B.1, B.2, C.1)   ← INVARIANTE
    AND   equipo_canonico ⊆ perfil.equipment      ← INVARIANTE
    AND   nivel_canonico compatible con perfil    ← relaja de L1 a L2
    AND   categoria_canonica compatible           ← relaja de L2 a L3
    AND   momento = bloque_solicitado             ← INVARIANTE

  Si |pool_N| = 0 → subir al siguiente nivel.
  Si |pool_N| > 0 → ranking + top-1.
  Nunca colar por saltar filtro de gate.
```

### 5.2 · Detalle por hueco × nivel

| Hueco | L1 | L2 | L3 | L5 |
|---|---|---|---|---|
| **A.1** zone→ID | Si `blockedZones` contiene `fingers-pulleys` → excluir `fuerza-dedos`. Si `elbow` → excluir tracción. Si `shoulder` → excluir hangboard avanzado. | Idéntico a L1 | Idéntico a L1 — L3 busca en categoría emparentada pero A.1 también las filtra por zone. Nunca propone hangboard a un dedo lesionado. | Rechazar. LLM debe reproponer sin categoría bloqueada. |
| **A.2** grip restriction | Si `gripRestrictions` contiene `no-small-crimps-below-15mm` → excluir tag `carga:regleta-pequena`. | Idéntico a L1 | Idéntico a L1 — L3 emparenta a otras categorías pero A.2 sigue filtrando tag de regleta pequeña. | Rechazar + LLM repropone sin regleta pequeña. |
| **A.3** §3.freq-dedos | **No aplica al matcher.** Post-generación. | Idem | Idem | Idem. Si plan tiene 4 sesiones de fuerza-dedos, `check_3_freq_dedos` dispara retry. |
| **B.1** power-max | Si `blockedCategories` contiene `power-max` → excluir tag `riesgo-lesion:power-max`. | Idéntico a L1 | Idéntico a L1 — L3 no puede caer a otro power-max de otra categoría. | Rechazar + LLM repropone sin dinámica máxima. |
| **B.2** proposito='rehab' | Excluir `proposito='rehab'` a menos que perfil tenga lesión o pain≥3. | Idéntico a L1 | Idéntico a L1 — perfil sano nunca recibe rehab. | Rechazar. |
| **C.1** §2.4 maxPullupReps | Si `profile.maxPullupReps < 15` o es null → excluir tag `prerequisito:15-pullups`. | Idéntico a L1 | Idéntico a L1 — FT-006/FTP-004 quedan fuera del pool en toda la escalera. | Rechazar + LLM repropone alternativa asistida. |

### 5.3 · Qué SÍ relaja la escalera

| Criterio | L1 | L2 | L3 | L5 |
|---|---|---|---|---|
| Match exacto `categoria_canonica` | ✓ | ✓ | Se relaja a emparentada por stimulus | LLM repropone |
| Match exacto `nivel_canonico` | ✓ | Acepta adyacente inferior | Acepta más distante inferior | LLM repropone |
| Similitud textual del nombre | Solo tie-breaker | Solo tie-breaker | Solo tie-breaker | N/A |
| Preferencia `proposito='entrenamiento'` sobre `'prevencion'` | ✓ | ✓ | Igualadas | N/A |

### 5.4 · Ejemplos caminados

#### Perfil con lesión de dedos (adulto experimentado) + Bill propone MaxHang

- **Perfil:** `injuries=['fingers']`, `climbingTime='more3'`, `age='adult'`, `equipment=['home','hangboard','pullup_bar']`.
- **BrainContext:** `gripRestrictions={no-small-crimps-below-15mm}`, `blockedZones=∅` (pain=0), `blockedCategories=∅`.
- **Bill propone:** `{name: "MaxHang 20mm 8s", suggestedCategory: "fuerza-dedos", stimulusCategory: "strength", momento: "principal"}`.

**Pipeline:**
1. **L1** — Pool con filtros gate:
   - A.1 no aplica (blockedZones vacío).
   - A.2 excluye tag `carga:regleta-pequena` → **fuera** los 9 firmes (DP-004, DP-005, DP-P003, DP-P004, FD-003, HB-003, HB-004, HB-P001, HB-P002).
   - B.1, B.2, C.1 no aplican para este perfil.
   - Equipo: `⊆ {home,hangboard,pullup_bar}` — muchos fuerza-dedos quedan.
   - Nivel: `avanzado` aceptable (climbingTime=more3).
   - Momento: `principal`.
   - Ranking por `categoria_canonica='fuerza-dedos'` exacto → probable match: HB-002 (MaxHangs 18-20mm), DP-003 (MaxHangs peso añadido regleta fija), FD-002 (18-20mm). Todos pasan y son `hangboard-intense` pero NO `carga:regleta-pequena`.
2. **Top-1** = HB-002 o DP-003 según ranking. **Se entrega al usuario con howTo/cues/mistakes reales.**
3. Nunca se llega a L2/L3/L5.

#### Menor u16 principiante lesionado + Bill propone MaxHang

- **Perfil:** `injuries=['fingers']`, `age='u16'`, `climbingTime='less1'`.
- **BrainContext:** `gripRestrictions={no-small-crimps-below-15mm}`, `blockedCategories={hangboard, campus, full-crimp, hit, finger-training-any, hangboard-intense, pullups-weighted, max-tests}` (§1.1 u16 + §1.2 <2 años acumulados), `blockedZones=∅`.
- **Bill propone:** `{name: "MaxHang principiante", suggestedCategory: "fuerza-dedos", ...}`.

**Pipeline:**
1. **L1** — `blockedCategories` excluye `fuerza-dedos` vía `hangboard-intense`/`hit`/`finger-training-any`. Pool = 0.
2. **L2** — Nivel adyacente (principiante): mismo filtro por gate. Pool = 0.
3. **L3** — Categoría emparentada por stimulus. `fuerza-dedos + strength` → `fuerza-traccion`, `boulder`. Filtros gate siguen activos.
   - `fuerza-traccion` a nivel principiante: FT-001 "Dominadas en barra", FTP-001 "Progresión de dominadas base". A.2 no aplica (no son dedos). `pullups-weighted` bloquea FTP-001 (tag). Pool = {FT-001}.
   - Top-1 = FT-001. **Entregado al usuario.**
4. Bill propuso dedos, el usuario recibe una dominada básica. Fue cambio de categoría, pero seguro y wired.
5. Si L3 también estuviera vacío → L5: rechazar y reproponer.

---

## 6) Metadata nueva a agregar en Paso 5

### 6.1 · Migración `0027_paso_5_tags_matcher.sql`

Aplica 3 tags nuevos + amplía enum en código:

#### `carga:regleta-pequena` · 9 filas firmes

Aprobado por Giuliana (2026-07-13): los 9 firmes ✓, los 6 ambivalentes ✗.

**Definición del tag:** profundidad ≤15mm / reduce profundidad como parámetro. NO intensidad general (esa ya está en `hangboard-intense`).

| ID | Evidencia literal |
|---|---|
| DP-004 | *"Ajustar intensidad reduciendo profundidad de regleta"* |
| DP-005 | *"ajustar profundidad para fallar o casi fallar al final"* |
| DP-P003 | *"Misma estructura que MaxHangs, pero ajustando profundidad"* |
| DP-P004 | *"regleta ajustada para casi fallo al final del set"* |
| FD-003 | *"MaxHangs con mínima profundidad — MED"* |
| HB-003 | *"Ajustar la profundidad en vez del peso"* |
| HB-004 | *"regleta que permita completar el set, buscando fallo"* |
| HB-P001 | *"fase con peso añadido en 18 mm y fase con profundidad mínima"* |
| HB-P002 | *"Bloque de 8 semanas de suspensiones intermitentes en regleta ajustable"* |

**Ambivalentes descartados (razones de Giuliana):**
- **HB-73** dice 20mm explícito → no es regleta pequeña.
- **HB-005, HB-753, HB-P006** no mencionan profundidad → intensidad general ya en `hangboard-intense`.
- **HB-P003, HB-P004** son programas-bloque → heredan de sus componentes (HB-P001 ya tiene el tag), no necesitan tag propio.

#### `prerequisito:15-pullups` · 2 filas

- **FT-006** (Bloqueo con una mano / one-arm lock-off, post-0026)
- **FTP-004** (Bloqueo con una mano — criterio de entrada)

Ambos son la materialización operativa de §2.4 Doc 02.

#### `riesgo-lesion:power-max` · 2 filas

- **PO-DEADSTOP** (Dead Stop / precisión dinámica)
- **PO-POWERPU** (Power Pull-up / dominada explosiva)

Requiere ampliación paralela del enum `BlockedCategory` en `lib/brain/types.ts:16-24` con el valor `power-max`, y extensión de §1.1/§1.2 `RULE_1_*_CATEGORIES` para incluir la nueva categoría en los verdicts emitidos.

### 6.2 · Migración `0028_paso_5_stimulus_computed.sql`

Columna `stimulus_derivado text` computed desde `categoria_canonica + proposito`. Mapping:

| categoria_canonica | proposito | stimulus_derivado |
|---|---|---|
| fuerza-dedos | entrenamiento | strength |
| fuerza-dedos | rehab / prevencion | mobility |
| fuerza-traccion | entrenamiento | strength |
| fuerza-empuje | entrenamiento | strength |
| fuerza-tren-inferior | entrenamiento | strength |
| potencia | entrenamiento | power |
| campus | entrenamiento | power |
| resistencia-aerobica | entrenamiento | aerobic-base |
| resistencia-anaerobica | entrenamiento | power-endurance |
| tecnica | entrenamiento | skill |
| movilidad | entrenamiento | mobility |
| core | entrenamiento | strength |
| hombros-escapulas | entrenamiento | mobility |
| munecas-antebrazos | entrenamiento | mobility |
| piel | entrenamiento | mobility |
| boulder | entrenamiento | skill (o power según intensidad, a validar) |

**Alternativa considerada:** función en el matcher que compute on-the-fly. Descartada — columna computada es una sola vez, no cada llamada, y permite indexado.

---

## 7) Plan de implementación del bloque completo del Paso 5

Trabajar en este orden. No parar en el medio salvo por decisión editorial nueva.

### 7.1 · Entregables

1. **`0027_paso_5_tags_matcher.sql`** — aplica los 3 tags + extiende enum `BlockedCategory` con `power-max`.
2. **`0028_paso_5_stimulus_computed.sql`** — columna `stimulus_derivado` computada.
3. **`lib/brain/matcher/resolveToCanonical.ts`** — el matcher completo (filtros gate + equipo + nivel + momento + ranking + fallback L1→L2→L3→L5).
4. **`lib/ai/fast-plan-schema.ts` extendido** — `suggestedCategory: CategoriaCanonicaEnum` obligatorio.
5. **Integración en `app/api/generate-plan/route.ts`** — cada exercise pasa por `resolveToCanonical` antes de persistirse.
6. **24 tests** (6 huecos × 4 niveles L1/L2/L3/L5) que verifican que cada hueco queda cerrado en toda la escalera.
7. **Performance test en plan 12 semanas** — típicamente ~200-250 llamadas al matcher.
8. **Reporte final con evidencia cruda:** grep de cada hueco antes/después, output de los 24 tests, output del performance test, muestreo de 3-5 resolvers reales.

### 7.2 · Limitaciones conocidas

- Sin credenciales Supabase → migraciones las aplica Giuliana. Yo paso SQL crudo para revisión.
- Performance test con mocks del pool no refleja latencia real de Postgres/GIN → hay que correrlo contra Supabase después de aplicar. Yo describo runner + script; Giuliana corre y pasa timings.
- Tests unitarios con fixtures in-memory reproducen el pool. Los 24 tests corren en Vitest sin DB. Válido para lógica de matcher, no para latencia.

### 7.3 · Decisiones editoriales que podrían frenar la implementación

- Si al mapear `stimulus_derivado` aparece una fila donde el mapping determinístico no encaja (ej: boulder que es power-endurance en vez de skill).
- Si algún fixture de test revela ambigüedad en el orden de filtros que no está en este diseño.
- Si el performance test muestra latencia >100ms por llamada — habría que discutir cache del pool o precomputo.

En ausencia de esas, se implementa el bloque entero y se trae con evidencia.

---

## Estado al momento del snapshot (2026-07-13)

- **Paso 4:** cerrado del todo. Migraciones 0024/0025/0026 aplicadas. 20 rows borradas, 35 tags aplicados, FT-006 reclasificada.
- **Deudas registradas:** #9 (4 gaps BrainContext), #10 (power-max), #11 (proposito rehab), #12 (§2.4 maxPullupReps).
- **Checklist Paso 5:** 6 huecos consolidados (A.1, A.2, A.3, B.1, B.2, C.1) en `docs/brain/paso5-checklist-aceptacion.md`.
- **Diseño matcher:** aprobado (post-hoc, dos capas, fallback L1→L2→L3→L5 sin L4, gate invariante en toda la escalera).
- **Tags `carga:regleta-pequena` cerrados:** 9 firmes ✓, 6 ambivalentes ✗.
- **Próximo:** implementar bloque completo del Paso 5 y traer con evidencia cruda.

**Migración 0014 sigue doblemente bloqueada.**
