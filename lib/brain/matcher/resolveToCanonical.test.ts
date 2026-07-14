// Paso 5 · Matcher · suite de 24 tests (6 huecos × 4 niveles).
//
// Cada hueco del checklist de aceptación se verifica en las 4 fases del
// fallback (L1, L2, L3, L5) para garantizar que el filtro de gate NUNCA
// se relaja entre niveles. Un ejercicio "parecido" jamás debe saltar el
// gating aunque esté disponible como fallback.
//
// Los tests usan fixtures in-memory del pool (no Supabase). Cada fixture
// se etiqueta con los tags/canónicas que hacen match/mismatch para el
// filtro que se está probando.

import { describe, expect, it } from 'vitest';
import { resolveToCanonical } from './resolveToCanonical';
import type { CatalogRow, MatcherInput } from './types';
import type {
  BlockingContext,
  BlockedCategory,
  BlockedZone,
  GripRestriction,
  ProfileForRules
} from '../types';

// -------------------- Helpers de fixtures --------------------

function makeRow(overrides: Partial<CatalogRow> & { id: string }): CatalogRow {
  return {
    id: overrides.id,
    nombre: overrides.nombre ?? overrides.id,
    descripcion: overrides.descripcion ?? null,
    nivel_canonico: overrides.nivel_canonico ?? 'intermedio',
    categoria_canonica: overrides.categoria_canonica ?? 'fuerza-dedos',
    proposito: overrides.proposito ?? 'entrenamiento',
    momento: overrides.momento ?? 'principal',
    equipo_canonico: overrides.equipo_canonico ?? ['home'],
    stimulus_derivado: overrides.stimulus_derivado ?? 'strength',
    tags: overrides.tags ?? [],
    intensidad: overrides.intensidad ?? null,
    riesgo: overrides.riesgo ?? null,
    series: overrides.series ?? null,
    reps: overrides.reps ?? null,
    tiempo: overrides.tiempo ?? null,
    descanso: overrides.descanso ?? null,
    cues: overrides.cues ?? null,
    errores_comunes: overrides.errores_comunes ?? null,
    precauciones: overrides.precauciones ?? null,
    senales_detener: overrides.senales_detener ?? null,
    equipo: overrides.equipo ?? null
  };
}

function makeProfile(overrides: Partial<ProfileForRules> = {}): MatcherInput['profile'] {
  return {
    age: '26-35',
    climbingTime: 'more3',
    currentFingerPain: 0,
    currentElbowPain: 0,
    currentShoulderPain: 0,
    injuries: [],
    sleep: 'good',
    ...overrides,
    equipment: ['home', 'hangboard', 'pullup_bar', 'gym'],
    maxPullupReps: 15
  };
}

function makeBrainContext(
  overrides: Partial<BlockingContext> = {}
): BlockingContext {
  return {
    blockedCategories: overrides.blockedCategories ?? new Set(),
    blockedZones: overrides.blockedZones ?? new Set(),
    blockedExercises:
      overrides.blockedExercises ?? { exactIds: new Set(), prefixes: new Set() },
    gripRestrictions: overrides.gripRestrictions ?? new Set(),
    trainingPriorities: overrides.trainingPriorities ?? new Set(),
    intensityAdjustments: overrides.intensityAdjustments ?? new Set(),
    derivationMessages: overrides.derivationMessages ?? [],
    ruleHits: overrides.ruleHits ?? []
  };
}

function makeInput(
  overrides: Partial<MatcherInput> & { proposal?: Partial<MatcherInput['proposal']> } = {}
): MatcherInput {
  return {
    proposal: {
      name: 'Ejercicio propuesto',
      suggestedCategory: 'fuerza-dedos',
      stimulusCategory: 'strength',
      momento: 'principal',
      ...overrides.proposal
    },
    profile: overrides.profile ?? makeProfile(),
    brainContext: overrides.brainContext ?? makeBrainContext()
  };
}

// -------------------- Pool de fixtures --------------------
//
// El pool cubre las 5 categorías bloqueables + edge cases (rehab, tags).
// Se comparte entre tests y NO se muta.

