# Paso 4 (a) · Evidencia file:line para 44 reglas candidatas

**Estado:** revisado por Giuliana 2026-07-10. Post-audit end-to-end: 21 BORRAR + 1 RECLASIFICAR + 22 CONSERVAR.

Política aplicada (politica-paso4.md): las filas con `tipo_registro='regla'` en `data/brain/exercises-v3.csv` (44 rows, excluye FIL-004 ya borrada en 0015) se clasifican en 3 grupos:

- **BORRAR** — la lógica está implementada en `lib/brain/rules/*.ts` con evidencia file:line abajo **Y** se aplica end-to-end (verdict → consumidor → efecto real en la generación o el retry loop).
- **RECLASIFICAR** — mis-taggeada como regla, es en realidad un ejercicio.
- **CONSERVAR** — no hay regla equivalente en código (protocolos, taxonomías, discrepancias, guidance editorial), **o** la regla existe en código pero un gap corta la cadena antes del efecto. En este segundo caso queda como constancia de una regla que en la práctica no funciona; se re-audita al cerrar el gap.

Todas las líneas de código fueron leídas literalmente en esta sesión.

**Grupo B original disuelto (decisión Giuliana):**
- DP-R004 y HB-S005 → **Grupo C** (§1.3 emite `block-zone` pero section-02 no traduce zones a IDs — gap real, no borrar). Ver `canonicalization-debt.md#deuda-9` gap 1.
- FT-006 → **RECLASIFICAR** a `tipo_registro='ejercicio'`. Es un ejercicio (Tipo="Ejercicio", Categoría="Fuerza de tracción", Equipo="Barra", Descripción con ejecución, Progresión/Regresión, Riesgo="Alto"). No se borra ni se conserva como regla.

**Audit end-to-end del Grupo A original (23 rows) — cambios adicionales:**
- **HB-S004** → **Grupo C**. Mapeada a §5.2 (`add-grip-restriction: no-small-crimps-below-15mm`). `gripRestrictions` NO se inyecta al prompt de `generateWeek()` — se acumula en `BlockingContext` y se descarta. Ver `canonicalization-debt.md#deuda-9` gap 2.
- **DP-S001** → **Grupo C**. Mapeada a §1.3 (`block-zone` dedos) + §5.2 (`gripRestriction`). Ambos verdicts caen en gaps distintos. Ver `canonicalization-debt.md#deuda-9` gaps 1 y 2.
- **DP-S004** se queda en A. §5.3 emite verdicts que no llegan al prompt, pero §14.2 tiene cobertura real (evaluateGeneratedPlan + `ensureExtensorWork` post-processor en `lib/ai/plan-post-process.ts:143-179`, wired en `app/api/generate-plan/route.ts:966`).

Grupo A queda en **21 rows** con cobertura end-to-end confirmada.

---

## Grupo A — BORRAR (23 rows con evidencia clara de duplicación)

