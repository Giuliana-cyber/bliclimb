/**
 * F2.3 · Smoke GC-001 LIVE · llama a OpenAI real.
 *
 * Aprobado por Giuliana 2026-07-16 con "costo de tokens mínimo". Este
 * test se corre EXPLÍCITAMENTE con RUN_LIVE_LLM=1 para no gastar tokens
 * en el suite habitual. Sin la var, el test se skipea.
 *
 * Modelo: `OPENAI_MODEL` (gpt-4o-mini · ~$0.15/1M in, $0.60/1M out).
 * Estimación: 1 llamada · ~2000 tokens in + 500 out ≈ $0.0006 (menos de
 * un décimo de centavo).
 *
 * Uso:
 *   RUN_LIVE_LLM=1 npx vitest run lib/brain/motor-inverted/__tests__/gc-001-live
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadCatalog, resetCatalogCache } from '../catalog-loader';
import { generateSession } from '../plan-generator';
import type { Catalog, FocusObject, Profile } from '../types';

const RUN_LIVE = process.env.RUN_LIVE_LLM === '1';

// Cargar .env.local si RUN_LIVE — no queremos exigirlo en CI.
function loadDotEnvLocal(): void {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    for (const line of raw.split('\n')) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) {
        process.env[m[1]!] = m[2] ?? '';
      }
    }
  } catch {
    // sin .env.local → asumimos que el env ya está poblado
  }
}

const GIULIANA: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 5,
  maxPullupReps: 3,
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'hangboard', 'home', 'bands', 'weights', 'pullup_bar'],
  character: 'bill',
};

const RECONSTRUCTION: FocusObject = {
  phase: 'reconstruccion',
  primaryPriority: 'Tolerancia y técnica en muro',
  secondaryPriority: 'Dedos asistidos',
  avoid: ['Máximos', 'Borde mínimo', 'Lastre'],
  narrative:
    'Tu historial no define tu condición actual; reconstruimos desde donde estás.',
  maxRiskLevel: 'medium',
};

let catalog: Catalog;

beforeAll(() => {
  if (RUN_LIVE) loadDotEnvLocal();
  resetCatalogCache();
  catalog = loadCatalog();
});

describe.skipIf(!RUN_LIVE)('F2.3 · GC-001 LIVE con OpenAI', () => {
  it('genera plan válido, fail-closed verificado', async () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();

    const { session, meta } = await generateSession({
      catalog,
      profile: GIULIANA,
      focus: RECONSTRUCTION,
      options: {
        category: 'fuerza-dedos',
        nExercises: 4,
        sessionTheme: 'Sesión de reconstrucción · dedos asistidos + técnica hombros',
      },
    });

    // ----- Sanidad estructural -----
    expect(session.title.length).toBeGreaterThan(0);
    expect(session.rationale.length).toBeGreaterThan(20);
    expect(session.exercises).toHaveLength(4);

    // ----- Fail-closed · todos los IDs vienen del pool restringido -----
    for (const ex of session.exercises) {
      const inCatalog = catalog.exerciseById.get(ex.exerciseId);
      expect(inCatalog, `${ex.exerciseId} no en catálogo — fail-closed roto`).toBeDefined();
      expect(inCatalog!.status).toBe('active');
      expect(['low', 'low-medium', 'medium']).toContain(inCatalog!.riskLevel);
      expect(inCatalog!.category).toBe('fuerza-dedos');
    }

    // ----- Must-NOT-happen del GC-001 -----
    for (const ex of session.exercises) {
      expect(ex.name.toLowerCase()).not.toMatch(/max\s*hang/);
      expect(ex.name.toLowerCase()).not.toMatch(/full\s*crimp/);
      expect(ex.riskLevel).not.toBe('high');
      expect(ex.riskLevel).not.toBe('medium-high');
    }

    // ----- Contenido curado (no inventado por el LLM) -----
    for (const ex of session.exercises) {
      // execution viene del catálogo, siempre debería tener texto
      expect(ex.execution.length).toBeGreaterThan(10);
      // stop_signals crítico para ejercicios de riesgo medium
      if (ex.riskLevel === 'medium') {
        expect(ex.stopSignals.length).toBeGreaterThan(0);
      }
    }

    // ----- Log el plan para revisión editorial de Giuliana -----
    console.log('\n═══ PLAN GENERADO (GC-001) ═══');
    console.log(`Título: ${session.title}`);
    console.log(`Rationale: ${session.rationale}`);
    console.log(`Atleta: ${session.atleta.condicionActual}`);
    console.log(`\nEjercicios (${session.exercises.length}):`);
    for (const ex of session.exercises) {
      console.log(
        `  ${ex.exerciseId} · ${ex.name}` +
          ` · ${ex.sets} × ${ex.reps} · descanso ${ex.rest}` +
          ` · risk=${ex.riskLevel}`,
      );
      if (ex.llmNotes) console.log(`     Notas: ${ex.llmNotes}`);
    }
    console.log(
      `\nMeta: ${meta.eligibleCount} elegibles · ${meta.blockedCount} bloqueados` +
        ` · ${meta.tokensUsed ?? '?'} tokens · ${meta.latencyMs}ms`,
    );
    console.log('════════════════════════════\n');
  }, 60_000);
});

describe.skipIf(RUN_LIVE)('F2.3 · noop cuando RUN_LIVE_LLM no está activo', () => {
  it('skip · corre con RUN_LIVE_LLM=1', () => {
    expect(true).toBe(true);
  });
});
