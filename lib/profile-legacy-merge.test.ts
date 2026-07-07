// Bloque 4 audit-360 (Parte F · compat legacy):
// Perfiles guardados antes de este bloque tenían 3 textareas separadas
// (goalDescription + project + rockProjectDescription). Al leerlos los
// concatenamos en `goalDescription` — el motor recibe todo el texto ahí.
// El helper `mergeLegacyGoalTextareas` es idempotente: aplicarlo dos
// veces no duplica texto.

import { describe, expect, it } from 'vitest';
import { mergeLegacyGoalTextareas } from './profile';

describe('mergeLegacyGoalTextareas (compat legacy)', () => {
  it('sin campos legacy → devuelve goalDescription tal cual', () => {
    expect(mergeLegacyGoalTextareas('mi objetivo', '', '')).toBe('mi objetivo');
  });

  it('todo vacío → string vacío', () => {
    expect(mergeLegacyGoalTextareas('', '', '')).toBe('');
  });

  it('solo project → aparece en el resultado', () => {
    expect(mergeLegacyGoalTextareas('', 'La Catrina 5.12a', '')).toBe(
      'La Catrina 5.12a'
    );
  });

  it('solo rockProjectDescription → aparece en el resultado', () => {
    expect(
      mergeLegacyGoalTextareas('', '', 'Desplome largo, crux paso 5')
    ).toBe('Desplome largo, crux paso 5');
  });

  it('los 3 con contenido distinto → concatenados con doble newline', () => {
    const merged = mergeLegacyGoalTextareas(
      'Ganar fuerza en desplome',
      'La Catrina 5.12a',
      'Vía de 30m, crux compresión.'
    );
    expect(merged).toBe(
      'Ganar fuerza en desplome\n\nLa Catrina 5.12a\n\nVía de 30m, crux compresión.'
    );
  });

  it('project ya está literal dentro de goalDescription → no duplica', () => {
    // Caso donde el user ya había pegado el proyecto en la textarea principal.
    const merged = mergeLegacyGoalTextareas(
      'Ganar fuerza y encadenar La Catrina 5.12a',
      'La Catrina 5.12a',
      ''
    );
    expect(merged).toBe('Ganar fuerza y encadenar La Catrina 5.12a');
  });

  it('rockProjectDescription == project → no duplica', () => {
    const merged = mergeLegacyGoalTextareas('', 'Descripción X', 'Descripción X');
    expect(merged).toBe('Descripción X');
  });

  it('trim whitespace de los tres', () => {
    const merged = mergeLegacyGoalTextareas(
      '  goal  ',
      '  project  ',
      '  rock  '
    );
    expect(merged).toBe('goal\n\nproject\n\nrock');
  });

  it('idempotencia: aplicar dos veces no cambia el resultado', () => {
    const first = mergeLegacyGoalTextareas('A', 'B', 'C');
    const second = mergeLegacyGoalTextareas(first, 'B', 'C');
    expect(second).toBe(first);
  });
});
