# Migration Sync Report — Checkpoint 1

**Objetivo**: cross-check entre `supabase/migrations/0001-0009` locales y el estado real de la DB de producción, antes de intentar aplicar `0010_exercises_schema.sql`.

**Fuentes de verdad**:
- Backup autoritativo: `~/bilclimb-backups/backup-2026-07-02-full.sql` (pg_dump 18.4, DB 17.6, 288 KB, snapshot post-reset de password).
- Migraciones locales: `supabase/migrations/0001_init.sql` … `0009_push_subscriptions.sql`.
- CLI Supabase: 2.98.1 linkeada al proyecto `rzeatodzqznsyieqdyoj` ("Giuliana-cyber's Project", us-east-1).

**Alcance del CP1**: solo diagnóstico. NO se modificaron migraciones, NO se ejecutó `db push` ni `migration repair`.

---

## Resumen ejecutivo

| Categoría | Encontrados | Bloquea CP4 |
|---|---:|---|
| Reconciliación de historial (schema_migrations vacío) | 1 | ✅ Sí |
| Bug pgvector sin schema qualifier en 0001 | 3 refs | ⚠️ Sí para fresh install |
| Constraints residuales con nombre `subscriptions_*` | 3 | ❌ No (cosmético) |
| Trigger duplicado en entitlements | 1 | ❌ No (overhead trivial) |
| **Total de diferencias significativas** | **8** | — |

Bajo el umbral de 15. Todas las tablas, índices, policies RLS y foreign keys esperadas están presentes con estructura correcta. No hay drift de tablas ni pérdida de columnas.

---

## Estado del historial de migraciones

`supabase migration list` reporta:

```
Local | Remote | Time (UTC)
------|--------|------------
0001  |        | 0001
0002  |        | 0002
...
0010  |        | 0010
```

**Todas las migraciones locales están sin contraparte remota.** La tabla `supabase_migrations.schema_migrations` está vacía (verificado en el backup: el `COPY` block no tiene filas). Esto es esperado — Giuliana aplicó 0001-0009 históricamente vía Dashboard/SQL Editor, no vía CLI, así que la tabla de historial nunca se pobló.

**Consecuencia**: `supabase db push` intentaría aplicar 0001-0010 desde cero. Como 0001-0009 ya están aplicadas parcialmente (ver §"Diferencias por tabla"), el push fallaría con errores tipo `relation already exists` o dobles-aplicaciones parciales.

**Fix**: `supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009` — inserta filas en `schema_migrations` sin ejecutar SQL. Esto se hace en el Checkpoint 3.

**Sintaxis verificada** (CLI 2.98.1 `migration repair --help`): `[version] ... --status [applied|reverted]`. La sintaxis idéntica existe en 2.109.0 (chequeada en docs actuales). **No hace falta actualizar la CLI**.

---

## Análisis del bug pgvector en 0001_init.sql

En Supabase, la extensión `vector` se instala en el schema `extensions` (no en `public`). El backup confirma:

```
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
...
CREATE TABLE public.source_chunks (
    ...
    embedding extensions.vector(1536),
    ...
);
CREATE INDEX source_chunks_embedding_idx
  ON public.source_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='100');
CREATE FUNCTION public.match_source_chunks(query_embedding extensions.vector, ...)
```

En la DB real todo está schema-qualified. En [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) las 3 refs NO tienen qualifier:

| # | Línea | Código actual | Código correcto |
|---|---|---|---|
| 1 | [0001_init.sql:9](supabase/migrations/0001_init.sql:9) | `create extension if not exists "vector";` | `create extension if not exists "vector" with schema extensions;` |
| 2 | [0001_init.sql:202](supabase/migrations/0001_init.sql:202) | `embedding vector(1536),` | `embedding extensions.vector(1536),` |
| 3 | [0001_init.sql:209](supabase/migrations/0001_init.sql:209) | `on public.source_chunks using ivfflat (embedding vector_cosine_ops)` | `on public.source_chunks using ivfflat (embedding extensions.vector_cosine_ops)` |
| 4 | [0001_init.sql:214](supabase/migrations/0001_init.sql:214) | `query_embedding vector(1536),` | `query_embedding extensions.vector(1536),` |

**Por qué la DB actual funciona pese al bug**: cuando se ejecuta desde el **SQL Editor del Dashboard**, el `search_path` implícito incluye `public, extensions, ...`, así que `vector` y `vector_cosine_ops` se resuelven sin qualifier. Cuando se ejecuta desde **`supabase db push` (CLI)**, la conexión usa el rol `postgres` con `search_path = "$user", public` — no incluye `extensions`. Un fresh install desde CLI falla con:

```
ERROR:  type "vector" does not exist
LINE X:   embedding vector(1536),
```

