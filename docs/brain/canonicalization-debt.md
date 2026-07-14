# Deuda de canonicalización — catálogo de ejercicios

**Contexto:** en Fase 1 escribimos `public.exercises` con **casi todas las columnas
como `text`**, no como enums. Este doc explica por qué, qué queda pendiente, y
qué necesita pasar antes de estrechar tipos.

## Decisión de Fase 1

El CSV `data/brain/exercises-v3.csv` (483 filas) fue curado a mano durante
meses por el equipo de contenido. Como resultado tiene mezcla de:

- Valores canónicos limpios (`"Alta"`, `"Boulder"`, `"Sí"`)
- Variantes de puntuación equivalentes (`"Bajo-Medio"` vs `"Bajo/Medio"`)
- Descriptivos largos que aportan matiz (`"Alta si se usa regleta pequeña o carga alta"`)
- Typos ocasionales (`"Pendiente deduplicacion"` sin tilde vs canónico con tilde)

Si en Fase 1 hubiéramos definido enums estrictos, el seeder habría rechazado
~40% de las filas por ruido de curación, bloqueando el flujo por trabajo de
limpieza que no cabe en el scope de esta fase. La decisión consensuada fue:
**cargar tal cual, canonicalizar en un PR aparte**, con este doc como
seguimiento.

## Columnas con deuda de canonicalización

Las 6 columnas donde el trade-off text/enum es más marcado, con muestreo
empírico del CSV v3:

| Columna | Distintos | Ejemplos representativos | Estado |
|---|---:|---|---|
| `nivel` | 34 real | `"Principiante"`, `"Intermedio en adelante"`, `"Todos"`, `"Avanzado / Elite"` | ✅ **CERRADA 2026-07-09** · migraciones `0015`+`0016` · 6 buckets canónicos (`principiante`, `principiante-intermedio`, `intermedio`, `intermedio-avanzado`, `avanzado`, `todos`) en columna `nivel_canonico` con CHECK constraint. Tags de trazabilidad `menor` (5 rows) + `rehab` (1 row: HB-REHAB-A2A4). FIL-004 borrada como regla colada. |
| `categoria` | 71 real (ejercicios) | `"Fuerza dedos"` en 9 variantes, `"Prevención hombros"`, `"Movilidad/fuerza"`, `"Recuperación / prehab"` | ✅ **CERRADA 2026-07-10** · migraciones `0017`-`0022` en 4 tandas editoriales · **Split ortogonal en 3 dimensiones** por decisión de contenido: `categoria_canonica` (15 buckets), `proposito` (3), `momento` (3). Vocabulario final: fuerza-dedos, fuerza-traccion, fuerza-empuje, fuerza-tren-inferior, potencia, campus, resistencia-aerobica, resistencia-anaerobica, tecnica, boulder, movilidad, core, hombros-escapulas, munecas-antebrazos, piel. **264 de 264 ejercicios canonicalizados (100%)**. Reclasificados 46 rows a concepto durante el workstream. |
| `intensidad` | ~82 | `"Alta"`, `"Media-Alta"`, `"Alta si se usa regleta pequeña o carga alta"` | Pendiente |
| `frecuencia` | ~60 | `"2x/sem"`, `"2-3x semana"`, `"Diaria"`, `"1x cada 2 semanas en fase pico"` | Pendiente |
| `riesgo` | ~40 | `"Bajo"`, `"Medio/alto"`, `"Bajo-Medio"`, `"Alto en principiante, medio en avanzado"` | Pendiente |
| `estado` | ~32 | `"activo"`, `"Pendiente deduplicación"`, `"Pendiente revisión"`, `"Pendiente limpieza"` | Pendiente |
| `tipo_escalador` | ~35 | `"General"`, `"Boulder"`, `"Sport / Deportiva"`, `"Boulder y sport"` | Pendiente |

`publicable_app` NO está en esta lista — ya definimos 5 valores canónicos y
la vista `exercises_eligible` los filtra. Es contrato duro, no deuda.

## Workstream del catálogo · Paso 2 cerrado (2026-07-10)

Las 2 columnas cerradas arriba son el resultado del Paso 2 del workstream
del catálogo (ver `docs/roadmap.md`). Detalles clave:

**Curación editorial en 4 tandas** — método de trabajo emergente durante
el workstream: yo pre-clasificaba con propuesta completa (categoría +
propósito + momento + flags), Giuliana revisaba y solo corregía las
excepciones. Escalable con calidad: 264 ejercicios curados en 4 sesiones
con criterio de dominio de escalada de Giuliana como capa final.

**Vocabulario emergente vs vocabulario inicial** — el vocabulario final
tiene 15 buckets de categoría, no los 13 originales. Los buckets
`fuerza-empuje` (bench/shoulder press/push-ups) y `fuerza-tren-inferior`
(deadlift/split squat/step-up) se agregaron en el cierre (0022) al aparecer
rows que no encajaban en el vocabulario original y no era honesto forzarlos.

**Split ortogonal en 3 dimensiones** — la tensión estructural detectada al
enumerar `categoria` en Paso 2 (rows tipo `"Prevención hombros"` mezclando
zona + propósito + estímulo) se resolvió separando el estímulo (categoría)
de la intención (propósito: entrenamiento/prevencion/rehab) y del momento
en la sesión (calentamiento/principal/enfriamiento). Cada dimensión con
CHECK constraint y default apropiado.

**Sistema de tags trazables** para rows reclasificadas a concepto durante
el workstream (72 rows post-Paso 2, +29 vs inicio):
- `conversacional` (22): rutinas de respiración, tips tácticos, mental
- `criterios` (1): checklist de elegibilidad (DP-P001)
- `programa-bloque` (19): protocolos multi-semana / macrociclos (radar Paso 5)
- `concepto-dominio` (3): definiciones de tipo de agarre
- `regla-catalogo` (2): FIL-004 (borrada), FIL-006 (reclasificada)
- `nutricion` (2): contenido de nutrición
- `monitoreo` (2): sesiones con registro de FC/duración

**Radar Paso 5 poblado** — 19 rows con tag `programa-bloque` que el motor
NO debe meter como ejercicio de sesión en un plan (frameworks, protocolos
de N semanas, macrociclos). Filtrar del pool en el enum del motor.

**Deuda #8** (reglas/conceptos/notas colacadas como filas del catálogo, ver
más abajo) parcialmente pagada durante el workstream — 46 rows reclasificados
de ejercicio a concepto con tags trazables. Quedan las non-ejercicio del
pool original (test, regla, concepto, nota) para audit definitivo en Paso 4.

## Fixes ya aplicados por el seeder

- **Typo `Estado`**: `"Pendiente deduplicacion"` (sin tilde, 5 filas) →
  `"Pendiente deduplicación"` (canónico). Implementado en
  `lib/exercises/csv-normalize.ts:KNOWN_TYPO_FIXES.estado`. El seeder
  loggea IDs específicos corregidos.
- **Tags** (`tags[]`): normalización a lowercase + trim + colapso de espacios
  + filtro de vacíos. Los tags SÍ son deuda cerrada — se puede confiar en
  ellos para queries.

## Fixes aplicados directamente al CSV (Fase 1, pre-merge)

### FIL-004: shift columnario de ~9 columnas hacia la derecha

Durante la review del PR se detectó que `FIL-004` tenía valores
desplazados desde `Señales detener` hasta `Notas` (Estado tenía
`"Sí con bloqueo por perfil"` cuando ese valor pertenece semánticamente
a `Publicable app`). Auditoría de las 483 filas con 5 heurísticas
(Riesgo con comas, Estado fuera del allowlist, Publicable app URL/largo,
Señales detener corto tipo Alto/Medio/Bajo, Fuente primaria vacía)
confirmó que FIL-004 es la **única fila con shift real** en v3.
EV-CS-001 aparece en H1 pero es falso positivo (Riesgo con coma dentro
de paréntesis descriptivo).

Fila reconstruida columna por columna en el commit de fix.
`KNOWN_ESTADO_VALUES` pasa de 13 → 12 valores (se remueve
`"Sí con bloqueo por perfil"` que solo aparecía por el shift).

**Causa raíz** (deuda de proceso, no del schema):
la generación incremental del CSV se hizo en múltiples batches sin un
validador cross-row que verificara consistencia semántica por columna.
Antes de futuros batches de contenido, correr las 5 heurísticas de
auditoría como paso previo a mergear el CSV — o mejor, invertir en un
validador Zod que cheque el shape semántico de cada fila (URL en
`URL fuente`, no-URL en `Publicable app`, etc).

## Plan de PR de canonicalización (futuro)

Requiere alineación explícita con Giuliana antes de arrancar. Steps sugeridos:

1. **Export CSV de audit por columna** — script one-shot que dumpee valores
   distintos con conteo por cada una de las 6 columnas. Confirma la
   distribución antes de decidir el mapa canónico.
2. **Decidir taxonomías canónicas** — reunión de contenido con Giuliana
   para escribir el mapa `variante → canónico` de cada columna.
3. **Migración `0011_exercises_canonicalize.sql`**:
   - Nueva tabla `exercise_canonical_mappings (columna, valor_original, valor_canonico)`.
   - `UPDATE public.exercises SET nivel = ...` en batches usando el mapping.
   - `CHECK (nivel = ANY (ARRAY[...]))` después del backfill, no antes.
4. **Actualizar `lib/exercises/csv-normalize.ts`** para aplicar los mismos
   maps al seed inicial (idempotencia entre seed y estado post-canonicalización).
5. **Test** que verifique que un re-seed sobre el catálogo canonicalizado
   no rompe.

## No hacer en Fase 1

- No añadir `CHECK (nivel IN (...))` — bloquearía el seed sin resolver el
  problema real de curación.
