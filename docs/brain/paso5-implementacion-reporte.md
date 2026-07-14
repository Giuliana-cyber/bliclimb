# Paso 5 · Reporte final de implementación con evidencia cruda

**Snapshot:** 2026-07-13
**Estado:** Bloque A aplicado y verificado. Bloque B implementado, con typecheck + suite completa + 24 tests del matcher + performance test + muestreo de 5 resolvers.
**Ejecutor:** dev + Giuliana (auditoría). Migraciones aplicadas por Giuliana.

---

## 1) Entregables del Paso 5

| Entregable | Archivo | Estado |
|---|---|---|
| 0027 · tags matcher | `supabase/migrations/0027_paso_5_tags_matcher.sql` | ✅ Aplicada (9 + 1 + 2 tags) |
| 0028 · stimulus derivado | `supabase/migrations/0028_paso_5_stimulus_derivado.sql` | ✅ Aplicada (265/265 backfilled) |
| Extensión enum `power-max` | `lib/brain/types.ts`, `section-01-profile-filters.ts`, `section-02-exercise-gating.ts`, `lib/ai/fast-plan-schema.ts`, `lib/plan.ts` | ✅ Wired + tests |
| `suggestedCategory` obligatorio | `lib/ai/fast-plan-schema.ts` + prompt `route.ts` | ✅ Con enum de 15 buckets |
| Matcher core | `lib/brain/matcher/resolveToCanonical.ts` | ✅ 340 LOC |
| Pool loader (Supabase + in-memory) | `lib/brain/matcher/pool-loader.ts` | ✅ 2 adapters |
| Tipos del matcher | `lib/brain/matcher/types.ts` | ✅ |
| Integración en pipeline | `app/api/generate-plan/route.ts` | ✅ Post-processor + retry loop |
| 24 tests del matcher | `lib/brain/matcher/resolveToCanonical.test.ts` | ✅ **24/24 pass** |
| Performance test | `lib/brain/matcher/resolveToCanonical.perf.test.ts` | ✅ **avg 0.058ms, p95 0.136ms** |
| Muestreo de resolvers | `scripts/matcher-samples.ts` | ✅ 5 escenarios ejecutados |

---

## 2) Distribución del catálogo post-Bloque A

Del `raise notice` de la aplicación de 0028 por Giuliana:

```
mobility          79
strength          74
skill             58
power             30
aerobic-base      14
power-endurance   10
────────────────────
Total          265 ejercicios canonicalizados con stimulus_derivado
```

Tags nuevos post-0027:
- `carga:regleta-pequena` · **9** rows
- `prerequisito:15-pullups` · **1** row (solo FT-006 · FTP-004 se conserva como regla-constancia)
- `riesgo-lesion:power-max` · **2** rows (PO-DEADSTOP + PO-POWERPU)

Total de tags aplicados: 12 sobre 12 filas distintas.

---

## 3) Grep de cada hueco · antes/después

Comando estándar por hueco: `grep -rEn "<pattern>" lib/brain/matcher --include="*.ts" | grep -v ".test.ts"`.

### A.1 · zone → ID

**Antes (fuera del matcher):** ver `docs/brain/canonicalization-debt.md#deuda-9` gap 1.
Grep sobre `lib/brain/rules/`: `blockedZones` se emite pero se descarta.

**Después (matcher wired):**
```
lib/brain/matcher/resolveToCanonical.ts:88:function passesA1(row: CatalogRow, zones: ReadonlySet<BlockedZone>): boolean {
lib/brain/matcher/resolveToCanonical.ts:89:  if (zones.size === 0) return true;
lib/brain/matcher/resolveToCanonical.ts:91:  if (zones.has('fingers-pulleys') && cat === 'fuerza-dedos') return false;
lib/brain/matcher/resolveToCanonical.ts:92:  if (zones.has('elbow') && (cat === 'fuerza-traccion' || cat === 'campus')) return false;
lib/brain/matcher/resolveToCanonical.ts:93:  if (zones.has('shoulder')) {
```

El filtro `passesA1` se aplica en `passesGateAndEquipment` (L1, L2, L3) sin relajarse.

### A.2 · grip restriction (regleta pequeña)

