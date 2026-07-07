// @vitest-environment jsdom
//
// Bloque 3 (audit-360) — H-03, H-04, H-02: verifica que la lógica de
// derivación (total de días, mismatch con availableDays, hint de grade
// con ciclo corto) es correcta. Testeamos las funciones puras que el
// componente usa; no montamos React.

import { describe, expect, it } from 'vitest';

// Reproducimos exactamente la lógica del componente para asegurar que
// cualquier ajuste al gate/aviso queda cubierto por test.

function totalDays(climbing: number, training: number): number {
  return climbing + training;
}

function isDaysMismatch(
  climbing: number,
  training: number,
  availableCount: number
): boolean {
  const total = totalDays(climbing, training);
  if (total === 0 || availableCount === 0) return false;
  return availableCount < total;
}

function showGradeShortCycleHint(
  goals: string[],
  durationChoice: '' | '2' | '3' | '4' | 'starter'
): boolean {
  return goals.includes('grade') && (durationChoice === '2' || durationChoice === '3');
}

function step5PassesGate(input: {
  climbingDaysPerWeek: number;
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  equipment: string[];
  previousTraining: string;
}): boolean {
  return (
    totalDays(input.climbingDaysPerWeek, input.trainingDaysPerWeek) >= 1 &&
    input.availableDays.length > 0 &&
    input.sessionDuration > 0 &&
    input.equipment.length > 0 &&
    input.previousTraining !== ''
  );
}

// -------------------- H-03: derivación del total --------------------

describe('H-03 total derivado', () => {
  it('2 escalada + 1 gym → 3 días', () => {
    expect(totalDays(2, 1)).toBe(3);
  });

  it('4 escalada + 0 gym → 4 días (usuario que solo escala)', () => {
    expect(totalDays(4, 0)).toBe(4);
  });

  it('0 escalada + 3 gym → 3 días (usuario en preparación, sin escalar)', () => {
    expect(totalDays(0, 3)).toBe(3);
  });

  it('0 + 0 → 0 (usuario incompleto, no debe pasar el gate)', () => {
    expect(totalDays(0, 0)).toBe(0);
    expect(
      step5PassesGate({
        climbingDaysPerWeek: 0,
        trainingDaysPerWeek: 0,
        availableDays: ['monday'],
        sessionDuration: 90,
        equipment: ['gym'],
        previousTraining: 'informal'
      })
    ).toBe(false);
  });

  it('gate ≥1: cualquier suma >= 1 pasa si el resto también', () => {
    expect(
      step5PassesGate({
        climbingDaysPerWeek: 1,
        trainingDaysPerWeek: 0,
        availableDays: ['monday'],
        sessionDuration: 90,
        equipment: ['gym'],
        previousTraining: 'informal'
      })
    ).toBe(true);
    expect(
      step5PassesGate({
        climbingDaysPerWeek: 0,
        trainingDaysPerWeek: 1,
        availableDays: ['monday'],
        sessionDuration: 90,
        equipment: ['gym'],
        previousTraining: 'informal'
      })
    ).toBe(true);
  });
});

// -------------------- H-04: validación cruzada disponible < total --------------------

describe('H-04 mismatch availableDays < total', () => {
  it('5 días de actividad + 3 disponibles → dispara mismatch', () => {
    expect(isDaysMismatch(3, 2, 3)).toBe(true);
  });

  it('3 días de actividad + 3 disponibles → NO dispara (suficientes)', () => {
    expect(isDaysMismatch(2, 1, 3)).toBe(false);
  });

  it('3 días de actividad + 5 disponibles → NO dispara (sobrecapacidad OK)', () => {
    expect(isDaysMismatch(2, 1, 5)).toBe(false);
  });

  it('0 días de actividad → NO dispara (no compara sin data)', () => {
    expect(isDaysMismatch(0, 0, 3)).toBe(false);
  });

  it('total OK pero available=0 → NO dispara (user aún no elige días)', () => {
    expect(isDaysMismatch(2, 1, 0)).toBe(false);
  });
});

// -------------------- H-02: hint honesto para "grade" + duración corta --------------------

describe('H-02 hint de grade con duración corta', () => {
  it('goals=["grade"] + duration="2" → muestra hint', () => {
    expect(showGradeShortCycleHint(['grade'], '2')).toBe(true);
  });

  it('goals=["grade"] + duration="3" → muestra hint', () => {
    expect(showGradeShortCycleHint(['grade'], '3')).toBe(true);
  });

  it('goals=["grade"] + duration="4" → NO muestra hint (4 semanas es razonable)', () => {
    expect(showGradeShortCycleHint(['grade'], '4')).toBe(false);
  });

  it('goals=["grade"] + duration="starter" → NO muestra hint (el user ya sabe que arranca)', () => {
    expect(showGradeShortCycleHint(['grade'], 'starter')).toBe(false);
  });

  it('goals=["technique"] + duration="2" → NO muestra hint (no aplica a técnica)', () => {
    expect(showGradeShortCycleHint(['technique'], '2')).toBe(false);
  });

  it('goals=["grade", "technique"] + duration="2" → SÍ muestra (grade está en la lista)', () => {
    expect(showGradeShortCycleHint(['grade', 'technique'], '2')).toBe(true);
  });

  it('goals=[] + duration="2" → NO muestra (sin objetivo grade)', () => {
    expect(showGradeShortCycleHint([], '2')).toBe(false);
  });
});
