# Roadmap de producto — BilClimb

**Propósito:** este documento responde *qué sigue y por qué*. No es un tracker de bugs (eso es `audit-360.md`) ni un registro de deuda técnica (eso es `brain/canonicalization-debt.md`).

**Audiencia:** cualquier sesión de desarrollo que arranque sin contexto previo. Léelo antes de proponer trabajo.

**Última actualización:** 2026-07-08

---

## Principio rector

**Durabilidad sobre velocidad.**

Consecuencias operativas:

- Las reglas de seguridad viven en código determinístico, no en instrucciones al LLM. Se restringe vía schema/enum, se aplica vía post-procesamiento, se inyecta como código.
- Los pasos irreversibles (migraciones `DROP`) van en archivo separado y se ejecutan al final, después de verificar.
- Ningún reporte de desarrollo se acepta sin salida cruda. Una afirmación en prosa no es evidencia.
- Las mejoras sin instrumentación son inmensurables. Analytics antes de rediseño.

---

## Los tres niveles

El trabajo se organiza en tres niveles con dependencias estrictas entre ellos. **No se salta de nivel.**

### Nivel 1 — Arreglos en curso

Lo que estabiliza la base. Nada de Nivel 2 o 3 arranca hasta que esto cierre.

**Estado:** Fase 5, en curso.

Pendientes conocidos:

| Item | Estado |
|---|---|
| Bug #1 — perfil no persiste (PATCH 200, filas en 0) | Sin evidencia. Faltan logs `profile_save`. |
| §1.gating — ejercicio prohibido se cuela → fallback → 422 | Fix aprobado (enum). Rompe planes en prod hoy. |
| Fix de lesión (Opción A) | Implementado. Smoke determinístico pasa. Falta end-to-end. |
| Migración 0014 (`DROP` columnas legacy) | **Bloqueada** hasta verificar todo lo anterior. |
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

**Dependencia dura:** el motor hoy descarta su razonamiento. Solo guarda ejercicios, no el porqué. Hay que generar y persistir rationale semanal/diario. Toca generación *y* presentación.

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