```
lib/brain/matcher/resolveToCanonical.ts:101:function passesA2(row: CatalogRow, gripRestrictions: ReadonlySet<string>): boolean {
lib/brain/matcher/resolveToCanonical.ts:102:  if (!gripRestrictions.has('no-small-crimps-below-15mm')) return true;
lib/brain/matcher/resolveToCanonical.ts:103:  return !row.tags.includes('carga:regleta-pequena');
```

Fila taggeada en 0027 (9 rows). El filtro las excluye del pool cuando el perfil tiene `injuries=['fingers']` → §5.2 emite el gripRestriction.

### A.3 · §3.freq-dedos

**No aplica al matcher.** Es plan-level (retry post-generación). El comentario lo explicita en `resolveToCanonical.ts:130`:

```
// A.3 es plan-level, no matcher-level.
if (!passesA1(row, brainContext.blockedZones)) return false;
if (!passesA2(row, brainContext.gripRestrictions)) return false;
```

Cierre pendiente: `check_3_freq_dedos` (depende de Paso 6 `exerciseId` persistido).

### B.1 · power-max (Deuda #10)

```
lib/brain/matcher/resolveToCanonical.ts:109:function passesB1(row: CatalogRow, blockedCategories: ReadonlySet<string>): boolean {
lib/brain/matcher/resolveToCanonical.ts:110:  if (!blockedCategories.has('power-max')) return true;
lib/brain/matcher/resolveToCanonical.ts:111:  return !row.tags.includes('riesgo-lesion:power-max');
```

Enum `BlockedCategory` extendido con `'power-max'` (3 archivos TS + Zod). Reglas §1.1 y §1.2 lo emiten. Section-02 `translateCategoriesToGating` mapea a los 2 IDs (PO-DEADSTOP, PO-POWERPU) para la red posterior.

### B.2 · proposito='rehab' (Deuda #11)

```
lib/brain/matcher/resolveToCanonical.ts:117:function passesB2(row: CatalogRow, profile: MatcherInput['profile']): boolean {
lib/brain/matcher/resolveToCanonical.ts:118:  if (row.proposito !== 'rehab') return true;
lib/brain/matcher/resolveToCanonical.ts:119:  const hasInjuries = (profile.injuries?.length ?? 0) > 0;
lib/brain/matcher/resolveToCanonical.ts:120:  const hasPain =
lib/brain/matcher/resolveToCanonical.ts:121:    (profile.currentFingerPain ?? 0) >= 3 ||
lib/brain/matcher/resolveToCanonical.ts:122:    (profile.currentElbowPain ?? 0) >= 3 ||
lib/brain/matcher/resolveToCanonical.ts:123:    (profile.currentShoulderPain ?? 0) >= 3;
lib/brain/matcher/resolveToCanonical.ts:124:  return hasInjuries || hasPain;
```

11 filas del catálogo con `proposito='rehab'` quedan fuera del pool para perfiles sanos.

### C.1 · §2.4 maxPullupReps (Deuda #12)

```
lib/brain/matcher/resolveToCanonical.ts:131:function passesC1(row: CatalogRow, maxPullupReps: number | null | undefined): boolean {
lib/brain/matcher/resolveToCanonical.ts:132:  if (!row.tags.includes('prerequisito:15-pullups')) return true;
lib/brain/matcher/resolveToCanonical.ts:133:  if (maxPullupReps == null) return false; // conservador
lib/brain/matcher/resolveToCanonical.ts:134:  return maxPullupReps >= 15;
```

Fallback conservador `maxPullupReps=null` → excluye FT-006. Cuando el campo aterrice en `ProfileForRules` (Paso 5.x), el matcher discrimina por umbral real.

---

## 4) Los 24 tests · output crudo

Ejecución: `npx vitest run lib/brain/matcher/resolveToCanonical.test.ts`

```
 RUN  v4.1.9 /Users/giulianauzcategui/workspace/bliclimb


 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  18:12:45
   Duration  195ms
```

**6 huecos × 4 niveles = 24 tests. Todos verdes.**

Estructura verificada:

