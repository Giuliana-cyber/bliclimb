// Bloque 4 audit-360 (H-08 punto 4): gate final útil. Cuando falta algo,
// listamos qué pasos y qué campos concretos. Reproducimos exacto la lógica
// de missingByStep del componente para blindarla contra regresión.

import { describe, expect, it } from 'vitest';

type FormShape = {
  character: 'bill' | 'senda';
  climbingTime: string;
  disciplines: string[];
  level: string;
  setting: string;
  age: string;
  sex: string;
  injuries: string[];
  sleep: string;
  climbingDaysPerWeek: number;
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  equipment: string[];
  goals: string[];
  goalDescription: string;
  durationChoice: '' | '2' | '3' | '4' | 'starter';
};

function missingByStep(form: FormShape) {
  const missing: Array<{ step: number; title: string; fields: string[] }> = [];
  if (!form.character) {
    missing.push({ step: 1, title: 'Elige tu compañer@', fields: ['Compañer@'] });
  }
  const step2: string[] = [];
  if (!form.climbingTime) step2.push('Tiempo escalando');
  if (!form.disciplines.length) step2.push('Disciplinas');
  if (!form.level) step2.push('Nivel');
  if (!form.setting) step2.push('Dónde escalas');
  if (step2.length) missing.push({ step: 2, title: 'Tu escalada', fields: step2 });
  const step3: string[] = [];
  if (!form.age) step3.push('Rango de edad');
  if (!form.sex) step3.push('Sexo biológico');
  if (step3.length) missing.push({ step: 3, title: 'Sobre ti', fields: step3 });
  const step4: string[] = [];
  if (!form.injuries.length) step4.push('Lesiones');
  if (!form.sleep) step4.push('Sueño');
  if (step4.length) missing.push({ step: 4, title: 'Tu cuerpo', fields: step4 });
  const step5: string[] = [];
  if (form.climbingDaysPerWeek + form.trainingDaysPerWeek < 1) step5.push('Días');
  if (!form.availableDays.length) step5.push('Días disponibles');
  if (!form.sessionDuration) step5.push('Duración sesión');
  if (!form.equipment.length) step5.push('Equipo');
  if (step5.length) missing.push({ step: 5, title: 'Tu entrenamiento', fields: step5 });
  const step6: string[] = [];
  if (!form.goals.length && !form.goalDescription.trim()) step6.push('Objetivo');
  if (!form.durationChoice) step6.push('Duración del ciclo');
  if (step6.length) missing.push({ step: 6, title: 'Tu objetivo', fields: step6 });
  return missing;
}

function baseComplete(): FormShape {
  return {
    character: 'bill',
    climbingTime: '1to3',
    disciplines: ['sport'],
    level: 'intermediate',
    setting: 'indoor',
    age: '26-35',
    sex: 'na',
    injuries: ['none'],
    sleep: 'good',
    climbingDaysPerWeek: 2,
    trainingDaysPerWeek: 1,
    availableDays: ['monday', 'wednesday', 'friday'],
    sessionDuration: 90,
    equipment: ['gym'],
    goals: ['grade'],
    goalDescription: '',
    durationChoice: '4'
  };
}

describe('gate final útil (Bloque 4 audit-360)', () => {
  it('perfil completo → lista vacía', () => {
    expect(missingByStep(baseComplete())).toEqual([]);
  });

  it('falta solo la edad → un solo entry con "Rango de edad"', () => {
    const missing = missingByStep({ ...baseComplete(), age: '' });
    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({
      step: 3,
      title: 'Sobre ti',
      fields: ['Rango de edad']
    });
  });

  it('faltan varios campos del paso 3 → lista los dos por nombre', () => {
    const missing = missingByStep({ ...baseComplete(), age: '', sex: '' });
    expect(missing).toHaveLength(1);
    expect(missing[0].fields).toEqual(['Rango de edad', 'Sexo biológico']);
  });

  it('faltan pasos 3 y 5 → dos entries en orden', () => {
    const missing = missingByStep({
      ...baseComplete(),
      age: '',
      climbingDaysPerWeek: 0,
      trainingDaysPerWeek: 0
    });
    expect(missing.map((m) => m.step)).toEqual([3, 5]);
    expect(missing[1].fields).toContain('Días');
  });

  it('paso 5: días=0/0 dispara "Días"; total>=1 no lo lista', () => {
    const zero = missingByStep({
      ...baseComplete(),
      climbingDaysPerWeek: 0,
      trainingDaysPerWeek: 0
    });
    expect(zero.find((m) => m.step === 5)?.fields).toContain('Días');
    const one = missingByStep({
      ...baseComplete(),
      climbingDaysPerWeek: 1,
      trainingDaysPerWeek: 0
    });
    expect(one).toEqual([]);
  });

  it('paso 6: goalDescription con texto vale como objetivo cumplido', () => {
    const missing = missingByStep({
      ...baseComplete(),
      goals: [],
      goalDescription: '  Quiero un proyecto  '
    });
    // Ni "Objetivo" ni nada del paso 6 debe aparecer en missing.
    expect(missing.find((m) => m.step === 6)).toBeUndefined();
  });

  it('paso 6: goals vacío y goalDescription también → lista "Objetivo"', () => {
    const missing = missingByStep({
      ...baseComplete(),
      goals: [],
      goalDescription: ''
    });
    expect(missing.find((m) => m.step === 6)?.fields).toContain('Objetivo');
  });

  it('perfil vacío completo → 6 entries (todos los pasos con campos)', () => {
    const empty: FormShape = {
      character: 'bill',
      climbingTime: '',
      disciplines: [],
      level: '',
      setting: '',
      age: '',
      sex: '',
      injuries: [],
      sleep: '',
      climbingDaysPerWeek: 0,
      trainingDaysPerWeek: 0,
      availableDays: [],
      sessionDuration: 0,
      equipment: [],
      goals: [],
      goalDescription: '',
      durationChoice: ''
    };
    const missing = missingByStep(empty);
    // 2/3/4/5/6 (character viene con default 'bill', no dispara paso 1).
    expect(missing.map((m) => m.step)).toEqual([2, 3, 4, 5, 6]);
    // Paso 5 tiene 4 campos incompletos.
    expect(missing.find((m) => m.step === 5)?.fields).toEqual([
      'Días',
      'Días disponibles',
      'Duración sesión',
      'Equipo'
    ]);
  });
});