**Impacto ahora**: la DB actual está bien. La corrección hace idempotente el fresh-install desde CLI (relevante para staging/backups/nuevos entornos), y hace que 0001_init.sql sea reproducible.

**Nota**: los cambios propuestos son **cosméticos para la DB actual** (no re-ejecutan porque `create table if not exists` no re-crea la tabla). Solo modifican el archivo `0001_init.sql` para que un fresh install funcione.

---

## Diferencias por tabla

### Tablas — 13/13 presentes con columnas correctas

Todas las columnas producidas por 0001+0002+0004+0005+0006+0007+0008+0009 están en la DB. Sin pérdida ni drift.

| Tabla | Migración origen | Estado |
|---|---|---|
| profiles | 0001 + 0005 (fuerza) + 0006 (role) + 0008 (streak+prefs) | ✅ |
| plans | 0001 + 0006 (source, coach_id) | ✅ |
| sessions | 0001 | ✅ |
| check_ins | 0001 | ✅ |
| entitlements (renombrada desde `subscriptions`) | 0001→0002 + 0004 + 0006 + 0007 | ✅ estructura, ⚠️ nombres de constraints |
| sources | 0001 | ✅ |
| source_chunks | 0001 | ✅ |
| webhook_events | 0002 | ✅ |
| coach_clients | 0006 | ✅ |
| coach_plans | 0006 | ✅ |
| daily_activity | 0008 | ✅ |
| weekly_summaries | 0008 | ✅ |
| push_subscriptions | 0009 | ✅ |

### Constraints y triggers en `entitlements` — residuos del rename

`0002_entitlements.sql` renombra `public.subscriptions` → `public.entitlements` preservando filas. Postgres **NO** renombra automáticamente los constraints ni los triggers de una tabla renombrada, así que los objetos internos mantienen su nombre original. `0003_cleanup_legacy_constraints.sql` intenta limpiar algunos con drops explícitos, pero **al menos uno no fue efectivo**.

Estado observado en el backup:

| Objeto | Nombre en DB | Debería ser | 0003 lo intenta arreglar? |
|---|---|---|---|
| PRIMARY KEY | `subscriptions_pkey` | `entitlements_pkey` | ❌ No |
| UNIQUE (provider, provider_subscription_id) | `subscriptions_provider_provider_subscription_id_key` | `entitlements_provider_sub_key` (o dropear en favor del partial index) | ✅ Intenta drop (línea 40-41), pero backup lo muestra presente |
| FOREIGN KEY (profile_id → profiles.id) | `subscriptions_profile_id_fkey` | `entitlements_profile_id_fkey` | ❌ No |
| TRIGGER updated_at | `subscriptions_touch` + `entitlements_touch` (ambos activos) | Solo `entitlements_touch` | ❌ No (0002 crea el nuevo pero no dropea el viejo) |

**Análisis**: 0003 fue aplicado **parcialmente**. Los `alter column drop not null` (líneas 13-16) se ven reflejados (las columnas son nullable en el backup), y el `add constraint entitlements_status_check` de 0002 sí se aplicó (con nombre correcto). Pero el `drop constraint if exists subscriptions_provider_provider_subscription_id_key` (línea 40-41 de 0003) no dejó rastro — el constraint sigue presente.

**Impacto funcional**: ninguno. El UNIQUE con nombre viejo cumple la misma función. El trigger duplicado ejecuta 2× por UPDATE (overhead trivial en la escala actual). Los nombres viejos son estéticos.

**Cosas a decidir en CP2** (§"Diferencias que requieren decisión"):
- ¿Renombrar los 3 constraints para consistencia? (nueva migración 0011)
- ¿Dropear el trigger duplicado `subscriptions_touch`?
- ¿Dejar todo tal cual y solo documentar en `canonicalization-debt.md`?

---

## Índices, policies, funciones, foreign keys

Comparación exhaustiva: **todo coincide con lo que producen 0001-0009 aplicadas en orden**.

- **24 índices** en `public.*`: todos matchean con el DDL de las migraciones. Los nombres siguen el patrón esperado (los antiguos `subscriptions_profile_id_idx` y `subscriptions_active_idx` fueron dropeados por 0002 líneas 109-110 y ya no aparecen en el backup — así que ese drop sí se aplicó).
- **23 policies RLS** en `public.*`: coinciden con las declaradas en 0001, 0002, 0006, 0008, 0009. No hay policies huérfanas ni faltantes.
- **3 funciones** en `public.*`: `handle_new_user`, `touch_updated_at`, `match_source_chunks`. Coinciden en signature.
- **7 triggers** en `public.*` + 1 en `auth.users` (`on_auth_user_created`): coinciden. El único extra es `subscriptions_touch` duplicado (ya listado arriba).
- **20 foreign keys** en `public.*`: todas presentes con la semántica correcta (ON DELETE CASCADE/SET NULL según spec).

---

## Diferencias que requieren decisión de Giuliana

