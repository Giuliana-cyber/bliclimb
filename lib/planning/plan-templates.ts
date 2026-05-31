import type { ProfileAnalysis, TrainingGoal } from '@/lib/planning/profile-analysis';
import type { StimulusType } from '@/lib/planning/session-blueprints';

export type MicrocycleDefinition = {
  id: string;
  weeks: number[];
  objective: string;
  loadLevel: 'entrada' | 'base' | 'construccion' | 'intensificacion' | 'descarga';
  progressionFocus: string;
  deloadWeek: boolean;
};

export type PlanTemplate = {
  id: string;
  name: string;
  recommendedDurationWeeks: number;
  microcycles: MicrocycleDefinition[];
  weeklyStimulusDistribution: Record<number, StimulusType[]>;
  expectedProgression: string[];
  deloadRules: string[];
  safetyRules: string[];
  requiredEquipment: string[];
  useWhen: string[];
  avoidWhen: string[];
  compatibleGoals: TrainingGoal[];
};

const defaultMicrocycles: MicrocycleDefinition[] = [
  {
    id: 'mc-1-base',
    weeks: [1, 2],
    objective: 'Construir base técnica, tolerancia de tejidos y hábitos de registro.',
    loadLevel: 'base',
    progressionFocus: 'Semana 1 controla técnica; semana 2 sube volumen o densidad sin subir riesgo.',
    deloadWeek: false
  },
  {
    id: 'mc-2-especificidad',
    weeks: [3],
    objective: 'Aumentar especificidad hacia objetivo principal sin romper restricciones.',
    loadLevel: 'intensificacion',
    progressionFocus: 'Semana 3 aumenta especificidad, dificultad técnica o descanso estructurado.',
    deloadWeek: false
  },
  {
    id: 'mc-3-descarga',
    weeks: [4],
    objective: 'Descargar, consolidar y preparar feedback para el siguiente bloque.',
    loadLevel: 'descarga',
    progressionFocus: 'Semana 4 baja volumen 30-50%, conserva calidad técnica y recuperación.',
    deloadWeek: true
  }
];

