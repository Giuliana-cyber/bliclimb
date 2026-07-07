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

| Columna | Distintos | Ejemplos representativos |
|---|---:|---|
| `nivel` | ~50 | `"Principiante"`, `"Intermedio en adelante"`, `"Todos"`, `"Avanzado, ideal para escalador de sportclimbing"` |
| `intensidad` | ~82 | `"Alta"`, `"Media-Alta"`, `"Alta si se usa regleta pequeña o carga alta"` |
| `frecuencia` | ~60 | `"2x/sem"`, `"2-3x semana"`, `"Diaria"`, `"1x cada 2 semanas en fase pico"` |
| `riesgo` | ~40 | `"Bajo"`, `"Medio/alto"`, `"Bajo-Medio"`, `"Alto en principiante, medio en avanzado"` |
| `estado` | ~32 | `"activo"`, `"Pendiente deduplicación"`, `"Pendiente revisión"`, `"Pendiente limpieza"` |
| `tipo_escalador` | ~35 | `"General"`, `"Boulder"`, `"Sport / Deportiva"`, `"Boulder y sport"` |

`publicable_app` NO está en esta lista — ya definimos 5 valores canónicos y
la vista `exercises_eligible` los filtra. Es contrato duro, no deuda.

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

### `lib/ai/plan-safety.ts` (legacy R1..R4) coexiste

Decisión (Giuliana, 2026-07-07): no deprecar en este PR. La validación
vieja de 4 reglas keyword-based sigue wireada en `route.ts:878` como
segunda red. Cuando el wiring nuevo (§1.gating + section-03 + section-14
en el retry loop) esté probado en producción, deprecar `plan-safety.ts`
en un PR separado. Convivencia temporal es más segura que reemplazo de
golpe.
