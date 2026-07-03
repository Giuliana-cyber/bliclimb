# Encoding Audit Report — CSV de ejercicios v3

**Snapshot**: `data/brain/exercises-v3.csv` post-fix de FIL-004, 483 filas.
**Diccionario**: 289 pares (typo → canónico) high-confidence + fix específico de `Publicable app`.
**Método**: word-boundary regex case-insensitive por columna de texto. Se preserva el casing del original al proponer el fix.

## Resumen por familia de IDs

| Familia | Total en familia | Filas con typos | % afectado |
|---|---:|---:|---:|
| **CO** | 14 | 13 | 92.9% |
| **FM** | 14 | 11 | 78.6% |
| **HB** | 66 | 10 | 15.2% |
| **EV** | 31 | 7 | 22.6% |
| **PF** | 3 | 3 | 100.0% |
| **ADO** | 6 | 1 | 16.7% |
| **NE** | 5 | 1 | 20.0% |
| **ADN** | 8 | 0 | 0.0% |
| **AG** | 6 | 0 | 0.0% |
| **AN** | 1 | 0 | 0.0% |
| **APM** | 13 | 0 | 0.0% |
| **BO** | 5 | 0 | 0.0% |
| **BT** | 7 | 0 | 0.0% |
| **CAL** | 12 | 0 | 0.0% |
| **CB** | 13 | 0 | 0.0% |
| **CD** | 6 | 0 | 0.0% |
| **CR** | 13 | 0 | 0.0% |
| **DIS** | 6 | 0 | 0.0% |
| **DP** | 47 | 0 | 0.0% |
| **EVT** | 3 | 0 | 0.0% |
| **FD** | 11 | 0 | 0.0% |
| **FIL** | 5 | 0 | 0.0% |
| **FL** | 15 | 0 | 0.0% |
| **FT** | 10 | 0 | 0.0% |
| **FTE** | 4 | 0 | 0.0% |
| **FTP** | 4 | 0 | 0.0% |
| **HE** | 19 | 0 | 0.0% |
| **ME** | 20 | 0 | 0.0% |
| **MO** | 12 | 0 | 0.0% |
| **MU** | 5 | 0 | 0.0% |
| **PE** | 6 | 0 | 0.0% |
| **PER** | 7 | 0 | 0.0% |
| **PO** | 13 | 0 | 0.0% |
| **POP** | 2 | 0 | 0.0% |
| **PR** | 5 | 0 | 0.0% |
| **RE** | 10 | 0 | 0.0% |
| **REP** | 3 | 0 | 0.0% |
| **RH** | 7 | 0 | 0.0% |
| **TA** | 15 | 0 | 0.0% |
| **TC** | 31 | 0 | 0.0% |
| **TOTAL** | **483** | **46** | **9.5%** |

## Distribución por columna

| Columna | # rows con hit |
|---|---:|
| `Fuente secundaria` | 34 |
| `Publicable app` | 10 |
| `Intensidad` | 7 |
| `Descripción` | 5 |
| `Precauciones` | 5 |
| `Señales detener` | 5 |
| `Estado` | 5 |
| `Objetivo` | 4 |
| `Notas` | 4 |
| `Nombre` | 3 |
| `Errores comunes` | 3 |
| `Tiempo` | 3 |
| `Regresión` | 2 |
| `Progresión` | 1 |

## Top palabras con typo (deduplicadas por lowercase)

| Palabra corrupta | # ocurrencias | Propuesta |
|---|---:|---|
| `maxima` | 27 | `máxima` |
| `aerobica` | 17 | `aeróbica` |
| `si con bloqueo por perfil` | 8 | `(review)` |
| `anadido` | 5 | `añadido` |
| `maximo` | 5 | `máximo` |
| `pendiente deduplicacion` | 5 | `pendiente deduplicación` |
| `tecnico` | 4 | `técnico` |
| `duracion` | 3 | `duración` |
| `lesion` | 3 | `lesión` |
| `anadir` | 2 | `añadir` |
| `facil` | 2 | `fácil` |
| `flexion` | 2 | `flexión` |
| `minima` | 2 | `mínima` |
| `pequenas` | 2 | `pequeñas` |
| `si con advertencia` | 2 | `(review)` |
| `tecnica` | 2 | `técnica` |
| `anadida` | 1 | `añadida` |
| `minimos` | 1 | `mínimos` |
| `muneca` | 1 | `muñeca` |
| `numeros` | 1 | `números` |
| `posicion` | 1 | `posición` |
| `practicas` | 1 | `prácticas` |
| `tension` | 1 | `tensión` |
| `ultimo` | 1 | `último` |

