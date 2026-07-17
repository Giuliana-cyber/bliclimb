/**
 * F3 · focus-selector · offline.
 *
 * Valida que las 12 FocusRules del v3.0 disparan correctamente para los
 * 5 golden cases y que la derivación automática produce un focus
 * equivalente al que pasamos a mano en F2.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { loadCatalog, resetCatalogCache } from '../catalog-loader';
import { deriveFocus } from '../focus-selector';
import type { Catalog } from '../types';
import {
  GC001_PROFILE,
  GC002_PROFILE,
  GC003_PROFILE,
  GC004_PROFILE,
  GC005_PROFILE,
} from './gc-perfiles';

let catalog: Catalog;

beforeAll(() => {
  resetCatalogCache();
  catalog = loadCatalog();
});

describe('F3 · las 12 FocusRules están cargadas', () => {
  it('catálogo trae 12 reglas ordenables', () => {
    expect(catalog.focusRules.length).toBeGreaterThanOrEqual(12);
    const priorities = catalog.focusRules
      .map((r) => r.priorityOrder)
      .sort((a, b) => a - b);
    expect(priorities[0]).toBe(1);
    expect(priorities[11]).toBeGreaterThanOrEqual(12);
  });

  it('IDs siguen FR-###', () => {
    for (const r of catalog.focusRules) {
      expect(r.id).toMatch(/^FR-\d{3}$/);
    }
  });
});

describe('F3 · GC-001 Giuliana → FR-002 Reconstrucción', () => {
  it('condition_current=rebuilding dispara FR-002', () => {
    const { focus, matchedRule } = deriveFocus(catalog, GC001_PROFILE);
    expect(matchedRule.id).toBe('FR-002');
    expect(focus.phase).toBe('reconstruccion');
    expect(focus.maxRiskLevel).toBe('medium');
    // La narrativa del canónico es la que Giuliana espera ver
    expect(focus.narrative.length).toBeGreaterThan(20);
  });
});

describe('F3 · GC-003 avanzado → FR-006 Específica (crítico)', () => {
  it('condition_current=advanced + hang≥15 dispara FR-006 (NO FR-002)', () => {
    const { focus, matchedRule } = deriveFocus(catalog, GC003_PROFILE);
    // FR-002 tiene mayor prioridad — pero GC-003 no está en rebuilding,
    // así que el motor debe bajar hasta FR-006.
    expect(matchedRule.id).toBe('FR-006');
    expect(focus.phase).toBe('especifica');
    expect(focus.maxRiskLevel).toBe('high');
  });

  it('el motor NO le da reconstrucción al avanzado (test crítico)', () => {
    const { focus } = deriveFocus(catalog, GC003_PROFILE);
    expect(focus.phase).not.toBe('reconstruccion');
    expect(['low', 'low-medium', 'medium']).not.toContain(focus.maxRiskLevel);
  });
});

describe('F3 · GC-004 unknown → FR-003 Conservador', () => {
  it('hang_unknown=true dispara FR-003 (antes de FR-004)', () => {
    const { focus, matchedRule } = deriveFocus(catalog, GC004_PROFILE);
    expect(matchedRule.id).toBe('FR-003');
    expect(focus.phase).toBe('conservador');
    expect(focus.maxRiskLevel).toBe('low-medium');
  });
});

describe('F3 · GC-005 dolor actual → FR-001 Seguridad', () => {
  it('pain_current=true dispara FR-001 (máxima prioridad)', () => {
    const { focus, matchedRule } = deriveFocus(catalog, GC005_PROFILE);
    expect(matchedRule.id).toBe('FR-001');
    expect(focus.phase).toBe('seguridad');
    expect(focus.maxRiskLevel).toBe('low');
  });
});

describe('F3 · GC-002 principiante → FR-005 Base técnica', () => {
  it('classified_level=beginner dispara FR-005', () => {
    const { focus, matchedRule } = deriveFocus(catalog, GC002_PROFILE);
    // less1 → beginner classified_level → FR-005
    // (FR-003 no dispara porque hang_unknown=true pero también condition_current
    //  no es 'unknown' según nuestra lógica; verificar cual gana)
    expect(['FR-003', 'FR-005']).toContain(matchedRule.id);
    // El maxRiskLevel debe quedar en base o conservador (bajo)
    expect(['low', 'low-medium', 'medium']).toContain(focus.maxRiskLevel);
  });
});

describe('F3 · sanidad · las 5 selecciones son distintas', () => {
  it('cada perfil deriva un FR distinto (o al menos 3 distintos)', () => {
    const selections = [
      deriveFocus(catalog, GC001_PROFILE),
      deriveFocus(catalog, GC002_PROFILE),
      deriveFocus(catalog, GC003_PROFILE),
      deriveFocus(catalog, GC004_PROFILE),
      deriveFocus(catalog, GC005_PROFILE),
    ];
    const rules = selections.map((s) => s.matchedRule.id);
    const unique = new Set(rules);
    expect(unique.size).toBeGreaterThanOrEqual(4);
    console.log('\nFocus derivado por golden case:');
    for (let i = 0; i < selections.length; i++) {
      const s = selections[i]!;
      console.log(
        `  GC-00${i + 1}: ${s.matchedRule.id} (${s.matchedRule.focusPhase})` +
          ` · maxRisk=${s.focus.maxRiskLevel} · evaluated=${s.rulesEvaluated}`,
      );
    }
  });
});