function distribution(types: StimulusType[]) {
  return {
    1: [types[0]],
    2: types.slice(0, 2),
    3: types.slice(0, 3),
    4: types.slice(0, 4),
    5: types.slice(0, 5)
  } satisfies Record<number, StimulusType[]>;
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'principiante-sin-gym',
    name: 'Principiante sin gym',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'tecnica_pies',
      'fuerza_general',
      'movilidad_recuperacion',
      'antagonistas_preventivo',
      'core'
    ]),
    expectedProgression: ['más control técnico', 'más volumen fácil', 'más autonomía de calentamiento'],
    deloadRules: ['Semana 4 reduce volumen y mantiene movilidad/técnica.'],
    safetyRules: ['No campus.', 'No hangboard.', 'No fallo muscular.'],
    requiredEquipment: [],
    useWhen: ['nivel principiante', 'sin gym', 'dolor o poca experiencia'],
    avoidWhen: ['perfil avanzado que requiere proyecto específico'],
    compatibleGoals: ['base', 'tecnica', 'retorno_lesion', 'mantenimiento']
  },
  {
    id: 'intermedio-con-gym',
    name: 'Intermedio con gym',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'tecnica_pies',
      'resistencia_4x4',
      'fuerza_general',
      'bloque_trabajado',
      'movilidad_recuperacion'
    ]),
    expectedProgression: ['subir densidad', 'subir especificidad de bloques', 'descargar al final'],
    deloadRules: ['Semana 4 reduce intentos difíciles y deja muro fácil.'],
    safetyRules: ['Nada de campus si hay dolor.', 'Bloques con descanso completo.'],
    requiredEquipment: ['gym'],
    useWhen: ['intermedio', 'con gym/muro', 'objetivo técnica o resistencia'],
    avoidWhen: ['sin acceso a muro', 'dolor de dedos alto'],
    compatibleGoals: ['tecnica', 'fuerza_resistencia', 'base']
  },
  {
    id: 'avanzado-campus-hangboard',
    name: 'Avanzado con campus/hangboard',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'bloque_trabajado',
      'fuerza_dedos_submaxima',
      'fuerza_general',
      'resistencia_4x4',
      'movilidad_recuperacion'
    ]),
    expectedProgression: ['alta calidad, bajo volumen', 'más especificidad', 'descarga real'],
    deloadRules: ['Semana 4 elimina campus y reduce dedos.'],
    safetyRules: ['Campus solo sin dolor y con experiencia.', 'Hangboard solo submáximo.'],
    requiredEquipment: ['gym', 'campus', 'hangboard'],
    useWhen: ['avanzado', 'sin dolor', 'experiencia campus/hangboard'],
    avoidWhen: ['dolor de dedos', 'principiante', 'sin equipo'],
    compatibleGoals: ['fuerza_dedos', 'proyecto_roca', 'fuerza_resistencia']
  },
  {
    id: 'dedos-conservador',
    name: 'Fuerza de dedos conservadora',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'antagonistas_preventivo',
      'fuerza_general',
      'tecnica_pies',
      'movilidad_recuperacion',
      'core'
    ]),
    expectedProgression: ['tolerancia submáxima', 'más control de extensores', 'sin dolor creciente'],
    deloadRules: ['Si dolor sube, convertir semana en recuperación.'],
    safetyRules: ['Sin campus.', 'Sin max hangs.', 'Sin arqueo máximo.', 'Parar si dolor sube a 3/10.'],
    requiredEquipment: [],
    useWhen: ['dolor de dedos leve', 'objetivo dedos pero riesgo activo'],
    avoidWhen: ['dolor de dedos 4/10 o más sin evaluación profesional'],
    compatibleGoals: ['fuerza_dedos', 'retorno_lesion', 'mantenimiento']
  },
  {
    id: 'fuerza-resistencia',
    name: 'Fuerza-resistencia',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'tecnica_pies',
      'resistencia_4x4',
      'fuerza_general',
      'antagonistas_preventivo',
      'descarga'
    ]),
    expectedProgression: ['más continuidad', 'descansos estructurados', 'menos pérdida técnica bajo fatiga'],
    deloadRules: ['Descarga con volumen fácil y movilidad.'],
    safetyRules: ['Evitar bombeo máximo si hay dolor.', 'No repetir 4x4 seguido.'],
    requiredEquipment: [],
    useWhen: ['objetivo resistencia', 'capacidad base suficiente'],
    avoidWhen: ['dolor alto', 'sin opción de escalar ni adaptar continuidad'],
    compatibleGoals: ['fuerza_resistencia', 'proyecto_roca']
  },
  {
    id: 'retorno-lesion',
    name: 'Retorno de lesión',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'movilidad_recuperacion',
      'antagonistas_preventivo',
      'tecnica_pies',
      'core',
      'descarga'
    ]),
    expectedProgression: ['tolerancia sin dolor', 'rango controlado', 'reintroducción gradual'],
    deloadRules: ['Descargar antes de subir intensidad si hay síntomas.'],
    safetyRules: ['Consulta fisio si hay lesión activa.', 'No dolor creciente.'],
    requiredEquipment: [],
    useWhen: ['lesión o dolor activo', 'baja recuperación'],
    avoidWhen: ['usuario busca bloque agresivo sin restricción'],
    compatibleGoals: ['retorno_lesion', 'mantenimiento', 'base']
  },
  {
    id: 'roca-proyecto',
    name: 'Roca/proyecto',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'via_trabajada',
      'fuerza_general',
      'tecnica_pies',
      'antagonistas_preventivo',
      'movilidad_recuperacion'
    ]),
    expectedProgression: ['más beta útil', 'más especificidad al crux', 'descarga para probar fresco'],
    deloadRules: ['Semana 4 baja volumen y conserva pegues de calidad.'],
    safetyRules: ['Limitar pegues de proyecto.', 'No forzar regletas dolorosas.'],
    requiredEquipment: ['rock'],
    useWhen: ['objetivo proyecto', 'acceso a roca'],
    avoidWhen: ['sin roca ni ruta objetivo'],
    compatibleGoals: ['proyecto_roca', 'tecnica', 'fuerza_resistencia']
  },
  {
    id: 'tecnica-movimiento',
    name: 'Técnica + movimiento',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'tecnica_pies',
      'core',
      'fuerza_general',
      'movilidad_recuperacion',
      'antagonistas_preventivo'
    ]),
    expectedProgression: ['más precisión', 'más transferencia de peso', 'más control corporal'],
    deloadRules: ['Descarga con técnica fácil y movilidad.'],
    safetyRules: ['Subir dificultad solo si técnica se mantiene.'],
    requiredEquipment: [],
    useWhen: ['objetivo técnica', 'sin gym o con poco equipo'],
    avoidWhen: ['objetivo exclusivo de potencia avanzada'],
    compatibleGoals: ['tecnica', 'base', 'mantenimiento']
  },
  {
    id: 'mantenimiento',
    name: 'Mantenimiento',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles,
    weeklyStimulusDistribution: distribution([
      'tecnica_pies',
      'fuerza_general',
      'movilidad_recuperacion',
      'antagonistas_preventivo',
      'descarga'
    ]),
    expectedProgression: ['mantener capacidad', 'evitar fatiga acumulada', 'registrar señales'],
    deloadRules: ['Descarga cada cuarta semana o antes si hay fatiga.'],
    safetyRules: ['Volumen moderado.', 'Nada de picos agresivos.'],
    requiredEquipment: [],
    useWhen: ['poco tiempo', 'mantener forma', 'temporada ocupada'],
    avoidWhen: ['busca pico competitivo inmediato'],
    compatibleGoals: ['mantenimiento', 'base', 'tecnica']
  },
  {
    id: 'descarga',
    name: 'Descarga',
    recommendedDurationWeeks: 4,
    microcycles: defaultMicrocycles.map((microcycle) => ({
      ...microcycle,
      loadLevel: microcycle.weeks.includes(4) ? 'descarga' : 'entrada'
    })),
    weeklyStimulusDistribution: distribution([
      'descarga',
      'movilidad_recuperacion',
      'tecnica_pies',
      'antagonistas_preventivo',
      'core'
    ]),
    expectedProgression: ['bajar fatiga', 'recuperar movilidad', 'dejar cuerpo listo'],
    deloadRules: ['Mantener RPE 2-4 toda la semana si hace falta.'],
    safetyRules: ['No añadir trabajo extra por sentirte bien.'],
    requiredEquipment: [],
    useWhen: ['fatiga alta', 'dolor', 'semana de recuperación'],
    avoidWhen: ['necesita estímulo fuerte y está recuperado'],
    compatibleGoals: ['retorno_lesion', 'mantenimiento', 'base']
  }
];

