// Paso 5 · Matcher · performance test.
//
// Simula el pipeline de un plan de 12 semanas contra un pool sintético del
// tamaño real (~265 rows). Mide latencia total + p50/p95/p99 por llamada.
//
// Este test NO corre contra Supabase — usa un pool sintético en memoria.
// Refleja el costo puramente algorítmico del matcher. La latencia real
// incluye además el SELECT inicial (~10-30ms) que se paga UNA vez.
//
// Objetivo: cada llamada debe estar por debajo de 2ms en promedio para
// que 12 semanas × 3 sesiones × ~10 ejercicios (~360 llamadas) sumen
// <1s de matcher puro.

import { describe, expect, it } from 'vitest';
import { resolveToCanonical } from './resolveToCanonical';
import type { CatalogRow, MatcherInput } from './types';
import type {
  BlockingContext,
  BlockedCategory,
  BlockedZone,
  GripRestriction
} from '../types';

// Pool sintético con las 15 categorías canónicas × 5 niveles × momentos.
function buildSyntheticPool(size: number): CatalogRow[] {
  const categories = [
    'fuerza-dedos',
    'fuerza-traccion',
    'fuerza-empuje',
    'fuerza-tren-inferior',
    'potencia',
    'campus',
    'resistencia-aerobica',
    'resistencia-anaerobica',
    'tecnica',
    'boulder',
    'movilidad',
    'core',
    'hombros-escapulas',
    'munecas-antebrazos',
    'piel'
  ];
  const niveles = [
    'principiante',
    'principiante-intermedio',
    'intermedio',
    'intermedio-avanzado',
    'avanzado',
    'todos'
  ];
  const momentos = ['calentamiento', 'principal', 'enfriamiento'];
  const propositos = ['entrenamiento', 'rehab', 'prevencion'];
  const stimuli = ['strength', 'power', 'aerobic-base', 'power-endurance', 'skill', 'mobility'];
  const equipos = [['home'], ['hangboard'], ['pullup_bar'], ['gym'], ['campus']];
  const rows: CatalogRow[] = [];
  let idCounter = 0;
  while (rows.length < size) {
    const cat = categories[idCounter % categories.length]!;
    const nivel = niveles[idCounter % niveles.length]!;
    const momento = momentos[idCounter % momentos.length]!;
    const proposito = propositos[idCounter % propositos.length]!;
    const stimulus = stimuli[idCounter % stimuli.length]!;
    const equipo = equipos[idCounter % equipos.length]!;
    const tagsPool: string[] = [];
    if (idCounter % 20 === 0) tagsPool.push('carga:regleta-pequena');
    if (idCounter % 30 === 0) tagsPool.push('prerequisito:15-pullups');
    if (idCounter % 25 === 0) tagsPool.push('riesgo-lesion:power-max');
    if (idCounter % 8 === 0) tagsPool.push('riesgo-lesion:hangboard-intense');
    rows.push({
      id: `SYN-${idCounter.toString().padStart(4, '0')}`,
      nombre: `Sintetico ${cat} ${nivel} #${idCounter}`,
      tipo: 'ejercicio',
      categoria: cat,
      equipo: 'sintetico',
      descripcion: `Descripción sintetica para el row ${idCounter}`,
      riesgo: 'medio',
      estado: 'activo',
      publicable_app: 'Sí',
      fuente_primaria: 'perf-synthetic',
      tipo_registro: 'ejercicio',
      tags: tagsPool,
      subcategoria: null,
      objetivo: null,
      nivel: null,
      tipo_escalador: null,
      series: null,
      reps: null,
      tiempo: null,
      tut: null,
      descanso: null,
      intensidad: null,
      frecuencia: null,
      progresion: null,
      regresion: null,
      errores_comunes: null,
      precauciones: null,
      senales_detener: null,
      fuente_secundaria: null,
      url_fuente: null,
      validacion_profesional: null,
      notas: null,
      nivel_canonico: nivel,
      categoria_canonica: cat,
      proposito,
      momento,
      equipo_canonico: equipo,
      stimulus_derivado: stimulus
    });
    idCounter++;
  }
  return rows;
}

function makeProfile(): MatcherInput['profile'] {
  return {
    age: '26-35',
    climbingTime: 'more3',
    currentFingerPain: 0,
    currentElbowPain: 0,
    currentShoulderPain: 0,
    injuries: [],
    sleep: 'good',
    equipment: ['home', 'hangboard', 'pullup_bar', 'gym', 'campus', 'bands', 'weights', 'trx', 'rock'],
    maxPullupReps: 15
  } as MatcherInput['profile'];
}

