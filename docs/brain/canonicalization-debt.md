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

## Deuda crítica: bug de encoding en el CSV inicial

**Descubierto**: 2026-07-03 durante el apply de Fase 1 contra Supabase.
**Reporte completo**: [encoding-audit-report.md](encoding-audit-report.md).
**Estado**: **bloqueante pre-Fase 4** — no exponer contenido a usuarios finales hasta resolver.

### Scope

**46 filas de 483 (9.5%) con corrupción sistemática de acentos** (ñ, á, é, í, ó, ú) en al menos una columna. Total de 93 findings de palabras corruptas distribuidas en columnas críticas del ejercicio (Nombre, Descripción, Precauciones, Señales detener) además de metadata (Publicable app, Estado, Fuente secundaria).

Familias más afectadas: **PF (100%)**, **CO (92.9%)**, **FM (78.6%)**, **EV (22.6%)**, **HB (15.2%)**. Otras 33 familias limpias (0%). El patrón sugiere que la corrupción vino de un batch específico de generación del CSV en un pipeline no-UTF-8, no de curación manual.

Palabras top corruptas: `maxima` (27), `aerobica` (17), `anadido` (5), `tecnico` (4), `duracion` (3), `lesion` (3). Todos son términos técnicos del dominio de escalada.

### Estado de la DB de producción

- **483 filas cargadas** en `public.exercises` (apply de 0010 + seeder ejecutados exitosamente el 2026-07-03).
- **Los `Nombre` y `Descripción` de esas 46 filas contienen palabras corruptas** — no aptos para renderizar en la UI de Bill/Senda sin arreglar antes.
- La política de `Publicable app` filtró correctamente los canónicos, pero 10 filas quedaron fuera de `exercises_eligible` por typo en el mismo campo (`"Si con..."` sin tilde) — debería subir de 359 a 369 post-fix.

### Bloqueante pre-Fase 4

**Antes de que Bill muestre planes a usuarios reales, el CSV debe regenerarse limpio.** No aplicar autofix sobre la corrupción — es sistémico y arriesga introducir sutilezas peor que las que arregla (encoding preserva estructura, autofix no).

### Plan de resolución

1. **Sesión de regeneración con Claude** (la sesión que usa Giuliana para construir el brain) — produce un nuevo `exercises-v3.csv` desde cero con pipeline UTF-8 explícito.
2. **Re-run del seeder** contra el CSV limpio. Es idempotente por upsert de PK, así que:
   - Filas nuevas se insertan.
   - Filas con IDs preexistentes se actualizan (los nombres corruptos se sobrescriben).
   - Si algún ID desaparece en la regeneración, queda huérfano en la DB — decidir con Giuliana si el seeder debe hacer un DELETE reconciliatorio o si se maneja manual.
3. **Re-correr la auditoría de encoding** (script en `/private/tmp/.../encoding-audit.py` — se puede migrar al repo si se decide instrumentar como CI check).
4. **Verificar que `exercises_eligible = 369`** (o el número final consensuado tras la regeneración).

### Fecha estimada de resolución

Sesión de regeneración con Claude — **fecha por definir**. Bloqueante para Fase 4 (exposición pública). No bloquea Fase 2 (vector store) ni Fase 3 (motor de plan interno) mientras se trabaje con IDs y no con contenido crudo.

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