## Detalle de todas las filas afectadas

Agrupadas por familia. Cada fila muestra: ID, columna, valor actual → valor propuesto, palabras corregidas.

### Familia `HB` — 55 findings en 10 filas

- **HB-001** / `Descripción`
  - actual: `Colgarse de una regleta con brazos extendidos, agarre activo, core activo y sin balanceo. Mantene...`
  - propuesto: `Colgarse de una regleta con brazos extendidos, agarre activo, core activo y sin balanceo. Mantene...`
  - palabras: `posicion` → `posición`
- **HB-001** / `Estado`
  - actual: `Pendiente deduplicacion`
  - propuesto: `Pendiente deduplicación`
  - palabras: `Pendiente deduplicacion` → `Pendiente deduplicación`
- **HB-001** / `Precauciones`
  - actual: `No recomendado si no se cumplen criterios minimos; requiere tecnica y control de carga`
  - propuesto: `No recomendado si no se cumplen criterios mínimos; requiere técnica y control de carga`
  - palabras: `tecnica` → `técnica`, `minimos` → `mínimos`
- **HB-001** / `Progresión`
  - actual: `Anadir peso, reducir tamano de regleta o aumentar duracion`
  - propuesto: `Añadir peso, reducir tamano de regleta o aumentar duración`
  - palabras: `Anadir` → `Añadir`, `duracion` → `duración`
- **HB-001** / `Publicable app`
  - actual: `Si con advertencia`
  - propuesto: `Sí con advertencia`
  - palabras: `Si con advertencia` → `Sí con advertencia`
- **HB-001** / `Señales detener`
  - actual: `Dolor en dedos, poleas, muneca, codo, hombro; perdida de forma`
  - propuesto: `Dolor en dedos, poleas, muñeca, codo, hombro; perdida de forma`
  - palabras: `muneca` → `muñeca`
- **HB-002** / `Descripción`
  - actual: `Usar una regleta fija, normalmente 18-20 mm al inicio segun la guia; anadir peso para alcanzar la...`
  - propuesto: `Usar una regleta fija, normalmente 18-20 mm al inicio segun la guia; añadir peso para alcanzar la...`
  - palabras: `anadir` → `añadir`, `duracion` → `duración`
- **HB-002** / `Errores comunes`
  - actual: `No llegar al fallo; usarlo sin experiencia; dolor o lesion`
  - propuesto: `No llegar al fallo; usarlo sin experiencia; dolor o lesión`
  - palabras: `lesion` → `lesión`
- **HB-002** / `Estado`
  - actual: `Pendiente deduplicacion`
  - propuesto: `Pendiente deduplicación`
  - palabras: `Pendiente deduplicacion` → `Pendiente deduplicación`
