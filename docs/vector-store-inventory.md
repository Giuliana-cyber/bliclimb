# Vector store inventory — BilClimb Knowledge Base

**Fecha del snapshot:** 2026-06-22
**Fuente:** live query a `https://api.openai.com/v1/vector_stores/{id}` y `.../files`
**Método:** read-only, sin borrar nada.

## Vector store metadata

| Campo | Valor |
|---|---|
| **name** | BilClimb Knowledge Base |
| **vector_store_id** | `vs_6a00e43d356881919467b2138508f938` |
| **status** | completed |
| **created_at** | 1778443325 (2026-05-10 21:22 UTC) |
| **total files** | 12 (completed) / 0 in_progress / 0 failed |
| **usage_bytes** | 3,769,736 (≈ 3.6 MB) |

## Files en el store

Ordenados por fecha de subida ascendente.

| # | file_id | filename | bytes | created_at | status |
|---|---|---|---:|---|---|
| 1 | file-WsBb9E6E4qc2zbnaLUC7w3 | 1.-Alex-Barrows-Training-Doc-V2-for-training-beta.pdf | 606,728 | 2026-05-10 21:22 | processed |
| 2 | file-VputkSZ1nx6viTxtH9LmCK | Beastmaking PDF (Limited Copy).pdf | 4,137,714 | 2026-05-10 21:22 | processed |
| 3 | file-PAqot3NiEmMFouWd38mKfB | boulderingForBeginners.pdf | 8,191,571 | 2026-05-10 21:23 | processed |
| 4 | file-WTv3xHVY7BLax2ofNjvPWp | Compendio Maestro de Ciencias de la Escalada_ Base de Conocimiento Estructurada.pdf | 144,042 | 2026-05-10 21:23 | processed |
| 5 | file-J58p6rVQd2N86ZpkN8H3cD | Como Entrenar y Escalar Mejor - Eric Horst.pdf | 8,718,490 | 2026-05-10 21:23 | processed |
| 6 | file-CexQvx36v9qUYqCNK5A4Fx | ediciones_desnivel_entrenamiento_consultorio.pdf | 110,801 | 2026-05-10 21:23 | processed |
| 7 | file-4moTzfGP95mkZbw5oqVdiy | e03092509017b.pdf | 5,150,509 | 2026-05-10 21:23 | processed |
| 8 | file-AC87Ai7Qcu6nuZWnFov3v6 | Guía-de-entrenadores-de-escalada.pdf | 1,217,460 | 2026-05-10 21:23 | processed |
| 9 | file-Jdhb6NfpJ4Z6JMqEEATXB8 | How to Climb 5.12 - Eric Horst.pdf | 4,991,880 | 2026-05-10 21:23 | processed |
| 10 | file-Vha1pnpXzqvY9Vu9YTXkfk | training102.pdf | 10,056,621 | 2026-05-10 21:23 | processed |
| 11 | file-PCAaQQSTvtxPTwBcW2ZcSv | Sexto Plan de entrenamiento Giuliana.pdf | 377,517 | 2026-05-30 20:26 | processed |
| 12 | file-JuzXoFxFXSmDPL62vZNtqJ | Guerreros de la Roca.pdf | 2,911,867 | 2026-05-30 20:26 | processed |

## Nota discrepancia: `usage_bytes` reportado por el store (3.6 MB) vs suma de `bytes` por archivo (≈ 46 MB)

OpenAI reporta `usage_bytes` como consumo indexado (post-chunking / embedding),
no como suma de tamaños de PDF crudo. Los archivos originales suman ≈ 46 MB
pero el índice utiliza 3.6 MB. **No es un bug** — es la métrica esperada
para file_search de Responses API. Documento para que no cause confusión
al ver la métrica en el dashboard.

## Análisis: candidatos a Doc 02 / Doc 03 vieja versión

Heurística aplicada: nombres que contengan "reglas", "seguridad",
"conceptual", "knowledge", "brain", "compendio", "base de conocimiento".