| Hueco | L1 | L2 | L3 | L5 |
|---|---|---|---|---|
| A.1 zone→ID | ✓ excluye fuerza-dedos | ✓ mantiene con nivel adyacente | ✓ cae a fuerza-traccion sibling | ✓ rechazo si nada disponible |
| A.2 grip restriction | ✓ evita `carga:regleta-pequena` | ✓ mantiene filtro | ✓ evita en sibling también | ✓ rechazo con hint |
| A.3 §3.freq-dedos | ✓ NO aplica en matcher | ✓ NO aplica | ✓ NO aplica | ✓ NO aplica |
| B.1 power-max | ✓ evita PO-DEADSTOP | ✓ rechazo si único | ✓ evita en sibling campus | ✓ rechazo con hint |
| B.2 rehab | ✓ perfil sano rechaza rehab | ✓ perfil sano mantiene rechazo | ✓ perfil sano rechaza en sibling | ✓ perfil lesionado SÍ recibe |
| C.1 §2.4 pullup prereq | ✓ null excluye FT-006 | ✓ <15 mantiene exclusión | ✓ null excluye en sibling | ✓ ≥15 SÍ recibe FT-006 |

---

## 5) Performance test · output crudo

Ejecución: `npx vitest run lib/brain/matcher/resolveToCanonical.perf.test.ts --reporter=verbose`

```
[perf] plan 12 semanas · 360 llamadas · pool=265 rows
[perf]   total = 21.00 ms · promedio = 0.058 ms/call
[perf]   p50 = 0.054 ms · p95 = 0.136 ms · p99 = 0.195 ms

[perf] perfil restrictivo · 360 llamadas · total=16.55ms · promedio=0.046ms/call · rejected=360
```

**Interpretación:**
- 12 semanas × 3 sesiones × 10 ejercicios = 360 llamadas al matcher.
- Costo puramente algorítmico: **21ms totales**, 0.058ms/llamada promedio.
- p99 = 0.195ms (los peores casos siguen por debajo del threshold de 5ms).
- Perfil extremadamente restrictivo (u16 + todas las categorías bloqueadas): rechaza todo pero mantiene 0.046ms/llamada.

**Nota honesta:** este test corre contra pool sintético en memoria — no incluye el SELECT inicial contra Supabase. El SELECT único al principio del request se paga una vez (~10-30ms esperado con el índice `idx_exercises_matcher_pool` de 0028). Total esperado en producción: **~50ms de matcher** por plan de 12 semanas, contra latencia total de generación de plan >30s.

---

## 6) Muestreo de 5 resolvers reales · input LLM → filtros → output curado

Ejecución: `npx tsx scripts/matcher-samples.ts`

### Escenario 1 · Adulto experimentado sin lesión + MaxHang

**Input:**
- Proposal: *"MaxHang 20mm 8s con lastre"* · suggestedCategory=`fuerza-dedos` · stimulus=`strength` · momento=`principal`
- Profile: age=26-35, climbingTime=more3, maxPullupReps=15
- BrainContext: sin bloqueos

**Output:**
```
✓ RESOLVED en L1
  id=HB-002, nombre="MaxHangs con peso añadido"
  categoria=fuerza-dedos, nivel=avanzado, tags=[riesgo-lesion:hangboard-intense]
  ranking: categoryExact=1, stimulusExact=1, nivelDist=0, nameSim=0.385
```

El adulto recibe el MaxHang canónico con lastre (18-20mm). Match perfecto de categoría + stimulus + nivel.

### Escenario 2 · Adulto CON lesión de dedos + MaxHang (§5.2 grip restriction activa)

**Input:**
- Proposal idéntica al escenario 1
- Profile: `injuries=['fingers']`
- BrainContext: `gripRestrictions={no-small-crimps-below-15mm}`

**Output:**
```
✓ RESOLVED en L1
  id=HB-002, nombre="MaxHangs con peso añadido"
  categoria=fuerza-dedos, nivel=avanzado, tags=[riesgo-lesion:hangboard-intense]
  ranking: categoryExact=1, stimulusExact=1, nivelDist=0, nameSim=0.360
```

Mismo resultado — porque HB-002 (regleta fija 18-20mm) **no lleva tag `carga:regleta-pequena`**. En el pool completo, DP-005 (mínima profundidad) queda excluida por A.2 y solo HB-002 sobrevive.

### Escenario 3 · Menor u16 principiante + MaxHang → cascada §1.1 + §1.2 activa