- **HB-002** / `Intensidad`
  - actual: `Alta / Maxima`
  - propuesto: `Alta / Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-002** / `Nombre`
  - actual: `MaxHangs con peso anadido`
  - propuesto: `MaxHangs con peso añadido`
  - palabras: `anadido` → `añadido`
- **HB-002** / `Objetivo`
  - actual: `Desarrollar fuerza maxima de dedos mediante alta tension mecanica`
  - propuesto: `Desarrollar fuerza máxima de dedos mediante alta tensión mecanica`
  - palabras: `maxima` → `máxima`, `tension` → `tensión`
- **HB-002** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-002** / `Señales detener`
  - actual: `Fallo tecnico, dolor, flexion de brazos/cadera, perdida de contacto`
  - propuesto: `Fallo técnico, dolor, flexión de brazos/cadera, perdida de contacto`
  - palabras: `tecnico` → `técnico`, `flexion` → `flexión`
- **HB-003** / `Descripción`
  - actual: `Elegir una profundidad que permita cumplir la duracion objetivo con margen antes del fallo. Ajust...`
  - propuesto: `Elegir una profundidad que permita cumplir la duración objetivo con margen antes del fallo. Ajust...`
  - palabras: `duracion` → `duración`
- **HB-003** / `Errores comunes`
  - actual: `Usar regletas pequenas sin control tecnico`
  - propuesto: `Usar regletas pequeñas sin control técnico`
  - palabras: `pequenas` → `pequeñas`, `tecnico` → `técnico`
- **HB-003** / `Estado`
  - actual: `Pendiente deduplicacion`
  - propuesto: `Pendiente deduplicación`
  - palabras: `Pendiente deduplicacion` → `Pendiente deduplicación`
- **HB-003** / `Intensidad`
  - actual: `Alta / Maxima`
  - propuesto: `Alta / Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-003** / `Nombre`
  - actual: `MaxHangs con profundidad minima`
  - propuesto: `MaxHangs con profundidad mínima`
  - palabras: `minima` → `mínima`
- **HB-003** / `Objetivo`
  - actual: `Desarrollar fuerza maxima reduciendo el tamano de regleta`
  - propuesto: `Desarrollar fuerza máxima reduciendo el tamano de regleta`
  - palabras: `maxima` → `máxima`
- **HB-003** / `Precauciones`
  - actual: `Regletas pequenas elevan el riesgo; requiere control tecnico`
  - propuesto: `Regletas pequeñas elevan el riesgo; requiere control técnico`
  - palabras: `pequenas` → `pequeñas`, `tecnico` → `técnico`
- **HB-003** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-004** / `Descripción`
  - actual: `Repetir ciclos de suspension y pausa corta en una regleta que permita completar el set, buscando ...`
  - propuesto: `Repetir ciclos de suspension y pausa corta en una regleta que permita completar el set, buscando ...`
  - palabras: `ultimo` → `último`
- **HB-004** / `Errores comunes`
  - actual: `Fatiga deteriora forma; usar con dolor o lesion`
  - propuesto: `Fatiga deteriora forma; usar con dolor o lesión`
  - palabras: `lesion` → `lesión`
- **HB-004** / `Estado`
  - actual: `Pendiente deduplicacion`
  - propuesto: `Pendiente deduplicación`
  - palabras: `Pendiente deduplicacion` → `Pendiente deduplicación`
- **HB-004** / `Precauciones`
  - actual: `Fatiga deteriora forma; no usar con dolor o lesion`
  - propuesto: `Fatiga deteriora forma; no usar con dolor o lesión`
  - palabras: `lesion` → `lesión`
- **HB-004** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-004** / `Señales detener`
  - actual: `Dolor, perdida de contacto, balanceo, chicken wing, fallo tecnico`
  - propuesto: `Dolor, perdida de contacto, balanceo, chicken wing, fallo técnico`
  - palabras: `tecnico` → `técnico`
- **HB-006** / `Estado`
  - actual: `Pendiente deduplicacion`
  - propuesto: `Pendiente deduplicación`
  - palabras: `Pendiente deduplicacion` → `Pendiente deduplicación`
- **HB-006** / `Objetivo`
  - actual: `Evaluar si el escalador tiene fuerza minima para iniciar dead hangs`
  - propuesto: `Evaluar si el escalador tiene fuerza mínima para iniciar dead hangs`
  - palabras: `minima` → `mínima`
- **HB-006** / `Publicable app`
  - actual: `Si con advertencia`
  - propuesto: `Sí con advertencia`
  - palabras: `Si con advertencia` → `Sí con advertencia`
- **HB-006** / `Señales detener`
  - actual: `Dolor o imposibilidad tecnica`
  - propuesto: `Dolor o imposibilidad técnica`
  - palabras: `tecnica` → `técnica`