function makeBrainContext(): BlockingContext {
  return {
    blockedCategories: new Set(),
    blockedZones: new Set(),
    blockedExercises: { exactIds: new Set(), prefixes: new Set() },
    gripRestrictions: new Set(),
    trainingPriorities: new Set(),
    intensityAdjustments: new Set(),
    derivationMessages: [],
    ruleHits: []
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

describe('resolveToCanonical · performance test (plan 12 semanas)', () => {
  it('12 sem × 3 sesiones × ~10 ejercicios = 360 llamadas · p95 < 5ms, promedio < 2ms', () => {
    // Pool ~265 rows, en producción viene del SELECT sobre public.exercises.
    const pool = buildSyntheticPool(265);
    const profile = makeProfile();
    const brainContext = makeBrainContext();

    const proposals: MatcherInput['proposal'][] = [];
    const categories = [
      'fuerza-dedos',
      'fuerza-traccion',
      'potencia',
      'campus',
      'movilidad',
      'core',
      'boulder'
    ] as const;
    const stimuli = ['strength', 'power', 'aerobic-base', 'mobility', 'skill'] as const;
    const momentos = ['calentamiento', 'principal', 'enfriamiento'] as const;

    for (let week = 0; week < 12; week++) {
      for (let session = 0; session < 3; session++) {
        for (let ex = 0; ex < 10; ex++) {
          proposals.push({
            name: `Proposal week${week} ses${session} #${ex}`,
            suggestedCategory: categories[ex % categories.length]!,
            stimulusCategory: stimuli[ex % stimuli.length]!,
            momento: momentos[ex % momentos.length]!,
            description: 'sample'
          });
        }
      }
    }

    // Warmup (JIT tier) — no lo medimos.
    for (let i = 0; i < 10; i++) {
      resolveToCanonical({ proposal: proposals[0]!, profile, brainContext }, pool);
    }

    // Medición real.
    const timings: number[] = [];
    const totalStart = performance.now();
    for (const proposal of proposals) {
      const start = performance.now();
      resolveToCanonical({ proposal, profile, brainContext }, pool);
      timings.push(performance.now() - start);
    }
    const totalMs = performance.now() - totalStart;

    timings.sort((a, b) => a - b);
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const p50 = percentile(timings, 50);
    const p95 = percentile(timings, 95);
    const p99 = percentile(timings, 99);

    console.log(
      `\n[perf] plan 12 semanas · ${proposals.length} llamadas · pool=${pool.length} rows`
    );
    console.log(
      `[perf]   total = ${totalMs.toFixed(2)} ms · promedio = ${avg.toFixed(3)} ms/call`
    );
    console.log(
      `[perf]   p50 = ${p50.toFixed(3)} ms · p95 = ${p95.toFixed(3)} ms · p99 = ${p99.toFixed(3)} ms`
    );

    // Aserciones — thresholds generosos para no ser flaky en CI.
    expect(avg).toBeLessThan(2);
    expect(p95).toBeLessThan(5);
  });

  it('12 sem con perfil restrictivo (u16 + lesión dedos + climbingTime=start) · sigue rápido', () => {
    const pool = buildSyntheticPool(265);
    const profile: MatcherInput['profile'] = {
      ...makeProfile(),
      age: 'u16',
      climbingTime: 'start',
      injuries: ['fingers', 'elbows'],
      currentFingerPain: 4,
      maxPullupReps: null
    };
    const brainContext: BlockingContext = {
      blockedCategories: new Set<BlockedCategory>(['hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any', 'hangboard-intense', 'pullups-weighted', 'max-tests', 'power-max']),
      blockedZones: new Set<BlockedZone>(['fingers-pulleys', 'elbow']),
      blockedExercises: { exactIds: new Set(), prefixes: new Set() },
      gripRestrictions: new Set<GripRestriction>(['no-small-crimps-below-15mm']),
      trainingPriorities: new Set(),
      intensityAdjustments: new Set(),
      derivationMessages: [],
      ruleHits: []
    };
    const proposal: MatcherInput['proposal'] = {
      name: 'MaxHang',
      suggestedCategory: 'fuerza-dedos',
      stimulusCategory: 'strength',
      momento: 'principal'
    };
    // Ejecutar 360 iteraciones.
    const start = performance.now();
    let rejected = 0;
    for (let i = 0; i < 360; i++) {
      const r = resolveToCanonical({ proposal, profile, brainContext }, pool);
      if (r.kind === 'rejected') rejected++;
    }
    const totalMs = performance.now() - start;
    const avg = totalMs / 360;
    console.log(
      `[perf] perfil restrictivo · 360 llamadas · total=${totalMs.toFixed(2)}ms · promedio=${avg.toFixed(3)}ms/call · rejected=${rejected}`
    );
    expect(avg).toBeLessThan(2);
  });
});
