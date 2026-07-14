// Test de contrato del pool-loader contra el schema real.
//
// PROPÓSITO: garantizar que las columnas que el matcher pide en el SELECT
// EXISTEN en la definición del schema (0010 + canónicas de 0015-0028). Si
// alguien agrega un campo al `CatalogRow` sin la migración correspondiente,
// este test falla al build — sin necesidad de correr contra Supabase.
//
// El test no requiere conexión a la DB: parsea los archivos SQL locales
// (`supabase/migrations/*.sql`) y extrae la unión de columnas que existen
// en `public.exercises` en el estado final de las migraciones.
//
// Motivo del test: 2026-07-13 pull request review de Giuliana descubrió
// que el matcher pedía columnas inventadas (`cues`) que no existen en la
// tabla. El adapter in-memory pasaba tests con nombres fabricados. Este
// contrato existe para que esa fabricación no pueda volver a pasar.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG_ROW_COLUMNS } from './pool-loader';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/**
 * Extrae de todos los `.sql` de migraciones el conjunto FINAL de columnas
 * que existen en `public.exercises`.
 *
 * Soporta:
 *   - `create table public.exercises ( … );` (schema base 0010)
 *   - `alter table public.exercises add column [if not exists] <col> <type>;`
 *
 * NO soporta `drop column` — a la fecha del test no hay ninguno sobre
 * public.exercises. Si algún día se hace, este parser se extiende.
 */
function extractSchemaColumns(): Set<string> {
  const cols = new Set<string>();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

    // Match create table public.exercises ( ... );
    const createMatch = sql.match(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.exercises\s*\(([\s\S]*?)\)\s*;/i
    );
    if (createMatch) {
      const body = createMatch[1]!;
      // Cada línea significativa dentro del paréntesis es una definición de
      // columna: "<name> <type> [modifiers],". Ignoramos constraints y comentarios.
      for (const rawLine of body.split(/\n/)) {
        const line = rawLine.replace(/--.*$/, '').trim();
        if (!line) continue;
        // Ignorar líneas de constraint puro (primary key, check, foreign key).
        if (/^(constraint|primary\s+key|check|foreign\s+key|unique)\b/i.test(line)) {
          continue;
        }
        const colMatch = line.match(/^([a-z_][a-z0-9_]*)\s+/i);
        if (colMatch) cols.add(colMatch[1]!);
      }
    }

    // Match alter table public.exercises add column [if not exists] <col>.
    const alterRe =
      /alter\s+table\s+(?:if\s+exists\s+)?public\.exercises\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
    let m: RegExpExecArray | null;
    while ((m = alterRe.exec(sql)) !== null) {
      cols.add(m[1]!);
    }
  }
  return cols;
}

describe('pool-loader · contrato de schema con public.exercises', () => {
  const schemaCols = extractSchemaColumns();

  it('el parser encuentra las 34+ columnas base (tabla existe)', () => {
    // Sanity check del parser mismo — si esto falla, el parser está roto,
    // no las columnas del matcher.
    expect(schemaCols.size).toBeGreaterThanOrEqual(30);
    expect(schemaCols.has('id')).toBe(true);
    expect(schemaCols.has('nombre')).toBe(true);
    expect(schemaCols.has('categoria_canonica')).toBe(true);
    expect(schemaCols.has('stimulus_derivado')).toBe(true);
  });

  it('cada columna que el matcher pide EXISTE en el schema real', () => {
    const missing: string[] = [];
    for (const col of CATALOG_ROW_COLUMNS) {
      if (!schemaCols.has(col)) missing.push(col);
    }
    if (missing.length > 0) {
      // Mensaje explícito con la lista de columnas fabricadas — para que
      // sea obvio qué corregir. Si alguna vez volviera a colarse `cues`
      // como fue el caso el 2026-07-13, este mensaje lo delata.
      throw new Error(
        `El pool-loader pide columnas que NO existen en public.exercises: ${missing.join(', ')}. ` +
          `Agrega la migración que las crea o quítalas de CATALOG_ROW_COLUMNS.`
      );
    }
    expect(missing).toEqual([]);
  });

  it('NO existe columna inventada `cues` (regression guard)', () => {
    // Guard explícito contra la regresión del 2026-07-13.
    expect(schemaCols.has('cues')).toBe(false);
    expect(CATALOG_ROW_COLUMNS as readonly string[]).not.toContain('cues');
  });
});