| Row ID | Nombre corto | Regla en código · file:line | Justificación |
|---|---|---|---|
| DP-R001 | Hangboard no primera opción para principiantes | `section-01-profile-filters.ts:77-86` (`check_1_2`) · `section-02-exercise-gating.ts:96-98` | §1.2 climbingTime <2 años bloquea `hangboard-intense` → prefijo `HB-` completo. |
| DP-R002 | Dead hangs después del calentamiento | `section-03-session-programming.ts:361-399` (`check_3_6`) | §3.6 bloquea strength/power en warmup y cooldown. Dead hangs = strength. |
| DP-R005 | Bloquear crimp intenso en menores en crecimiento | `section-01-profile-filters.ts:37-54` (`check_1_1` + `RULE_1_1_CATEGORIES`) | §1.1 age='u16' bloquea `hangboard`, `campus`, `full-crimp`, `hit`, `finger-training-any`. |
| DP-R008 | Limitar fingerboard/campus en escaladores de menor grado | `section-01-profile-filters.ts:68-86` (`check_1_2`) | Mismo mecanismo que DP-R001 (`hangboard-intense` + `campus`). |
| DP-S001 | Riesgo lesión de poleas — bloquear carga con dolor/lesión previa | `section-01-profile-filters.ts:102-124` (`check_1_3`) · `section-05-health-derivation.ts:37-46` (`check_5_2`) | §1.3 pain≥3 emite block-zone dedos; §5.2 injuries='fingers' añade `no-small-crimps-below-15mm`. |
| DP-S002 | Riesgo fracturas epifisarias — bloquear crimp en crecimiento | `section-01-profile-filters.ts:37-54` (`check_1_1`) | Idéntico a DP-R005. |
| DP-S004 | Riesgo tendinopatía / codo / cuello | `section-05-health-derivation.ts:58-77` (`check_5_3`) · `section-14-elbow-prevention.ts:104-131` (`check_14_2`) | §5.3 injuries='elbows' → prioridad extensores + reducir tracción; §14.2 exige extensores si 3+ (o 1+ con historial) días de tracción. |
| FIL-001 | Filtro elegibilidad hangboard | `section-01-profile-filters.ts:68-86` (`check_1_2` + `RULE_1_2_CATEGORIES`) · `section-02-exercise-gating.ts:96-98` | §1.2 bloquea `hangboard-intense` → HB- prefix. |
| FIL-003 | Bloqueo de campus en principiantes | `section-01-profile-filters.ts:68-86` · `section-02-exercise-gating.ts:101-103` | §1.2 bloquea `campus` → CB- prefix. |
| HB-R001 | Hangboard después del calentamiento y al inicio | `section-03-session-programming.ts:163-209` (`check_3_1`) · `section-03-session-programming.ts:361-399` (`check_3_6`) | §3.1 orden intra-sesión (strength temprano) + §3.6 no strength en warmup/cooldown. |
| HB-R003 | Filtro conservador antes de recomendar hangboard | `section-01-profile-filters.ts:68-86` | Duplica FIL-001. |
| HB-R007 | Limitar fingerboard/campus alta intensidad en principiantes/intermedios | `section-01-profile-filters.ts:68-86` | Duplica DP-R001/DP-R008. |
| HB-R008 | No programar dedos máximos días consecutivos | `section-03-session-programming.ts:318-351` (`check_3_4`) | §3.4 recuperación mínima entre sesiones de mismo stimulus (strength: 2 días). |
| HB-S001 | Bloqueo dead hangs generales en principiantes | `section-01-profile-filters.ts:68-86` · `section-02-exercise-gating.ts:96-98` | Idéntico a FIL-001. |
| HB-S002 | Bloqueo de MaxHangs | `section-01-profile-filters.ts:68-86` (`RULE_1_2_CATEGORIES` incluye `max-tests`) · `section-02-exercise-gating.ts:42-58, 132-134` (`TEST_MAXIMO_IDS`) | §1.2 bloquea `max-tests`; section-02 hardcodea IDs concretos (FD-006/007/008, HB-007, EV-CF, etc). |
| HB-S003 | Bloqueo/adaptación de IntHangs / Repeaters | `section-01-profile-filters.ts:68-86` · `section-02-exercise-gating.ts:96-98` | §1.2 bloquea `hangboard-intense` → HB- prefix cubre repeaters. |
| HB-S004 | Bloqueo regletas 11-15mm | `section-05-health-derivation.ts:37-46` (`check_5_2`) | §5.2 injuries='fingers' añade GripRestriction `no-small-crimps-below-15mm`. |
| HB-S006 | Bloqueo en menores de edad / crecimiento | `section-01-profile-filters.ts:37-54` (`check_1_1`) | Idéntico a DP-R005. |
| PER-003 | Orden diario de sesión — estímulos por calidad y seguridad | `section-03-session-programming.ts:119-130, 163-209` (`INTRA_SESSION_ORDER` + `check_3_1`) | §3.1 orden monotónico skill→strength→power→PE→aerobic→mobility/mental. |
| PER-004 | Programación semanal fuerza/recuperación | `section-03-session-programming.ts:148-153, 318-351` (`MIN_RECOVERY_DAYS` + `check_3_4`) | §3.4 recuperación mínima entre sesiones del mismo stimulus. |
| REP-002 | Recuperación según intensidad | `section-03-session-programming.ts:279-306` (`check_3_3`) · `section-03-session-programming.ts:318-351` (`check_3_4`) | §3.3 no 3 días duros consecutivos + §3.4 recuperación por stimulus. |
| REP-003 | Regla "no 3 días seguidos" | `section-03-session-programming.ts:279-306` (`check_3_3`) | Match literal. |
| APM-005 | Habilidades nuevas en estado fresco | `section-03-session-programming.ts:224-264` (`check_3_2`) | §3.2 skills en primeros ~30% del mainBlock. |

---

## Grupo B — REVISAR (3 rows con gap parcial)