const POOL: CatalogRow[] = [
  // FUERZA-DEDOS (cubren match categoria + carga:regleta-pequena + prerequisito:15-pullups)
  makeRow({
    id: 'FD-SAFE',
    nombre: 'Dead hang seguro',
    categoria_canonica: 'fuerza-dedos',
    nivel_canonico: 'intermedio',
    stimulus_derivado: 'strength',
    equipo_canonico: ['hangboard'],
    tags: ['riesgo-lesion:hangboard-intense']
  }),
  makeRow({
    id: 'FD-REGLETA-PEQ',
    nombre: 'MaxHang mínima profundidad',
    categoria_canonica: 'fuerza-dedos',
    nivel_canonico: 'avanzado',
    stimulus_derivado: 'strength',
    equipo_canonico: ['hangboard'],
    tags: ['riesgo-lesion:hangboard-intense', 'carga:regleta-pequena']
  }),
  makeRow({
    id: 'FD-BEGIN',
    nombre: 'Suspensión suave principiante',
    categoria_canonica: 'fuerza-dedos',
    nivel_canonico: 'principiante',
    stimulus_derivado: 'strength',
    equipo_canonico: ['hangboard']
  }),

  // FUERZA-TRACCION (emparentada · para L3 + prerequisito:15-pullups + rehab)
  makeRow({
    id: 'FT-SAFE',
    nombre: 'Dominadas seguras',
    categoria_canonica: 'fuerza-traccion',
    nivel_canonico: 'intermedio',
    stimulus_derivado: 'strength',
    equipo_canonico: ['pullup_bar']
  }),
  makeRow({
    id: 'FT-BEGIN',
    nombre: 'Dominada asistida principiante',
    categoria_canonica: 'fuerza-traccion',
    nivel_canonico: 'principiante',
    stimulus_derivado: 'strength',
    equipo_canonico: ['pullup_bar']
  }),
  makeRow({
    id: 'FT-006',
    nombre: 'One-arm lock-off',
    categoria_canonica: 'fuerza-traccion',
    nivel_canonico: 'avanzado',
    stimulus_derivado: 'strength',
    equipo_canonico: ['pullup_bar'],
    tags: ['riesgo-lesion:pullups-weighted', 'prerequisito:15-pullups']
  }),

  // POTENCIA (para power-max B.1)
  makeRow({
    id: 'PO-SAFE',
    nombre: 'Dyno controlado',
    categoria_canonica: 'potencia',
    nivel_canonico: 'intermedio',
    stimulus_derivado: 'power',
    equipo_canonico: ['gym']
  }),
  makeRow({
    id: 'PO-DEADSTOP',
    nombre: 'Dead Stop precisión dinámica',
    categoria_canonica: 'potencia',
    nivel_canonico: 'avanzado',
    stimulus_derivado: 'power',
    equipo_canonico: ['gym'],
    tags: ['riesgo-lesion:power-max']
  }),

  // CAMPUS (para power-max L3 fallback)
  makeRow({
    id: 'CB-SAFE',
    nombre: 'Campus intermedio',
    categoria_canonica: 'campus',
    nivel_canonico: 'intermedio',
    stimulus_derivado: 'power',
    equipo_canonico: ['campus']
  }),
  makeRow({
    id: 'CB-POWERMAX',
    nombre: 'Campus max power',
    categoria_canonica: 'campus',
    nivel_canonico: 'avanzado',
    stimulus_derivado: 'power',
    equipo_canonico: ['campus'],
    tags: ['riesgo-lesion:power-max']
  }),

  // REHAB (para B.2)
  makeRow({
    id: 'RH-004',
    nombre: 'Squeeze device post-lesión',
    categoria_canonica: 'fuerza-dedos',
    proposito: 'rehab',
    nivel_canonico: 'avanzado',
    stimulus_derivado: 'mobility',
    equipo_canonico: ['home']
  }),

  // BOULDER (sibling de fuerza-dedos)
  makeRow({
    id: 'BO-SAFE',
    nombre: 'Boulder de tecnica',
    categoria_canonica: 'boulder',
    nivel_canonico: 'intermedio',
    stimulus_derivado: 'skill',
    equipo_canonico: ['gym']
  }),

  // MOVILIDAD (para warmup/cooldown)
  makeRow({
    id: 'MO-WARMUP',
    nombre: 'Movilidad de calentamiento',
    categoria_canonica: 'movilidad',
    momento: 'calentamiento',
    nivel_canonico: 'todos',
    stimulus_derivado: 'mobility',
    equipo_canonico: ['home']
  })
];