- No inventar taxonomías sin Giuliana — el catálogo es dominio.
- No re-escribir valores "obvios" en el seeder — el fix del typo de
  `Estado` es la excepción, documentado explícitamente. Cualquier otro
  fix requiere un item nuevo en `KNOWN_TYPO_FIXES` con su porqué.

## Deuda del middleware de seguridad — Fase 3 sub-fase 1

**Contexto**: `lib/brain/` implementa el gate de perfil del Doc 02 §1
(reglas 1.1, 1.2, 1.3). Estas son las decisiones tomadas o diferidas
mientras se aterriza el resto del middleware.

### Zonas de dolor sin cobertura en §1.3

Doc 02 §1.3 lista 6 zonas para la regla de dolor 3+/10: dedos, poleas,
muñeca, codo, hombro, cuello. El perfil actual (`public.profiles`) solo
tiene 3 escalas 0-10:

- `current_finger_pain` → cubre **dedos** + **poleas** (misma zona
  anatómica en escalada).
- `current_elbow_pain` → cubre **codo**.
- `current_shoulder_pain` → cubre **hombro**.
- **Muñeca**: sin campo. El flag `injuries.includes('wrists')` existe
  como histórico bool, pero no representa dolor actual con gradient.
- **Cuello**: sin campo ni flag.

**Decisión de Giuliana (sub-fase 1)**: no agregar UI nueva. Muñeca y
cuello quedan sin cobertura en v1. Si en la práctica aparecen falsos
negativos peligrosos (usuarios entrenando con dolor de muñeca/cuello),
priorizar agregar los 2 campos al onboarding en v2.

### Reglas del Doc 02 §1 diferidas a v2

- **1.4 Cribado RED-S / LEAF-Q**: decisión de producto (no screening
  clínico). BilClimb no recolecta ni interpreta datos clínicos; deriva
  ante señales vía la regla 3.15 (sub-fase futura) y los mensajes
  reactivos del middleware.
- **1.5 Embarazo**: diferido a v2 (no se pregunta en onboarding).

### `lib/ai/plan-safety.ts` coexiste sin cambios

El validador viejo con 4 reglas keyword-based (`R1..R4`) sigue vivo en
`lib/ai/plan-safety.ts` y wireado en `app/api/generate-plan/route.ts`.
`lib/brain/` es una capa paralela nueva. La decisión de depreciar o
llamar `plan-safety.ts` como fallback POST se toma en la sub-fase final
de wiring, no durante las sub-fases intermedias.

### Audit persistente de bloqueos

Sub-fase 1 usa `ConsoleLogSink` (JSON estructurado a stdout). La
interface `LogSink` está lista para swap trivial a un `SupabaseLogSink`
cuando llegue la sub-fase de audit persistente (tabla nueva tipo
`safety_block_events`).

### Assumptions con edge cases

- **`age` vacío/desconocido** en 1.1: **NO dispara** el bloqueo. Se
  asume adulto por default. Justificativo: en perfiles legacy sin
  bucket, el falso positivo sería peor que el falso negativo (bloquear
  a la gran mayoría por asumir que son menores).
- **`climbingTime` vacío/desconocido** en 1.2: **SÍ dispara** el
  bloqueo. Justificativo: sin saber los años de práctica, no permitimos
  hangboard intenso — coherente con "ante duda, lado seguro" del
  principio transversal de Fase 3.

## Tests-máximos preservados como criterio (para modo evaluación futuro)

Con el saneamiento vía `tipo_registro` (0012), la sub-fase 2 Parte B de
Fase 3 (etiquetado manual `test-maximo` en Sheet 01) queda **cubierta
por saneamiento + hardcode**:

- Los 15 tests de alto riesgo tienen `tipo_registro='test'` → automáticamente
  fuera de `exercises_eligible` (el pool que ve Bill/Senda como
  ejercicios asignables al plan diario).
- Dominadas con lastre (`FT-002`, `FTE-002`) son `tipo_registro='ejercicio'`
  pero ya las bloquea section-02 Parte A por perfil (§1.2 <2 años).

**No hace falta agregar etiqueta `test-maximo` a Sheet 01.** El PR de
etiquetado queda descartado.

### Criterio del subset "test-máximo" preservado para futuro

Los 15 IDs identificados como tests de alto riesgo (spec de
sub-fase 2 Parte B, revisados uno por uno con criterio en 2026-07-04)
quedan archivados **para retomar cuando/si se construye un "modo
evaluación"** donde los tests se sirvan al usuario con protocolo de
seguridad extra:

- `FD-006` — Suspensión máxima en 25mm
- `FD-007` — Test MIFS (fuerza isométrica máxima de dedos)
- `FD-008` — Fuerza máxima de flexores
- `FD-009` — Resistencia de dedos con contracciones máximas (E1/E2)
- `HB-007` — Dead hang 11mm hasta fallo
- `CD-009` — Prefatiga + escalada hasta fallo
- `EV-CF` — Critical Force Test
- `EV-GRIP-PULL` — Grip + Pull-up hasta fallo
- `EV-FM-002` — Isometric pull-up force
- `EV-FM-004` — Bent-arm hang hasta fallo
- `FTE-002` — 1RM dominada con lastre
- `EVT-PO-001` — RFD contracción máxima
- `EV-CB-001` — Maximal reach en campus
- `EV-CB-003` — Isometric pull-up force en campus
- `EV-CB-004` — RFD en campus

**Origen**: `fase-3-subfase-2-etiquetado.md` (spec de Giuliana, 2026-07-04).
No se pierde el trabajo de criterio — solo no se implementa como
etiqueta ahora porque `tipo_registro='test'` cubre la exclusión del
pool general.

## Deuda del middleware de seguridad — Fase 3 sub-fase 3

**Contexto**: `lib/brain/rules/section-05-health-derivation.ts` implementa
las 3 reglas de perfil del Doc 02 §5 (5.2 historial de polea, 5.3 historial
de codo/epicondilitis, 5.4 sueño).

### Proxies conservadores por falta de campos específicos

El onboarding no captura historial médico específico. Sub-fase 3 usa
`injuries[]` como proxy — decisión de Giuliana: no agregar UI nueva.

| Regla | Trigger real (Doc 02) | Proxy implementado | Falso positivo |
|---|---|---|---|
| §5.2 | "reporta lesión de polea pasada" | `injuries.includes('fingers')` | Cualquiera con lesión pasada de dedos/mano dispara (no solo polea). Aceptable — la regla solo añade GripRestriction, no bloquea plan. |
| §5.3 | "reporta historial de epicondilitis" | `injuries.includes('elbows')` | Cualquier historial de codo dispara. Aceptable — la regla prioriza extensores, beneficio para todos. |
| §5.4 | "sueño <7h consistente" | `sleep === 'bad'` (solo <5h) | Excluye el bucket 'regular' (5-7h). Decisión firme: demasiada gente para reducirles intensidad, no es seguridad crítica. |

### La regla estrella §3.15 (pérdida de peso) NO vive en section-05

§3.15 dispara por lenguaje del usuario en el chat (`chat/route.ts`), no
por campos del perfil. Se diseña como pieza aparte con dos capas:
detección determinística (keywords en Node) + intención vía LLM.
Pendiente para siguiente sub-fase.

## Deuda de esquema en `public.profiles` (redundancias históricas)

Detectadas al verificar datos para sub-fase 3. **NO requieren acción
inmediata** — todos los campos son `nullable`, no rompen nada. Se
documentan para un workstream futuro de limpieza de schema.

### Duplicados de sueño (3 columnas para lo mismo)

- `sleep integer` — legacy (versión numérica, no usada por el onboarding actual)
- `sleep text` — activa (`'good'` / `'regular'` / `'bad'`, la que consume el mapper)
- `sleep_quality text` — redundante (el mapper copia `sleep` acá también)

Recomendación futura: consolidar en `sleep text`, dropear las otras 2.

### Duplicados de energía (3 columnas para lo mismo)

- `energy integer` — legacy
- `energy text` — activa
- `energy_level text` — redundante

Recomendación futura: consolidar en `energy text`.

### `injury_description` = `injury_notes` (duplicado en escritura)

El onboarding copia el mismo textarea (`injuryNotes`) a las 2 columnas.
El mapper no distingue. Recomendación futura: dropear `injury_description`,
mantener solo `injury_notes`.

### `needs_regeneration boolean` sin wire

Existe en DB pero no está en `UserProfileSchema` ni en el mapper. Vestigio
sin uso. Recomendación futura: dropear si nada la lee.

### Cuándo abordar

Post-Fase 5 en un PR de "limpieza de schema de profiles" que consolide
las 4 áreas. Prerequisito: verificar que ningún código lee de las
columnas duplicadas antes de dropearlas.

## Impacto en el motor (Fase 3)

Mientras esta deuda esté abierta, el motor de generación de plan NO debe
hacer matching estricto por `nivel`/`riesgo`/`intensidad`. Alternativas
seguras hasta canonicalizar:

- **Full-text / ILIKE** para clasificar por columnas de texto libre.
- **Tags** como la vía principal de filtrado por atributo semántico (ya
  están normalizados).
- **`publicable_app`** como el único gate duro por perfil (Fase 3).

Cuando 0011 aterrice y las 6 columnas tengan enum efectivo, el motor puede
migrar a matching estricto sin cambios en el schema.

## Fase 3 sub-fase 4 — deudas abiertas

Registradas durante la implementación de section-03-session-programming.

### Mensaje #17 de mensajes-tono-belay-partners.md

`lib/brain/messages/section-03-programming.ts` referencia el mensaje #17
como fallback tras 3 retries fallidos. Ese archivo aún no está en el repo
(no encontrado en `find . -name mensajes-tono*.md`). El string queda como
PLACEHOLDER explícito ('[PLACEHOLDER — mensaje #17 de mensajes-tono-belay-partners.md] ...')
para respetar la regla "no inventar tono".

