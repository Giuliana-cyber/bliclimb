// Muestreo de resolvers reales para el reporte P5-9.
// Corre 5 escenarios contra un mini-pool que refleja las filas reales del catálogo
// (los 3 tags nuevos + rehab + hangboard-intense).

import { resolveToCanonical } from '../lib/brain/matcher/resolveToCanonical';
import type { CatalogRow, MatcherInput } from '../lib/brain/matcher/types';
import type {
  BlockingContext,
  BlockedCategory,
  GripRestriction
} from '../lib/brain/types';

// Builder que rellena defaults del schema real (0010) para las columnas que
// el matcher NO usa. Solo hay que setear lo relevante para cada fixture.
function row(partial: Partial<CatalogRow> & { id: string }): CatalogRow {
  return {
    id: partial.id,
    nombre: partial.nombre ?? partial.id,
    tipo: partial.tipo ?? 'ejercicio',
    categoria: partial.categoria ?? 'Fuerza dedos',
    equipo: partial.equipo ?? 'Peso corporal',
    descripcion: partial.descripcion ?? 'sin descripción',
    riesgo: partial.riesgo ?? 'medio',
    estado: partial.estado ?? 'activo',
    publicable_app: partial.publicable_app ?? 'Sí',
    fuente_primaria: partial.fuente_primaria ?? 'sample',
    tipo_registro: 'ejercicio',
    tags: partial.tags ?? [],
    subcategoria: partial.subcategoria ?? null,
    objetivo: partial.objetivo ?? null,
    nivel: partial.nivel ?? null,
    tipo_escalador: partial.tipo_escalador ?? null,
    series: partial.series ?? null,
    reps: partial.reps ?? null,
    tiempo: partial.tiempo ?? null,
    tut: partial.tut ?? null,
    descanso: partial.descanso ?? null,
    intensidad: partial.intensidad ?? null,
    frecuencia: partial.frecuencia ?? null,
    progresion: partial.progresion ?? null,
    regresion: partial.regresion ?? null,
    errores_comunes: partial.errores_comunes ?? null,
    precauciones: partial.precauciones ?? null,
    senales_detener: partial.senales_detener ?? null,
    fuente_secundaria: partial.fuente_secundaria ?? null,
    url_fuente: partial.url_fuente ?? null,
    validacion_profesional: partial.validacion_profesional ?? null,
    notas: partial.notas ?? null,
    nivel_canonico: partial.nivel_canonico ?? 'intermedio',
    categoria_canonica: partial.categoria_canonica ?? null,
    proposito: partial.proposito ?? 'entrenamiento',
    momento: partial.momento ?? 'principal',
    equipo_canonico: partial.equipo_canonico ?? ['home'],
    stimulus_derivado: partial.stimulus_derivado ?? null
  };
}

