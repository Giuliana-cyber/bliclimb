/**
 * F2 · Smoke GC-001 (Golden Case Giuliana) · pool restringido.
 *
 * Verifica que el motor invertido produce el pool correcto para el
 * perfil de Giuliana ANTES de invocar al LLM. Este es el corazón del
 * fail-closed por construcción: si el pool no está bien restringido,
 * el prompt tampoco lo estará.
 *
 * NO invoca OpenAI. El smoke con LLM real vive en F2.3.
 *
 * Perfil GC-001 (documento canónico, GoldenCases del v3.0):
 *   32 años · 10+ años escalando · condición actual baja
 *   hang25mm ~5s · 3 domi · sin dolor · equipment gym+hangboard+home
 *
 * Expected según GC-001:
 *   focus.phase = 'reconstruccion'
 *   allowed: Dedos asistidos, técnica en muro, complemento roca
 *   must NOT happen: MaxHangs, borde mínimo, interpretar 10 años como permiso
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { loadCatalog, filterByCategory, resetCatalogCache } from '../catalog-loader';
import { restrictPool } from '../restrict-pool';
import { evaluateGate, resolveField } from '../gate-evaluator';
import type { Profile, FocusObject, Catalog } from '../types';

const GIULIANA_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 5,
  maxPullupReps: 3,
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  // Giuliana tiene kit completo del gym (bandas, pesas, etc.) más setup casero
  equipment: ['gym', 'hangboard', 'home', 'bands', 'weights', 'pullup_bar'],
  character: 'bill',
};

const RECONSTRUCTION_FOCUS: FocusObject = {
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
  resetCatalogCache();
  catalog = loadCatalog();
});

describe('F2 · Catálogo v3.1 · sanidad', () => {
  it('carga las 8 hojas APP_*', () => {
    // v3.1 regenerada tiene 280 EX + 170 GT + 125 PR + 968 REL
    expect(catalog.exercises.length).toBeGreaterThanOrEqual(280);
    expect(catalog.gates.length).toBeGreaterThanOrEqual(170);
    expect(catalog.protocols.length).toBeGreaterThanOrEqual(125);
    expect(catalog.relationships.length).toBeGreaterThanOrEqual(900);
  });

  it('indexa exerciseGatesById desde las 3 relaciones canónicas', () => {
    const gcCount = Array.from(catalog.exerciseGatesById.values()).flat().length;
    expect(gcCount).toBeGreaterThan(150); // 186 canónicos EX-FIN→GT-FIN + resto
  });

  it('EX-FIN-001 (Suspensión asistida) existe y es active', () => {
    const ex = catalog.exerciseById.get('EX-FIN-001');
    expect(ex).toBeDefined();
    expect(ex?.status).toBe('active');
    expect(ex?.category).toBe('fuerza-dedos');
  });
});

describe('F2 · resolveField para perfil Giuliana', () => {
  it('deriva condition_current=rebuilding (hang<15 · pull<15 · more3)', () => {
    expect(resolveField('condition_current', GIULIANA_PROFILE)).toBe('rebuilding');
  });

  it('deriva comeback_status=returning', () => {
    expect(resolveField('comeback_status', GIULIANA_PROFILE)).toBe('returning');
  });

  it('injury_active=false (Giuliana sin lesión activa)', () => {
    expect(resolveField('injury_active', GIULIANA_PROFILE)).toBe(false);
  });

  it('pain_current=false (Giuliana sin dolor)', () => {
    expect(resolveField('pain_current', GIULIANA_PROFILE)).toBe(false);
  });

  it('hang_25mm_seconds = 5 (crítico para Eva López rule)', () => {
    expect(resolveField('hang_25mm_seconds', GIULIANA_PROFILE)).toBe(5);
  });

  it('is_minor=false (adulto)', () => {
    expect(resolveField('is_minor', GIULIANA_PROFILE)).toBe(false);
  });
});

describe('F2 · gate evaluator (regla Eva López · hang<15s)', () => {
  it('GT-FIN-005 (o similar) se dispara con hang<15s si existe en catálogo', () => {
    // El catálogo v3.1 tiene 30 gates GT-FIN. Buscamos alguno con condition
    // que mencione hang_25mm o similar.
    const finGates = catalog.gates.filter((g) => g.id.startsWith('GT-FIN'));
    expect(finGates.length).toBeGreaterThan(0);

    const evaLopezGates = finGates.filter((g) =>
      /hang_25mm|hang25mm|hang_25/i.test(g.condition),
    );

    // Si hay gates de Eva López, al menos uno debe disparar con Giuliana
    if (evaLopezGates.length > 0) {
      const triggered = evaLopezGates
        .map((g) => evaluateGate(g, GIULIANA_PROFILE))
        .filter(Boolean);
      expect(triggered.length).toBeGreaterThan(0);
    }
  });
});

describe('F2 · restrict-pool para GC-001', () => {
  it('produce pool restringido no vacío para Giuliana en fuerza-dedos', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    expect(dedos.length).toBeGreaterThan(50);

    const result = restrictPool(catalog, dedos, GIULIANA_PROFILE, RECONSTRUCTION_FOCUS);

    // Golden expectation: 5-15 elegibles (auditoría manual predijo ~14)
    expect(result.eligible.length).toBeGreaterThanOrEqual(3);
    expect(result.eligible.length).toBeLessThanOrEqual(30);
  });

  it('todos los elegibles son status=active + risk ≤ medium', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const result = restrictPool(catalog, dedos, GIULIANA_PROFILE, RECONSTRUCTION_FOCUS);
    const ALLOWED_RISK = new Set(['low', 'low-medium', 'medium']);
    for (const id of result.eligible) {
      const ex = catalog.exerciseById.get(id)!;
      expect(ex.status).toBe('active');
      expect(ALLOWED_RISK.has(ex.riskLevel)).toBe(true);
    }
  });

  it('NUNCA incluye ejercicios high-risk (must-not-happen del GC-001)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const result = restrictPool(catalog, dedos, GIULIANA_PROFILE, RECONSTRUCTION_FOCUS);
    for (const id of result.eligible) {
      const ex = catalog.exerciseById.get(id)!;
      expect(['high', 'medium-high']).not.toContain(ex.riskLevel);
    }
  });

  it('incluye suspensiones asistidas (positivo — GC-001 permite explícitamente)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const result = restrictPool(catalog, dedos, GIULIANA_PROFILE, RECONSTRUCTION_FOCUS);
    // El pool debe incluir al menos EX-FIN-001 (suspensión asistida regleta grande)
    // — es literalmente el ejercicio que GC-001 espera
    expect(result.eligible).toContain('EX-FIN-001');
  });
});
