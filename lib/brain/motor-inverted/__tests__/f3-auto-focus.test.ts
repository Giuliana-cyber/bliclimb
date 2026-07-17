/**
 * F3.3 · Re-correr los 5 golden cases con focus derivado automáticamente.
 *
 * Contra F2.4 (focus pasado a mano), acá NO le pasamos focus a
 * generateSession — el motor lo deriva de las FocusRules del v3.0.
 *
 * Si los 5 casos siguen pasando con focus automático, el molde está 100%:
 * el motor entiende cuándo activar cada focus solo desde el perfil.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadCatalog, filterByCategory, resetCatalogCache } from '../catalog-loader';
import { restrictPool } from '../restrict-pool';
import { deriveFocus } from '../focus-selector';
import { generateSession } from '../plan-generator';
import type { Catalog } from '../types';
import {
  GC001_PROFILE,
  GC002_PROFILE,
  GC003_PROFILE,
  GC004_PROFILE,
  GC005_PROFILE,
} from './gc-perfiles';

const RUN_LIVE = process.env.RUN_LIVE_LLM === '1';

function loadDotEnvLocal(): void {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    for (const line of raw.split('\n')) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2] ?? '';
    }
  } catch { /* opcional */ }
}

let catalog: Catalog;

beforeAll(() => {
  if (RUN_LIVE) loadDotEnvLocal();
  resetCatalogCache();
  catalog = loadCatalog();
});

// ---------------------------------------------------------------------------
// Offline (siempre corre): pool restringido con focus derivado
// ---------------------------------------------------------------------------

describe('F3.3 · pool restringido con focus DERIVADO · offline', () => {
  const cases = [
    { id: 'GC-001', profile: GC001_PROFILE, expectPool: (n: number) => n >= 5 && n <= 20 },
    { id: 'GC-002', profile: GC002_PROFILE, expectPool: (n: number) => n === 0 },
    { id: 'GC-003', profile: GC003_PROFILE, expectPool: (n: number) => n >= 30 },
    { id: 'GC-004', profile: GC004_PROFILE, expectPool: (n: number) => n === 0 },
    { id: 'GC-005', profile: GC005_PROFILE, expectPool: (n: number) => n === 0 },
  ];

  for (const c of cases) {
    it(`${c.id} · pool con focus derivado cumple expectativa`, () => {
      const { focus, matchedRule } = deriveFocus(catalog, c.profile);
      const dedos = filterByCategory(catalog, 'fuerza-dedos');
      const result = restrictPool(catalog, dedos, c.profile, focus);
      console.log(
        `  ${c.id} · focus=${matchedRule.id} (${matchedRule.focusPhase}) · pool=${result.eligible.length}`,
      );
      expect(c.expectPool(result.eligible.length)).toBe(true);
    });
  }

  it('los 5 focus derivados son ≥3 distintos', () => {
    const rules = [
      GC001_PROFILE,
      GC002_PROFILE,
      GC003_PROFILE,
      GC004_PROFILE,
      GC005_PROFILE,
    ].map((p) => deriveFocus(catalog, p).matchedRule.id);
    expect(new Set(rules).size).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Live (RUN_LIVE_LLM=1): plan completo con focus derivado
// ---------------------------------------------------------------------------

describe.skipIf(!RUN_LIVE)('F3.3 · plan LIVE con focus DERIVADO', () => {
  it('GC-001 con focus automático produce plan de reconstrucción', async () => {
    const { session, meta } = await generateSession({
      catalog,
      profile: GC001_PROFILE,
      // sin focus — se deriva
      options: { category: 'fuerza-dedos', nExercises: 4 },
    });
    expect(meta.focusRule).toBe('FR-002');
    expect(session.exercises).toHaveLength(4);
    for (const ex of session.exercises) {
      expect(['low', 'low-medium', 'medium']).toContain(ex.riskLevel);
      expect(ex.name.toLowerCase()).not.toMatch(/máxima|maxima|max\s*hang/i);
    }
    console.log(`\nGC-001 auto · focusRule=${meta.focusRule} · ${meta.tokensUsed}tok · ${meta.latencyMs}ms`);
    console.log(`  Título: ${session.title}`);
    for (const ex of session.exercises) {
      console.log(`  ${ex.exerciseId} · ${ex.name} · ${ex.sets}×${ex.reps} · risk=${ex.riskLevel}`);
    }
  }, 60_000);

  it('GC-003 con focus automático produce plan específico con high risk', async () => {
    const { session, meta } = await generateSession({
      catalog,
      profile: GC003_PROFILE,
      options: { category: 'fuerza-dedos', nExercises: 4 },
    });
    expect(meta.focusRule).toBe('FR-006');
    const risks = session.exercises.map((e) => e.riskLevel);
    const hasChallenge = risks.some((r) => r === 'high' || r === 'medium-high');
    expect(
      hasChallenge,
      `GC-003 auto sin high/medium-high · risks=${risks.join(',')}`,
    ).toBe(true);
    console.log(`\nGC-003 auto · focusRule=${meta.focusRule} · ${meta.tokensUsed}tok · ${meta.latencyMs}ms`);
    console.log(`  Título: ${session.title}`);
    for (const ex of session.exercises) {
      console.log(`  ${ex.exerciseId} · ${ex.name} · ${ex.sets}×${ex.reps} · risk=${ex.riskLevel}`);
    }
  }, 60_000);

  it('GC-002 con focus automático · rechaza pool vacío', async () => {
    await expect(
      generateSession({
        catalog,
        profile: GC002_PROFILE,
        options: { category: 'fuerza-dedos', nExercises: 3 },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('\nGC-002 auto · rechazó pool vacío ✅');
  }, 30_000);

  it('GC-004 con focus automático · rechaza pool vacío', async () => {
    await expect(
      generateSession({
        catalog,
        profile: GC004_PROFILE,
        options: { category: 'fuerza-dedos', nExercises: 3 },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('GC-004 auto · rechazó pool vacío ✅');
  }, 30_000);

  it('GC-005 con focus automático (seguridad) · rechaza pool vacío por dolor', async () => {
    await expect(
      generateSession({
        catalog,
        profile: GC005_PROFILE,
        options: { category: 'fuerza-dedos', nExercises: 3 },
      }),
    ).rejects.toThrow(/pool restringido tiene 0/);
    console.log('GC-005 auto · rechazó pool vacío ✅');
  }, 30_000);
});

describe.skipIf(RUN_LIVE)('F3.3 · noop cuando RUN_LIVE_LLM=0', () => {
  it('skip · corre con RUN_LIVE_LLM=1', () => expect(true).toBe(true));
});