// Pool reducido con filas representativas de las categorías reales del catálogo.
const POOL: CatalogRow[] = [
  row({
    id: 'DP-005',
    nombre: 'IntHangs / Repeaters',
    descripcion: 'Hangs intermitentes con descansos cortos; ajustar profundidad para fallar o casi fallar al final.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'fuerza-dedos',
    equipo_canonico: ['hangboard'],
    stimulus_derivado: 'strength',
    tags: ['riesgo-lesion:hangboard-intense', 'carga:regleta-pequena'],
    intensidad: 'Alta',
    riesgo: 'Alto',
    equipo: 'Hangboard'
  }),
  row({
    id: 'HB-002',
    nombre: 'MaxHangs con peso añadido',
    descripcion: 'Usar una regleta fija, normalmente 18-20 mm al inicio; añadir peso para alcanzar la duración objetivo.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'fuerza-dedos',
    equipo_canonico: ['hangboard', 'weights'],
    stimulus_derivado: 'strength',
    tags: ['riesgo-lesion:hangboard-intense'],
    intensidad: 'Alta / Máxima',
    riesgo: 'Alto',
    equipo: 'Hangboard, lastre'
  }),
  row({
    id: 'HB-LOW',
    nombre: 'Low Intensity Hangs (pies en suelo)',
    descripcion: 'Colgado del hangboard con los pies apoyados en el suelo. Suspensión de 10s con carga muy submáxima.',
    nivel_canonico: 'todos',
    categoria_canonica: 'fuerza-dedos',
    equipo_canonico: ['hangboard'],
    stimulus_derivado: 'strength',
    intensidad: '30-50%',
    riesgo: 'Bajo',
    equipo: 'Hangboard'
  }),
  row({
    id: 'FT-001',
    nombre: 'Dominadas en barra',
    descripcion: 'Manos en pronación a ancho de hombros; subir y bajar completo, sin rebotar.',
    nivel_canonico: 'principiante',
    categoria_canonica: 'fuerza-traccion',
    equipo_canonico: ['pullup_bar'],
    stimulus_derivado: 'strength',
    intensidad: 'Media',
    riesgo: 'Bajo',
    equipo: 'Barra'
  }),
  row({
    id: 'FT-006',
    nombre: 'Bloqueo con una mano (one-arm lock-off)',
    descripcion: 'Subir en dominada/chin-up; bloquear arriba con un brazo y soltar el otro; mantener.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'fuerza-traccion',
    equipo_canonico: ['pullup_bar'],
    stimulus_derivado: 'strength',
    tags: ['riesgo-lesion:pullups-weighted', 'prerequisito:15-pullups'],
    intensidad: 'Máxima',
    riesgo: 'Alto',
    equipo: 'Barra'
  }),
  row({
    id: 'PO-DEADSTOP',
    nombre: 'Dead Stop (precisión dinámica)',
    descripcion: 'Generar momentum. Al llegar al momento de contactar la presa, detenerse INMEDIATAMENTE sin chocar.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'potencia',
    equipo_canonico: ['gym'],
    stimulus_derivado: 'power',
    tags: ['riesgo-lesion:power-max'],
    intensidad: 'Máxima',
    riesgo: 'Alto',
    equipo: 'Muro'
  }),
  row({
    id: 'PO-002',
    nombre: 'Movimiento dinámico de alcance y agarre (dyno)',
    descripcion: 'Movimiento dinámico hacia una presa objetivo, buscando agarrar cerca del dead point.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'potencia',
    equipo_canonico: ['gym'],
    stimulus_derivado: 'power',
    intensidad: 'Alta',
    riesgo: 'Medio',
    equipo: 'Muro'
  }),
  row({
    id: 'RH-004',
    nombre: 'Squeeze device / putty para retorno post-lesión polea',
    descripcion: 'Tras descanso completo, fuerza de baja resistencia con dispositivo de presión.',
    nivel_canonico: 'avanzado',
    categoria_canonica: 'fuerza-dedos',
    proposito: 'rehab',
    equipo_canonico: ['home'],
    stimulus_derivado: 'mobility',
    intensidad: 'Baja',
    riesgo: 'Alto',
    precauciones: 'Sólo iniciar sin dolor.',
    equipo: 'Squeeze device'
  })
];

function baseProfile(): MatcherInput['profile'] {
  return {
    age: '26-35',
    climbingTime: 'more3',
    currentFingerPain: 0,
    currentElbowPain: 0,
    currentShoulderPain: 0,
    injuries: [],
    sleep: 'good',
    equipment: ['home', 'hangboard', 'pullup_bar', 'gym', 'weights'],
    maxPullupReps: 15
  };
}

