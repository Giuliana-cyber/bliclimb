# Checklist de aceptación · Paso 5 del workstream del catálogo

**Propósito:** este documento consolida en un solo lugar los huecos que Paso 5
debe cerrar para que el gating con dientes esté completo. Al aterrizar el
motor conectado con el catálogo (enum de `FastExerciseSchema.name` filtrado
por reglas + join con `public.exercises`), cada ítem de abajo debe
verificarse **cerrado end-to-end**: verdict/gating emitido, consumido por
la generación, con efecto observable sobre un ejercicio o categoría real.

**Regla de cierre:** al confirmar un ítem como cerrado, se re-corre el `grep`
sobre las filas conservadas y las que quedan wired end-to-end pasan a un
DELETE/UPDATE posterior. Esto mantiene la propiedad de que "cada regla del
catálogo o vive en código o marca un gap explícito", nunca "vive
parcialmente en un limbo".

**Fuentes de verdad detallada:** ver `canonicalization-debt.md` Deuda #9
(4 gaps de BrainContext descartado), Deuda #10 (potencia-max sin
BlockedCategory), Deuda #11 (`proposito='rehab'` no filtrado). Este
documento resume; el detalle vive allá.

---

## Categoría A · 5 filas del catálogo conservadas por gap end-to-end

Son reglas del catálogo cuya lógica *existe* en `lib/brain/rules/` pero
cuyo verdict se descarta antes de tocar un ejercicio. Se conservaron en
`0024_paso_4_delete_reglas_duplicadas.sql` (no se borraron con las 20
duplicadas WIRED) porque borrarlas sería borrar constancia de reglas que
en la práctica no funcionan.

### A.1 · Gap `block-zone → ID` (§1.3 no traduce a IDs concretos)

**Emisor:** `check_1_3` @ `lib/brain/rules/section-01-profile-filters.ts:102-124`
emite `block-zone: fingers-pulleys` (o `elbow`, `shoulder`) cuando el
dolor actual del perfil ≥ 3.

**Gap:** `translateCategoriesToGating` @
`lib/brain/rules/section-02-exercise-gating.ts:77-137` acepta
`BlockedCategory` pero no `BlockedZone`. El set `ctx.blockedZones` se
computa y se descarta al salir del validator.

**Filas del catálogo afectadas:**
- **DP-R004** — "No entrenar hangboard si hay lesión actual"
- **HB-S005** — "Bloqueo tests máximos con dolor o lesión reciente"

**Criterio de cierre:** extender `translateCategoriesToGating` para
consumir `ctx.blockedZones` y traducirlas a IDs por join con
`categoria_canonica`:
- zona `fingers-pulleys` → bloquear `categoria_canonica='fuerza-dedos'`
- zona `elbow` → bloquear `categoria_canonica='fuerza-traccion'` con
  proposito='entrenamiento' (aún debatible: puede ser demasiado amplio;
  ver Paso 5 al aterrizar)
- zona `shoulder` → cubrir `categoria_canonica='hombros-escapulas'`
  cuando aparezcan filas de ese bucket sin proposito='prevencion'

**Verificación:** con perfil `currentFingerPain=5` corriendo el motor,
ningún ejercicio de `fuerza-dedos` aparece en el plan generado. Borrar
DP-R004 + HB-S005 en migración posterior.

---

### A.2 · Gap `gripRestriction → prompt` (§5.2 no llega al LLM)

**Emisor:** `check_5_2` @ `lib/brain/rules/section-05-health-derivation.ts:37-46`
emite `add-grip-restriction: no-small-crimps-below-15mm` cuando
`profile.injuries.includes('fingers')`.

**Gap:** `ctx.gripRestrictions` se acumula en el BlockingContext
(`validator.ts:82-83`) pero **no se pasa a `generateWeek()`** en
`app/api/generate-plan/route.ts:948-957`. Ese endpoint solo lee
`brainContext.blockedCategories`; los demás sets del brainContext se
descartan.

**Filas del catálogo afectadas:**
- **HB-S004** — "Bloqueo regletas 11-15 mm"
- **DP-S001** — "Riesgo lesión de poleas" (también depende de gap A.1
  por §1.3, doble gap)

**Criterio de cierre:** extender `generateWeek()` para recibir el
`BrainContext` completo y añadir bullets de `gripRestrictions`,
`trainingPriorities`, `intensityAdjustments` al `prohibitedBlock` del
prompt (`route.ts:581`). Idealmente, también agregar restricción
estructural al schema Zod cuando aplique.

**Verificación:** con perfil `injuries=['fingers']`, el prompt de
`generateWeek()` incluye literal "restricción de agarre: no regletas
menores a 15mm". Borrar HB-S004 + DP-S001 en migración posterior.

---

### A.3 · Gap semántico §3.3/§3.4 no capturan frecuencia semanal ni espaciado de dedos

