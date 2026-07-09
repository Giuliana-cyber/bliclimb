# Roadmap de producto — BilClimb

**Propósito:** este documento responde *qué sigue y por qué*. No es un tracker de bugs (eso es `audit-360.md`) ni un registro de deuda técnica (eso es `brain/canonicalization-debt.md`).

**Audiencia:** cualquier sesión de desarrollo que arranque sin contexto previo. Léelo antes de proponer trabajo.

**Última actualización:** 2026-07-08 (madrugada — añadido hallazgo del catálogo desconectado)

---

## Principio rector

**Durabilidad sobre velocidad.**

Consecuencias operativas:

- Las reglas de seguridad viven en código determinístico, no en instrucciones al LLM. Se restringe vía schema/enum, se aplica vía post-procesamiento, se inyecta como código.
- Los pasos irreversibles (migraciones `DROP`) van en archivo separado y se ejecutan al final, después de verificar.
- Ningún reporte de desarrollo se acepta sin salida cruda. Una afirmación en prosa no es evidencia.
- Las mejoras sin instrumentación son inmensurables. Analytics antes de rediseño.
- **Lo que no está escrito en el repo, se pierde.** Un plan de fases que vive en una conversación no sobrevive a la conversación. Cada PR puede mergearse limpio, con tests verdes, y aun así dejar sin hacer el paso que le daba sentido. Ver el hallazgo del catálogo desconectado abajo — se perdió exactamente así.

---

## Los tres niveles

El trabajo se organiza en tres niveles con dependencias estrictas entre ellos. **No se salta de nivel.**

### Nivel 1 — Arreglos en curso

Lo que estabiliza la base. Nada de Nivel 2 o 3 arranca hasta que esto cierre.

**Estado:** Fase 5, en curso.

---

#### 🔴 HALLAZGO CRÍTICO — El catálogo nunca se conectó al motor

**Descubierto:** 2026-07-08, madrugada.

**El hecho:** `public.exercises` (483 ejercicios) **nunca fue consultado en runtime**. Verificado con `git log -S` (pickaxe) sobre toda la historia del repo: cero matches para `public.exercises`, `exercises_eligible`, `exerciseId`, `exercise_id` bajo `app/` o `lib/`. El pickaxe capta agregados *y* eliminaciones — "nunca aparece" significa que nunca vivió en runtime, ni siquiera efímeramente.

Los únicos consumidores de la tabla: `scripts/seed-exercises.ts` (el seeder) y las migraciones `0010` / `0012`.

**Qué hace el motor hoy:**

- `groundFromLibrary()` (`generate-plan/route.ts:431-470`) hace RAG sobre el **vector store de OpenAI** (los PDFs) + web search allowlisted
- Ese "brief de biblioteca" se inyecta como **texto libre en el prompt** (`route.ts:603`)
- El LLM **inventa** los ejercicios. `FastExerciseSchema` tiene `name: z.string()` — cualquier string. **No hay `exerciseId` ni FK al catálogo.**

**Cómo se perdió:** el diagnóstico de Fase 0 confirmó que "los ejercicios se generan on-the-fly, no viven en catálogo", y la conexión estaba prevista para Fase 4. Fase 4 se llenó de otro trabajo (citas académicas, capa B de RAG, personas Bill/Senda). El paso nunca se ejecutó. **No estaba escrito en ningún lado.** Este documento existe para que eso no vuelva a pasar.

**Tres consecuencias, en orden de gravedad:**

1. **El §1.gating no tiene dientes.** El enum restringe `blockCategory` — la *etiqueta* que el propio LLM eligió. No restringe qué ejercicio pone. El LLM puede escribir "campus board" y etiquetarlo `blockCategory: "strength"`; el gating no lo atrapa. Esto explica el gating slip: no es que el LLM se salte una regla, es que la regla nunca tuvo con qué agarrarlo.