Ordenadas por criticidad. **Ninguna sugiere pérdida de datos**.

### 🔴 Bloqueantes de CP4 (aplicar 0010)

**D1 — `schema_migrations` remoto vacío.**
La CLI no sabe que 0001-0009 fueron aplicadas. Sin repair, `supabase db push` intentaría re-crear tablas y fallaría.
**Acción propuesta CP3**: `supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009`. Solo escribe en `schema_migrations`, no ejecuta DDL. Rollback trivial: `--status reverted`.

### 🟡 Recomendadas — no bloquean CP4 pero valen la pena

**D2 — Bug pgvector en 0001_init.sql** (4 refs sin schema qualifier).
No bloquea CP4 porque la tabla ya existe. Sí bloquea futuros fresh installs desde CLI (staging, backup restore, nuevos ambientes).
**Acción propuesta CP2**: fix en 4 líneas del archivo. Commit dedicado: `fix(migration): schema-qualify pgvector refs en 0001_init.sql`.

### 🟢 Cosméticas — decisión de estilo

**D3 — Constraint `subscriptions_pkey` en entitlements.**
PK con nombre viejo del rename. Funcionalidad correcta.
**Opciones**:
- (a) Dejarlo — no rompe nada, refleja historia real de la DB.
- (b) Nueva migración 0011 que hace `alter table ... rename constraint subscriptions_pkey to entitlements_pkey`.
**Recomendación**: dejar (a). Renombrar PKs es de bajo valor y podría tener efectos colaterales en integrity checks internos de Postgres. Documentar en `docs/brain/canonicalization-debt.md`.

**D4 — Constraint `subscriptions_provider_provider_subscription_id_key` UNIQUE.**
Similar a D3. 0003 intentó dropearlo pero el drop no fue efectivo (probablemente ese fragmento nunca corrió en esta DB).
**Opciones**:
- (a) Dejarlo — funcionalidad no cambia (permite múltiples NULL, bloquea duplicados con valor).
- (b) Nueva migración 0011 que hace `drop constraint if exists subscriptions_provider_provider_subscription_id_key` (efectivamente re-corriendo 0003 líneas 40-41). Después el partial index `entitlements_provider_sub_idx` (creado en 0002) cubre la funcionalidad.
**Recomendación**: (b). El drop refleja la intención original de 0003. Rollback trivial (re-add del UNIQUE).

**D5 — Foreign key `subscriptions_profile_id_fkey` en entitlements.**
Similar a D3.
**Recomendación**: dejar. Renombrar FKs es de valor cosmético puro.

**D6 — Trigger duplicado `subscriptions_touch` + `entitlements_touch` en entitlements.**
Ambos ejecutan `touch_updated_at` on BEFORE UPDATE. Overhead 2× por UPDATE (trivial).
**Opciones**:
- (a) Dejarlo — sin impacto observable.
- (b) Nueva migración 0011 con `drop trigger if exists subscriptions_touch on public.entitlements`.
**Recomendación**: (b). El drop es 100% seguro (el `entitlements_touch` cubre la funcionalidad idéntica). Elimina overhead y trigger duplicado no documentado.

---

## Propuesta consolidada para CP2

Si aprobás las recomendaciones anteriores, CP2 produce **2 commits en `chore/migration-sync`**:

1. **`fix(migration): schema-qualify pgvector refs en 0001_init.sql`** — cambia las 4 líneas de D2. Solo afecta fresh installs futuros.
2. **`fix(migration): 0011 cleanup residuos del rename subscriptions→entitlements`** — nuevo archivo `0011_cleanup_rename_residuals.sql` que:
   - Dropea el UNIQUE viejo (D4).
   - Dropea el trigger duplicado (D6).
   - Deja D3 y D5 (PK y FK) intactos con comment SQL explicando por qué.

Ambos commits son **solo edición de archivos** — CP2 no ejecuta ningún SQL contra la DB. Los diffs se muestran para review antes de CP3.

## Cosas explícitamente NO detectadas

- ❌ No hay tablas huérfanas en la DB que no correspondan a alguna migración.
- ❌ No hay columnas presentes en las migraciones pero ausentes en la DB.
- ❌ No hay columnas presentes en la DB pero ausentes de las migraciones.
- ❌ No hay policies RLS huérfanas ni faltantes.
- ❌ No hay indicios de pérdida de datos.
- ❌ No hay funciones plpgsql huérfanas.
- ❌ El schema `extensions` tiene todas las extensiones esperadas: `pgcrypto`, `vector`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`.

## Pendiente de tu OK antes de CP2

- ¿Aprobás las recomendaciones D1-D6? Puedo aplicar parcialmente si querés (ej: solo D1+D2, dejar residuos del rename).
- ¿Preferís que D3/D5 (PK y FK) sí se renombren en la misma 0011 para consistencia total?