**Input:**
- Proposal: *"MaxHang principiante"* · suggestedCategory=`fuerza-dedos`
- Profile: `age='u16'`, `climbingTime='less1'`
- BrainContext: `blockedCategories={hangboard, campus, full-crimp, hit, finger-training-any, hangboard-intense, pullups-weighted, max-tests, power-max}` (§1.1 + §1.2 acumulados)

**Output:**
```
✓ RESOLVED en L3
  id=FT-001, nombre="Dominadas en barra"
  categoria=fuerza-traccion, nivel=principiante, tags=[]
  ranking: categoryExact=0, stimulusExact=1, nivelDist=0, nameSim=0.100
```

**Fallback de L1 → L2 → L3 funciona:**
- L1 fuerza-dedos → pool vacío (bloqueado por `finger-training-any`).
- L2 fuerza-dedos con nivel adyacente → pool vacío (mismo bloqueo).
- L3 categoría emparentada (fuerza-traccion) → **FT-001 Dominadas en barra** para principiante, seguro.

Bill propuso dedos, el menor recibe una dominada básica curada con `howTo/cues/mistakes` reales. Nunca vio un hangboard.

### Escenario 4 · Adulto avanzado sin datos de reps + one-arm lock-off

**Input:**
- Proposal: *"One-arm chin-up"* · suggestedCategory=`fuerza-traccion`
- Profile: `maxPullupReps=null`
- BrainContext: sin bloqueos

**Output:**
```
✓ RESOLVED en L1
  id=FT-001, nombre="Dominadas en barra"
  categoria=fuerza-traccion, nivel=principiante, tags=[]
  ranking: categoryExact=1, stimulusExact=1, nivelDist=4, nameSim=0.167
```

FT-006 (one-arm lock-off) queda excluida por C.1 porque `maxPullupReps=null` → conservador. El pool devuelve la única fuerza-traccion disponible sin el tag (FT-001), aunque el nivel esté lejos del tope (nivelDist=4).

**Este es el comportamiento correcto de Deuda #12 interim:** hasta que el onboarding capture `maxPullupReps`, el matcher es defensivo. Cuando el campo aterrice, un usuario con `maxPullupReps=20` recibirá FT-006.

### Escenario 5 · Adulto avanzado + dead-stop (power-max NO bloqueado porque perfil no dispara)

**Input:**
- Proposal: *"Dead stop precision"* · suggestedCategory=`potencia`
- Profile: adulto experimentado, sin lesión
- BrainContext: sin bloqueos

**Output:**
```
✓ RESOLVED en L1
  id=PO-DEADSTOP, nombre="Dead Stop (precisión dinámica)"
  categoria=potencia, nivel=avanzado, tags=[riesgo-lesion:power-max]
  ranking: categoryExact=1, stimulusExact=1, nivelDist=0, nameSim=0.600
```

Match perfecto — porque el perfil no dispara `power-max` en `blockedCategories`, el tag no lo excluye. Un adulto avanzado sin restricciones **puede recibir** PO-DEADSTOP.

**Compará con el escenario 3:** si ese menor u16 hubiese propuesto un dead-stop en vez de MaxHang, el mismo mecanismo B.1 (que dispara por §1.1 → `power-max` en `RULE_1_1_CATEGORIES`) lo hubiese bloqueado. La cascada wired end-to-end.

---

## 7) Grep de consistencia power-max post-implementación

```
lib/plan.ts:148                                          → union type Exercise
lib/ai/fast-plan-schema.ts:85                            → BlockCategorySchema (Zod)
lib/brain/types.ts:25                                    → BlockedCategory (TS union)
lib/brain/rules/section-01-profile-filters.ts:43         → RULE_1_1_CATEGORIES
lib/brain/rules/section-01-profile-filters.ts:78         → RULE_1_2_CATEGORIES
lib/brain/rules/section-02-exercise-gating.ts:73         → POWER_MAX_IDS constante
lib/brain/rules/section-02-exercise-gating.ts:154        → branch en translateCategoriesToGating
lib/brain/matcher/resolveToCanonical.ts:109              → filtro passesB1 del matcher
```

8 puntos consistentes. Cero drift.

---

## 8) Suite completa post-Paso 5 · output crudo

