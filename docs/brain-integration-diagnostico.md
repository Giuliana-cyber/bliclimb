# Diagnóstico — Integración de los 3 pilares del brain de BilClimb.ai

**Rama analizada:** `main` @ `aa84cb8`
**Fecha del corte:** 2026-06-22
**Autor:** Claude Opus 4.7 (auditoría estática sobre el repo local)

Este documento responde las 6 preguntas del brief antes de la Fase 1.
NO hay cambios de código asociados a este diagnóstico.

## Alcance y límites

- Todo lo que sale de **archivos locales** (migraciones, código TS/TSX,
  env vars documentadas) es verificable y lo respondo con precisión.
- **Row counts de Supabase** y **contenido actual del vector store en
  OpenAI** requieren acceso a los dashboards / API keys de esos
  servicios. Donde no pude verificar, digo "requiere confirmación
  dashboard" explícito.
- El script `scripts/upload-knowledge-pdfs.mjs` mencionado en
  `docs/KNOWLEDGE_BASE.md` **no existe en el repo hoy**. Deuda anotada.

---

## 1. Tabla `exercises` en Supabase

### Estado actual

**La tabla `exercises` NO existe en las migraciones del repo.**

Grep exhaustivo en `supabase/migrations/*.sql` (0001–0009) confirma que
no hay ningún `create table ... exercises`, ni columna llamada
`exercises`. Las tablas actuales son: `profiles`, `plans`, `sessions`,
`check_ins`, `entitlements`, `webhook_events`, `sources`, `source_chunks`,
`coach_clients`, `coach_plans`, `daily_activity`, `weekly_summaries`,
`push_subscriptions`.

Hoy los ejercicios viven **dentro** de `sessions.warmup / main_block /
cooldown` como `jsonb`, generados on-the-fly por OpenAI en cada plan.
No hay un catálogo consultable.

### Comparación con schema objetivo (31 columnas)

Como la tabla no existe, **ninguna de las 31 columnas del schema
objetivo está presente**. Estado: 0/31 coinciden, 31 faltan, 0 sobran.

Row count: **0 (la tabla no existe)**.

### Recomendación de precisión

Cuando en Fase 1 se cree la tabla, hay que definir:

- **Tipos exactos** por columna. La lista del brief no los especifica.
  Ej. `Series` puede ser `int`, `text` (rangos "3-5"), o `int4range`.
- **Columnas nullable vs required**. Los 483 ejercicios de Sheet 01
  probablemente tienen filas incompletas.
- **Índices** para las queries del filtrador: `Nivel`, `Equipo`, `Tags`
  van a ser los más consultados.
- **Constraint** en `Publicable app` (bool) + `Estado` (enum probable
  `borrador | publicable | archivado`).
- **RLS**: la tabla es catálogo de sistema, no de usuario. Solo lectura
  para authenticated, escritura solo para `service_role` desde un
  seeder / admin panel.

---

## 2. Vector store en OpenAI

### Estado actual verificable desde el repo

- **Env var configurada**: `OPENAI_VECTOR_STORE_ID` está declarada en
  `.env.example` y presente en `.env.local` (valor redacted). El código
  la lee en `app/api/generate-plan/route.ts:406` y `app/api/chat/route.ts:95`.
- **File ID / vector store ID**: presente en `.env.local` pero NO se
  chequea en el repo por seguridad.
- **Cómo se usa**: pasado como `vector_store_ids: [vectorStoreId]` en
  `tools: [{ type: 'file_search', ... }, { type: 'web_search_preview' }]`
  del Responses API (grounding en `groundFromLibrary`).

### Estado NO verificable desde el repo local

- **Nombres exactos de archivos actualmente subidos**: requiere llamar
  a la API de OpenAI (`GET /v1/vector_stores/{id}/files`) con el
  `OPENAI_API_KEY`. No lo hago sin permiso porque:
  - Necesita credenciales prod
  - El brief dice "no borres nada todavía" — explícitamente pediste no
    tocar. Consultar `list files` no borra, pero mejor confirmar
    antes.
- **Si hay versiones antiguas de Doc 02 o Doc 03 subidas**: requiere
  la misma listing API.

### Deuda anotada

`docs/KNOWLEDGE_BASE.md:9` referencia
`node scripts/upload-knowledge-pdfs.mjs`, pero **ese archivo no existe
en el repo**:

```
$ ls scripts/upload-knowledge-pdfs.mjs
ls: scripts/upload-knowledge-pdfs.mjs: No such file or directory
```

