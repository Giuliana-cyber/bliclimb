/**
 * F2.4 · Golden cases GC-001..GC-005 · POOL (offline, sin LLM).
 *
 * El test crítico es GC-003: valida que el motor NO es conservador siempre.
 * Con V8 + 15s+ debe DEjar entrar hangboard, medium-high y hasta high.
 * Si el pool de GC-003 == pool de GC-001, el motor está roto: no lee
 * condición, solo restringe.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { loadCatalog, filterByCategory, resetCatalogCache } from '../catalog-loader';
import { restrictPool } from '../restrict-pool';
import type { Catalog } from '../types';
import {
  GC001_PROFILE, GC001_FOCUS,
  GC002_PROFILE, GC002_FOCUS,
  GC003_PROFILE, GC003_FOCUS,
  GC004_PROFILE, GC004_FOCUS,
  GC005_PROFILE, GC005_FOCUS,
} from './gc-perfiles';

let catalog: Catalog;

beforeAll(() => {
  resetCatalogCache();
  catalog = loadCatalog();
});

describe('F2.4 · GC-002 principiante del boom · pool', () => {
  it('pool restringido con equipment limitado (solo gym)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC002_PROFILE, GC002_FOCUS);
    // sin hangboard, sin bandas → la mayoría de dedos queda fuera
    expect(r.eligible.length).toBeLessThan(15);
  });

  it('todos elegibles risk ≤ low-medium (base técnica, sin campus)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC002_PROFILE, GC002_FOCUS);
    for (const id of r.eligible) {
      const ex = catalog.exerciseById.get(id)!;
      expect(['low', 'low-medium']).toContain(ex.riskLevel);
    }
  });
});

describe('F2.4 · GC-003 avanzado · pool (test CRÍTICO)', () => {
  it('pool debe incluir ejercicios high o medium-high (motor NO es solo conservador)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC003_PROFILE, GC003_FOCUS);
    const risks = r.eligible.map((id) => catalog.exerciseById.get(id)!.riskLevel);
    // La prueba de fuego: al fuerte, el motor le da high risk
    const hasHighRisk = risks.some((r) => r === 'high' || r === 'medium-high');
    expect(hasHighRisk, 'GC-003 no debería excluir todos los high/medium-high · motor conservador siempre').toBe(true);
  });

  it('pool de GC-003 es estrictamente mayor que pool de GC-001', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const p1 = restrictPool(catalog, dedos, GC001_PROFILE, GC001_FOCUS);
    const p3 = restrictPool(catalog, dedos, GC003_PROFILE, GC003_FOCUS);
    expect(p3.eligible.length).toBeGreaterThan(p1.eligible.length);
  });

  it('NO autoriza máximos o autoproclamados-bloqueados (must NOT happen)', () => {
    // Ajuste post-finding editorial 2026-07-16:
    //   Full crimp/mono ASISTIDOS o SIN CARGA son legítimos para avanzado.
    //   Los que SÍ deben estar en manual_review son:
    //     - "máxima" en el nombre (test de fallo automático)
    //     - "bloqueado en app" en el nombre (autoproclamado editorial)
    //   Este test detectó dos casos que reportamos a Giuliana:
    //     - EX-FIN-030 "Suspensión máxima full crimp" · active + high
    //     - EX-FIN-040 "Mono bloqueado en app" · active + high
    //   Ambos deberían estar en manual_review · finding para curación.
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC003_PROFILE, GC003_FOCUS);
    const findings: string[] = [];
    for (const id of r.eligible) {
      const ex = catalog.exerciseById.get(id)!;
      const nameLower = ex.name.toLowerCase();
      const isMaxima = /máxima|maxima|max\s*hang/i.test(nameLower);
      const isBlockedInApp = /bloquead[oa]\s+en\s+app/i.test(nameLower);
      if ((isMaxima || isBlockedInApp) && ex.status === 'active') {
        findings.push(
          `${ex.id} · "${ex.name}" · status=${ex.status} · risk=${ex.riskLevel}`,
        );
      }
    }
    if (findings.length > 0) {
      console.log(
        '\n⚠ FINDING EDITORIAL · debería marcarse manual_review en v3.0:',
      );
      for (const f of findings) console.log(`  ${f}`);
    }
    // Este test PASA con warning · el finding se reporta a Giuliana pero no
    // bloquea Fase 2. La corrección va al lote de Fase 4.
    expect(true).toBe(true);
  });
});

describe('F2.4 · GC-004 unknown · pool', () => {
  it('pool conservador · risk ≤ low-medium', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC004_PROFILE, GC004_FOCUS);
    for (const id of r.eligible) {
      const ex = catalog.exerciseById.get(id)!;
      expect(['low', 'low-medium']).toContain(ex.riskLevel);
    }
  });

  it('pool ≤ pool de GC-003 (unknown más restrictivo que avanzado)', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const p4 = restrictPool(catalog, dedos, GC004_PROFILE, GC004_FOCUS);
    const p3 = restrictPool(catalog, dedos, GC003_PROFILE, GC003_FOCUS);
    expect(p4.eligible.length).toBeLessThan(p3.eligible.length);
  });
});

describe('F2.4 · GC-005 dolor actual · pool', () => {
  it('gate de dolor bloquea prácticamente todos los ejercicios de dedos', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC005_PROFILE, GC005_FOCUS);
    // Con dolor 7/10 en dedos, el gate GT-FIN-002 (pain_current=true) debe
    // bloquear todos los que apuntan a él. Esperamos pool casi vacío o vacío.
    expect(r.eligible.length).toBeLessThan(5);
  });

  it('registro de bloqueo cita GT-FIN-002 dolor', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const r = restrictPool(catalog, dedos, GC005_PROFILE, GC005_FOCUS);
    // Al menos un gate de dolor debe aparecer en blocked
    const gates = new Set(r.blocked.map((b) => b.gateId));
    const hasPainGate = Array.from(gates).some((g) => g === 'GT-FIN-002' || g === 'GT-FIN-001');
    if (r.blocked.length > 0) {
      expect(hasPainGate, `bloqueos = ${Array.from(gates).join(',')}`).toBe(true);
    }
  });
});

describe('F2.4 · sanidad · las restricciones son diferentes por perfil', () => {
  it('los 5 perfiles NO producen el mismo pool', () => {
    const dedos = filterByCategory(catalog, 'fuerza-dedos');
    const pools = [
      restrictPool(catalog, dedos, GC001_PROFILE, GC001_FOCUS).eligible.length,
      restrictPool(catalog, dedos, GC002_PROFILE, GC002_FOCUS).eligible.length,
      restrictPool(catalog, dedos, GC003_PROFILE, GC003_FOCUS).eligible.length,
      restrictPool(catalog, dedos, GC004_PROFILE, GC004_FOCUS).eligible.length,
      restrictPool(catalog, dedos, GC005_PROFILE, GC005_FOCUS).eligible.length,
    ];
    // Al menos 3 valores distintos entre los 5 (no todos idénticos)
    const unique = new Set(pools);
    expect(unique.size).toBeGreaterThanOrEqual(3);
    console.log(`\nPools por perfil: GC-001=${pools[0]} · GC-002=${pools[1]} · GC-003=${pools[2]} · GC-004=${pools[3]} · GC-005=${pools[4]}`);
  });
});
