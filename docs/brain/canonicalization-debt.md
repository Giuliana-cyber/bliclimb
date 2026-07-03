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

## Bug sistémico de encoding en CSV inicial

**Descubierto**: 2026-07-03 durante el apply de Fase 1 contra Supabase.
**Reporte completo**: [encoding-audit-report.md](encoding-audit-report.md).

**Alcance medido**: 46/483 filas afectadas (9.5%). 93 findings totales distribuidos en columnas `Nombre`, `Descripción`, `Precauciones`, `Publicable app`, `Estado`, `Señales detener`, `Fuente secundaria` y otras.

Familias más afectadas: **PF (100%)**, **CO (92.9%)**, **FM (78.6%)**, **EV (22.6%)**, **HB (15.2%)**. Otras 33 familias limpias (0%). El patrón sugiere que la corrupción vino de un batch específico de generación del CSV en un pipeline no-UTF-8, no de curación manual.

### Tipos de corrupción detectados por la auditoría automática

1. **`ñ` perdida.** Ejemplos: `anadido → añadido`, `muneca → muñeca`, `pequenas → pequeñas`, `diseno → diseño`. ~30 pares en el diccionario de la auditoría.
2. **Tildes faltantes en sustantivos.** Ejemplos: `maxima → máxima`, `aerobica → aeróbica`, `tecnica → técnica`, `periodizacion → periodización`, `lesion → lesión`. Mayoría del diccionario. Palabras top por frecuencia: `maxima` (27 ocurrencias), `aerobica` (17), `tecnico` (4), `duracion` (3), `lesion` (3).

**Fuera del scope de la auditoría automática (por diseño)**: verbos y palabras ambiguas (`esta`/`está`, `si`/`sí`, `solo`/`sólo`, `practica` verbo vs `práctica` sustantivo). Ambos usos son gramaticalmente válidos según contexto y no se pueden fixear con reglas de word-boundary sin inspección manual. Estos requieren revisión caso por caso durante la regeneración.

### Estado de la DB de producción

- **483 filas cargadas** en `public.exercises` (apply de 0010 + seeder ejecutados exitosamente el 2026-07-03T04:22Z).
- **46 filas con corrupción visible en `Nombre` y otras columnas** — apto para trabajo interno de Fase 2 (vector store) y Fase 3 (motor de plan por IDs). **NO apto para exposición a usuarios finales.**
- La política de `Publicable app` filtró correctamente los canónicos, pero 10 filas quedaron fuera de `exercises_eligible` por typo en el mismo campo (`"Si con..."` sin tilde) — debería subir de 359 a 369 post-regeneración.

### Estrategia de resolución

**NO fix automático.** Aplicar 46 reemplazos vía script sobre un CSV corrupto arriesga introducir sutilezas peor que las que arregla (encoding preserva estructura, autofix no). En cambio: **regeneración del CSV desde raíz con pipeline UTF-8 explícito en sesión aparte con Claude** (contexto amplio necesario).

Plan de re-carga tras la regeneración:

1. Reemplazar `data/brain/exercises-v3.csv` con el CSV limpio.
2. `npm run seed:exercises` — idempotente por upsert de PK. Filas con IDs preexistentes se sobrescriben (nombres corruptos → limpios). Si algún ID desaparece en la regeneración, queda huérfano en la DB — decidir si el seeder hace `DELETE` reconciliatorio o se maneja manual.
3. Re-correr la auditoría de encoding para verificar 0 findings.
4. Verificar `exercises_eligible = 369` (o el número final consensuado).

### Prioridad

**URGENTE — bloqueante pre-Fase 4.** Antes de que Bill muestre planes a usuarios reales, el CSV debe regenerarse limpio. No bloquea Fase 2 (vector store) ni Fase 3 (motor de plan interno) mientras se trabaje con IDs y no con contenido crudo.

### Deuda del seeder cuando llegue el CSV limpio

- Remover el fix `KNOWN_TYPO_FIXES.estado` para `"Pendiente deduplicacion"` una vez que el CSV regenerado ya no lo tenga.
- Considerar agregar validación de encoding al seeder (ej: rechazar filas con caracteres non-printable o con ratio anómalo de ASCII-solo en un CSV que debería tener acentos).

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