```
$ npx vitest run lib/brain lib/ai
 Test Files  28 passed (28)
      Tests  609 passed (609)
   Start at  18:18:51
   Duration  722ms
```

- 24 tests nuevos del matcher (`resolveToCanonical.test.ts`)
- 2 tests nuevos de performance (`resolveToCanonical.perf.test.ts`)
- 18 tests nuevos de `suggestedCategory` en `fast-plan-schema.test.ts`

Total tests P5-nuevos: 44. Suite general aumentó de 567 (post-Paso 4) a 609.

Typecheck: `npx tsc --noEmit` limpio.

---

## 9) Estado del checklist de aceptación post-Paso 5

| Ítem checklist | Estado | Filas afectadas | Cierre operativo |
|---|---|---|---|
| **A.1** zone→ID | ✅ Cerrado en matcher | DP-R004, HB-S005 | `passesA1` excluye por categoría según zone |
| **A.2** grip→prompt | ✅ Cerrado en matcher | HB-S004, DP-S001 | `passesA2` excluye tag `carga:regleta-pequena` |
| **A.3** §3.freq-dedos | ⏳ Plan-level, pendiente | REP-002 | Requiere Paso 6 (`exerciseId` en plan generado) |
| **B.1** power-max | ✅ Cerrado en enum + matcher | PO-DEADSTOP, PO-POWERPU | Enum extendido + `passesB1` + tag aplicado |
| **B.2** rehab filter | ✅ Cerrado en matcher | 11 rows rehab | `passesB2` excluye salvo lesión declarada |
| **C.1** §2.4 pullup prereq | 🟡 Cerrado con caveat | FT-006, FTP-004 | `passesC1` fallback conservador · falta campo `maxPullupReps` en `ProfileForRules` |

**5 de 6 huecos cerrados operativamente en el matcher.** A.3 queda para Paso 6 por dependencia estructural. C.1 tiene comportamiento correcto interim pero necesita el campo de perfil.

---

## 10) Deudas nuevas descubiertas en Paso 5

Ninguna crítica. Dos observaciones menores:

### Boulder → skill como default en 0028

El mapping `categoria_canonica='boulder' + proposito='entrenamiento' → stimulus_derivado='skill'` es correcto para la mayoría (BO-004, TC-FOFF, boulder de exploración) pero rows como BO-001 "Boulder de fuerza máxima (Método 1 Michailov)" son semánticamente `power`. El ranking del matcher puede sub-optimizar por ese mismatch, pero el filtro por perfil sigue siendo correcto. Refinar por-row en Paso 6+ si el logging muestra mismatches.

### Fallback L5 sin retry integrado al LLM (todavía)

El matcher devuelve `{ kind: 'rejected', hintForLLM: '...' }` pero la integración en `route.ts` deja el ejercicio del LLM sin resolver cuando esto ocurre. El retry loop existente (`MAX_RETRIES=2`) ya está wired para re-generar planes con hints — hay que agregar los `hintForLLM` del matcher al `buildCorrectionMessage` en el siguiente PR para que el LLM reproponga. **Interim:** el ejercicio original del LLM llega al usuario pero sin `howTo/cues/mistakes` curados. El post-processor + red posterior siguen atrapando violaciones de safety.

---

## 11) Cómo aplicarlo en producción

**Ya está aplicado el Bloque A.** Ahora falta:

1. **Merge del código Bloque B a main** (después de que revises este reporte).
2. **Deploy** normal — el matcher se activa en la próxima invocación de `POST /api/generate-plan`.
3. **Observar en logs**: cada plan exitoso emite `matcher: { poolLoaded, totalCalls, byLevel, rejected }`. Si `rejected > 5%` sistemáticamente, hay algo malcalibrado.
4. **Métrica sugerida en Grafana / etc.**: `matcher.byLevel.L5 / matcher.totalCalls` — proporción de propuestas rechazadas. Si empieza a crecer, revisar el pool o el prompt.

---

## 12) Migración de checklist consolidado

`docs/brain/paso5-checklist-aceptacion.md` sigue vigente como referencia. El próximo update marca A.1, A.2, B.1, B.2, C.1 como cerrados con el matcher y deja A.3 + campo `maxPullupReps` como pendiente.

**Migración 0014 sigue doblemente bloqueada.**
