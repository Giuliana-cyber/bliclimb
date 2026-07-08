// Guardia contra regresión del WEEK_PROMPT (audit-360 bug #2).
//
// El fix del bug #2 verbaliza las reglas §3.1/§3.2/§3.6/§14.2 al LLM
// desde la primera pasada — antes el motor solo veía la corrección
// post-hoc del middleware y las violaba sistemáticamente. Si alguien
// edita el prompt y saca uno de estos strings sin querer, el motor
// vuelve a fallar como antes.
//
// Testeamos leyendo el archivo directo con fs para no depender de
// exportar el prompt del route.ts (Next prohíbe exports arbitrarios ahí).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTE_SOURCE = readFileSync(
  join(__dirname, 'route.ts'),
  'utf-8'
);

describe('WEEK_PROMPT · reglas de safety inyectadas desde la primera pasada', () => {
  it('§3.6 · prohibición explícita de strength/power/hangboard en warmup y cooldown', () => {
    // El "NUNCA" en mayúsculas es clave: el LLM lo lee como restricción dura.
    expect(ROUTE_SOURCE).toContain(
      'NUNCA strength, power, power-endurance ni hangboard en warmup'
    );
    expect(ROUTE_SOURCE).toContain(
      'NUNCA strength, power, power-endurance ni hangboard en cooldown'
    );
    expect(ROUTE_SOURCE).toContain('§3.6');
  });

  it('§3.1 · orden intra-sesión monotónico no decreciente', () => {
    expect(ROUTE_SOURCE).toContain('MONOTÓNICA NO DECRECIENTE');
    // Los 6 niveles del orden en el mismo bloque.
    expect(ROUTE_SOURCE).toMatch(
      /1\.\s+skill[\s\S]+2\.\s+strength[\s\S]+3\.\s+power[\s\S]+4\.\s+power-endurance[\s\S]+5\.\s+aerobic-base[\s\S]+6\.\s+mobility/
    );
    expect(ROUTE_SOURCE).toContain('§3.1');
  });

  it('§3.2 · skills en la primera mitad del mainBlock', () => {
    expect(ROUTE_SOURCE).toContain('PRIMERA MITAD del mainBlock');
    expect(ROUTE_SOURCE).toContain("stimulusCategory='skill'");
    expect(ROUTE_SOURCE).toContain('§3.2');
  });

  it('§14.2 · extensores obligatorios con historial de codo o alta tracción', () => {
    // Rama epicondilitis (historial de codo obliga siempre).
    expect(ROUTE_SOURCE).toContain("'elbows' en injuries");
    expect(ROUTE_SOURCE).toContain(
      "AL MENOS 1 exercise con stimulusCategory='mobility'"
    );
    // Rama sin historial (umbral ≥3 sesiones de tracción).
    expect(ROUTE_SOURCE).toContain('≥3 sesiones');
    expect(ROUTE_SOURCE).toContain(
      '{strength, power, power-endurance, aerobic-base}'
    );
    expect(ROUTE_SOURCE).toContain('§14.2');
  });

  it('bloque completo de reglas está antes de "MÍNIMOS POR SESIÓN"', () => {
    // Sanity de orden: el bloque tiene que preceder a la sección mínima
    // para que el LLM lo tenga fresco al armar la estructura.
    const structIdx = ROUTE_SOURCE.indexOf('ESTRUCTURA OBLIGATORIA DE SESIÓN');
    const minsIdx = ROUTE_SOURCE.indexOf('MÍNIMOS POR SESIÓN');
    expect(structIdx).toBeGreaterThan(0);
    expect(minsIdx).toBeGreaterThan(structIdx);
  });

  it('MAX_RETRIES bajó de 3 a 2', () => {
    expect(ROUTE_SOURCE).toContain('const MAX_RETRIES = 2');
    // Guardia negativa: si alguien lo sube devuelta a 3, el test falla.
    expect(ROUTE_SOURCE).not.toContain('const MAX_RETRIES = 3');
  });

  it('circuit breaker · budget de tiempo antes de cada retry', () => {
    expect(ROUTE_SOURCE).toContain('MS_BUDGET_FOR_RETRY');
    expect(ROUTE_SOURCE).toContain('MAX_DURATION_MS');
    // Debe abortar con log específico para observabilidad.
    expect(ROUTE_SOURCE).toContain("kind: 'plan_retry_aborted_time_budget'");
  });
});