Documentación desactualizada. En Fase 1 conviene: (a) recrear el
script si sigue siendo la forma correcta de subir, o (b) actualizar
`KNOWLEDGE_BASE.md` con el proceso real.

### Cómo listar los archivos del vector store cuando lo autorices

```bash
curl https://api.openai.com/v1/vector_stores/$OPENAI_VECTOR_STORE_ID/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "OpenAI-Beta: assistants=v2"
```

O desde el Dashboard de OpenAI → Vector Stores → seleccionar el store →
tab Files.

---

## 3. Middleware de validación de planes

### Estado actual

**Existe** una capa de safety que corre antes de mostrar el plan.

- **Archivo**: `lib/ai/plan-safety.ts`
- **Función principal**: `validatePlanSafety(plan, profile): SafetyResult`
- **Invocación**: `app/api/generate-plan/route.ts:814` (primera pasada)
  y línea 845 (segunda pasada tras retry).
- **Tests**: `lib/ai/plan-safety.test.ts` — 9 describes cubriendo cada
  regla.

### Reglas que valida hoy (4)

Extraídas de la union type `SafetyViolation.rule`:

| # | ID (regla) | Qué chequea |
|---|---|---|
| R1 | `no_finger_load_minors` | Menores de 16 no reciben carga máxima de dedos (max hangs / campus / bloque max) |
| R2 | `no_max_hangs_with_pain` | Con `currentFingerPain > 3/10` no se prescriben max hangs |
| R3 | `no_campus_for_beginners` | Con `climbingTime < 1 año` no se prescribe campus board |
| R4 | `no_max_hangs_for_strength_novice` | Principiante que declara `hangboard_20mm_added_weight_7s = 0kg` no recibe max hangs |

Detección: keyword-match sobre `exercise.name` + `exercise.description`
contra listas curadas (`MAX_HANG_KEYWORDS`, `CAMPUS_KEYWORDS`, etc.).

### Flujo del safety check

```
generate weeks (paralelo)
  ↓
buildPlan
  ↓
validatePlanSafety(plan, profile)   ← 1ª pasada
  ↓ si violaciones
buildSafetyRetryMessage + regeneración solo de weeks ofensivas
  ↓
validatePlanSafety otra vez         ← 2ª pasada
  ↓ si sigue con violaciones
return 422 (no se devuelve plan inseguro)
```

### Gaps vs. reglas de Doc 02 (evaluación preliminar)

Sin haber visto Doc 02 completo, las 4 reglas actuales son un subset
mínimo. Reglas típicas que suelen faltar en implementaciones así:
edad + volumen máximo por semana, dolor de codo → no antagonistas
extremos, ventana de retorno post-lesión, no-back-to-back de sesiones
de intensidad. Confirmar con Doc 02 en Fase 1.

---

## 4. System prompt de Bill y Senda

### Ubicación

- `lib/prompts/coach-system.ts`
- Función export: `buildCoachSystemPrompt({ profile, character, plan, checkIns })`
- Invocado en `app/api/chat/route.ts` para el system prompt del chat.
- **NO** se usa en `app/api/generate-plan/route.ts` — la generación de
  plan tiene su propio prompt separado (`WEEK_PROMPT` y `METADATA_PROMPT`
  in-line en `route.ts`).

### Tamaño

- **213 líneas**
- **~11 KB** (`wc -c` sobre el archivo)
- Tokens estimados: ~2800–3200 tokens (regla aprox 4 chars/token para
  español). Se suma la personalización por perfil/plan/check-ins que
  agrega otros 500-1500 tokens en runtime.

### Secciones (headings del prompt actual)

Orden y ubicación (números de línea del prompt string interno):

1. **Identidad + voz del personaje** (líneas 112-113)
2. **REGLAS DE RESPUESTA (no negociables)** (114-146)
   - Formato máximo 4-6 líneas
   - Formato explícito para "explicar UN ejercicio"
   - Regla YouTube search en vez de link
   - Formato de LISTA de ejercicios
   - Sin headers markdown ni tablas
3. **SEGURIDAD (prioridad sobre todo)** (148-151)
   - Dolor dedos >0 → no max hangs / campus / arqueo full
   - Dolor sube a 3 → parar + fisio
   - Lesión activa → bajar carga + fisio
4. **ESTILO DE COACH PRO (ESCALADA)** (153-155)
   - Nomenclatura real (`hangboard 22mm semi-arqueo` vs "ejercicios de dedos")
   - Prescripciones exactas
