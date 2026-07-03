#!/usr/bin/env tsx
// Seeder Fase 1 — carga data/brain/exercises-v3.csv a public.exercises.
//
// Uso:
//   npm run seed:exercises   (usa tsx + --env-file=.env.local por default)
//   node --env-file=.env.local -r tsx/cjs scripts/seed-exercises.ts
//
// Requiere:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (bypasea RLS, permite upsert)
//
// Idempotente: upsert by id (PK). Correr N veces produce el mismo estado.
//
// Todas las decisiones de normalización viven en lib/exercises/csv-normalize.ts
// para poder testearlas sin DB.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  CSV_HEADER,
  csvRowToExerciseRow,
  KNOWN_ESTADO_VALUES,
  type CsvRow,
  type ExerciseRow
} from '../lib/exercises/csv-normalize';

// ---------- CSV parser mínimo con soporte de campos entrecomillados ----------
//
// El CSV tiene comas dentro de "..." (descripciones, tags con coma). No alcanza
// con split(','). Este parser respeta RFC 4180 en lo esencial:
//   - " " delimita campos que pueden contener comas y saltos de línea
//   - "" dentro de un campo entrecomillado escapa a "
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // strip
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows: string[][]): CsvRow[] {
  if (rows.length === 0) throw new Error('CSV vacío');
  const header = rows[0];
  if (header.length !== CSV_HEADER.length) {
    throw new Error(
      `Header tiene ${header.length} columnas, esperábamos ${CSV_HEADER.length}.`
    );
  }
  for (let i = 0; i < header.length; i++) {
    if (header[i] !== CSV_HEADER[i]) {
      throw new Error(
        `Columna ${i}: CSV tiene "${header[i]}", esperábamos "${CSV_HEADER[i]}".`
      );
    }
  }
  const out: CsvRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === '') continue;
    if (row.length !== header.length) {
      throw new Error(
        `Fila ${r + 1}: ${row.length} campos, esperábamos ${header.length}.`
      );
    }
    const obj = {} as CsvRow;
    for (let c = 0; c < header.length; c++) {
      (obj as Record<string, string>)[header[c]] = row[c];
    }
    out.push(obj);
  }
  return out;
}

// ---------- Main ----------
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
        'Correr con: npm run seed:exercises'
    );
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const csvPath = resolve(here, '..', 'data', 'brain', 'exercises-v3.csv');
  const raw = readFileSync(csvPath, 'utf8');

  console.log(`[seed] Leyendo ${csvPath} (${raw.length} bytes)`);
  const rows = parseCsv(raw);
  const objects = rowsToObjects(rows);
  console.log(`[seed] ${objects.length} filas de datos parseadas`);

  const estadoTypoFixedIds: string[] = [];
  const unknownEstado: Array<{ id: string; value: string }> = [];
  const exercises: ExerciseRow[] = [];
  for (const obj of objects) {
    const { exercise, fixesApplied } = csvRowToExerciseRow(obj);
    if (fixesApplied.estadoTypo) estadoTypoFixedIds.push(exercise.id);
    if (!KNOWN_ESTADO_VALUES.has(exercise.estado)) {
      unknownEstado.push({ id: exercise.id, value: exercise.estado });
    }
    exercises.push(exercise);
  }

  console.log(
    `[seed] Fix "Pendiente deduplicacion" (sin tilde) → "Pendiente deduplicación": ${estadoTypoFixedIds.length} filas`
  );
  if (estadoTypoFixedIds.length > 0) {
    console.log(`[seed]   IDs corregidos: ${estadoTypoFixedIds.join(', ')}`);
  }

  // Fail-fast: si aparece una variante de Estado no anticipada, abortamos
  // antes de escribir. Prevenir que se cuele contenido silenciosamente y
  // preservar KNOWN_ESTADO_VALUES como snapshot vivo del contrato.
  if (unknownEstado.length > 0) {
    console.error(
      `[seed] ABORT: ${unknownEstado.length} filas tienen valores de Estado ` +
        `no anticipados en KNOWN_ESTADO_VALUES (lib/exercises/csv-normalize.ts).`
    );
    for (const { id, value } of unknownEstado) {
      console.error(`[seed]   ${id}: ${JSON.stringify(value)}`);
    }
    console.error(
      '[seed] Decidí con el equipo de contenido si es una variante nueva ' +
        'que debe agregarse al allowlist, o un typo a corregir en el CSV.'
    );
    process.exit(1);
  }

  const ids = new Set<string>();
  for (const e of exercises) {
    if (ids.has(e.id)) throw new Error(`ID duplicado en el CSV: ${e.id}`);
    ids.add(e.id);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Node 20 no tiene WebSocket nativo; el seeder no usa realtime pero
    // el cliente lo inicializa igual. Pasamos ws para evitar el crash.
    realtime: { transport: ws as unknown as typeof WebSocket }
  });

  const BATCH = 100;
  let written = 0;
  for (let i = 0; i < exercises.length; i += BATCH) {
    const chunk = exercises.slice(i, i + BATCH);
    const { error } = await supabase
      .from('exercises')
      .upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(
        `[seed] Error escribiendo batch ${i}-${i + chunk.length}: ${error.message}`
      );
      process.exit(1);
    }
    written += chunk.length;
    console.log(`[seed] Escritas ${written}/${exercises.length}`);
  }

  const { count, error: countErr } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true });
  if (countErr) {
    console.error(`[seed] Error contando exercises: ${countErr.message}`);
    process.exit(1);
  }

  const { count: eligibleCount, error: eligErr } = await supabase
    .from('exercises_eligible')
    .select('id', { count: 'exact', head: true });
  if (eligErr) {
    console.error(
      `[seed] Error contando exercises_eligible: ${eligErr.message}`
    );
    process.exit(1);
  }

  console.log('');
  console.log(`[seed] ✓ Total en public.exercises:          ${count}`);
  console.log(`[seed] ✓ Total en public.exercises_eligible: ${eligibleCount}`);
  console.log(`[seed] ✓ Fixes aplicados (estado typo):       ${estadoTypoFixedIds.length} (${estadoTypoFixedIds.join(', ') || 'ninguno'})`);
  console.log('[seed] Listo.');
}

main().catch((err) => {
  console.error('[seed] Fallo:', err);
  process.exit(1);
});