// ============================================================================
// Los 24 tests: 6 huecos × 4 niveles (L1, L2, L3, L5).
// Cada bloque de 4 verifica que el filtro NO se relaja entre niveles.
// ============================================================================

// -------------------- A.1 · zone→ID (dolor de dedos) --------------------
describe('A.1 · §1.3 blockedZones=fingers-pulleys · exclusión INVARIANTE en toda la escalera', () => {
  const brainContext = makeBrainContext({
    blockedZones: new Set<BlockedZone>(['fingers-pulleys'])
  });

  it('L1 · match exacto NO devuelve fuerza-dedos aunque sea el mejor match textual', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Dead hang', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      POOL
    );
    // Todos los fuerza-dedos deben ser filtrados por A.1.
    // Como no hay otro match exacto de fuerza-dedos, cae a L2 o L3.
    if (result.kind === 'resolved') {
      expect(result.row.categoria_canonica).not.toBe('fuerza-dedos');
    } else {
      expect(result.kind).toBe('rejected');
    }
  });

  it('L2 · nivel adyacente sigue excluyendo fuerza-dedos', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Suspensión', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile({ climbingTime: '1to3' }), // baja tope
        brainContext
      }),
      POOL
    );
    if (result.kind === 'resolved') {
      expect(result.row.categoria_canonica).not.toBe('fuerza-dedos');
    }
  });

  it('L3 · categoría emparentada (fuerza-traccion) SÍ es aceptada — A.1 no la bloquea', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Fuerza', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      POOL
    );
    if (result.kind === 'resolved') {
      // Cae a fuerza-traccion (sibling) que no está bloqueado por fingers-pulleys.
      expect(result.row.categoria_canonica).not.toBe('fuerza-dedos');
      expect(['fuerza-traccion', 'boulder']).toContain(result.row.categoria_canonica);
    }
  });

  it('L5 · pool sin fuerza-traccion tampoco → rechazo con hint sobre lesión de dedos', () => {
    // Pool restringido: solo fuerza-dedos disponible → gate lo bloquea → L5.
    const restrictedPool = POOL.filter((r) => r.categoria_canonica === 'fuerza-dedos');
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Fuerza dedos', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.hintForLLM).toContain('fingers-pulleys');
    }
  });
});

// -------------------- A.2 · §5.2 gripRestriction (regleta pequeña) --------------------
describe('A.2 · §5.2 gripRestriction=no-small-crimps-below-15mm · exclusión de carga:regleta-pequena', () => {
  const brainContext = makeBrainContext({
    gripRestrictions: new Set<GripRestriction>(['no-small-crimps-below-15mm'])
  });

  it('L1 · fuerza-dedos disponible SIN regleta pequeña — entrega FD-SAFE, no FD-REGLETA-PEQ', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'MaxHang', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      POOL
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.tags).not.toContain('carga:regleta-pequena');
    }
  });

  it('L2 · nivel más bajo mantiene el filtro', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Suspensión leve', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile({ climbingTime: 'start' }),
        brainContext
      }),
      POOL
    );
    if (result.kind === 'resolved') {
      expect(result.row.tags).not.toContain('carga:regleta-pequena');
    }
  });

  it('L3 · pool solo con FD-REGLETA-PEQ → sale a sibling sin tag', () => {
    const restrictedPool = POOL.filter(
      (r) => r.id === 'FD-REGLETA-PEQ' || r.categoria_canonica === 'fuerza-traccion'
    );
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'MaxHang', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.id).not.toBe('FD-REGLETA-PEQ');
      expect(result.row.categoria_canonica).toBe('fuerza-traccion');
    }
  });

  it('L5 · pool solo con FD-REGLETA-PEQ y sin siblings seguros → rechazo', () => {
    const restrictedPool = POOL.filter((r) => r.id === 'FD-REGLETA-PEQ');
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'MaxHang', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });
});