Cierre: cuando el doc aterrice, reemplazar el string en
`SECTION_03_FALLBACK_MESSAGE.text` (misma clave, sin cambiar lógica).

### Wiring generate-plan + retry loop

Este PR entrega la librería pura (`section03SessionProgramming` +
`section10LoadAlternation`) con 42 tests verdes. El wiring con
`app/api/generate-plan/route.ts` (correr los módulos post-generación,
regenerar hasta 3 veces si hay `blocking`, pasar `advisory` como hint
al retry prompt, tras 3 fallidos mostrar el mensaje #17) queda para
el paso final del middleware, DESPUÉS de sub-fase 5.

### Precisión de §3.2 sin duración per-exercise

La regla original habla de "primeros ~30 minutos" pero el mainBlock no
tiene duración por ejercicio. Aproximamos con posición: skill debe estar
en la primera mitad (redondeada hacia arriba) del mainBlock. Cuando aterrice
per-exercise duration, el check puede pasar a minutos reales.

### 3.4 recovery para power-endurance

Doc 02 dice "hasta 5 días" para power-endurance al fallo / 4x4. Usamos 3
como mínimo defensivo (no 5) porque bloqueaba plans válidos de 3 días/semana
con PE. Revisar con Giuliana + Doc 02 v4 si el mínimo debe ser más agresivo.

## Fase 3 sub-fase 5 grupo 1 — deudas abiertas

### 14.2 usa mobility como proxy de "extensor work"

El validador `section14ElbowPrevention` verifica presencia de al menos 1
exercise con `stimulusCategory === 'mobility'` en la semana como proxy de
"trabajo de extensores". Es GENEROSO — cualquier movilidad (foam roll,
estiramiento pasivo de espalda) cumple la regla, no solo band extensors
específicos.

Cierre: cuando aterrice un flag `isExtensorWork` per-exercise (o una
sub-categoría 'extensor' bajo mobility), refinar el check a exigir un
ejercicio marcado explícitamente. Hasta entonces, el trade-off es:
falsos negativos (semana que dice cumplir sin ser realmente extensor
loading), pero cero falsos positivos que bloqueen planes válidos.

## Fase 3 sub-fase 5 grupo 2 — deudas abiertas

### 9.5 diferida — falta campo estructurado de disfrute/motivación

La regla §9.5 del Doc 02 dice: si el usuario reporta frustración /
desmotivación en 3+ check-ins CONSECUTIVOS, sugerir pausa de 2-4 semanas.
Requiere leer `public.check_ins` entre sesiones y detectar la señal.

Estado actual verificado en `supabase/migrations/0001_init.sql:135`:
la tabla existe con `rpe`, `finger_pain`, `energy` (1-5), `sleep` (1-5),
`notes` (texto libre), `manual_activity`. **Ningún campo estructurado de
disfrute / motivación / diversión.**

Decisión (Giuliana + Claude, 2026-07-06): NO implementar §9.5 con proxy
loose (ej: `energy ≤ 2` en 3+ consecutivos). Razón: energía baja es
compatible con fatiga física normal post-sesión intensa, NO
necesariamente desmotivación. Bill sugiriendo "descanso de 2-4 semanas"
a alguien solo cansado sería contraproducente — false positive con
costo alto.

Cierre: implementar §9.5 cuando aterrice un campo estructurado
(ej: `enjoyment int 1-5` en `check_ins` + pregunta explícita "¿cómo la
pasaste?" en el flujo de check-in UI).

### §10.4 solo detección numérica, no semántica

`lib/brain/detection/project-attempts-keywords.ts` solo detecta "N intentos"
con N ≥ 7. Frases como "no me sale" / "estoy trabado" NO disparan.
Razón (Giuliana, 2026-07-06): precisión > cobertura. "No me sale" abarca
frustración pasajera / mal día / duda técnica — no necesariamente 7+
intentos. Disparar "pará por hoy" con esa señal sería intrusivo para una
sugerencia suave.

Cierre: no hay cierre pendiente — decisión de diseño estable.
Si en producción aparecen usuarios que la necesitan sin usar números,
revisitar con datos reales.

### §10.3 sin distinción viral vs bacteriana

`sickness-keywords.ts` clasifica en `high-symptoms` (fiebre, covid,
escalofríos, temp ≥38°C → descanso total) o `mild-symptoms` (resfriado,
gripe, tos, mocos, garganta, flema → reducir volumen). Doc 02 §10.3
opera con la misma granularidad.

Deuda potencial: no detectamos sinusitis con antibiótico ni post-viral
prolongada. No urgente — la mitigación es que el mensaje de mild incluya
"si persiste 48h+, consultá profesional".

## Fase 3 wiring del middleware — deudas abiertas

### §1.gating depende de que Bill etiquete `blockCategory` honestamente

`section01PlanGating` cruza `exercise.blockCategory` (enum del schema Zod)
contra `BlockingContext.blockedCategories` (§1.1/§1.2). Es un lookup
determinístico sin string matching, PERO depende de que el LLM etiquete
honestamente.

Análisis del riesgo (Giuliana + Claude, 2026-07-07):
- Bill NO es adversarial. No hay incentivo para evadir el enum.
- El prompt le pide explícitamente etiquetar honestamente incluso si el
  ejercicio está en la lista de PROHIBIDOS ("el middleware necesita saber").
- La primera capa (PROHIBIDOS en el user message) hace que Bill *casi
  siempre* ni siquiera genere ejercicios de la categoría prohibida.
- Modo de falla realista: ambigüedad de categorización (ej: "tension
  board fingertip drill" — ¿es hangboard? Bill podría decidir null).

Decisión: NO agregar red secundaria de string matching sobre `name`.
Reintroducir string matching es exactamente lo que consistentemente vinimos
evitando. Alternativa mitigatoria: monitorear en prod planes de perfiles
u16/less1 que pasen §1.gating; si aparecen nombres tipo "hangboard",
"campus" en ejercicios con blockCategory=null, incorporar cruce adicional.

Sanity real (2026-07-07 con gpt-4o-mini, perfil u16):
  - Caso A (Bill recibe PROHIBIDOS): plan generado con 0 ejercicios de
    hangboard/campus/etc. Todos con blockCategory=null. §1.gating: 0
    violations.
  - Caso B (plan forzado con "MaxHang Hangboard 20mm" etiquetado
    'hangboard'): §1.gating detecta 1 violation, severity=blocking,
    profileRule='1.1'.

### Monitoreo `low-confidence-block-category` (log-only, sin bloqueo)

`lib/brain/monitoring/low-confidence-block-category.ts` emite JSON a stdout
por cada exercise sospechoso de mal-etiquetado en perfiles con bloqueos
de §1.x. Pattern: `stimulusCategory ∈ {strength, power}` + `riskLevel='alto'`
+ `blockCategory=null` + perfil con al menos 1 categoría bloqueada.

Contexto de por qué NO bloquea (decisión Giuliana, 2026-07-07):
la combinación coincide TANTO con ejercicios legítimos prescritos para
menores (front lever, muscle-up, dominadas BW max, compound BW) como con
ejercicios prohibidos mal-etiquetados. Un bloqueante sobre este pattern
generaría ~5-10 falsos positivos por cada mal-etiquetado real, empujando
al fallback #17 planes válidos para u16 y haciéndoles inútil la app.
Preferimos medir el fenómeno con log antes de meter mecanismo.

Formato del evento (`kind: 'low-confidence-block-category'`):
  profileAge, profileClimbingTime, exerciseName, stimulusCategory,
  riskLevel, blockCategory: null, activeProfileBlocks[], location.

Revisión en 2-4 semanas de prod. Decisión con datos:
  - Si mal-etiquetado real es FRECUENTE (ratio >20%): agregar
    `loadsFingersDirectly: boolean` al FastExerciseSchema (schema-first,
    mismo patrón que blockCategory) para separar strength-dedos de
    strength-compuesta. Después, bloqueante limpio.
  - Si mal-etiquetado real es RARO (<5%): refinar descripciones del enum
    en el WEEK_PROMPT o dejar log-only permanente.
  - Si intermedio (5-20%): decidir con casos concretos.

Emit implementado en `app/api/generate-plan/route.ts` justo antes de
`markFreePlanConsumed` (solo en path de éxito, no en fallos ni retries
intermedios — el log tracea el plan FINAL que el usuario recibió).

### `lib/ai/plan-safety.ts` (legacy R1..R4) coexiste con brain evaluator

Decisión (Giuliana, 2026-07-07): no deprecar en este PR. La validación
vieja de 4 reglas keyword-based sigue wireada en `route.ts` como red
paralela a `evaluateGeneratedPlan` (§1.gating + §3.x + §14.2 + §10.6).
Ambos corren en cada intento; ambos disparan retry al mismo loop; ambos
mensajes de corrección van concatenados a Bill.

Cuando 2-4 semanas de prod confirmen que el brain evaluator no deja
pasar nada que el legacy sí atrapaba, deprecar `plan-safety.ts` en PR
separado (sacar el import + el bloque de correction ensemble).

### Fallback #17 sigue como PLACEHOLDER

`SECTION_03_FALLBACK_MESSAGE.text` retorna al usuario cuando el retry
loop se agota tras 3 intentos con blocking persistente. Sigue con el
texto placeholder:
`'[PLACEHOLDER — mensaje #17 de mensajes-tono-belay-partners.md] ...'`

Verificado (2026-07-07) que el frontend `app/generating-plan/page.tsx`
pasa `data.error` por `getFriendlyGenerationError()`, que solo swappea
si detecta rate-limit técnico de OpenAI. Cualquier otro error se
muestra tal cual al usuario. O sea: hoy el placeholder llega al usuario
literal. Riesgo bajo en frecuencia (solo dispara tras 3 retries fallidos,
que en el sanity de u16 no se activó), pero cuando lo haga, el texto
placeholder se ve raro. Reemplazar el string por el mensaje #17 real
cuando aterrice `mensajes-tono-belay-partners.md`.

## Fase 4 Pieza 2 (Senda) — deudas abiertas para auditoría 360

### Voz de Senda en listas queda en infinitivo impersonal

Estado post-merge (2026-07-07): el refuerzo del bloque VOZ Y TONO logró
que Senda arranque las respuestas con acknowledge + nombre del tema por
su nombre. Los imperativos secos ("Ajusta", "Considera") desaparecieron.
Pero en LISTAS/BULLETS el LLM eligió infinitivo impersonal en vez del
registro de par experta pedido:

Sanity real (gpt-4o-mini, 2026-07-07):
  Usuario: "estoy en mis días y no tengo energía para entrenar hoy"
  Senda:   "Gracias por contarme. En días de menstruación, es normal…
           - Trabajar técnica de pies en la pared.
           - Hacer movilidad suave, enfocándote en cadera y hombros.
           - Considerar descansar y escuchar a tu cuerpo.
           Lo importante es que te sientas bien."

Los infinitivos ("Trabajar", "Hacer", "Considerar") son mejora sobre
imperativos secos pero NO llegaron al registro de par experta buscado
("podés hacer técnica de pies", "algo que a mí me servía era yoga
suave", "probá con"). El cierre motivacional "Lo importante es que te
sientas bien" rozó el extremo condescendiente que también prevenimos.

Solución diferida (auditoría 360, NO ahora): agregar ejemplos LITERALES
de bullets en voz Senda dentro del prompt (no instrucción abstracta),
mismo patrón que usamos con los formatos de ejercicio de Bill. Instrucción
abstracta ("registro de par experta") no basta para el modelo — necesita
ejemplos concretos de bullets ya escritos en la voz correcta.

Cero impacto de safety: la respuesta técnica es correcta (orientación a
sesión suave / aeróbico / mobility / descanso). Es tema de textura de
marca, no de seguridad.

### Classifier prefiere amenorrhea con training link presente

`cycle-signal-classifier.ts` con prompt reforzado explícitamente para
priorizar `clinical-red-s` cuando training link + ausencia co-ocurren.
gpt-4o-mini NO obedece el refuerzo — sigue eligiendo
`clinical-amenorrhea` con 4 meses de ausencia + link explícito al
entrenamiento.

Sanity real (gpt-4o-mini, 2026-07-07):
  Usuario: "hace como 4 meses que no me baja la menstruación, desde
           que aumenté el entrenamiento"
  Layer 1: absence=1, trainingLink=1, monthsElapsed=4
  Layer 2 elige: clinical-amenorrhea (esperado: clinical-red-s)
  Núcleo servido: SENDA_DERIVATION_2_AMENORRHEA verbatim
  Warmth: OK (no viola blacklist).

Cero impacto de safety: ambas derivaciones (Derivación 1 RED-S y
Derivación 2 amenorrhea) derivan a consulta con profesional. La
usuaria recibe un mensaje aprobado que la orienta a lo correcto. La
diferencia es matiz clínico (mencionar training-link explícitamente
vs solo "varios meses"), no criticidad.

Solución diferida (auditoría 360, NO ahora): sacar la decisión red-s
vs amenorrhea del LLM y hacerla REGLA DETERMINÍSTICA en el
orquestador:

```
if (layer1.domains.absence.length > 0 && layer1.domains.trainingLink.length > 0) {
  return { category: 'clinical-red-s', ... };
}
// resto va al classifier LLM
```

Esto elimina la dependencia del LLM para el caso más frecuente y más
importante (RED-S) y deja al LLM solo los casos verdaderamente
ambiguos. Decisión de Giuliana (2026-07-07): NO subir el modelo del
classifier a gpt-4o — resolver por lógica determinística cuando llegue
el momento.

---

## Deuda #5 — Dolor de codo y hombro sin canal directo de captura (2026-07-07)

Contexto del rediseño (audit-360 · rediseño lesión, 07/07/2026):

- El onboarding ya no pregunta `currentFingerPain / currentElbowPain /
  currentShoulderPain`. El perfil los mantiene como opcionales solo
  por compat legacy (usuarios pre-rediseño ya los tienen guardados).
- Dolor de dedos: capturado en el check-in diario. `deriveFingerPain`
  aplica `max(dolor_check_in, lesión_declarada ? 5 : 0)`, con fallback
  a `profile.currentFingerPain` legacy.
- Dolor de codo y hombro: NO tienen check-in propio. Solo se activan
  las ramas §1.3 codo / hombro cuando el usuario declara una lesión
  en esa zona (equivale a dolor 5/10), o cuando tiene el legacy field
  con valor > 0.

Deuda concreta — caso fuera de cobertura:

Un usuario que:
1. NO se considera "lesionado" (no marca la zona en /profile), y
2. Está progresivamente empeorando codo o hombro sesión a sesión,

…no tiene forma de comunicarle al motor esa señal de dolor sub-clínico.
El motor sigue programando §14.2 codo-prevención igual, pero nunca
levanta las adaptaciones de §1.3 rama codo (`limitDeepLockOff`, etc.)
ni las de §1.3 rama hombro (`limitOverheadVolume`, etc.).

Por qué se aceptó la deuda: Giuliana priorizó cortar preguntas del
onboarding sobre esta cobertura. Codo/hombro sin lesión previa es
minoritario vs. usuarios que declaran una lesión franca. El disclaimer
del chat ("esto lo tiene que ver un profesional — un fisio te va a
decir mejor que yo qué puedes y qué no") funciona como red de
seguridad conversacional.

Cuándo revisitarla: si la telemetría del chat muestra >5% de usuarios
mencionando "codo" o "hombro" con dolor sin haber declarado lesión,
volver a agregar la captura — probablemente en el check-in (paridad
con dedos), no en el onboarding.

Solución mínima si se decide capturarlo:
- Extender check-in con 2 escalas opcionales adicionales (0-5 codo,
  0-5 hombro).
- Extender `deriveElbowPain` / `deriveShoulderPain` para leer del
  check-in latest antes del fallback legacy.
- Cero cambio en `lib/brain/rules/section-01-profile-filters.ts` — el
  candado se mantiene.

---

## Deuda #6 — Perfil canónico vive en localStorage, no en DB (2026-07-07)

Contexto: `app/generating-plan/page.tsx:61` llama `loadProfile()` de
`lib/profile.ts`, que lee `bilclimb:profile` de localStorage. El
request a `/api/generate-plan` viaja con ese objeto — la DB de Supabase
NO se consulta para armar el perfil que ve el motor.

Consecuencia inmediata:

- Un usuario que cambia de dispositivo (celular → laptop, o navegador
  privado) llega al home sin perfil visible, aunque en la DB tenga uno
  completo. Se le pide onboarding de nuevo.
- Limpiar caché / cookies del navegador equivale a perder el perfil
  desde la perspectiva del cliente. La DB conserva el registro pero
  el usuario re-onboardea.
- Bug #1 (PATCH devuelve 200, filas quedan en 0) no rompe el flujo de
  generación de plan mientras el usuario siga en el mismo browser —
  el smoke test post-rediseño lesión es válido en ese escenario, pero
  esta desconexión oculta el bug hasta que aparece otro dispositivo.

Deuda separada de bug #1: bug #1 es "el PATCH no persiste"; deuda #6
es "aunque el PATCH persistiera, nadie lo re-hidrata al abrir el app
en otro contexto". Arreglar solo bug #1 no cierra deuda #6.

Solución mínima cuando se atienda:

- Al montar `/` (o el AppShell), hacer `fetch('/rest/v1/profiles?user_id=eq.<uid>')`,
  merge con `loadProfile()` (localStorage) usando `updatedAt` como
  tiebreaker → sobrescribir localStorage y usarlo como cache.
- Regla de conflicto: la DB gana si su `updatedAt` es más nuevo. Si
  el cliente es más nuevo (usuario editó offline), disparar sync a la
  DB antes de leer.
- Alternativa más simple si se acepta latencia: leer siempre de DB en
  `/generating-plan` y en `/profile`, dejar localStorage solo como
  cache warm de UI (dashboard, chat).

No hay decisión de producto tomada. Punto de reevaluación: cuando
llegue el primer usuario reportando "perdí mi perfil" o cuando se
sume soporte multi-dispositivo formal.

---

## Deuda #7 — §1.gating fallback permisivo con `blockCategory: null` (2026-07-08)

Contexto: al implementar la Opción A del §1.gating (enum dinámico de
`blockCategory` restringido por perfil, ver
`lib/ai/fast-plan-schema.ts::buildRestrictedFastWeekSchema`), el LLM pierde
la vía "honesta" para meter un ejercicio prohibido — la structured output
de OpenAI rechaza cualquier `blockCategory` que esté en el set bloqueado.

Camino residual (deuda): el LLM todavía puede etiquetar un ejercicio
prohibido con `blockCategory: null` y colarlo. En
`lib/brain/rules/section-01-plan-gating.ts:121-122`:

```ts
const cat = ex?.blockCategory;
if (!cat) continue; // fallback permisivo
```

Cualquier exercise con `blockCategory: null` se salta el chequeo entero,
independientemente de si el ejercicio real cae en una categoría bloqueada
(ej: "Dominadas con lastre 5kg" etiquetado con `null`). El fallback existe
porque LA MAYORÍA de ejercicios legítimos son `null` (silent feet, foam
roll, respiración), así que endurecerlo a "null → violation" rompería
más de lo que arregla.

Por qué se aceptó: el enum dinámico corta el vector honesto, que es el
que apareció en los logs de P2 en prod (2 slips). La vía "mislabel con
null" requiere que el LLM eluda activamente su propia instrucción, lo
que es menos frecuente. El prompt de `route.ts::generateWeek` ahora dice
explícitamente que el schema rechaza categorías prohibidas, reforzando
que no elija ese camino.

Cuándo revisitarla: si en los logs de prod aparecen slips donde
`blockCategory === null` PERO el ejercicio manifiestamente cae en una
categoría bloqueada. Marcador para grep en logs:
`"kind":"plan_violations_summary"` combinado con inspección manual del
exerciseName.

Solución mínima si se decide cerrar el hueco:

- Agregar `stimulusCategory + name` matcher: para cada exercise con
  `blockCategory: null`, si `stimulusCategory` es 'strength' + `name`
  matchea heurística conocida (regex sobre "pull-up", "hangboard",
  "campus", "MaxHang", "weighted", etc), emitir violation.
- Alternativa más cara: pipeline de segundo LLM que clasifique
  post-hoc cada `null` — costoso en tokens y latencia.

Sin decisión de producto tomada. La Opción A cierra el vector observado
en prod; el vector `null-mislabel` sigue como deuda hasta que aparezca
en logs.

---

## Deuda #8 — Reglas / conceptos / notas / tests colacados como filas del catálogo (2026-07-09)

**Contexto:** al canonicalizar `nivel` (migración 0015, Paso 1 del
workstream del catálogo), se identificó que FIL-004 ("Bloqueo crimp y
hangboard en menores") es una regla de gating, no un ejercicio:
`Tipo = 'Filtro / etiqueta'`, `tipo_registro = 'regla'`, todos los campos
de ejecución en `N/A`. Duplicaba en la tabla la lógica que ya vive en
`lib/brain/rules/section-01-profile-filters.ts` §1.1. Se borró en 0015.

Al enumerar las no-ejercicio restantes (script offline contra el CSV,
2026-07-09), el problema resultó estructural, no aislado.

**Números exactos:** el catálogo tiene **483 rows** totales, de los
cuales **314 son `tipo_registro='ejercicio'`** y **168 son no-ejercicio** (post-DELETE FIL-004):

| tipo_registro | n | Naturaleza |
|---|---|---|
| `test` | 83 | Evaluaciones (MIFS, Critical Force, EAT-26, LEAF-Q, Wall test, cuestionarios…). No son ejercicios de un plan, pero varios podrían tener valor en `/checkin` o en una feature de auto-test. |
| `regla` | 44 | Documentación de reglas de gating y programación (DP-R*, HB-R*, HB-S*, PER-*, REP-*). **Duplican lógica que ya vive en `lib/brain/rules/`.** Perfil para DELETE. FIL-004 era la 45va y ya fue borrada por 0015 (regla de gating específicamente por edad). |
| `concepto` | 22 | Mix: contenido pedagógico de agarres (TA-C001..C008, "Half crimp"), mensajes de safety (DP-W001..W006), documentación de recuperación/nutrición (RE-005..009), decisiones de producto (ADO-001). Ninguno es ejercicio; varios contienen contenido migrable a `lib/brain/messages/` o a UI de referencia. |
| `nota` | 19 | Todas son "Faltante: X". Placeholders de curación abierta. **Cero contenido útil**, son TODOs. Perfil para DELETE. |

Clasificación tentativa por decisión: **~63 rows son ruido puro** (19 notas + 44 reglas que duplican código), **~105 tienen algún valor** (concepto migrable + tests re-usables en futuro), aunque **ninguno es un ejercicio de un plan**.

**Impacto en 0015 (aplicada 2026-07-09):** el UPDATE de `nivel_canonico`
y los UPDATE de tags en la versión inicial aplicaron a las 482 rows
(post-DELETE FIL-004), incluyendo las 168 no-ejercicio restantes. El resultado en
prod fue reglas/notas/tests con `nivel_canonico='principiante'` y el
tag `menor` en 5 rows todas non-ejercicio (DP-R005, DP-S002, EV-RH-003,
HB-F006, HB-S006).

**Corrección aplicada en dos frentes:**

1. **Archivo `0015_canonicalize_nivel.sql`:** guards `AND tipo_registro =
   'ejercicio'` en el CASE y en los dos UPDATE de tags. Correr desde
   cero mapea solo ejercicios (para futuros environments).
2. **Migración `0016_correct_nivel_canonico_non_ejercicio.sql`:**
   idempotente. Pone `nivel_canonico = NULL` donde `tipo_registro !=
   'ejercicio'`, retira tag `menor` de las 5 no-ejercicio. Corrige el
   estado de la base ya aplicada. HB-REHAB-A2A4 (ejercicio real) conserva
   su tag `rehab`.

**Estado post-0016 (verificado 2026-07-10):** 314 ejercicios reales con
`nivel_canonico` mapeado, 168 no-ejercicio con `nivel_canonico = NULL`,
0 rows con tag `menor` no-ejercicio, HB-REHAB-A2A4 intacto (todos + rehab).

**Cuándo revisitar la deuda:** Paso 4 del workstream del catálogo
(mapping `BlockedCategory` → filas). Ahí auditamos los 168 por tipo
para decidir DELETE / migrate / retain:

1. **Reglas y notas (63 rows)**: DELETE. La lógica y los TODOs ya viven
   (o deberían vivir) en otros lugares del repo.
2. **Conceptos migrables (~10 rows, DP-W* y algunos TA-C*)**: mover a
   `lib/brain/messages/` con un shape canónico, luego DELETE del catálogo.
3. **Conceptos de referencia (~12 rows, tipos de agarre, recuperación,
   nutrición)**: decidir con Bill/Senda si conservar como catálogo de
   referencia (con `tipo_registro='concepto'` visible al motor) o migrar
   a documentación estática.
4. **Tests (83 rows)**: decidir si el motor los recomienda como
   evaluaciones periódicas (`/checkin` extendido), como onboarding
   opcional (Wall test), o si quedan como referencia sin runtime.

**Costo estimado:** 1-2h de curación con Bill/Senda en Paso 4. No urgente
— la vista `exercises_eligible` ya los aísla del motor y 0016 los deja
con `nivel_canonico = NULL` para que se identifiquen como "no
clasificados por este workstream" sin confundirlos con ejercicios reales.

**Radar añadido al enumerar `categoria` en Paso 2 (2026-07-10):** 16 rows
con `tipo_registro='ejercicio'` que probablemente son reglas/frameworks/
contenido colado. Todas siguen contando como ejercicio hasta que Paso 4
audite. No las canonicalizamos ni les asignamos categoria/proposito/momento
en las tandas — quedan con las 3 columnas NULL como marca de "revisar".

Reglas colacadas sospechosas (5 rows):
- `FIL-006` · Campus near maximum (Michailov) — categoria "Datos app: clasificación y filtros"
- `PER-001` · Modelo Base → Peak (Barrows) — categoria "Periodización y planificación"
- `PER-002` · Ciclo 4-3-2-1 — categoria "Periodización y planificación"
- `PER-005` · Macrociclo de hangboard (López-Rivera) — categoria "Periodización y planificación"
- `PER-DELOAD` · 3/1 Cycle (deload / descarga) — categoria "Periodización"

Framework/contenido colacado sospechosos (11 rows):
- Adaptación por nivel (5): ADN-001, ADN-002, ADN-003, ADN-004, ADN-005
- Adaptación por objetivo (4): ADO-002, ADO-003, ADO-004, ADO-006
- Adaptación tabla (1): BO-BOARD-PROG · Progresión Board 3 bloques
- Nutrición (1): NE-PR-001 · Ajuste de carbohidratos según carga semanal
- Recuperación (1): NE-PR-003 · Nutrición post-entrenamiento

Notas del análisis para Paso 4:
- La mayoría de los "Adaptación por X" son instrucciones para armar
  planes, no ejercicios ejecutables con dosis. Van perfil `concepto`.
- Los `PER-*` de periodización son frameworks/protocolos macro, no
  ejercicios de sesión. Van perfil `concepto` o `regla`.
- Los `NE-*` de nutrición son contenido de biblioteca. Van perfil
  `concepto`.
- `FIL-006` sigue el mismo patrón que FIL-004 (regla colada).

Sub-total actualizado del pool de Paso 4: los 189 no-ejercicio actuales
(83 test + 44 regla + 43 concepto + 19 nota, post-0018 reclasificación
de mental/táctica) + estos 16 candidatos a recategorización = ~205 filas
a auditar. Costo estimado sube de 1-2h a 2-3h con Bill/Senda.

**Radar añadido en Tanda 1 fuerza-dedos (2026-07-10):** distinción
protocolo-de-bloque vs ejercicio-de-sesión dentro de fuerza-dedos.

Los rows HB-P001..P004 son **bloques de 4-8 semanas** con 2-3 sesiones
por semana:
- HB-P001: "MaxHangs 8 semanas — 2 sesiones/semana"
- HB-P002: "IntHangs / Repeaters 8 semanas"
- HB-P003: "MaxHangs + IntHangs — 8 semanas (4+4)"
- HB-P004: "Fingerboard competitivo 4 semanas — 3 sesiones/semana"
- DP-P005 similarmente ("Fingerboard competitivo de boulder")

El motor **no debe meter un bloque de 8 semanas como si fuera un
ejercicio de una sesión** en un plan de 4 semanas. Riesgo real: en Paso
5 (enum del motor), OpenAI podría elegir HB-P001 como un exercise del
mainBlock, tratándolo como sesión única cuando en realidad es un
protocolo completo con estructura semanal propia.

**Decisiones a tomar en Paso 5:**

1. **Distinguir en el catálogo:** agregar una dimensión adicional al
   schema — quizás `alcance` con valores `sesion` / `bloque`, o un tag
   `protocolo-de-bloque`. Al filtrar la lista para el enum del motor,
   filtrar `alcance='sesion'` para plan generation. Los bloques quedan
   como referencia para futuras features (macrociclos, planes de 8+
   semanas).
2. **Alternativa más simple:** excluir los IDs con sufijo `-P00N` del
   pool de exercises-eligibles. Pattern-based. Menos limpio pero rápido.
3. **Alternativa más granular:** curar row por row en Paso 4 y marcar
   los que son bloques con una tag específica.

**Costo estimado:** 0.5-1h en Paso 5 más la curación adicional si va
por opción 1. Registrado acá para no perderse entre pasos.

**Actualización tanda 3 (2026-07-10):** CO-P004 "Bloque de base con Aero
Cap" se agrega al radar Paso 5. Descripción tiene estructura de
macrociclo ("Base 1 con fuerza + An Cap + Aero Cap razonable; Base 2
Aero Cap alta prioridad; Peak bajar Aero Cap; Taper retirar Aero Cap y
ARC"). Decisión de Giuliana: queda como resistencia-aerobica (no
reclassificar a concepto) pero se marca acá para revisar al conectar
el motor.

Suma al listado de rows sospechosos de "protocolo-de-bloque" que el
motor no debe meter como ejercicio de sesión única:
- HB-P001..P004 (fuerza-dedos, 4 rows) — bloques 4-8 semanas
- DP-P005 (fuerza-dedos) — Fingerboard competitivo de boulder
- CO-P004 (resistencia-aerobica) — Bloque de base con Aero Cap 4-6 meses

Total: 6 rows candidatos a filtrar del pool del motor en Paso 5, o
marcar con `alcance='bloque'` si se implementa esa dimensión adicional.

## Deuda #9 — Fracciones del BrainContext descartadas antes de llegar al motor (2026-07-10)

**Contexto:** al hacer el audit end-to-end del Grupo A del Paso 4 del
workstream del catálogo, se detectó que `evaluateProfile()` acumula 4
tipos de output en `BlockingContext` (blockedCategories, blockedZones,
blockedExercises, gripRestrictions + trainingPriorities +
intensityAdjustments) pero **solo uno** llega a la generación real.

**Detectado con:**
`grep -rn "gripRestrictions\|trainingPriorities\|intensityAdjustments\|blockedExercises\.exactIds\|blockedExercises\.prefixes" --include="*.ts"`
fuera de `lib/brain/{types,validator,rules,orchestrator}` no matchea nada.
Único consumo del `brainContext` en `app/api/generate-plan/route.ts:941`:
```
const blockedCategoriesForPrompt = Array.from(brainContext.blockedCategories);
```

Los demás sets se computan, se persisten en el ctx, y se descartan.

**Los 3 gaps concretos:**

1. **§1.3 `blockedZones` no se traduce a IDs.**
   `check_1_3` (`lib/brain/rules/section-01-profile-filters.ts:102-124`) emite
   `block-zone` con `zone ∈ {fingers-pulleys, elbow, shoulder}` cuando el
   dolor actual ≥ 3. `section-02-exercise-gating.ts:77-137` solo traduce
   `BlockedCategory`, no `BlockedZone` — el `translateCategoriesToGating`
   ignora el input de zones. Resultado: dolor de dedos (por ejemplo) no
   filtra ningún ejercicio en el prompt, no aparece en el matcher, no
   dispara PlanRuleModule. Solo queda como `derivationMessages` para el UI,
   pero no impacta la generación. **Reglas del catálogo afectadas:**
   DP-R004, HB-S005 (mantenidas como referencia hasta que se cierre).

2. **§5.2 `gripRestrictions` no se inyectan al prompt.**
   `check_5_2` (`lib/brain/rules/section-05-health-derivation.ts:37-46`)
   añade `'no-small-crimps-below-15mm'` cuando `injuries.includes('fingers')`.
   El set queda en `ctx.gripRestrictions` pero **no** se pasa a
   `generateWeek()` en `app/api/generate-plan/route.ts:948-957`. El
   parámetro solo incluye `blockedCategoriesForPrompt`. Resultado: la
   regla de regletas 11-15 mm no llega al LLM. **Reglas del catálogo
   afectadas:** HB-S004, DP-S001 (mantenidas como referencia).

3. **§5.3 `trainingPriorities` + §5.4 `intensityAdjustments` no se
   inyectan al prompt.** Mismo mecanismo: `check_5_3` emite
   `'extensors-before-traction'` y `'reduce-traction-volume'`, `check_5_4`
   emite `'reduce-below-baseline'`. Ninguno llega a `generateWeek()`. §5.3
   tiene mitigación parcial vía §14.2 (que sí se ejecuta y tiene el
   post-processor `ensureExtensorWork`), por lo que DP-S004 queda con
   cobertura real end-to-end. §5.4 (sueño malo) no tiene mitigación
   downstream: se computa y se descarta.

4. **`blockedExercises` (exactIds + prefixes) computados por section-02 no
   se consumen en ningún lado.**
   `translateCategoriesToGating` (`section-02-exercise-gating.ts:77-137`)
   produce un matcher con IDs concretos (`HB-` prefix, `CB-` prefix, HIT
   IDs, TEST_MAXIMO_IDS, PULLUPS_WEIGHTED_IDS) que se copia a
   `ctx.blockedExercises` en `validator.ts:98-100`. Fuera del validator y
   los rules, **nadie lo lee**. La red posterior `section01PlanGating`
   (`lib/brain/rules/section-01-plan-gating.ts:91-140`) reevalúa el perfil
   y compara `exercise.blockCategory` (enum) contra
   `ctx.blockedCategories` (enum). No usa el matcher de IDs. Resultado: si
   el LLM inventa un nombre de ejercicio que corresponde a un ID bloqueado
   (por ejemplo un "Suspensión máxima en 25mm" que es FD-006) pero lo
   etiqueta con `blockCategory='strength'` en vez de `'max-tests'`, la red
   no lo atrapa por ID.

**Cuándo cerrar:** Paso 5 del workstream del catálogo (motor enum +
join con `public.exercises`). Ahí se pueden hacer las 4 cosas en un solo
PR:
- Extender `translateCategoriesToGating` para aceptar
  `ReadonlySet<BlockedZone>` y traducir a IDs por zona (join con
  `categoria_canonica ∈ {hombros-escapulas, munecas-antebrazos,
  fuerza-dedos}` según zona).
- Extender `generateWeek()` para recibir el `BrainContext` completo (no
  solo `blockedCategoriesForPrompt`) e inyectar las restricciones y
  adjustments como bullets adicionales en el `prohibitedBlock`.
- Extender `section01PlanGating` (o crear un nuevo `section-02-plan-gating`)
  para chequear `exercise.exerciseId` contra `ctx.blockedExercises` una
  vez que el schema tenga `exerciseId` (Paso 6).

**Interim:** las reglas del catálogo cuya lógica cae en un gap se
CONSERVAN como referencia. Al abordar Paso 5/6, se re-audita: si la regla
pasa a estar cubierta end-to-end, se borra entonces. Este comportamiento
lo definió Giuliana explícitamente en el Paso 4: "borrar una fila cuya
lógica no llega a ejecutarse sería borrar constancia de una regla que en
la práctica no funciona".

### Checklist de aceptación del Paso 5 — filas conservadas por gap

Las 5 filas del catálogo que sobrevivieron el 0024 porque su check
existe en código pero no llega al ejercicio. Cerrar los gaps de Deuda #9
gaps 1-4 debe volverlas redundantes; al cerrar cada gap se re-audita la
fila y se decide si borrar en un DELETE posterior.

| Fila | Check emisor | Gap concreto | Cierra con |
|---|---|---|---|
| **DP-R004** · "No entrenar hangboard si hay lesión actual" | §1.3 `check_1_3` @ `lib/brain/rules/section-01-profile-filters.ts:102-124` emite `block-zone: fingers-pulleys` con pain≥3 | `translateCategoriesToGating` @ `section-02-exercise-gating.ts:77-137` acepta `BlockedCategory` pero no `BlockedZone` — el zone se descarta al salir del validator | Extender section-02 para consumir `ctx.blockedZones` y traducirlas a IDs (join con `categoria_canonica ∈ {fuerza-dedos}` para zona `fingers-pulleys`). Gap 1 de Deuda #9. |
| **HB-S005** · "Bloqueo tests máximos con dolor o lesión reciente" | §1.3 mismo mecanismo (pain≥3 → block-zone) | Mismo gap zone→ID que DP-R004 | Igual que DP-R004 |
| **HB-S004** · "Bloqueo regletas 11-15 mm" | §5.2 `check_5_2` @ `lib/brain/rules/section-05-health-derivation.ts:37-46` emite `add-grip-restriction: no-small-crimps-below-15mm` con `injuries.includes('fingers')` | `ctx.gripRestrictions` no se pasa a `generateWeek()`. `route.ts:941` solo lee `blockedCategoriesForPrompt`; los demás sets del `brainContext` se descartan | Extender `generateWeek()` en `app/api/generate-plan/route.ts:948-957` para recibir el `BrainContext` completo y añadir bullets de `gripRestrictions` al `prohibitedBlock`. Gap 2 de Deuda #9. |
| **DP-S001** · "Riesgo lesión de poleas — bloquear carga con dolor o lesión previa" | Doble emisor: §1.3 (pain≥3 → block-zone dedos) + §5.2 (injuries.includes('fingers') → grip restriction) | Doble gap: zone→ID (gap 1) y grip→prompt (gap 2) | Cierran los dos gaps arriba |
| **REP-002** · "Recuperación según intensidad — máx 2-3 sesiones de dedos por semana con 48h de espacio" | No hay check emisor arquitectónico — §3.3 (`check_3_3`) cubre "no 3 duros consecutivos" y §3.4 (`check_3_4`) cubre recuperación entre dos sesiones consecutivas del mismo stimulus, pero ninguno cap el total semanal de sesiones de dedos ni el espaciado específico | Requiere un check nuevo `check_3_freq_dedos` que cuente sesiones cuyo mainBlock incluye exercise con `stimulusCategory='strength'` **Y** `categoria_canonica='fuerza-dedos'` por semana, con cap 3 y gap mínimo 48h entre ellas. Necesita `categoria_canonica` accesible al validator (Paso 6: persist `exerciseId` per-exercise en el plan generado). |

Además, aunque no bloqueó ninguna fila del Paso 4:

- **Gap 3 de Deuda #9** — §5.3 (`extensors-before-traction` + `reduce-traction-volume`) y §5.4 (`reduce-below-baseline`) no llegan al prompt. §5.3 tiene mitigación colateral por §14.2 (que sí corre), por lo que ninguna fila del catálogo fallaba por §5.3 sola. **§5.4 (sueño <5h) no tiene mitigación downstream**: el verdict se computa y se descarta silenciosamente. No hay row del catálogo que lo documente en el subset de 44 tipo_registro='regla', pero cerrarlo es parte del mismo PR que gap 2.
- **Gap 4 de Deuda #9** — `blockedExercises` (exactIds/prefixes) computados por section-02 no se consumen. La red posterior `section01PlanGating` chequea `exercise.blockCategory` enum contra `ctx.blockedCategories` enum. Se cierra cuando el schema del plan tenga `exerciseId` (Paso 6) y un nuevo `section-02-plan-gating` chequee ID contra matcher.

**Regla la constancia sobre el motor:** al cerrar cada gap, se re-corre
`grep` sobre las 5 filas conservadas y las que quedan wired end-to-end
pasan a un DELETE posterior. Esto mantiene la propiedad de que "cada
regla del catálogo o vive en código o marca un gap explícito", nunca
"vive parcialmente en un limbo".

### Nuevas deudas descubiertas al hacer Paso 4 (b) mapping BlockedCategory → catálogo (2026-07-10)

Al revisar los 78 sin-tag de las 5 categorías bloqueables uno por uno para el
marcado de `riesgo-lesion:*` (migración `0025`), aparecieron dos huecos que
no están cubiertos por ninguna BlockedCategory del enum actual y que Paso 5
debe cerrar antes de que el gating con dientes esté completo.

#### Deuda #10 — Potencia máxima con contact strength sin BlockedCategory (2026-07-10)

**Contexto:** al taggear los 78 sin-tag en 0025 aparecieron 2 rows con
intensidad Máxima y riesgo Alto de contacto explosivo que ninguna categoría
del enum `BlockedCategory` (`lib/brain/types.ts:16-24`) cubre:

- **PO-DEADSTOP** · "Dead Stop (precisión dinámica)" · `categoria_canonica='potencia'`, `nivel_canonico='avanzado'`. Descripción menciona "detenerse INMEDIATAMENTE sin 'chocar' contra ella" — carga explosiva máxima en dedos + codo + hombro.
- **PO-POWERPU** · "Power Pull-up (dominada explosiva)" · `categoria_canonica='potencia'`, `nivel_canonico='avanzado'`. "Ejecutar una dominada explosiva intentando que el pecho toque la barra ... cada rep debe ser máxima velocidad de subida" — tracción explosiva máxima.

**Verificación cruzada:**
- `campus` bloquea prefijo `CB-` (`lib/brain/rules/section-02-exercise-gating.ts:101-103`). Ni PO-DEADSTOP ni PO-POWERPU empiezan con `CB-`.
- `hit` bloquea 2 IDs literales (`FM-014`, `PF-FM-005` — `section-02:35`). Ninguno matchea.
- `pullups-weighted` bloquea 2 IDs literales (`FT-002`, `FTE-002` — `section-02:61-64`). Ninguno matchea. Nota semántica: en 0025 el tag `riesgo-lesion:pullups-weighted` se extendió sobre 9 rows via UPDATE de catálogo, pero el motor NO consume ese tag hoy (Deuda #9 gap 4: `blockedExercises` matcher no se lee). La categoría enum sigue con 2 IDs hardcoded.

**Consecuencia operativa:** un menor de 16 (age=u16), un usuario con <2 años (climbingTime <2 años), o un lesionado de dedos (pain≥3 / injuries.includes('fingers')) **no queda bloqueado de PO-DEADSTOP ni PO-POWERPU**. La única red que los aleja de un principiante es `nivel_canonico='avanzado'` — el LLM no los propone por nivel, no por categoría de seguridad.

**Cuándo cerrar:** Paso 5 del workstream del catálogo, mismo PR que amplíe el enum. Opciones de nombre para la categoría nueva:
- `power-max` — cubre potencia explosiva con contact strength máximo. Semánticamente limpio.
- `explosive-contact-strength` — más descriptivo, más largo.
- Reutilizar `hit` extendido a "todo entrenamiento de alta intensidad neural repetido máximo": semánticamente confuso (HIT canónico = Hypergravity Isolation Training específico), no recomendado.

**Interim (post-0025):** ambos rows quedan `sin tag riesgo-lesion:*` en el catálogo. Documentados acá como huecos conscientes.

#### Deuda #11 — `proposito='rehab'` no filtrado en el motor (2026-07-10)

**Contexto:** los rows con `proposito='rehab'` (asignados en `0022_paso_2_cierre.sql:216-220`) son ejercicios de retorno post-lesión con protocolos específicos. La Deuda #8 y el análisis del Paso 4 asumen que están "segregados por dimensión propósito" y por tanto no llegan al pool de entrenamiento del LLM.

**Verificación:**
```
grep -rEn "proposito" lib/ app/ | grep -v test | grep -v node_modules
```
retorna cero coincidencias. **No hay filtro por `proposito` en ningún lado del código del motor.** El LLM recibe el pool completo (todo `tipo_registro='ejercicio'`) sin discriminar por `proposito`.

**Consecuencia operativa:** RH-004, RH-005, RH-001, RH-P001, RH-P002, HB-REHAB-A2A4, HB-ISO-RECOV, HB-DENS, HB-PROT, PR-003, TC-FOFF (11 rows con `proposito='rehab'` o `proposito='prevencion'`) pueden llegar al prompt como opciones de programación normal, incluso a perfiles sanos sin historial de lesión declarado.

**Cuándo cerrar:** Paso 5. Dos opciones:
- **Filtro duro por proposito**: excluir `proposito ∈ {rehab}` del pool a menos que el perfil tenga `injuries` no vacío o `pain≥3`.
- **Regla condicional** en el prompt: "sólo ofrecer rehab a perfiles con lesión declarada". Menos hermética (depende de que el LLM respete), más flexible.

Giuliana definió la regla operativa: "los ejercicios `proposito='rehab'` solo se ofrecen a perfiles con lesión declarada, nunca a sanos". Se implementa como filtro estricto en Paso 5.

**Interim (post-0025):** los rows quedan sin tag riesgo-lesion (bien) pero pueden ser propuestos por el LLM aunque no correspondan. Deuda conocida.

## Deuda #12 — §2.4 (gating por prerrequisito de reps) sin código ni campo de perfil (2026-07-11)

**Contexto:** al cerrar el cabo suelto de FT-006 en el Paso 4 (migración `0026`), aparece un tipo de regla nueva del Doc 02 que ninguna de las Deudas #9-#11 cubre: gating por **prerrequisito de capacidad medible** contra un valor umbral.

**Regla del Doc 02:** §2.4 dice literalmente *"Condición: ejercicio FT-006 o equivalente. Acción: desbloquear sólo si usuario completa ≥15 dominadas estrictas por serie."*

**Grep en `lib/brain/rules/` (verificado 2026-07-11):**
```
FT-006          → 0 matches en rules/
one-arm / lock-off → matches solo en types.ts:68 y section-05 como TEXTO
                    de mensaje ("reducir volumen de dominadas/lock-offs"),
                    NO como regla operativa que bloquee FT-006
15 dominadas    → 0 matches
§2.4 / regla 2.4 → 0 matches
```

**Gap doble:**

1. **No hay check emisor.** Ninguna función en `lib/brain/rules/` compara "reps de dominada" contra 15 ni bloquea FT-006.

2. **No hay campo en `ProfileForRules`.** El tipo `ProfileForRules` en `lib/brain/types.ts` no captura "reps máximas de dominada estricta" del usuario. Aunque quisiéramos implementar §2.4 mañana, la señal no está disponible en runtime. Requiere:
   - Nueva pregunta en el onboarding (o el checkin) que capture reps de dominada.
   - Campo `maxPullupReps: number | null` en `ProfileForRules`.
   - Regla `check_2_4` que compare `profile.maxPullupReps` con el umbral 15 y emita `block-categories` con una nueva categoría (candidata: extensión de `pullups-weighted` semánticamente cubre; alternativa: nueva categoría `pullups-prerequisite` para separar).

**Filas del catálogo afectadas:**
- **FT-006** — "Bloqueo con una mano (one-arm lock-off)" — reclasificada a ejercicio en `0026`, tag `riesgo-lesion:pullups-weighted` aplicado. Post-`0027` **lleva también tag `prerequisito:15-pullups`** que el matcher del Paso 5 consume para excluirla del pool cuando `profile.maxPullupReps < 15` o es null (fallback conservador C.1 del checklist). Barrera actual = `nivel_canonico='avanzado'` (débil, depende del LLM) + gate del matcher por tag (fuerte, determinístico) una vez que el matcher esté en runtime.
- **FTP-004** — "Bloqueo con una mano — criterio de entrada" — es `tipo_registro='regla'` (**no `concepto`** como se documentó por error antes del 2026-07-13). Es §2.4 escrita como fila del catálogo (*"Sólo iniciar bloqueo a una mano con ≥15 dominadas por serie…"*). **NO lleva tag `prerequisito:15-pullups`** porque el matcher filtra pool `tipo_registro='ejercicio'` — taggear una regla no le sirve al gating. Se conserva como **constancia editorial en catálogo del gap** — mismo patrón que las 5 reglas conservadas por gap end-to-end en Paso 4 (DP-R004, HB-S005, HB-S004, DP-S001, REP-002 · Deuda #9). Al cerrarse §2.4 con `maxPullupReps` + `check_2_4`, se re-audita: si FTP-004 queda cubierta end-to-end vía el nuevo módulo, pasa a un DELETE posterior.

**Interim (post-0026):** `nivel_canonico='avanzado'` es la barrera única mientras §2.4 no exista en código. Es una barrera **débil** — depende de que el LLM respete el filtro por nivel, no de un check determinístico. Un LLM que ignore el nivel puede proponer FT-006 a un principiante y no hay red posterior que lo atrape.

**Interim (post-0027 aplicada + matcher en runtime):** el filtro C.1 del matcher lee el tag `prerequisito:15-pullups` sobre FT-006 y la excluye del pool si `maxPullupReps < 15` o null. Barrera se vuelve **determinística en el matcher** aunque §2.4 siga sin check dedicado en `lib/brain/rules/`. Sigue siendo interim porque:
1. El campo `maxPullupReps` no existe todavía en `ProfileForRules` → el filtro cae al fallback conservador (excluye igual con valor null).
2. La red posterior `section01PlanGating` sigue sin cubrir el caso — solo el matcher lo cierra.
3. Si el matcher tiene un bug y la fila se cuela, no hay segunda red que la atrape.

**Cuándo cerrar:** Paso 5 o inmediatamente después. Es un check pequeño y aislado — no depende de Paso 6 (`exerciseId`), sino de un campo nuevo de perfil. Puede implementarse antes que Paso 6.

**Estado post-Paso 5 · matcher (2026-07-13):** el filtro C.1 del matcher (`passesC1` en `lib/brain/matcher/resolveToCanonical.ts:131-135`) ya opera con **fallback conservador** — `profile.maxPullupReps == null` excluye a FT-006 del pool en todos los niveles del fallback (L1/L2/L3). Es la barrera correcta para el interim: mejor bloquear el one-arm lock-off por defecto que dárselo a alguien que no completa 15 dominadas. Aprobado por Giuliana el 2026-07-13.

**Pendiente de decisión de producto (Giuliana):** dónde va la pregunta "¿cuántas dominadas estrictas hacés en una serie?" en el onboarding. Alternativas identificadas:
- Nueva pregunta explícita en el onboarding inicial (más data captura de entrada, más fricción de setup).
- Pregunta condicional en el primer checkin que aparece solo si el usuario expresa objetivos de tracción/fuerza (menos fricción, ventana de datos más chica).
- Autocaptura en el primer plan generado que pide al usuario reportar reps post-sesión (data-driven pero más tardía).

La lógica del check `check_2_4` es trivial una vez que el campo existe (~20 LOC). El bloqueo real es editorial: dónde y cómo se pregunta. Decisión pendiente de Giuliana.

**Criterio de cierre:**
1. Onboarding capta `maxPullupReps` (nueva pregunta) — 0 si no puede hacer ninguna.
2. Migración de schema `public.profiles` agrega columna `max_pullup_reps int`.
3. `ProfileForRules` incluye el campo.
4. `check_2_4` (nuevo módulo o sección) emite `block-categories` con la categoría que corresponda cuando `maxPullupReps < 15`.
5. Verificación: perfil con `maxPullupReps=10`, plan generado no contiene FT-006.
6. Al confirmar cerrado, se re-audita: FT-006 pasa de "protegida solo por nivel" a "protegida end-to-end". No requiere borrado adicional; solo actualiza este documento.

**Deudas anidadas que este cierre desbloquea:** también cierra el "prerequisito ≥15 dominadas" para FTP-004 y para cualquier ejercicio futuro que Doc 02 gate por reps de dominada.

## Deuda #13 — §3.4 power-endurance: 3 días recuperación en código, 5 días en Doc 02 (2026-07-13)

**Contexto:** al extender el `WEEK_PROMPT` con §3.4 (recuperación entre sesiones del mismo stimulus) para atrapar el Bug #3 de estructura semanal, hubo divergencia entre lo que dice Doc 02 y lo que el código valida:

- **Doc 02 §3.4:** power-endurance (4x4 al fallo, PE circuits densos) requiere hasta **5 días** de recuperación entre sesiones. Es la ventana biológica canónica citada en la literatura (McClure et al., Hörst; documentado también en Lattice Training).
- **Código actual** en `lib/brain/rules/section-03-session-programming.ts:148-153` (tabla `MIN_RECOVERY_DAYS`): usa **3 días** para power-endurance. El comentario dice literal: *"3 días como mínimo defensivo (no 5 porque bloqueaba demasiado a 3 días/semana con PE)"*.

**Decisión (Giuliana, 2026-07-13):** mantener 3 días alineando prompt y validador. Rationale:

> El público objetivo entrena típicamente 3 sesiones/semana. Con recuperación de 5 días entre sesiones de power-endurance, quedaría **1 sesión de PE cada 5-7 días** máximo, lo que hace inviable programar un ciclo de PE realista en el mesociclo del usuario. Preferimos que el sistema converja con 3 días (biológicamente sub-óptimo pero programáticamente viable) a que rechace todos los planes por 5 días biológicamente correctos.

**Alineación aplicada 2026-07-13:**
- `WEEK_PROMPT` en `app/api/generate-plan/route.ts` (sección `DISTRIBUCIÓN SEMANAL DE CARGA`): dice literal *"power-endurance → 3 días de separación (72h)"*.
- `MIN_RECOVERY_DAYS` en `section-03-session-programming.ts:148-153`: `'power-endurance': 3`.
- `check_3_4` valida contra el mismo umbral.

**Principio guía:** el prompt y el validador tienen que pedir lo mismo. Si divergen, el LLM cumple el prompt y el validador lo rechaza igual → el plan nunca converge.

**Cuándo revisitar:** si el público cambia a atletas con volumen semanal >4 sesiones y varias de PE (élite competitivo), el umbral de 3 días podría subir a 4-5 sin bloquear viabilidad. Revisar con datos reales de logs (rate de retries por §3.4).

## Deuda #14 — §3.9 desactivada para planes <6 semanas + §1.2 ampliada con power-endurance (2026-07-13)

**Contexto:** al debuggear plans que fallaban por §3.9 (anaerobic-without-aerobic-base) descubrimos una contradicción producto-regla:

- **Producto:** BilClimb produce planes cortos de guía. `planDuration` está restringido a `{2, 3, 4}` en `lib/schemas/user-profile.ts:66` (commit `25b0401`, "matches onboarding").
- **§3.9 (Doc 02):** power-endurance requiere ≥6 semanas de base aeróbica previas.
- **Consecuencia matemática:** en un plan de 4 semanas, §3.9 nunca puede cumplirse aunque el atleta sea un profesional. Cualquier PE en cualquier semana viola.

Antes de este fix, cada plan con PE fallaba estructuralmente: Bill seguía metiendo PE, §3.9 rechazaba, retry no absorbía.

**Decisión Giuliana (Camino A con restricción por experiencia):**

1. **§1.2 ampliada:** `power-endurance` se bloquea como *stimulus* para escaladores con menos de 2 años (`climbingTime !== 'more3'`), en el mismo umbral que ya bloquea hangboard-intense/campus/hit/pullups-weighted/max-tests.

2. **§3.9 desactivada para planes <6 semanas:** `check_3_9` retorna `[]` si `plan.weeks.length < 6`. Los avanzados con 2+ años pueden hacer PE en planes cortos porque tienen la base fisiológica previa (fuera del plan generado por BilClimb).

3. **Principio:** el gating por experiencia (§1.2) es la protección real. Mantener §3.9 activa para planes cortos haría el permiso a avanzados inútil — el check los bloquearía igual.

**Implementación:**

- **`lib/ai/fast-plan-schema.ts`**:
  - Nueva `buildAllowedStimulusCategorySchema(blockedStimuli)`.
  - `buildRestrictedExerciseSchemas(blocked, blockedStimuli)` y `buildRestrictedFastWeekSchema(blocked, blockedStimuli)` aceptan lista de stimulus prohibidos y los recortan del enum de `StimulusCategory` en `session` y en las 3 variantes de exercise (warmup/mainBlock/cooldown).
- **`app/api/generate-plan/route.ts`**:
  - Calcula `blockedStimuliForSchema = climbingTime !== 'more3' ? ['power-endurance'] : []`.
  - Lo pasa a `generateWeek` en las 2 llamadas (primera generación + retry loop).
- **`lib/brain/rules/section-03-session-programming.ts:500-503`**:
  - `check_3_9` retorna `[]` si `ordered.length < 6`.
  - Comentario documenta la decisión.

**Verificaciones (2026-07-13):**

- typecheck limpio.
- Suite 616+ tests verdes (incluyendo 5 nuevos de `buildAllowedStimulusCategorySchema` y 2 tests de `blockedStimuli` en `buildRestrictedFastWeekSchema`).
- Test viejo de §3.9 con plan de 4 semanas actualizado: ahora verifica que NO dispara (con explicación referencia a esta deuda).
- Nuevo test §3.9 con plan de 7 semanas: verifica que el check sigue funcionando en macrociclos largos.

**Cuándo revisitar:**

- Si `planDuration` alguna vez se expande a >6 semanas, revisar si §3.9 se mantiene desactivada para el rango 2-5 o se activa selectivamente por duración exacta.
- Si el análisis de logs muestra que ningún usuario avanzado usa PE en planes cortos, considerar bloquear PE en todo el producto y simplificar la lógica.

**Deudas anidadas:** §3.9 desactivada crea la asunción implícita de que "si un avanzado quiere PE, tiene la base fisiológica fuera del sistema". No hay validación de eso. Si algún día hay checkin más detallado de historia de entrenamiento, se puede pedir "confirmá base aeróbica de ≥6 semanas antes de habilitar PE" en el onboarding avanzado.