**Emisor:** no hay check emisor arquitectónico — §3.3 (`check_3_3` @
`section-03-session-programming.ts:279-306`) cubre "no 3 duros
consecutivos" y §3.4 (`check_3_4` @ `:318-351`) cubre recuperación entre
dos sesiones consecutivas del mismo stimulus. Ninguno capea el total
semanal de sesiones de dedos ni exige espaciado específico de 48h.

**Fila del catálogo afectada:**
- **REP-002** — "Recuperación según intensidad — máx 2-3 sesiones de
  dedos/semana con 48h de espacio"

**Criterio de cierre:** implementar `check_3_freq_dedos` que:
1. Cuente sesiones cuyo `mainBlock` incluye al menos un exercise con
   `stimulusCategory='strength'` **Y** cuyo `exerciseId` tiene
   `categoria_canonica='fuerza-dedos'`.
2. Aplique cap 3/semana y gap mínimo 48h entre ellas.
3. Emita `PlanViolation` severity=blocking cuando falle.

Depende de Paso 6 (`exerciseId` persistido per-exercise en el plan
generado) para poder joinear con `categoria_canonica`.

**Verificación:** plan con 4 sesiones de fuerza-dedos en una semana
dispara retry por §3-freq-dedos. Borrar REP-002 en migración posterior.

---

## Categoría B · Filas del catálogo sin BlockedCategory que las cubra

Son ejercicios de intensidad Máxima con riesgo Alto para los que el enum
`BlockedCategory` (`lib/brain/types.ts:16-24`) actual no tiene una
categoría que los capture. Un menor de 16, un usuario con <2 años, o un
lesionado NO queda bloqueado de estos ejercicios por regla de safety —
solo por `nivel_canonico='avanzado'` (red débil: depende del LLM).

### B.1 · Potencia máxima con contact strength (Deuda #10)

**Filas del catálogo afectadas:**
- **PO-DEADSTOP** — "Dead Stop (precisión dinámica)". Descripción:
  *"detenerse INMEDIATAMENTE sin 'chocar' contra ella"*.
- **PO-POWERPU** — "Power Pull-up (dominada explosiva)". *"Cada rep
  debe ser máxima velocidad de subida"*.

Ambos `categoria_canonica='potencia'`, `nivel_canonico='avanzado'`.

**Verificación cruzada del gap:**
- `campus` bloquea prefijo `CB-` (`section-02-exercise-gating.ts:101-103`).
  No matchea.
- `hit` bloquea `['FM-014', 'PF-FM-005']` (`section-02:35`). No matchea.
- `pullups-weighted` bloquea `['FT-002', 'FTE-002']` (`section-02:61-64`).
  No matchea.
- Ninguna otra categoría los cubre.

**Criterio de cierre:** agregar valor `power-max` al enum
`BlockedCategory` en `lib/brain/types.ts:16-24`. Ampliar
`translateCategoriesToGating` para bloquear rows con tag
`riesgo-lesion:power-max` (o similar). Ampliar §1.1 y §1.2 en
`RULE_1_1_CATEGORIES` y `RULE_1_2_CATEGORIES` para incluir `power-max`.
Taggear PO-DEADSTOP y PO-POWERPU en el catálogo. Migración posterior.

**Nombres alternativos considerados y por qué no:**
- Reutilizar `hit` extendido — semánticamente confuso; HIT canónico es
  Hypergravity Isolation Training específico.
- Reutilizar `pullups-weighted` extendido — mezcla lastre externo con
  potencia neural; pierde precisión semántica.

**Verificación:** con perfil `age='u16'`, un plan generado no puede
contener PO-DEADSTOP ni PO-POWERPU. El schema restringido de
`generateWeek()` rechaza `blockCategory='power-max'` si viene bloqueada.

---

### B.2 · `proposito='rehab'` no filtrado en el motor (Deuda #11)

**Filas del catálogo afectadas (11 rows con `proposito='rehab'` o
similar, según asignaciones en `0022_paso_2_cierre.sql:216-220`):**
- **RH-004** — "Squeeze device / putty para retorno post-lesión polea"
- **RH-005** — "Escalada en rutas de agarres grandes (retorno post-polea)"
- **RH-P002** — "Carga progresiva con hangboard para tejido (rehab)"
- Otras: RH-001, RH-P001, HB-REHAB-A2A4, HB-ISO-RECOV, HB-DENS, HB-PROT,
  PR-003, TC-FOFF (todas con `proposito ∈ {rehab, prevencion}`).

**Gap verificado:**
```
grep -rEn "proposito" lib/ app/ | grep -v test | grep -v node_modules
```
retorna cero. Ningún código del motor filtra por `proposito`. El pool
que ve el LLM incluye rehab/prevención junto con entrenamiento.

