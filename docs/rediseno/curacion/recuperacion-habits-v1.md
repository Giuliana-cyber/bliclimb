# Curación · recuperación → hábitos (flag `type='habit'`) · v1 provisional

**Fecha:** 2026-07-20 · **Estado:** provisional, pendiente lista final de Giuliana

## Contexto

El mini-test end-to-end con GC-001 mostró que el LLM **descarta consistentemente los ejercicios de recuperación tipo "hábito"** (sueño, hidratación, registro de dolor, cuidado de piel) — incluso con `sessionTheme="Rutinas de cuidado post-sesión"`. Razón: el schema Zod le exige `{sets, reps, rest}` obligatorios y el LLM prefiere elegir físicos "programables" antes que arriesgar un `sets/reps` que suene raro para "Diario de sueño".

Diagnóstico de fondo: **los hábitos no son ejercicios**. La UI de `/sesion` (card actual con Protocolo/Descanso, botón "Siguiente ejercicio", timer, chip riesgo) no aplica conceptualmente a "Cuidado de piel". Meterlos en la misma sesión es fricción, no solo cosmética.

## Decisión (Giuliana 2026-07-20)

Aplicar **(B) ahora + (A) después**:

- **(B) AHORA** · flag `type='habit'` en el catalog + filtro por default en el motor de `/sesion`. Los hábitos siguen en el catálogo pero fuera del pool automático de sesión.
- **(A) DESPUÉS** · nueva superficie `/cuidado` con UI dedicada (checklist post-sesión, sin timer ni series). Feature aparte para cuando el loop de entreno esté firme.

## Implementación (B)

### Data — `scripts/rediseno/regenerate_v31.py`

```python
RECOVERY_HABIT_IDS = {
    "EX-REC-011",  # Registro de dolor post sesión
    "EX-REC-012",  # Registro de fatiga post sesión
    "EX-REC-013",  # Diario de sueño
    "EX-REC-014",  # Plan de descanso entre sesiones
    "EX-REC-018",  # Hidratación post sesión
    "EX-REC-020",  # Cuidado de piel
    "EX-REC-023",  # Sueño como recuperación
    "EX-REC-028",  # Retorno tras fatiga alta
    "EX-REC-029",  # Reducción de volumen por dolor
}
```

El `flatten_exercise_row` emite `type: "habit"` para esos IDs (`""` para los otros 553 EX).

### Motor — `lib/brain/motor-inverted/`

- **`types.ts`** · `Exercise.type?: 'habit' | ''`
- **`catalog-loader.ts`** · parsea el campo `type` del JSON
- **`restrict-pool.ts`** · check 0 (antes de status): si `ex.type === 'habit'` → sale del pool con nota "type=habit (reservado para /cuidado)"

Consecuencia: el motor de `/sesion` nunca elige los 9. La categoría `recuperacion` en `/sesion` ahora tiene 21 EX físicos disponibles.

## Estado post-curación

| | Total | Habit | En pool /sesion |
|---|---|---|---|
| recuperacion | 30 | **9** (reservados) | 21 físicos |
| calentamiento | 30 | 0 | 29 (1 manual_review) |
| otras 12 cats | 502 | 0 | 501 · según status |

Motor smoke test: **42/42 verde** post-filter habit.

## Lista provisional — pendiente confirmación editorial

Los 9 IDs de arriba fueron derivados por keyword-match sobre `name_es`. Giuliana pasa la lista final en las próximas horas.

**Candidatos adicionales que quedaron en el pool físico y podrían ser habits** (le paso a Giuliana para que confirme si van al set o quedan como físicos):

| ID | Nombre | ¿Habit? |
|---|---|---|
| EX-REC-015 | Día de descarga | posible (plan-level, no ejercicio) |
| EX-REC-016 | Semana de descarga | posible (plan-level, no ejercicio) |
| EX-REC-019 | Comida post sesión | posible (nutrición) |
| EX-REC-021 | Manejo de flapper | posible (cuidado de piel) |
| EX-REC-022 | Lima suave de callos | posible (cuidado de piel) |
| EX-REC-024 | Siesta corta | posible (sueño) |
| EX-REC-025 | Relajación guiada | posible (bienestar) |
| EX-REC-027 | Chequeo de readiness al día siguiente | posible (registro) |

Cuando Giuliana pase la lista final, editar `RECOVERY_HABIT_IDS` en `scripts/rediseno/regenerate_v31.py`, re-correr `regenerate_v31.py` + `xlsx_to_json.py` y commit.

## Reservado: futura curación (A) · `/cuidado`

Cuando llegue la Fase 4b, los EX marcados `type='habit'` se consumen en `/cuidado`:
- UI de checklist post-sesión (no timer, no series)
- Un motor propio decide qué mostrar hoy (probablemente por rotación semanal o triggers como "dolor reportado → priorizar registro")
- Se sincroniza con estado del user (sueño ayer, hidratación de la semana)

Todo eso vive fuera de este batch. La infraestructura de datos ya está lista.