- **HB-007** / `Intensidad`
  - actual: `Maxima`
  - propuesto: `Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-007** / `Notas`
  - actual: `Test maximo de alto riesgo`
  - propuesto: `Test máximo de alto riesgo`
  - palabras: `maximo` → `máximo`
- **HB-007** / `Precauciones`
  - actual: `Test maximo; solo avanzado`
  - propuesto: `Test máximo; solo avanzado`
  - palabras: `maximo` → `máximo`
- **HB-007** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-008** / `Descripción`
  - actual: `Realizar intentos de 5 s en regleta de 15 mm; aumentar 5-10 kg tras 5 min segun desempeno; objeti...`
  - propuesto: `Realizar intentos de 5 s en regleta de 15 mm; aumentar 5-10 kg tras 5 min segun desempeno; objeti...`
  - palabras: `maximo` → `máximo`
- **HB-008** / `Intensidad`
  - actual: `Maxima`
  - propuesto: `Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-008** / `Nombre`
  - actual: `Strength test: 5 s con peso anadido en 15 mm`
  - propuesto: `Strength test: 5 s con peso añadido en 15 mm`
  - palabras: `anadido` → `añadido`
- **HB-008** / `Notas`
  - actual: `Test maximo de alto riesgo`
  - propuesto: `Test máximo de alto riesgo`
  - palabras: `maximo` → `máximo`
- **HB-008** / `Objetivo`
  - actual: `Medir carga maxima anadida tolerada 5 s`
  - propuesto: `Medir carga máxima añadida tolerada 5 s`
  - palabras: `anadida` → `añadida`, `maxima` → `máxima`
- **HB-008** / `Precauciones`
  - actual: `Test maximo; no apto para principiantes`
  - propuesto: `Test máximo; no apto para principiantes`
  - palabras: `maximo` → `máximo`
- **HB-008** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-008** / `Señales detener`
  - actual: `Dolor, flexion, perdida de contacto`
  - propuesto: `Dolor, flexión, perdida de contacto`
  - palabras: `flexion` → `flexión`
- **HB-009** / `Intensidad`
  - actual: `Maxima`
  - propuesto: `Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-009** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-009** / `Tiempo`
  - actual: `5-7 s objetivo en pretest con peso anadido`
  - propuesto: `5-7 s objetivo en pretest con peso añadido`
  - palabras: `anadido` → `añadido`
- **HB-010** / `Intensidad`
  - actual: `Maxima`
  - propuesto: `Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-010** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-010** / `Regresión`
  - actual: `Menos peso / agarre mas facil`
  - propuesto: `Menos peso / agarre mas fácil`
  - palabras: `facil` → `fácil`
- **HB-010** / `Tiempo`
  - actual: `5-7 s objetivo en pretest con peso anadido`
  - propuesto: `5-7 s objetivo en pretest con peso añadido`
  - palabras: `anadido` → `añadido`
- **HB-011** / `Intensidad`
  - actual: `Maxima`
  - propuesto: `Máxima`
  - palabras: `Maxima` → `Máxima`
- **HB-011** / `Publicable app`
  - actual: `Si con bloqueo por perfil`
  - propuesto: `Sí con bloqueo por perfil`
  - palabras: `Si con bloqueo por perfil` → `Sí con bloqueo por perfil`
- **HB-011** / `Regresión`
  - actual: `Menos peso / agarre mas facil`
  - propuesto: `Menos peso / agarre mas fácil`
  - palabras: `facil` → `fácil`
- **HB-011** / `Tiempo`
  - actual: `5-7 s objetivo en pretest con peso anadido`
  - propuesto: `5-7 s objetivo en pretest con peso añadido`
  - palabras: `anadido` → `añadido`

### Familia `CO` — 13 findings en 13 filas

- **CO-001** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-002** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-003** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-004** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-005** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-006** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-007** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P001** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P002** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P003** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P004** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P005** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **CO-P006** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`

### Familia `FM` — 11 findings en 11 filas

- **FM-002** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-003** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-004** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-005** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-006** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-007** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-008** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-009** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-012** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-013** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **FM-014** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`