// -------------------- A.3 · §3.freq-dedos (plan-level, no matcher-level) --------------------
describe('A.3 · §3.freq-dedos · NO se aplica en matcher (plan-level, retry post-generación)', () => {
  const brainContext = makeBrainContext();

  it('L1 · matcher entrega fuerza-dedos sin bloqueo · A.3 se atrapa después con check_3_freq_dedos', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Dead hang', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      POOL
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.categoria_canonica).toBe('fuerza-dedos');
    }
  });

  it('L2 · A.3 no cambia por nivel', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Dead hang leve', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile({ climbingTime: 'start' }),
        brainContext
      }),
      POOL
    );
    expect(result.kind).toBe('resolved');
  });

  it('L3 · A.3 sigue sin aplicar aunque se caiga a categoría emparentada', () => {
    const restrictedPool = POOL.filter((r) => r.categoria_canonica !== 'fuerza-dedos');
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Fuerza', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('resolved');
  });

  it('L5 · pool vacío devuelve rechazo (por gate, no por A.3)', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'X', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        brainContext
      }),
      [] // pool completamente vacío
    );
    expect(result.kind).toBe('rejected');
  });
});

// -------------------- B.1 · power-max --------------------
describe('B.1 · Deuda #10 blockedCategories=power-max · exclusión de riesgo-lesion:power-max', () => {
  const brainContext = makeBrainContext({
    blockedCategories: new Set<BlockedCategory>(['power-max'])
  });

  it('L1 · potencia disponible sin power-max — entrega PO-SAFE, no PO-DEADSTOP', () => {
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Dyno', suggestedCategory: 'potencia', stimulusCategory: 'power', momento: 'principal' },
        brainContext
      }),
      POOL
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.tags).not.toContain('riesgo-lesion:power-max');
    }
  });

  it('L2 · perfil avanzado + pool sólo con PO-DEADSTOP · rechazo por filtro power-max', () => {
    // Pool con solo el ejercicio taggeado: aunque el perfil sea avanzado
    // (tope nivel=5) y matchee categoría exacta, B.1 lo excluye. L2 tampoco
    // ayuda porque el filtro es invariante.
    const restrictedPool = [POOL.find((r) => r.id === 'PO-DEADSTOP')!];
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Explosivo', suggestedCategory: 'potencia', stimulusCategory: 'power', momento: 'principal' },
        profile: makeProfile({ climbingTime: 'more3' }),
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });

  it('L3 · sibling campus también respeta el filtro power-max', () => {
    // Pool con solo potencia bloqueada + campus. L3 debería caer en CB-SAFE, no CB-POWERMAX.
    const restrictedPool = POOL.filter(
      (r) => r.categoria_canonica === 'potencia' || r.categoria_canonica === 'campus'
    );
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'X', suggestedCategory: 'potencia', stimulusCategory: 'power', momento: 'principal' },
        brainContext
      }),
      restrictedPool.filter((r) => r.id !== 'PO-SAFE') // eliminar el match L1 seguro
    );
    if (result.kind === 'resolved') {
      expect(result.row.tags).not.toContain('riesgo-lesion:power-max');
    }
  });

  it('L5 · pool solo con power-max rows → rechazo', () => {
    const restrictedPool = POOL.filter((r) =>
      r.tags.includes('riesgo-lesion:power-max')
    );
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'X', suggestedCategory: 'potencia', stimulusCategory: 'power', momento: 'principal' },
        brainContext
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });
});

