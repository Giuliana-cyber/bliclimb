import { describe, expect, it } from 'vitest';
import { detectCycleSignal } from './cycle-signal-keywords';

describe('detectCycleSignal — dominio AUSENCIA', () => {
  it('"no me baja" dispara absence', () => {
    const r = detectCycleSignal('hace tiempo que no me baja');
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
  });

  it('"no me viene" dispara absence', () => {
    const r = detectCycleSignal('no me viene desde hace unas semanas');
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
  });

  it('"sin regla" dispara absence', () => {
    const r = detectCycleSignal('llevo dos ciclos sin regla');
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
  });

  it('"amenorrea" dispara absence directo', () => {
    const r = detectCycleSignal('me diagnosticaron amenorrea el año pasado');
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
  });

  it('"desapareció el ciclo" dispara absence', () => {
    const r = detectCycleSignal('desapareció el ciclo hace meses');
    expect(r.hit).toBe(true);
  });
});

describe('detectCycleSignal — dominio TRAINING LINK', () => {
  it('"desde que aumenté" NO dispara solo (regla anti-falso-positivo)', () => {
    const r = detectCycleSignal('desde que aumenté la carga estoy más cansada');
    expect(r.hit).toBe(false);
    expect(r.domains.trainingLink.length).toBeGreaterThan(0);
    expect(r.domains.absence).toEqual([]);
  });

  it('"desde que aumenté" + "no me baja" sí dispara (co-ocurrencia)', () => {
    const r = detectCycleSignal(
      'desde que aumenté el volumen no me baja hace 2 meses'
    );
    expect(r.hit).toBe(true);
    expect(r.domains.trainingLink.length).toBeGreaterThan(0);
    expect(r.domains.absence.length).toBeGreaterThan(0);
  });

  it('"con el aumento de carga" solo NO dispara', () => {
    const r = detectCycleSignal(
      'con el aumento de carga me falta energía en las sesiones'
    );
    expect(r.hit).toBe(false);
  });
});

describe('detectCycleSignal — dominio SEVERIDAD DOLOR', () => {
  it('"dolor severo" dispara severity', () => {
    const r = detectCycleSignal('tengo dolor severo en el dedo desde ayer');
    expect(r.hit).toBe(true);
    expect(r.domains.severity.length).toBeGreaterThan(0);
  });

  it('"dolor insoportable" dispara severity', () => {
    const r = detectCycleSignal('el dolor es insoportable');
    expect(r.hit).toBe(true);
    expect(r.domains.severity.length).toBeGreaterThan(0);
  });

  it('"no puedo moverme" dispara functionalImpact', () => {
    const r = detectCycleSignal('me duele tanto que no puedo moverme');
    expect(r.hit).toBe(true);
    expect(r.domains.functionalImpact.length).toBeGreaterThan(0);
  });

  it('"me deja tirada" dispara functionalImpact', () => {
    const r = detectCycleSignal('el dolor me deja tirada en cama');
    expect(r.hit).toBe(true);
    expect(r.domains.functionalImpact.length).toBeGreaterThan(0);
  });

  it('"ibuprofeno no me hace nada" dispara painkillerIneffective', () => {
    const r = detectCycleSignal('el ibuprofeno no me hace nada con este dolor');
    expect(r.hit).toBe(true);
    expect(r.domains.painkillerIneffective.length).toBeGreaterThan(0);
  });
});

describe('detectCycleSignal — MESES capturados', () => {
  it('"hace 3 meses" captura monthsElapsed=3', () => {
    const r = detectCycleSignal('no me baja hace 3 meses');
    expect(r.monthsElapsed).toBe(3);
  });

  it('"hace como 4 meses" captura 4', () => {
    const r = detectCycleSignal('no me viene hace como 4 meses');
    expect(r.monthsElapsed).toBe(4);
  });

  it('"hace casi 5 meses" captura 5', () => {
    const r = detectCycleSignal('sin regla hace casi 5 meses');
    expect(r.monthsElapsed).toBe(5);
  });

  it('"hace 1 mes" captura 1 (singular)', () => {
    const r = detectCycleSignal('no me viene hace 1 mes');
    expect(r.monthsElapsed).toBe(1);
  });

  it('sin mención de meses → monthsElapsed=null', () => {
    const r = detectCycleSignal('no me baja desde hace un rato');
    expect(r.monthsElapsed).toBeNull();
  });
});

describe('detectCycleSignal — MENCIONES NEUTRAS NO disparan', () => {
  it('"estoy en mis días" NO dispara', () => {
    const r = detectCycleSignal('estoy en mis días y no tengo energía');
    expect(r.hit).toBe(false);
  });

  it('"me vino la regla" NO dispara', () => {
    const r = detectCycleSignal('me vino la regla ayer, ¿qué hago hoy?');
    expect(r.hit).toBe(false);
  });

  it('"estoy ovulando" NO dispara', () => {
    const r = detectCycleSignal('estoy ovulando y me siento fuerte');
    expect(r.hit).toBe(false);
  });

  it('"en fase folicular" NO dispara', () => {
    const r = detectCycleSignal(
      'estoy en fase folicular, ¿aprovecho para hangboard?'
    );
    expect(r.hit).toBe(false);
  });

  it('"cólico leve" NO dispara (no está en severity)', () => {
    const r = detectCycleSignal('tengo un cólico leve pero puedo entrenar');
    expect(r.hit).toBe(false);
  });

  it('"me duele un poco" NO dispara', () => {
    const r = detectCycleSignal('me duele un poco el dedo');
    expect(r.hit).toBe(false);
  });
});

describe('detectCycleSignal — combinaciones realistas', () => {
  it('caso RED-S clásico: "hace 4 meses que no me baja desde que aumenté"', () => {
    const r = detectCycleSignal(
      'hace 4 meses que no me baja la menstruación, desde que aumenté el entrenamiento'
    );
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
    expect(r.domains.trainingLink.length).toBeGreaterThan(0);
    expect(r.monthsElapsed).toBe(4);
  });

  it('caso amenorrea simple: "no me baja hace 6 meses"', () => {
    const r = detectCycleSignal('no me baja hace 6 meses');
    expect(r.hit).toBe(true);
    expect(r.domains.absence.length).toBeGreaterThan(0);
    expect(r.domains.trainingLink.length).toBe(0);
    expect(r.monthsElapsed).toBe(6);
  });

  it('caso dolor severo: "dolor insoportable, no puedo moverme, ibuprofeno no me hace nada"', () => {
    const r = detectCycleSignal(
      'tengo un dolor insoportable, no puedo moverme, el ibuprofeno no me hace nada'
    );
    expect(r.hit).toBe(true);
    expect(r.domains.severity.length).toBeGreaterThan(0);
    expect(r.domains.functionalImpact.length).toBeGreaterThan(0);
    expect(r.domains.painkillerIneffective.length).toBeGreaterThan(0);
  });
});

describe('detectCycleSignal — defensivos', () => {
  it('mensaje vacío → hit=false', () => {
    expect(detectCycleSignal('').hit).toBe(false);
  });

  it('null/undefined → hit=false', () => {
    expect(detectCycleSignal(null as unknown as string).hit).toBe(false);
    expect(detectCycleSignal(undefined as unknown as string).hit).toBe(false);
  });

  it('texto sin nada relacionado → hit=false', () => {
    expect(
      detectCycleSignal('quiero mejorar mi hangboard esta semana').hit
    ).toBe(false);
  });
});