5. **CROSS-TRAINING** (156-191)
   - Reglas por deporte: running, ciclismo, calistenia, yoga, pilates,
     pesas, natación
6. **REGLAS DE COMBINACIÓN** (192-196)
   - Interacción entre día de escalada dura y otros deportes
7. **PESO Y NUTRICIÓN BÁSICA** (198-201)
   - No prescribir dietas
   - Reglas seguras (proteína, hidratación, timing post-entreno)
8. **Interpolación dinámica** (203-211)
   - `PERFIL: ${summarizeProfile(profile)}`
   - `PLAN: ${summarizePlan(plan)}`
   - `CHECK-INS RECIENTES: ${summarizeCheckIns(checkIns)}`
   - Warnings condicionales: dolor de dedos, RPE alto, energía baja

### Observaciones

- El prompt es **denso pero coherente**. Está bien estructurado
  jerárquicamente (identidad → reglas → seguridad → estilo → dominio
  específico → interpolación de contexto).
- Los personajes están diferenciados solo por la línea "Estilo:" — una
  sola oración por personaje. El resto del prompt es compartido. Si el
  brief quiere voces más distintas hay que ramificar más secciones.

---

## 5. Flujo de generación de plan

### Trazado end-to-end

```
Usuario apreta "Generar plan"
  ↓
[CLIENTE] app/generating-plan/page.tsx
  → loadProfile() (localStorage)
  → fetch('/api/generate-plan', { method: 'POST', body: { profile } })
  → maneja response: success → saveTrainingPlan(plan) → router.push('/plan')
                       error → getFriendlyGenerationError + reintentar
  ↓
[SERVER] app/api/generate-plan/route.ts (POST)
  1. gatePlanGeneration()             — auth + trial/sub check
     └─ lib/billing/gates.ts
  2. canRegeneratePlan(userId)        — límite mensual 2 planes/mes
     └─ lib/entitlements.ts
  3. body parse + UserProfileSchema.safeParse + isUserProfile guard
     └─ lib/schemas/user-profile.ts
  4. checkRateLimit('plan')           — sliding window 2/hora
     └─ lib/rate-limit.ts
  5. new OpenAI({ timeout: 120_000 }) — cliente Responses API
  6. groundFromLibrary + generateMetadata EN PARALELO
     ├─ groundFromLibrary: Responses API con tools file_search +
     │  web_search_preview (allowlist de sitios profesionales)
     └─ generateMetadata: chat.completions.parse con
        FastPlanMetadataSchema (Zod → JSON schema para OpenAI)
  7. themes := metadata.weekThemes ajustado a profile.planDuration
  8. Promise.all(themes.map(theme => generateWeek(...)))
     └─ Cada week: chat.completions.parse con FastWeekSchema.
        max_tokens 12000 con retry en 16000 si trunca.
        groundingContext se inyecta en el user message.
  9. buildPlan(metadata, fastWeeks, profile, traceability)
  10. validatePlanSafety(plan, profile)  ← [safety check]
      ↓ si viola
      buildSafetyRetryMessage + regeneración de weeks ofensivas
      ↓
      validatePlanSafety otra vez
      ↓ si sigue violando
      return 422
  11. markFreePlanConsumed(userId) + incrementPlanCount(userId) +
      commitRateLimit('plan')            ← contadores solo en éxito
  12. return NextResponse.json({ plan })
```

### Archivos / funciones que intervienen

| Rol | Archivo | Nota |
|---|---|---|
| Entrada UI | `app/generating-plan/page.tsx` | Client component. Carga profile de localStorage, hace fetch al endpoint. |
| Endpoint | `app/api/generate-plan/route.ts` | 800+ líneas. Contiene prompts inline. |
| Prompts | `lib/prompts/pro-style.ts` | `PRO_STYLE_RULES`, `PRO_STYLE_EXAMPLES`, `EQUIPMENT_ADAPTATION_RULES` — se concatenan al `WEEK_PROMPT`. |
| Schemas | `lib/ai/fast-plan-schema.ts` | `FastPlanMetadataSchema`, `FastWeekSchema`, `FastExerciseSchema`. |
| Safety | `lib/ai/plan-safety.ts` | 4 reglas (ver §3). |
| Gates billing | `lib/billing/gates.ts`, `lib/entitlements.ts` | Sub check + monthly limit. |
| Rate limit | `lib/rate-limit.ts` | Sliding window. |
| Post-proceso | `buildPlan()` inline en `route.ts` | Convierte `Fast*` → `TrainingPlan`. |