**Regla operativa definida por Giuliana (Paso 4, turno 2026-07-11):**
> "Los ejercicios `proposito='rehab'` solo se ofrecen a perfiles con
> lesión declarada, nunca a sanos."

**Criterio de cierre (dos opciones):**

**Opción 1 · Filtro duro por proposito.** En el pool que consume el LLM
(post-Paso 5 con enum de IDs), excluir `proposito='rehab'` a menos que
el perfil cumpla al menos una de:
- `injuries` no vacío
- `currentFingerPain >= 3`, `currentElbowPain >= 3`,
  `currentShoulderPain >= 3`
- Historial de lesión declarado en checkin reciente

**Opción 2 · Regla condicional en el prompt.** Añadir al prompt de
`generateWeek()`: "solo ofrecer ejercicios de rehabilitación a perfiles
con lesión declarada, nunca a sanos". Menos hermético (depende de que
el LLM respete), más flexible.

**Preferencia (durabilidad sobre velocidad):** Opción 1. Determinístico,
no depende de LLM.

**Verificación:** con perfil sin `injuries` y `pain=0` en las 3 zonas,
un plan generado no contiene RH-* ni HB-REHAB-* ni PR-003.

---

## Categoría C · Gating por prerrequisito de capacidad medible

Reglas del Doc 02 que gatean un ejercicio contra un umbral cuantitativo de
capacidad del usuario, no contra edad/experiencia/lesión. Requieren un
campo nuevo en `ProfileForRules` que hoy no existe.

### C.1 · §2.4 · gating por reps de dominada (Deuda #12)

**Regla del Doc 02:** *"Condición: ejercicio FT-006 o equivalente. Acción:
desbloquear sólo si usuario completa ≥15 dominadas estrictas por serie."*

**Gap doble:**
1. Ninguna función en `lib/brain/rules/` compara "reps de dominada" contra
   15 ni bloquea FT-006 (grep confirmó cero matches).
2. `ProfileForRules` en `lib/brain/types.ts` no captura reps de dominada.
   Aunque quisiéramos implementar §2.4 mañana, la señal no está disponible
   en runtime.

**Filas del catálogo afectadas:**
- **FT-006** — reclasificada a ejercicio en `0026`, tag
  `riesgo-lesion:pullups-weighted` aplicado. **Barrera única actual:
  `nivel_canonico='avanzado'` — barrera débil (depende del LLM).**
- **FTP-004** — concepto editorial que documenta el prerrequisito de 15
  dominadas.

**Criterio de cierre:**
1. Onboarding capta `maxPullupReps` (nueva pregunta).
2. Migración de schema `public.profiles` agrega columna
   `max_pullup_reps int`.
3. `ProfileForRules` incluye el campo.
4. `check_2_4` (nuevo módulo) emite `block-categories` con la categoría
   apropiada cuando `maxPullupReps < 15`.
5. **Verificación:** perfil con `maxPullupReps=10`, plan generado no
   contiene FT-006.

Es un check pequeño y aislado — no depende de Paso 6 (`exerciseId`), solo
de un campo nuevo de perfil. Puede implementarse antes o en paralelo.

---

## Resumen ejecutivo

| Ítem | Filas afectadas | Gap | Cierra con |
|---|---|---|---|
| A.1 | DP-R004, HB-S005 | §1.3 zone→ID | Extender section-02 con `BlockedZone` |
| A.2 | HB-S004, DP-S001 | §5.2 grip→prompt | Pasar `BrainContext` completo a `generateWeek()` |
| A.3 | REP-002 | §3.3/§3.4 no capturan freq semanal | `check_3_freq_dedos` (depende Paso 6 exerciseId) |
| B.1 | PO-DEADSTOP, PO-POWERPU | Falta `power-max` en enum | Ampliar `BlockedCategory` + taggear |
| B.2 | 11 rows rehab/prevencion | `proposito` no filtrado | Filtro duro en pool del motor |
| C.1 | FT-006, FTP-004 | §2.4 sin código + falta campo maxPullupReps | Nuevo campo de perfil + `check_2_4` |

**Total filas del catálogo bajo checklist:** 5 conservadas por gap end-to-end
(A.1-A.3) + 2 sin categoría del enum (B.1) + 11 con proposito no filtrado (B.2)
+ 2 sin prerrequisito de reps implementado (C.1) = **20 rows en observación**.
Cerrar los 6 huecos del checklist las libera todas para reevaluación / borrado
en migraciones posteriores.

**Paso 5 no está completo hasta que cada ítem esté verificado cerrado.**
Cada cierre se acompaña de:
1. El PR de motor que implementa el fix.
2. El re-grep sobre las filas afectadas (deben ser tratadas end-to-end).
3. La migración `00XX` que borra/retagea las filas que ya no necesitan
   conservarse como constancia.
4. Update de `canonicalization-debt.md` marcando el gap como cerrado.