function baseCtx(): BlockingContext {
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

interface Scenario {
  title: string;
  input: MatcherInput;
}

const scenarios: Scenario[] = [
  {
    title: '1. Adulto experimentado (climbingTime=more3, sin lesión) — Bill propone MaxHang',
    input: {
      proposal: {
        name: 'MaxHang 20mm 8s con lastre',
        suggestedCategory: 'fuerza-dedos',
        stimulusCategory: 'strength',
        momento: 'principal',
        description: 'Hang máximo con lastre'
      },
      profile: baseProfile(),
      brainContext: baseCtx()
    }
  },
  {
    title: '2. Adulto CON lesión de dedos (§5.2 grip restriction) — Bill propone MaxHang',
    input: {
      proposal: {
        name: 'MaxHang 20mm 8s',
        suggestedCategory: 'fuerza-dedos',
        stimulusCategory: 'strength',
        momento: 'principal',
        description: 'Hang máximo'
      },
      profile: { ...baseProfile(), injuries: ['fingers'] },
      brainContext: {
        ...baseCtx(),
        gripRestrictions: new Set<GripRestriction>(['no-small-crimps-below-15mm'])
      }
    }
  },
  {
    title: '3. Menor u16 principiante — Bill propone MaxHang (§1.1 dispara: bloqueos + power-max)',
    input: {
      proposal: {
        name: 'MaxHang principiante',
        suggestedCategory: 'fuerza-dedos',
        stimulusCategory: 'strength',
        momento: 'principal',
        description: 'Hang para menor'
      },
      profile: { ...baseProfile(), age: 'u16', climbingTime: 'less1' },
      brainContext: {
        ...baseCtx(),
        blockedCategories: new Set<BlockedCategory>(['hangboard', 'campus', 'full-crimp', 'hit', 'finger-training-any', 'hangboard-intense', 'pullups-weighted', 'max-tests', 'power-max']),
        gripRestrictions: new Set<GripRestriction>(['no-full-crimp'])
      }
    }
  },
  {
    title: '4. Adulto avanzado sin datos de reps (maxPullupReps=null) — Bill propone one-arm lock-off',
    input: {
      proposal: {
        name: 'One-arm chin-up',
        suggestedCategory: 'fuerza-traccion',
        stimulusCategory: 'strength',
        momento: 'principal',
        description: 'One-arm negatives'
      },
      profile: { ...baseProfile(), maxPullupReps: null },
      brainContext: baseCtx()
    }
  },
  {
    title: '5. Adulto avanzado — Bill propone dead-stop (power-max NO bloqueado, sin perfil restrictivo)',
    input: {
      proposal: {
        name: 'Dead stop precision',
        suggestedCategory: 'potencia',
        stimulusCategory: 'power',
        momento: 'principal',
        description: 'Contact strength'
      },
      profile: baseProfile(),
      brainContext: baseCtx()
    }
  }
];

console.log('MUESTREO DE RESOLVERS · 5 escenarios reales\n' + '='.repeat(75));
for (const s of scenarios) {
  console.log('\n' + '─'.repeat(75));
  console.log(s.title);
  console.log('─'.repeat(75));
  console.log('Input:');
  console.log(`  Proposal: "${s.input.proposal.name}"`);
  console.log(`    suggestedCategory=${s.input.proposal.suggestedCategory}, stimulus=${s.input.proposal.stimulusCategory}, momento=${s.input.proposal.momento}`);
  console.log(`  Profile: age=${s.input.profile.age}, climbingTime=${s.input.profile.climbingTime}, maxPullupReps=${s.input.profile.maxPullupReps}, injuries=[${s.input.profile.injuries.join(',')}]`);
  console.log(`  BrainContext: blockedCategories={${Array.from(s.input.brainContext.blockedCategories).join(',')}}`);
  console.log(`               blockedZones={${Array.from(s.input.brainContext.blockedZones).join(',')}}`);
  console.log(`               gripRestrictions={${Array.from(s.input.brainContext.gripRestrictions).join(',')}}`);
  const result = resolveToCanonical(s.input, POOL);
  console.log('');
  console.log('Output:');
  if (result.kind === 'resolved') {
    console.log(`  ✓ RESOLVED en ${result.level}`);
    console.log(`    id=${result.row.id}, nombre="${result.row.nombre}"`);
    console.log(`    categoria=${result.row.categoria_canonica}, nivel=${result.row.nivel_canonico}, tags=[${result.row.tags.join(', ')}]`);
    console.log(`    ranking: categoryExact=${result.ranking.categoryExact}, stimulusExact=${result.ranking.stimulusExact}, nivelDist=${result.ranking.nivelDistance}, nameSim=${result.ranking.nameSimilarity.toFixed(3)}`);
  } else {
    console.log(`  ✗ REJECTED · razón=${result.reason}`);
    console.log(`    hint LLM: "${result.hintForLLM}"`);
  }
}

console.log('\n' + '='.repeat(75));
console.log('Fin del muestreo.');