### Dónde se llama a OpenAI Responses API

- **`groundFromLibrary`** (`app/api/generate-plan/route.ts:388`):
  `client.responses.create({ model, tools: [file_search, web_search_preview] })`.
- **`generateMetadata`** (`app/api/generate-plan/route.ts:475`):
  `client.chat.completions.parse({ model, response_format: zodResponseFormat(FastPlanMetadataSchema) })`.
  (Notar: chat.completions.parse, NO Responses API.)
- **`generateWeek`** (`app/api/generate-plan/route.ts:544`):
  `client.chat.completions.parse({ model, max_tokens, response_format: zodResponseFormat(FastWeekSchema) })`.
  (Idem: chat.completions.parse.)

### Datos del onboarding que se pasan al modelo

Se pasan **todos los campos del `UserProfile` filtrados por `profileToPrompt()`**
(línea 58 de `route.ts`). Cada campo se emite como una línea del tipo
`"Días por semana: 3"` solo si tiene valor. Incluye:

- character, name, age, sex, weight, height
- climbingTime, disciplines, level, setting
- goals, goalDescription, project, rockProjectDescription
- daysPerWeek, availableDays, sessionDuration, maxSessionDuration
- equipment, equipmentNotes
- previousTraining, pullUpAbility, fingerTrainingExperience
- **Fuerza absoluta** (bloque explícito, línea 91): dominadas BW,
  dominadas +peso 5reps, regleta 20mm BW seg, regleta 20mm +peso 7s,
  banca 1RM, sentadilla 1RM, peso muerto 1RM
- campusExperience, outdoorFrequency, trainingAggressiveness
- injuries, injuryDescription, injuryNotes
- currentFingerPain, currentShoulderPain, currentElbowPain
- sleepQuality, energyLevel

---

## 6. Onboarding

### Campos capturados hoy

De `app/onboarding/page.tsx` + `lib/schemas/user-profile.ts` + `lib/profile.ts`:

**Step 1 — Personaje**
- character (bill | senda)

**Step 2 — Escalada**
- climbingTime (tiempo escalando, categorías)
- disciplines[] (boulder, deportiva, tradicional, etc.)
- level (grado autoreportado)
- setting (indoor / outdoor / mixed)

**Step 3 — Sobre ti**
- sex, age (**text**, no int años)
- weight, height
- Nombre

**Step 4 — Tu cuerpo**
- currentFingerPain (0-10)
- currentShoulderPain (0-10)
- currentElbowPain (0-10)
- injuries[], injuryDescription, injuryNotes
- sleep, energy (categorías: bien / regular / mal)

**Step 5 — Fuerza + entrenamiento**
- pullUpAbility (categoría)
- fingerTrainingExperience (categoría)
- campusExperience (categoría)
- outdoorFrequency (categoría)
- **Fuerza absoluta**:
  - pullupsBodyweight (dominadas BW máx)
  - pullupsAddedWeight5Reps (dominadas +peso para 5 reps)
  - hangboard20mmSeconds (regleta 20mm BW seg)
  - hangboard20mmAddedWeight7s (regleta 20mm +peso 7s)
  - benchPress1Rm, squat1Rm, deadlift1Rm (opcionales)

**Step 6 — Objetivo + duración**
- goals[], goalDescription
- project, rockProjectDescription
- trainingAggressiveness (conservative | balanced | aggressive)
- planDuration (2 | 3 | 4 semanas)

**Step 7 — Disponibilidad + equipo**
- daysPerWeek (1-7)
- availableDays[] (días de la semana)
- sessionDuration, maxSessionDuration (min)
- equipment[] (multi-select)
- equipmentNotes
- accessToCampusBoard / accessToHangboard / accessToTRX /
  accessToWeights (bool, derivados de equipment[])

### Persistencia

- **localStorage** (`lib/profile.ts`) — desde el commit inicial.
- **`public.profiles` en Supabase** — desde el fix del onboarding
  (`5d1e06e`). `POST /api/profile` con mapper camelCase→snake_case
  para 37 campos.

### Comparación vs. Doc 02 Sección 1 (requisitos del brief)