2. **Los ejercicios son genéricos.** "Haz movilidad", "traverse en el muro" — sin `howTo`, sin `cues`, sin `commonMistakes` reales. El LLM escribe lo que le sale. Los 483 ejercicios curados con setup, ejecución, errores comunes y alternativas están en la base y nadie los lee.

3. **El hilo narrativo (3.1) no se puede construir encima.** No se puede explicar *por qué este ejercicio* si el ejercicio no existe en ningún catálogo con razón de ser.

**El fix, alineado con el principio rector:**

> Restringir vía enum, no instruir al LLM. Solo que el enum tiene que ser **de ejercicios**, no de categorías.

Forma aproximada (dimensionar con el dev antes de comprometer):

1. Código filtra `exercises_eligible` por perfil + reglas de safety → lista de IDs permitidos
2. El LLM arma la sesión **eligiendo de esa lista**, no inventando
3. El plan persiste `exerciseId`
4. La pantalla renderiza `howTo` / `cues` / `commonMistakes` desde la tabla

Resuelve las tres consecuencias de un tiro. Y hace estructuralmente imposible el gating slip.

**Implicación para Fase 5:**

**La migración 0014 no cierra Fase 5.** Cerrarla ahora sería declarar terminada una fase construida sobre la premisa de que el cerebro está conectado. No lo está.

**DECISIÓN (2026-07-08):** conectar el catálogo **entra a Fase 5**, no abre fase propia. Razón: el §1.gating rompe planes en producción hoy y no tiene dientes sin esto; Nivel 2 (pulir UI) sobre un motor que inventa ejercicios es maquillar un hueco estructural. Fase 5 no cierra hasta que el catálogo alimente el motor.

---

**El workstream del catálogo — dimensionado con datos reales (conteos de Supabase, 2026-07-08):**

*Precondición descartada:* el catálogo NO necesita crecer. Conteos de elegibles por perfil tras §1.2/§1.3: (a) sin lesión = 92, (b) codo = 67, (c) hombro = 53. Todos muy por encima del umbral de ~20. El problema es de canonicalización, no de profundidad.

