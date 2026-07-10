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