### Familia `EV` — 7 findings en 7 filas

- **EV-CO-001** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **EV-CO-002** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **EV-CO-003** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **EV-CO-004** / `Fuente secundaria`
  - actual: `CONTINUIDAD Y RESISTENCIA AEROBICA`
  - propuesto: `CONTINUIDAD Y RESISTENCIA AERÓBICA`
  - palabras: `AEROBICA` → `AERÓBICA`
- **EV-FM-002** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **EV-FM-004** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **EV-FM-005** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`

### Familia `PF` — 3 findings en 3 filas

- **PF-FM-001** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **PF-FM-002** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`
- **PF-FM-005** / `Fuente secundaria`
  - actual: `FUERZA MAXIMA`
  - propuesto: `FUERZA MÁXIMA`
  - palabras: `MAXIMA` → `MÁXIMA`

### Familia `ADO` — 1 findings en 1 filas

- **ADO-001** / `Notas`
  - actual: `Pregunta de check-in: "¿Hoy practicas o rindes?"`
  - propuesto: `Pregunta de check-in: "¿Hoy prácticas o rindes?"`
  - palabras: `practicas` → `prácticas`

### Familia `NE` — 1 findings en 1 filas

- **NE-PR-001** / `Notas`
  - actual: `NUMEROS solo orientativos. Cualquier prescripción individual requiere nutricionista deportiva.`
  - propuesto: `NÚMEROS solo orientativos. Cualquier prescripción individual requiere nutricionista deportiva.`
  - palabras: `NUMEROS` → `NÚMEROS`

## Palabras ambiguas (REVIEW only, no propuestas)

Palabras con y sin tilde son ambas gramaticalmente válidas según contexto. No se proponen fixes automáticos.

Total menciones de palabras ambiguas en el CSV: **1064** (esperado — la mayoría son usos correctos).

Top 10 más frecuentes:

| Palabra | # ocurrencias |
|---|---:|
| `el` | 332 |
| `si` | 271 |
| `como` | 176 |
| `que` | 124 |
| `solo` | 84 |
| `cuando` | 30 |
| `este` | 14 |
| `donde` | 9 |
| `mas` | 6 |
| `tu` | 6 |

**No se listan por fila individual** para no inflar el reporte — mayoría son usos correctos. Si hace falta análisis manual de un subset, se puede acotar por familia después.

## Notas sobre el método

- **Match por palabra completa (word boundary)** para evitar falsos positivos como matchear `esta` dentro de `estatico`.
- **Case-insensitive** — matchea `Anadido`, `anadido`, `ANADIDO`. La propuesta preserva el casing original.
- **HIGH-confidence dictionary** — todas las palabras del diccionario son sustantivos/adjetivos técnicos del dominio de escalada donde la versión sin tilde es casi con certeza corrupción, no un uso gramatical válido.
- **Ambigüedades excluidas** — palabras como `esta`, `si`, `solo`, `mas`, `tu`, `mi` NO se proponen para fix porque ambos usos son válidos según contexto.
- **`Publicable app`** — reemplazo específico del valor completo del campo (no word-level), matcheando los typos descubiertos manualmente en el paso anterior.

## Cosas explícitamente NO en el reporte

- ❌ Fixes propuestos para las palabras marcadas como REVIEW (esta, si, solo, ...) — deben inspeccionarse fila por fila si Giuliana decide ampliar el scope.
- ❌ Cambios estructurales del CSV (nuevas columnas, reordenamiento).
- ❌ Fixes de contenido semántico (ej: ejercicios mal categorizados).

## Recomendación operacional

Si Giuliana OK-ea aplicar los fixes HIGH-confidence, el resultado es:

- **91 findings** en **46 filas únicas**.
- Fix aplicado directamente en el CSV como en FIL-004.
- Seeder extendido con `KNOWN_TYPO_FIXES.publicable_app` para safeguard futuro.
- Re-run del seeder tras el fix (idempotente por upsert).
- `exercises_eligible` esperado post-fix: **369** (sube de 359 por los 10 typos de Publicable app).

