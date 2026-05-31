import type { PainRisk, TrainingGoal } from '@/lib/planning/profile-analysis';

export type StimulusType =
  | 'tecnica_pies'
  | 'fuerza_dedos_submaxima'
  | 'fuerza_general'
  | 'resistencia_4x4'
  | 'bloque_trabajado'
  | 'via_trabajada'
  | 'movilidad_recuperacion'
  | 'antagonistas_preventivo'
  | 'core'
  | 'descarga';

export type SessionBlueprint = {
  stimulusType: StimulusType;
  title: string;
  objective: string;
  whenToUse: string[];
  whenNotToUse: string[];
  requiredBlocks: Array<'warmupGeneral' | 'warmupSpecific' | 'mainBlock' | 'finalBlock' | 'cooldown'>;
  intensityTarget: string;
  typicalDuration: number;
  requiredEquipment: string[];
  riskLevel: PainRisk;
  compatibleGoals: TrainingGoal[];
  incompatibleRisks: PainRisk[];
};

export const SESSION_BLUEPRINTS: Record<StimulusType, SessionBlueprint> = {
  tecnica_pies: {
    stimulusType: 'tecnica_pies',
    title: 'Técnica de pies y control corporal',
    objective: 'Mejorar precisión, peso en pies, cadera y eficiencia sin fatigar dedos.',
    whenToUse: ['base técnica', 'sin gym usando suelo/roca', 'dolor de dedos leve'],
    whenNotToUse: ['fatiga extrema que impide coordinación'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 3-5, técnica limpia y respiración estable',
    typicalDuration: 70,
    requiredEquipment: [],
    riskLevel: 'bajo',
    compatibleGoals: ['tecnica', 'proyecto_roca', 'base', 'retorno_lesion'],
    incompatibleRisks: []
  },
  fuerza_dedos_submaxima: {
    stimulusType: 'fuerza_dedos_submaxima',
    title: 'Fuerza de dedos submáxima',
    objective: 'Estimular tejido de dedos con cargas moderadas y margen amplio.',
    whenToUse: ['experiencia de dedos', 'sin dolor actual', 'objetivo fuerza de dedos'],
    whenNotToUse: ['dolor de dedos mayor a 0 si requiere hangboard', 'principiantes', 'menores'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 5-7, agarre abierto, nunca al fallo',
    typicalDuration: 75,
    requiredEquipment: ['hangboard'],
    riskLevel: 'medio',
    compatibleGoals: ['fuerza_dedos', 'proyecto_roca', 'fuerza_resistencia'],
    incompatibleRisks: ['alto', 'critico']
  },
  fuerza_general: {
    stimulusType: 'fuerza_general',
    title: 'Fuerza general para escalada',
    objective: 'Construir tracción, piernas, escápulas y tensión corporal sin máxima carga de dedos.',
    whenToUse: ['sin gym', 'necesidad de acondicionamiento', 'intermedio o avanzado'],
    whenNotToUse: ['dolor agudo de hombro/codo sin adaptación'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 5-7 con 2 repeticiones en reserva',
    typicalDuration: 75,
    requiredEquipment: [],
    riskLevel: 'medio',
    compatibleGoals: ['base', 'fuerza_resistencia', 'proyecto_roca', 'tecnica'],
    incompatibleRisks: ['critico']
  },
  resistencia_4x4: {
    stimulusType: 'resistencia_4x4',
    title: 'Resistencia / 4x4',
    objective: 'Construir continuidad y tolerancia al bombeo con intensidad submáxima.',
    whenToUse: ['con gym/muro', 'objetivo resistencia', 'sin dolor de dedos activo'],
    whenNotToUse: ['sin muro', 'dolor de dedos activo', 'semana de descarga'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 6-7, bombeo controlado, técnica estable',
    typicalDuration: 85,
    requiredEquipment: ['gym'],
    riskLevel: 'medio',
    compatibleGoals: ['fuerza_resistencia', 'proyecto_roca'],
    incompatibleRisks: ['alto', 'critico']
  },
  bloque_trabajado: {
    stimulusType: 'bloque_trabajado',
    title: 'Bloque trabajado',
    objective: 'Practicar movimientos difíciles con descansos largos y foco técnico.',
    whenToUse: ['perfil intermedio/avanzado con gym', 'objetivo proyecto/potencia técnica'],
    whenNotToUse: ['sin gym', 'dolor de dedos activo', 'fatiga alta'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 6-8, pocos intentos, descanso completo',
    typicalDuration: 90,
    requiredEquipment: ['gym'],
    riskLevel: 'medio',
    compatibleGoals: ['proyecto_roca', 'tecnica', 'fuerza_dedos'],
    incompatibleRisks: ['alto', 'critico']
  },
  via_trabajada: {
    stimulusType: 'via_trabajada',
    title: 'Roca / vía trabajada',
    objective: 'Aplicar beta, descansos y estrategia en ruta real o proyecto.',
    whenToUse: ['acceso a roca', 'objetivo proyecto', 'trabajo técnico/táctico'],
    whenNotToUse: ['sin roca ni proyecto simulado', 'condiciones inseguras'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 5-7, intentos limitados y aprendizaje claro',
    typicalDuration: 95,
    requiredEquipment: ['rock'],
    riskLevel: 'medio',
    compatibleGoals: ['proyecto_roca', 'tecnica', 'fuerza_resistencia'],
    incompatibleRisks: ['critico']
  },
  movilidad_recuperacion: {
    stimulusType: 'movilidad_recuperacion',
    title: 'Movilidad / recuperación',
    objective: 'Bajar fatiga, recuperar rango y mantener hábito sin carga intensa.',
    whenToUse: ['descarga', 'fatiga alta', 'dolor leve', 'día corto'],
    whenNotToUse: ['como único estímulo durante todo el mes si no hay lesión'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 2-4, salir mejor de como entraste',
    typicalDuration: 50,
    requiredEquipment: [],
    riskLevel: 'bajo',
    compatibleGoals: ['retorno_lesion', 'mantenimiento', 'base', 'tecnica'],
    incompatibleRisks: []
  },
  antagonistas_preventivo: {
    stimulusType: 'antagonistas_preventivo',
    title: 'Antagonistas / preventivo',
    objective: 'Equilibrar dedos, hombros y codos con baja carga y control.',
    whenToUse: ['dolor leve', 'semanas con mucho agarre', 'sin equipo pesado'],
    whenNotToUse: ['dolor agudo que empeora con movimiento'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 3-5, sensación de activación, no fatiga profunda',
    typicalDuration: 60,
    requiredEquipment: [],
    riskLevel: 'bajo',
    compatibleGoals: ['retorno_lesion', 'mantenimiento', 'base', 'fuerza_dedos'],
    incompatibleRisks: []
  },
  core: {
    stimulusType: 'core',
    title: 'Core y tensión corporal',
    objective: 'Mejorar transferencia de fuerza entre pies y manos.',
    whenToUse: ['sin gym', 'acondicionamiento físico semanal', 'técnica en desplome'],
    whenNotToUse: ['dolor lumbar no evaluado'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 4-6, línea limpia y respiración posible',
    typicalDuration: 60,
    requiredEquipment: [],
    riskLevel: 'bajo',
    compatibleGoals: ['base', 'tecnica', 'fuerza_resistencia', 'proyecto_roca'],
    incompatibleRisks: []
  },
  descarga: {
    stimulusType: 'descarga',
    title: 'Descarga técnica',
    objective: 'Consolidar adaptaciones reduciendo volumen e intensidad.',
    whenToUse: ['semana 4', 'fatiga acumulada', 'dolor leve'],
    whenNotToUse: ['si el usuario necesita reposo total por dolor alto'],
    requiredBlocks: ['warmupGeneral', 'warmupSpecific', 'mainBlock', 'finalBlock', 'cooldown'],
    intensityTarget: 'RPE 2-4, volumen reducido 30-50%',
    typicalDuration: 45,
    requiredEquipment: [],
    riskLevel: 'bajo',
    compatibleGoals: ['retorno_lesion', 'mantenimiento', 'base', 'tecnica', 'proyecto_roca'],
    incompatibleRisks: []
  }
};

export function getSessionBlueprint(stimulusType: StimulusType) {
  return SESSION_BLUEPRINTS[stimulusType];
}
