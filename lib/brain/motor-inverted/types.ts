/**
 * Motor invertido · types compartidos · Fase 2 (2026-07-16).
 *
 * Convención de status del catálogo v3.1 (vocabulario #8):
 *   active         → publicable, motor puede prescribir
 *   manual_review  → requiere coach, motor NUNCA lo elige automáticamente
 *   draft          → no publicable
 *   deprecated     → solo referencia histórica
 */

export type CategoryToken =
  | 'fuerza-dedos'
  | 'traccion'
  | 'antebrazo-muneca-codo'
  | 'fuerza-general'
  | 'resistencia-fuerza'
  | 'power-endurance'
  | 'hombros-escapulas'
  | 'core'
  | 'tecnica-escalada'
  | 'calentamiento'
  | 'recuperacion'
  | 'campus-potencia'
  | 'movilidad'
  | 'prevencion'
  | 'mental';

export type EquipmentToken =
  | 'gym' | 'hangboard' | 'campus' | 'weights' | 'rock'
  | 'home' | 'bands' | 'pullup_bar' | 'trx'
  | 'dynamometer' | 'pinch_block';

export type RiskLevel =
  | 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';

export type CatalogStatus =
  | 'active' | 'manual_review' | 'draft' | 'deprecated';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type CanonicalAction =
  | 'STOP_SESSION' | 'BLOCK' | 'MANUAL_REVIEW' | 'STOP_OR_REGRESS'
  | 'REGRESS' | 'ADJUST_VOLUME' | 'HOLD' | 'SUBSTITUTE'
  | 'DEPRIORITIZE' | 'REQUIRE_TECHNIQUE_DRILL' | 'REORDER'
  | 'CUE_ONLY' | 'ALLOW_ONE_VARIABLE_ONLY';

export type CandidateState =
  | 'BLOCKED' | 'MANUAL_REVIEW' | 'ADAPTED' | 'HELD' | 'ELIGIBLE';

export interface Exercise {
  id: string;
  name: string;
  category: string; // one of CategoryToken cuando canonicalizado
  objective: string;
  levelMin?: string;
  levelMax?: string;
  environment?: string;
  equipmentRaw: string; // texto original (fricción 32 residuales)
  equipmentTokens: EquipmentToken[]; // parsed
  executionSummary: string;
  progression: string;
  regression: string;
  riskLevel: RiskLevel | string; // string cuando fricción
  stopSignals: string;
  gates: string[]; // gate IDs asociados
  sourceTrace: string;
  sprint: string;
  status: CatalogStatus | string;
}

export interface Gate {
  id: string;
  name: string;
  category: string;
  condition: string; // condition_expression texto
  action: CanonicalAction | string;
  severity: Severity | string;
  isWarning: boolean;
  appliesTo: string;
  reason: string;
  requiresValidation: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  objective: string;
  eligibleLevel: string;
  exerciseIds: string;
  structure: 'warmup' | 'main' | 'finisher' | 'cooldown' | 'standalone' | string;
  workRaw: string;
  workMinS: number | null;
  workMaxS: number | null;
  restRaw: string;
  restMinS: number | null;
  restMaxS: number | null;
  setsRaw: string;
  setsMin: number | null;
  setsMax: number | null;
  repsRaw: string;
  repsMin: number | null;
  repsMax: number | null;
  intensityRaw: string;
  intensityPctMin: number | null;
  intensityPctMax: number | null;
  notesDosage: string;
  frequency: string;
  progression: string;
  regression: string;
  riskLevel: RiskLevel | string;
  gates: string[];
  status: CatalogStatus | string;
}

export interface Relationship {
  id: string;
  fromId: string;
  relation: string;
  toId: string;
  category: string;
  notes: string;
}

export interface FocusRule {
  id: string; // FR-001..FR-012
  priorityOrder: number;
  condition: string; // condition_expression compatible con gate-evaluator
  focusPhase: string; // texto español del v3.0
  primaryPriority: string;
  secondaryPriority: string;
  avoidOrLimit: string;
  rationaleUser: string;
  status: string;
  reviewNote: string;
}

export interface Catalog {
  exercises: Exercise[];
  protocols: Protocol[];
  gates: Gate[];
  relationships: Relationship[];
  focusRules: FocusRule[];
  // acceso indexado (poblado por loader):
  exerciseById: Map<string, Exercise>;
  gateById: Map<string, Gate>;
  protocolById: Map<string, Protocol>;
  exerciseGatesById: Map<string, string[]>; // exerciseId → [gateId]
}

export interface Profile {
  age: 'u16' | 'adult';
  climbingTime: 'start' | 'less1' | '1to3' | 'more3';
  hang25mmSeconds: number | null;
  maxPullupReps: number | null;
  currentFingerPain: number;
  currentShoulderPain: number;
  currentElbowPain: number;
  injuries: string[];
  equipment: string[];
  character: 'bill' | 'senda';
  // extensible según SessionBuilder v3.1
  fatigueLevel?: 'low' | 'medium' | 'high';
  sleepQuality?: 'poor' | 'medium' | 'good';
  trainingFocus?: string;
  sessionEnvironment?: string;
  redSLeaFlags?: boolean;
}

export interface FocusObject {
  phase: 'reconstruccion' | 'base' | 'build' | 'peak' | 'deload' | 'test' | 'seguridad' | 'conservador' | 'especifica' | 'complemento' | 'primer-valor';
  primaryPriority: string;
  secondaryPriority?: string;
  avoid: string[];
  narrative: string;
  maxRiskLevel: RiskLevel;
}

export interface GateResult {
  gateId: string;
  action: CanonicalAction | string;
  candidateState: CandidateState;
  reason: string;
  isWarning: boolean;
}

export interface PoolRestrictionResult {
  eligible: string[];
  blocked: { id: string; gateId: string; reason: string }[];
  reasons: Map<string, string[]>; // por exercise: por qué fue eligible/blocked
}