*Hallazgo:* tres campos del catálogo son texto libre, no enums. Es la deuda de canonicalización de Fase 1 (PR 0011 previsto, nunca llegó — deudas #1-#4 de este archivo). Se cierra ahora.

| Campo | Distintos reales | Naturaleza | Fix |
|---|---|---|---|
| `nivel` | 17 | 4 buckets limpios cubren ~70%; resto colapsa fácil | Barato: ~1h dev + 15min curación |
| `categoria` | 69 | ~15 buckets grandes + cola de duplicados semánticos ("Fuerza dedos" en 9 variantes) | Medio: ~2h dev + 3-4h curación con Bill/Senda |
| `equipo` | 99 | Prosa libre, pero **mapea a los 9 tokens del onboarding** | Acotado: ~6h total |

*Vocabulario de equipo = los 9 del onboarding, ni más ni menos.* El onboarding captura `equipment: string[]` con 9 valores (`gym, hangboard, campus, weights, rock, home, bands, pullup_bar, trx`). Canonicalizar el catálogo a MENOS tokens tira información que el perfil ya distingue (un user con hangboard-sin-campus perdería ejercicios). Los 99 strings de prosa se **mapean** a subsets de esos 9, no agregan vocabulario. "Regleta + Force Gauge" → `[hangboard, weights]`.

*Mapping `BlockedCategory` → catálogo:* no existe en código — es el corazón del trabajo. 8 valores fijos (`hangboard, hangboard-intense, campus, full-crimp, hit, pullups-weighted, max-tests, finger-training-any`). Se implementa como **tabla de mapeo con CHECK constraint** (Forma B) o **columna `text[]` con constraint via trigger** (Forma A). Preferencia: la que garantice las 8 categorías canónicas en la DB, no solo en TS — es una regla de safety. Decisión menor, del dev con Giuliana.

**Pasos del workstream (orden):**

1. Canonicalizar `nivel` → enum, con backfill (~1h + 15min)
2. Canonicalizar `categoria` → vocabulario canónico ~15-20 clases, mapping de los 69 (~2h + 3-4h curación)
3. Canonicalizar `equipo` → mapear 99 strings a los 9 tokens del onboarding (~6h)
4. Mapping `BlockedCategory` → catálogo, con constraint estructural + curación de los 483 (~4-8h curación)
5. Enum del motor: `FastExerciseSchema.name` → `z.enum(idsPermitidos)` filtrado por perfil + reglas (~1 día)
6. Persistir `exerciseId` en `Exercise` + `mainBlock[]` (~0.5 día)
7. Pantalla de sesión lee `howTo`/`cues`/`commonMistakes` de la tabla vía join (~0.5 día)
8. Tests + validación end-to-end: gating, injury, equipment filters (~1 día)

**Estimado honesto:** ~5-6 días dev + ~12-18h curación con Bill/Senda. La curación no acelera con más devs — es trabajo de contenido, de Giuliana.

*Posible corte de alcance (decisión de contenido):* si al curar con Bill/Senda hay ejercicios con equipo exótico que el usuario objetivo nunca usará, cortarlos del catálogo baja la curación de `equipo`. ¿Le sirven al principiante al que apunta la app?

*Al cerrar:* actualizar deudas #1-#4 de `canonicalization-debt.md` marcándolas como cerradas, para trazar el cierre y que no se pierda.

---

Pendientes conocidos:

| Item | Estado |
|---|---|
| **Conectar catálogo al motor** | 🔴 **Ver hallazgo crítico arriba.** Bloquea el cierre de Fase 5. |
| Bug #1 — perfil no persiste | ✅ **CERRADO. No existía.** Logs de prod (commit `538145a`) muestran `attempt_update.rowSample` y `update_ok_verify.verifiedFields` **idénticos**, `rowNull: false`. El PATCH persiste. Las filas en 0 eran perfiles creados por el trigger de signup que nunca guardaron, levantados por un `order by created_at desc limit 1` equivocado. |
| §1.gating — ejercicio prohibido se cuela → fallback → 422 | Enum commiteado (`f35116c`). **Fix parcial:** restringe la etiqueta, no el ejercicio. Ver hallazgo crítico. |
| Fix de lesión (Opción A) | Implementado, commiteado. Smoke determinístico pasa (§1.3 rama codo y §5.3 disparan). Falta end-to-end. |
| §3.9 — anaeróbico sin base aeróbica | No cubierta por Opción 6. Sigue siendo prompt, no schema. El LLM la viola y la corrige por reintento, moviéndola de semana. Frágil. Candidata a restricción estructural. |
| Instrumentación `TEMPORARY` en `profile/route.ts` | Barrer (`grep TEMPORARY`). Bug #1 cerrado, ya no se necesita. |
| Migración 0014 (`DROP` columnas legacy) | **Bloqueada.** No cierra Fase 5 mientras el catálogo no esté conectado. |
| Auditoría de pantalla Settings | Pendiente. Verificar que cancelar suscripción en trial sea obvio y de un paso. |
| Tabla de field mapping pre-Block 4 | Pendiente. Campo por campo: ¿lo usa `profileToPrompt`? Con evidencia `file:line`. |
| Segunda pasada auditoría panel B2B (H-17) | Pendiente. Superficie más cara del producto, sin auditar. |

**Regla de cierre:** migración 0014 es el último paso. Nunca antes de que todo lo demás esté verificado con salida cruda.

---

### Nivel 2 — Mejoras de UX seguras

Mejoran claridad. No pueden empeorar nada. No necesitan datos para justificarse.

**Precondición:** Nivel 1 cerrado.

- Jerarquía visual del dashboard
- Estados vacíos
- Badge de biblioteca
- Prompts sugeridos del chat
- Coherencia visual Bill / Senda

Se abordan como lista priorizada, no como proyecto.

---

### Nivel 3 — Las apuestas grandes

Rediseños de núcleo. Cada uno con su propio workstream. Requieren datos.

**Precondición:** Nivel 1 cerrado + analytics definido e instrumentado.

#### 3.0 — Analytics (habilitador, va primero)

La app hoy no mide nada. Confirmado por `audit-360`: cero eventos instrumentados.

Sin esto, ningún rediseño de Nivel 3 es evaluable. Definir qué instrumentar:

- Drop-off por paso de onboarding
- Conversión de onboarding
- Qué métricas de Progreso mira la gente realmente
- Adherencia al plan vs. actividad manual

**Es el cuello de botella de todo el Nivel 3.**

#### 3.1 — Hilo narrativo del plan

*El proyecto de mayor impacto en retención.*

**Problema:** el plan carece del hilo que conecta el día con el plan completo. Dos vistas desconectadas (mapa de semana en `/plan`, sesión del día en `/session` con chips técnicos). La persona nunca entiende POR QUÉ esta sesión, PARA QUÉ, CÓMO la acerca a su objetivo. Toda la inteligencia del motor es invisible.

Es un problema de retención y confianza disfrazado de problema de diseño.

**Solución acordada — tres preguntas, cada una con su medio:**

> *Anclas visuales, la voz explica.*

| Pregunta | Medio |
|---|---|
| ¿Dónde estoy? | **Visual.** Mapa de montaña existente, pero con etiquetas de fase en lenguaje humano ("construyendo base", no "semana 2/4"). |
| ¿Por qué esto hoy? | **Voz del coach** (Bill/Senda). El motor debe generar Y PERSISTIR el razonamiento real de por qué ese estímulo esa semana. |
| ¿Hacia dónde va? | **Mixto.** Barra visual sutil ("esto te acerca a: [objetivo]") + refuerzo del coach en momentos clave (fin de semana). |

**Dependencias duras:**

1. **El catálogo debe estar conectado primero** (ver hallazgo crítico en Nivel 1). No se puede explicar *por qué este ejercicio* si el ejercicio lo inventó el LLM y no existe en ningún catálogo. El contenido pedagógico que la narrativa necesita (`howTo`, `cues`, `commonMistakes`) vive en `public.exercises` y hoy no se lee.
2. **El motor descarta su razonamiento.** Solo guarda ejercicios, no el porqué. Hay que generar y persistir rationale semanal/diario. Toca generación *y* presentación.

**Primer paso al arrancar:** verlo dibujado (wireframe/sketch) antes de comprometer código. Dimensionar con el dev el costo de persistir el rationale.

#### 3.2 — El motor lee check-ins para regenerar el plan

*Convierte BilClimb de "app que te da un plan" a "app que te entrena".*

**Problema:** al regenerar el plan (segundo mes en adelante), el motor genera desde el perfil — una foto vieja del onboarding. No lee la historia real de la persona. La actividad manual se guarda y nadie la lee.

**Diseño acordado — reparto código vs. LLM:**

**(A) El código calcula lo duro y contable:**
- Sesiones del plan completadas
- Tendencia del dolor de dedos (sube / baja / estable)
- RPE promedio

Y aplica la **regla crítica como red de seguridad:** si el dolor de dedos viene subiendo, retrocede la carga sin importar lo que interprete el coach.

**(B) El coach lee y pondera con criterio:**
La actividad manual (registro libre de lo que la persona hizo fuera del plan). Texto libre, sin RPE ni categorías — es manual y muy variable, se lee con criterio. El coach combina el texto con los números para decidir.

> **Insight clave:** alguien con 40% de adherencia al plan pero 5 salidas a roca NO está incumpliendo — está entrenando distinto. El plan siguiente debe contemplar sus salidas, no castigarlo.

**(C) El coach lo cuenta al entregar el plan nuevo.**

Contar el porqué es donde está el valor. Conecta directamente con 3.1.

**Regla de escritura:** nombrar el dato, explicar el ajuste, **nunca juzgar.**

- ✅ "Se te complicó llegar a 4 días, así que armé 3 — mejor tres que cumplas que cuatro que te frustren"
- ❌ "Faltaste a la mitad de las sesiones"

**Riesgo anotado:** la actividad manual en texto libre es también un riesgo de seguridad. Alguien podría escribir "hice campus 4 veces" y el coach tendría que entender que su nivel no lo permite. No urgente, pero el dev debe saberlo.

#### 3.3 — Rediseño de Progreso

**Precondición:** analytics definido. Validar con datos reales qué métricas mira la gente antes de rediseñar.

**Hipótesis acordada (no ejecutar sin validar):**

- Quitar promedios sueltos que no accionan nada (RPE promedio, energía promedio, sueño promedio)
- Mantener: sesiones completadas, % de adherencia, lista de check-ins recientes
- Arreglar el gráfico de dolor de dedos (H-12: hoy dibuja 4 niveles discretos como escala continua 0–10 → cambiar a barras por nivel)
- Agregar comparaciones y señales en vez de promedios: "tu mejor semana", "3 semanas sin fallar", "el dolor bajó vs. el mes pasado"
- Mover la racha a Progreso — es el elemento más motivador

**Patrón de fondo:** Progreso hoy es un espejo (devuelve datos promediados). Debería ser un narrador (cuenta la historia de la persona).

---

## Decisiones de producto cerradas

No se reabren sin motivo nuevo.

| Decisión | Detalle |
|---|---|
| **Lesión activa → plan adaptado, no bloqueado** | BilClimb es una app de sugerencias de entrenamiento, no un dispositivo médico. La persona entrena bajo su responsabilidad. El coach adapta y lo dice honestamente. |
| **Lesión declarada = dolor 5/10 en esa zona** | Regla de prioridad: `max(dolor_check_in, lesión_declarada ? 5 : 0)`. Un check-in en 0 no "cura" la lesión; solo se desactiva editando el perfil. |
| **Onboarding sin escalas de dolor** | El dolor es dinámico. Su lugar es el check-in. Se reemplazan por una pregunta de lesión activa + zona. |
| **Check-in solo con dolor de dedos** | Consecuencia asumida: §1.3 solo deriva por dedos. Codo y hombro quedan como ramas latentes (deuda #5). |
| **Voz de la app: "tú" (LATAM neutro)** | Firme. |
| **Plan anual se auto-renueva** | No es pago único. Reflejado en el copy de billing. |
| **Objetivo "subir de grado" se queda** | Con hint honesto para duraciones cortas. |
| **Exclusiones de la biblioteca** | Beastmaking (copyright), Eva López-Rivera (CC BY-NC, incompatible con uso comercial). |

---

## Protocolo de trabajo

**Roles:**
- Giuliana — decisiones de producto y negocio. Aprueba todo el copy visible al usuario antes de commit.
- Claude (revisor) — traducción técnica, revisión de arquitectura, presenta opciones numeradas con tradeoffs.
- Claude Code (dev) — implementación.

**Flujo:**
1. Diagnóstico con evidencia
2. El revisor corrige si hace falta
3. Fix aprobado
4. Verificación con queries o tests
5. Cierre del item

**Sin aprobación, no hay implementación.**

**Guardia contra fabricación:** cualquier afirmación de "el dev verificó X" sin salida cruda pegada se trata como potencialmente inventada. Todo reporte de desarrollo requiere `crudo`: comandos `ls`, cola de `npm test`, bloques de código con números de línea.

**Capas de verificación distintas:** `tests` ≠ `build` ≠ `flujo real`. Vitest no atrapa errores de tipo en build de Next.js en funciones exportadas de `route.ts`.

**Gestión de deuda:** lo que se conoce y no se arregla se registra en `brain/canonicalization-debt.md`. No se apura ni se difiere en silencio.

---

## Mapa de documentos

| Archivo | Responde |
|---|---|
| `docs/roadmap.md` (este) | Qué sigue y por qué |
| `docs/audit-360.md` | Qué está roto |
| `docs/brain/canonicalization-debt.md` | Qué sabemos que está mal y decidimos no arreglar todavía |
| `checklist-deploy-bilclimb.md` | Cómo desplegar sin repetir errores conocidos |