function hasRequiredEquipment(template: PlanTemplate, analysis: ProfileAnalysis) {
  return template.requiredEquipment.every((equipment) => {
    if (equipment === 'gym') return analysis.hasGymAccess;
    if (equipment === 'rock') return analysis.hasRockAccess;
    if (equipment === 'hangboard') return analysis.canUseHangboard;
    if (equipment === 'campus') return analysis.canUseCampus;
    return analysis.equipmentAvailable.includes(equipment);
  });
}

export function selectPlanTemplate(analysis: ProfileAnalysis): PlanTemplate {
  if (analysis.fingerRisk === 'critico' || analysis.shouldAvoidMaxStrength) {
    if (analysis.mainGoal === 'fuerza_dedos' && analysis.fingerRisk !== 'critico') {
      return PLAN_TEMPLATES.find((template) => template.id === 'dedos-conservador')!;
    }
    if (analysis.criticalRestrictions.some((item) => item.toLowerCase().includes('dolor'))) {
      return PLAN_TEMPLATES.find((template) => template.id === 'retorno-lesion')!;
    }
  }

  if (analysis.mainGoal === 'proyecto_roca' && analysis.hasRockAccess) {
    return PLAN_TEMPLATES.find((template) => template.id === 'roca-proyecto')!;
  }

  if (
    analysis.climbingLevel === 'advanced' &&
    analysis.canUseCampus &&
    analysis.canUseHangboard &&
    hasRequiredEquipment(PLAN_TEMPLATES.find((template) => template.id === 'avanzado-campus-hangboard')!, analysis)
  ) {
    return PLAN_TEMPLATES.find((template) => template.id === 'avanzado-campus-hangboard')!;
  }

  if (analysis.mainGoal === 'fuerza_resistencia' && analysis.hasGymAccess) {
    return PLAN_TEMPLATES.find((template) => template.id === 'fuerza-resistencia')!;
  }

  if (analysis.mainGoal === 'tecnica') {
    return PLAN_TEMPLATES.find((template) => template.id === 'tecnica-movimiento')!;
  }

  if (analysis.hasGymAccess) {
    return PLAN_TEMPLATES.find((template) => template.id === 'intermedio-con-gym')!;
  }

  if (analysis.climbingLevel === 'beginner' || !analysis.hasGymAccess) {
    return PLAN_TEMPLATES.find((template) => template.id === 'principiante-sin-gym')!;
  }

  return PLAN_TEMPLATES.find((template) => template.id === 'mantenimiento')!;
}