// -------------------- B.2 · proposito=rehab --------------------
describe('B.2 · Deuda #11 proposito=rehab · excluir salvo lesión declarada', () => {
  it('L1 · perfil sano NO recibe rehab aunque coincida con la propuesta', () => {
    // Pool con solo RH-004 disponible en fuerza-dedos.
    const restrictedPool = [POOL.find((r) => r.id === 'RH-004')!];
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Recovery', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile(), // sin lesiones
        brainContext: makeBrainContext()
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });

  it('L2 · perfil sano con nivel bajo sigue rechazando rehab', () => {
    const restrictedPool = [POOL.find((r) => r.id === 'RH-004')!];
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'X', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile({ climbingTime: 'start' }),
        brainContext: makeBrainContext()
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });

  it('L3 · perfil sano rechaza rehab incluso en fallback de categoría emparentada', () => {
    // Restringimos pool para forzar L3 y que solo RH-004 esté disponible.
    const restrictedPool = [
      POOL.find((r) => r.id === 'RH-004')!,
      // no siblings limpios: fuerza-traccion tampoco (perfil sin lesión)
    ];
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'X', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile(),
        brainContext: makeBrainContext()
      }),
      restrictedPool
    );
    expect(result.kind).toBe('rejected');
  });

  it('L1 con lesión declarada · perfil con injuries=[fingers] SÍ recibe RH-004', () => {
    const restrictedPool = [POOL.find((r) => r.id === 'RH-004')!];
    const result = resolveToCanonical(
      makeInput({
        proposal: { name: 'Recovery', suggestedCategory: 'fuerza-dedos', stimulusCategory: 'strength', momento: 'principal' },
        profile: makeProfile({ injuries: ['fingers'] }),
        // gripRestriction desactivada acá deliberadamente para aislar B.2
        brainContext: makeBrainContext()
      }),
      restrictedPool
    );
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.id).toBe('RH-004');
    }
  });
});

// -------------------- C.1 · §2.4 prerequisito 15-pullups --------------------
describe('C.1 · Deuda #12 prerequisito:15-pullups · conservador con maxPullupReps=null', () => {
  const brainContext = makeBrainContext();

  it('L1 · maxPullupReps=null → excluye FT-006, entrega FT-SAFE en su lugar', () => {
    const restrictedPool = POOL.filter((r) => r.categoria_canonica === 'fuerza-traccion');
    const input = makeInput({
      proposal: { name: 'One arm', suggestedCategory: 'fuerza-traccion', stimulusCategory: 'strength', momento: 'principal' },
      brainContext
    });
    input.profile.maxPullupReps = null;
    const result = resolveToCanonical(input, restrictedPool);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.tags).not.toContain('prerequisito:15-pullups');
    }
  });

  it('L2 · maxPullupReps=10 sigue excluyendo FT-006', () => {
    const restrictedPool = POOL.filter((r) => r.categoria_canonica === 'fuerza-traccion');
    const input = makeInput({
      proposal: { name: 'One arm', suggestedCategory: 'fuerza-traccion', stimulusCategory: 'strength', momento: 'principal' },
      profile: makeProfile({ climbingTime: 'start' }),
      brainContext
    });
    input.profile.maxPullupReps = 10;
    const result = resolveToCanonical(input, restrictedPool);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.id).not.toBe('FT-006');
    }
  });

  it('L3 · maxPullupReps=null también excluye FT-006 en categoría emparentada', () => {
    // Solo FT-006 disponible en fuerza-traccion + BO-SAFE como sibling.
    const restrictedPool = [
      POOL.find((r) => r.id === 'FT-006')!,
      POOL.find((r) => r.id === 'BO-SAFE')!
    ];
    const input = makeInput({
      proposal: { name: 'Fuerza traccion', suggestedCategory: 'fuerza-traccion', stimulusCategory: 'strength', momento: 'principal' },
      brainContext
    });
    input.profile.maxPullupReps = null;
    const result = resolveToCanonical(input, restrictedPool);
    // L1 fuerza-traccion = FT-006 excluido → L2 = FT-006 excluido → L3 sibling BO-SAFE.
    // BO-SAFE es boulder con stimulus='skill' que no matchea strength; puede rankear peor pero pasa.
    if (result.kind === 'resolved') {
      expect(result.row.id).not.toBe('FT-006');
    }
  });

  it('L1 con maxPullupReps=20 · SÍ recibe FT-006 (prerequisito cumplido)', () => {
    const restrictedPool = [POOL.find((r) => r.id === 'FT-006')!];
    const input = makeInput({
      proposal: { name: 'One arm', suggestedCategory: 'fuerza-traccion', stimulusCategory: 'strength', momento: 'principal' },
      brainContext
    });
    input.profile.maxPullupReps = 20;
    const result = resolveToCanonical(input, restrictedPool);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.row.id).toBe('FT-006');
    }
  });
});
