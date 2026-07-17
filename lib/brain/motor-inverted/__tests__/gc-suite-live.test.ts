/**
 * F2.4 · Golden cases GC-002/003/004/005 · LIVE con OpenAI.
 *
 * Skipeado por default. Ejecutar con RUN_LIVE_LLM=1.
 * Costo estimado: 4 llamadas · ~1000 tokens c/u · ~$0.002 total.
 *
 * GC-003 es EL test crítico: debe producir sesión con hangboard/PE
 * (no asistidos). Si el LLM entrega el mismo tipo de plan que a Giuliana,
 * el motor es demasiado conservador.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadCatalog, resetCatalogCache } from '../catalog-loader';
import { generateSession } from '../plan-generator';
import type { Catalog } from '../types';
import {
  GC002_PROFILE, GC002_FOCUS,
  GC003_PROFILE, GC003_FOCUS,
  GC004_PROFILE, GC004_FOCUS,
  GC005_PROFILE, GC005_FOCUS,
} from './gc-perfiles';

const RUN_LIVE = process.env.RUN_LIVE_LLM === '1';

function loadDotEnvLocal(): void {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    for (const line of raw.split('\n')) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) {
        process.env[m[1]!] = m[2] ?? '';
      }
    }
  } catch { /* opcional */ }
}

let catalog: Catalog;

beforeAll(() => {
  if (RUN_LIVE) loadDotEnvLocal();
  resetCatalogCache();
  catalog = loadCatalog();
});

function logPlan(header: string, session: any, meta: any): void {
  console.log(`\n═══ ${header} ═══`);
  console.log(`Título: ${session.title}`);
  console.log(`Rationale: ${session.rationale}`);
  console.log(`Atleta: ${session.atleta.condicionActual}`);
  console.log(`Ejercicios (${session.exercises.length}):`);
  for (const ex of session.exercises) {
    console.log(
      `  ${ex.exerciseId} · ${ex.name}` +
        ` · ${ex.sets} × ${ex.reps} · desc ${ex.rest}` +
        ` · risk=${ex.riskLevel}`,
    );
    if (ex.llmNotes) console.log(`     ${ex.llmNotes}`);
  }
  console.log(
    `Meta: ${meta.eligibleCount} elegibles · ${meta.tokensUsed} tokens · ${meta.latencyMs}ms`,
  );
  console.log('════════════════════════════');
}

describe.skipIf(!RUN_LIVE)('F2.4 · GC-002 principiante · live', () => {
  it('el pool es 0 · el motor debe rechazar con mensaje claro', async () => {
    // GC-002 sin hangboard = pool de dedos vacío. El motor DEBE rechazar
    // en vez de inventar. Esto es fail-closed puro.
    await expect(
      generateSession({
        catalog,
        profile: GC002_PROFILE,
        focus: GC002_FOCUS,
        options: {
          category: 'fuerza-dedos',
          nExercises: 4,
          sessionTheme: 'Base técnica primera sesión',
        },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('\nGC-002 · pool=0 · motor rechazó correctamente ✅');
  }, 30_000);
});

describe.skipIf(!RUN_LIVE)('F2.4 · GC-003 avanzado · live (TEST CRÍTICO)', () => {
  it('genera sesión específica con hangboard/PE reales · NO asistidos', async () => {
    const { session, meta } = await generateSession({
      catalog,
      profile: GC003_PROFILE,
      focus: GC003_FOCUS,
      options: {
        category: 'fuerza-dedos',
        nExercises: 4,
        sessionTheme: 'Sesión específica · fuerza de dedos avanzada',
      },
    });

    logPlan('PLAN GC-003 (avanzado)', session, meta);

    // Sanidad
    expect(session.exercises).toHaveLength(4);

    // TEST CRÍTICO: al menos un ejercicio debe ser high o medium-high
    // Si el motor le da a un V8 solo asistidas, está roto.
    const risks = session.exercises.map((e) => e.riskLevel);
    const hasChallengeRisk = risks.some(
      (r) => r === 'high' || r === 'medium-high',
    );
    expect(
      hasChallengeRisk,
      `GC-003 recibió TODAS asistidas · motor conservador siempre · risks=${risks.join(',')}`,
    ).toBe(true);

    // Must NOT: full crimp máximo / mono automático / bloqueados
    for (const ex of session.exercises) {
      expect(ex.name.toLowerCase()).not.toMatch(/máxima|maxima|max\s*hang/i);
      expect(ex.name.toLowerCase()).not.toMatch(/bloquead[oa]\s+en\s+app/i);
    }
  }, 60_000);
});

describe.skipIf(!RUN_LIVE)('F2.4 · GC-004 unknown · live', () => {
  it('pool 0 (sin hangboard) · motor rechaza', async () => {
    // GC-004 también sin hangboard → mismo comportamiento que GC-002
    await expect(
      generateSession({
        catalog,
        profile: GC004_PROFILE,
        focus: GC004_FOCUS,
        options: {
          category: 'fuerza-dedos',
          nExercises: 3,
          sessionTheme: 'Conservador · retest guiado',
        },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('\nGC-004 · pool=0 · motor rechazó correctamente ✅');
  }, 30_000);
});

describe.skipIf(!RUN_LIVE)('F2.4 · GC-005 dolor actual · live', () => {
  it('pool 0 · gate de dolor bloquea todo · fail-closed', async () => {
    // Perfil con dolor 7/10 en dedos → GT-FIN-002 bloquea todo. El motor
    // DEBE rechazar. Nunca cargar dedos con dolor actual.
    await expect(
      generateSession({
        catalog,
        profile: GC005_PROFILE,
        focus: GC005_FOCUS,
        options: {
          category: 'fuerza-dedos',
          nExercises: 3,
          sessionTheme: 'Sesión con dolor activo',
        },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('\nGC-005 · dolor activo · motor rechazó correctamente ✅');
  }, 30_000);
});

describe.skipIf(RUN_LIVE)('F2.4 · noop cuando RUN_LIVE_LLM=0', () => {
  it('skip · corre con RUN_LIVE_LLM=1', () => {
    expect(true).toBe(true);
  });
});