**Match sospechoso**:
- **file-WTv3xHVY7BLax2ofNjvPWp** —
  `Compendio Maestro de Ciencias de la Escalada_ Base de Conocimiento Estructurada.pdf`
  (144 KB, 2026-05-10). El título coincide con la semántica del Doc 03
  ("conocimiento conceptual estructurado"). Tamaño chico (144 KB) también
  encaja con el Doc 03 v3 que tenemos en `docs/brain/` (55 KB markdown).
  Probable **candidato a Doc 03 v1 o v2**.

**Sin match claro pero merecen inspección manual**:
- **file-4moTzfGP95mkZbw5oqVdiy** — `e03092509017b.pdf` (5 MB). Nombre
  opaco sin contexto. Podría ser un scan de libro, un doc interno viejo,
  o cualquier cosa. Es imposible clasificarlo sin abrirlo.

**Sin match — literatura externa curada**:
- Alex Barrows, Beastmaking, boulderingForBeginners, Como Entrenar y
  Escalar Mejor (Hörst), How to Climb 5.12 (Hörst), Guía de entrenadores,
  training102, ediciones_desnivel_entrenamiento_consultorio, Guerreros
  de la Roca — 9 archivos. Son libros/publicaciones de dominio de
  entrenamiento de escalada. Preservar como RAG general.

**Data personal**:
- **file-PCAaQQSTvtxPTwBcW2ZcSv** — `Sexto Plan de entrenamiento Giuliana.pdf`
  (377 KB). Es un plan de entrenamiento personal de la dueña del producto.
  Discutir política: ¿debería el vector store consumido por todos los
  usuarios contener data personal identificable? Si el uso es "ejemplo
  de plan bien hecho para grounding", quizás renombrar/anonimizar antes.

## Recomendación para Fase 2

### Preservar en el store (10 archivos)
Literatura curada. Se mantienen para grounding.
- Alex Barrows Training Doc
- Beastmaking
- boulderingForBeginners
- Como Entrenar Eric Hörst
- ediciones desnivel
- Guía de entrenadores
- How to Climb 5.12 Hörst
- training102
- Guerreros de la Roca
- e03092509017b.pdf → **inspección requerida antes de decidir**

### Reemplazar por Doc 03 v3 nuevo (1 archivo)
- **file-WTv3xHVY7BLax2ofNjvPWp** — `Compendio Maestro de Ciencias de la
  Escalada.pdf`: alta probabilidad de ser Doc 03 v1/v2. En Fase 2:
  1. Descargar el file (o abrirlo desde el Dashboard) para verificar
     que su contenido es un subset/superset del Doc 03 v3 que tenemos
     hoy en `docs/brain/doc-03-conocimiento-conceptual-v3.md`.
  2. Si se confirma reemplazo: subir Doc 03 v3 como PDF/markdown al
     store; eliminar el viejo con `DELETE /v1/vector_stores/{id}/files/{file_id}`.
  3. Si NO se confirma reemplazo (contenido distinto): preservar ambos.

### Discutir política (1 archivo)
- **file-PCAaQQSTvtxPTwBcW2ZcSv** — `Sexto Plan de entrenamiento Giuliana.pdf`:
  decisión de producto sobre data personal en el knowledge base.

### Subir en Fase 2 (2 archivos nuevos)
- Doc 02 v3 (`docs/brain/doc-02-reglas-seguridad-v3.md`) — NUEVO al store.
- Doc 03 v3 (`docs/brain/doc-03-conocimiento-conceptual-v3.md`) — NUEVO
  al store, reemplazando el "Compendio Maestro" viejo si aplica.

## No hay observaciones que bloqueen el arranque de Fase 1

El inventario documenta el estado actual y las decisiones que quedan
pendientes para Fase 2. Ninguna acción destructiva se tomó en esta
sesión de listing.

## Sobre la deuda del script de upload

`docs/KNOWLEDGE_BASE.md:9` referencia `node scripts/upload-knowledge-pdfs.mjs`,
pero ese archivo no existe en el repo hoy. Los 12 PDFs listados aquí
fueron subidos por otro método (Dashboard de OpenAI, presumiblemente).

En Fase 2 hay que decidir: **(A)** recrear el script para que las subidas
futuras sean reproducibles desde CLI (patrón: `openai.files.create()`
+ `openai.vectorStores.files.create({file_id})`) o **(B)** actualizar
`KNOWLEDGE_BASE.md` para reflejar que la vía real es el Dashboard.