| Campo requerido | Estado hoy | Notas |
|---|---|---|
| **Edad** | ✅ Capturado como `age: text` | Bug menor: es string, no int. Doc 02 quizás pide años como número para comparar contra umbrales (menores de 16, etc.). Hoy la regla R1 de `plan-safety.ts` parsea `age` con `Number()`. |
| **Años de práctica sistemática** | ⚠️ **Parcial** | Hoy tenemos `climbingTime` como categoría (`less1`, `1to3`, etc.) + `fingerTrainingExperience` categórico. NO tenemos "años de práctica **sistemática**" como int distinto de "tiempo total escalando". Si Doc 02 diferencia, hay que agregar. |
| **Dolor activo por zona** | ✅ Parcial → cubierto para dedos/hombro/codo | Falta: espalda baja, muñeca, rodilla, cadera. Doc 02 seguro pide más zonas. |
| **RED-S screening (LEAF-Q)** | ❌ **NO existe** | Ningún campo captura Low Energy Availability. |
| **RED-S screening (EAT-26)** | ❌ **NO existe** | Ningún campo captura riesgo de trastorno alimentario. |
| **Amenorrea** | ❌ **NO existe** | Sin campo específico para ciclo menstrual / amenorrea. |
| **Embarazo** | ❌ **NO existe** | Sin campo. |

### Gap ranking

De más urgente a menos urgente para Fase 1:

1. **Embarazo** — contraindicación mayor para muchos ejercicios.
   Fácil de agregar (bool opcional en step 3).
2. **Amenorrea + RED-S básico** — señal roja fuerte para volumen de
   entrenamiento. LEAF-Q abreviado (~8 preguntas) + edad menstruación /
   ciclos regulares (2 preguntas más) cubre el mínimo.
3. **EAT-26** — 26 preguntas, no cabe en onboarding directo. Alternativa:
   subset de 5 preguntas más discriminativas + banner "si tenés
   señales, hablá con profesional".
4. **Años práctica sistemática vs tiempo escalando** — refactor menor de
   step 2.
5. **Zonas de dolor adicionales** — expandir el multi-select actual.
6. **Edad como int** — migración simple, backward-compatible con parseo
   actual.

### Deuda tangencial que veo

- `profiles.age` es `text` en la DB (`0001_init.sql:20`). El código de
  safety parsea con `Number()` sin validar → un usuario que escribe
  "veintidós" queda `NaN` y la regla R1 (menores) pasa por alto sin
  aviso. Convendría migrar a `age_years: int` con un tratamiento
  legacy para el string viejo.

---

## Resumen ejecutivo

| Pilar | Estado hoy | Trabajo estimado Fase 1 |
|---|---|---|
| Sheet 01 (483 ejercicios) | ❌ Tabla no existe | Migración schema + seeder desde Sheet + índices + RLS |
| Doc 02 (reglas de seguridad) | ⚠️ 4 reglas críticas en código, resto ausente | Auditar Doc 02 contra R1-R4, portar reglas duras al `plan-safety.ts`, mover reglas de programación al system prompt |
| Doc 03 (conocimiento conceptual) | ⚠️ Existe vector store con env var, contenido actual no verificado desde acá | Listar files del store, borrar versiones viejas, subir Doc 03 curado |
| Middleware validación | ✅ Existe, extensible | Agregar reglas nuevas de Doc 02 |
| System prompt Bill/Senda | ✅ 213 líneas estructuradas | Insertar reglas de programación de Doc 02 en sección nueva antes de "CROSS-TRAINING" |
| Flujo generate-plan | ✅ Documentado, sin bloqueadores | Sumar query a `exercises` como filtro adicional antes/durante `generateWeek` |
| Onboarding | ⚠️ Falta screening RED-S + embarazo | Agregar 2-3 steps adicionales o extender step 3/4 |

## Próximos pasos que necesito confirmar antes de arrancar Fase 1

1. ¿Autorizás que corra la API de OpenAI (`list vector_stores/{id}/files`)
   para completar la parte NO verificable de §2?
2. Doc 02 y Doc 03 no están en el repo. ¿Los subís a algún drive o los
   pego yo directamente en `docs/` para tener versión versionada?
3. Sheet 01 (los 483 ejercicios) — ¿formato de origen (Google Sheet /
   CSV / xlsx) y dónde está?
4. ¿Querés que la tabla `exercises` viva en Supabase con RLS o preferís
   un catálogo estático (JSON en el repo, git-tracked) por costo?
   Trade-off: DB es filtrable con SQL, JSON pesa más en el bundle pero
   es 0 latencia.

Con esas 4 respuestas cierro el diagnóstico y arranco la Fase 1 con
plan de implementación concreto.