Estos casos tienen mecanismo relacionado en código PERO con un gap conocido. Giuliana decide si borrarlos ahora o esperar a que se cierre el gap.

| Row ID | Nombre corto | Situación | Gap |
|---|---|---|---|
| DP-R004 | No entrenar hangboard si hay lesión actual | `section-01-profile-filters.ts:102-124` (`check_1_3`) emite `block-zone` para dedos-poleas cuando pain≥3. | `section-02-exercise-gating.ts` NO traduce zones a IDs (solo BlockedCategory). El bloqueo se ejecuta vía prompt-hint, no vía gating enum→enum. Si Giuliana lo considera "en código" (aunque parcial), va a A. Si no, se conserva. |
| HB-S005 | Bloqueo tests máximos con dolor/lesión reciente | Mismo caso: §1.3 zone + §1.2 `max-tests`. La parte de "con dolor" no aterriza en gating de IDs (misma limitación que DP-R004). §1.2 sí aterriza. | Cobertura parcial. |
| FT-006 | Bloqueo con una mano (one-arm lock-off) | Nombre sugiere ejercicio, no regla. `tipo_registro='regla'` puede ser mis-tag. | Revisar si es taxonomía mal clasificada o regla real. Si es ejercicio, se reclasifica; si es regla de prerequisito, va a Conservar (no está en código). |

---

## Grupo C — CONSERVAR (18 rows sin equivalente en código)

Ninguna de estas tiene lógica traducible a un check() sobre plan/profile. Son taxonomías, protocolos internos, discrepancias documentadas o referencias editoriales. Se quedan como referencia de dominio.

| Row ID | Nombre corto | Naturaleza |
|---|---|---|
| DP-R003 | MaxHangs con fuerza/boulder; IntHangs con resistencia | Taxonomía (protocolo↔objetivo). |
| DP-R006 | Evitar balanceo y mantener hombros activos | Coaching cue técnico. |
| DP-R007 | No usar full crimp como test MIFS estándar | Protocolo de test. |
| DP-S003 | Riesgo sobrecarga por fatiga en IntHangs/Repeaters | Gestión interna del protocolo. |
| DP-S005 | Riesgo baja especificidad handgrip como único test | Protocolo de test. |
| DP-S006 | Riesgo RED-S / baja disponibilidad energética | §1.4 explícitamente marcada como "diferida a v2" en `section-01-profile-filters.ts:8-9`. |
| FIL-002 | Clasificación por tiempo de suspensión | Taxonomía de ejercicios (parte de la canonicalización editorial). |
| FTP-004 | Bloqueo con una mano — criterio de entrada | Prerequisito de progresión. |
| HB-C001 | Discrepancia método para resistencia | Meta-nota de discrepancia entre fuentes. |
| HB-C002 | Discrepancia descansos en repeaters | Meta-nota. |
| HB-C003 | Discrepancia edad/nivel de inicio | Meta-nota. |
| HB-R002 | MaxHangs fuerza / IntHangs-SubHangs resistencia | Taxonomía (duplica DP-R003). |
| HB-R004 | Fuerza máxima: alta intensidad, corta duración, margen | Parámetros de protocolo. |
| HB-R005 | Resistencia de fuerza: intermitente + descanso incompleto | Parámetros de protocolo. |
| HB-R006 | Autoregular carga set a set | Parámetro de auto-regulación. |
| HB-R009 | Priorizar técnica en primeros años | Guidance editorial (relacionado con §1.2 pero no bloqueante). |
| HB-S007 | Reacondicionamiento post-lesión no autoguiado | Requiere fisio/supervisión — fuera de scope brain. |
| ADO-002 | Adaptación por modalidad boulder vs deportiva | Adaptación editorial del plan. |

---

## Totales

- **Grupo A · BORRAR**: 23 rows
- **Grupo B · REVISAR**: 3 rows
- **Grupo C · CONSERVAR**: 18 rows
- **Total**: 44 rows (post-FIL-004 ya borrada en 0015)

## Próximo paso

Giuliana revisa este documento. Si aprueba:
1. Grupo A → migración `0024_paso_4_delete_reglas_duplicadas.sql` con DELETE por lista de IDs.
2. Grupo B → decisión por row (A o C).
3. Grupo C → se quedan como están, marcadas conceptualmente como referencia.

Nada se ejecuta hasta que veas el archivo `0024_*.sql` y me digas "aplicá".
