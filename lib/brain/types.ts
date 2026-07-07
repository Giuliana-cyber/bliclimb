// Tipos base del middleware de seguridad (Doc 02).
//
// Un módulo de reglas produce Verdicts; el validator los acumula en un
// BlockingContext. Un consumidor futuro (section-02 para filtrar catálogo,
// integración con generate-plan) lee el BlockingContext y decide qué mostrar
// al usuario / qué pasar al LLM.
//
// Diseño clave: section-01 emite CATEGORÍAS semánticas ("hangboard",
// "campus"), no IDs del catálogo. La traducción categoría → ejercicio
// concreto vive en section-02.

// -------------------- Categorías bloqueables --------------------
//
// Nombres estables. Cambiarlos requiere update en el mapping de section-02.
// Vienen del texto de Doc 02 §1.1 y §1.2.
export type BlockedCategory =
  | 'hangboard'              // canal Hangboard/Fingerboard general (§1.1)
  | 'hangboard-intense'      // MaxHangs, IntHangs, Repeaters (§1.2)
  | 'campus'                 // canal Campus Board (prefijo CB-) (§1.1, §1.2)
  | 'full-crimp'             // técnica full crimp / regletas pequeñas (§1.1)
  | 'hit'                    // FM-014 HIT y variantes (§1.1, §1.2)
  | 'pullups-weighted'       // dominadas con lastre (§1.2)
  | 'max-tests'              // tests máximos (Sec 2.5, referenciado en §1.2)
  | 'finger-training-any';   // "carga directa de dedos" cubre-todo (§1.1)

// -------------------- Zonas anatómicas (para §1.3 dolor 3+) --------------------
//
// Sub-fase 1 cubre solo las 3 zonas con escala 0-10 en el perfil actual.
// Muñeca y cuello (mencionados en Doc 02 §1.3) NO tienen campo y quedan
// como deuda documentada en canonicalization-debt.md.
export type BlockedZone = 'fingers-pulleys' | 'elbow' | 'shoulder';

// -------------------- Matcher de ejercicios bloqueados --------------------
//
// Section-02 (sub-fase 2) traduce categorías semánticas del perfil a este
// matcher, que puede consumirse contra un ID del catálogo (Sheet 01) para
// saber si el ejercicio está bloqueado. Dos vías:
//   - `exactIds`: matcheo exacto (ej: 'FM-014', 'PF-FM-005').
//   - `prefixes`: bloqueo por familia (ej: 'HB-' cubre los 66 HB-*).
export type BlockedExerciseMatcher = {
  exactIds: Set<string>;
  prefixes: Set<string>;
};

// -------------------- Restricciones de agarre --------------------
//
// Full crimp NO es un ejercicio — es una VARIANTE DE AGARRE. Section-02 la
// traduce a una restricción que Bill/Senda pasa como constraint al LLM
// dentro de ejercicios permitidos ("realizar en half crimp o open, nunca
// full crimp"). NO bloquea IDs.
//
// 'no-small-crimps-below-15mm' viene de §5.2 (historial de lesión de polea):
// mismo mecanismo — no bloquea ejercicios, restringe el tamaño de regleta
// que Bill puede prescribir dentro de un ejercicio permitido.
export type GripRestriction = 'no-full-crimp' | 'no-small-crimps-below-15mm';

// -------------------- Prioridades de entrenamiento (§5.3) --------------------
//
// Hints semánticos que Bill pasa al LLM como constraint del plan: no
// bloquean ejercicios ni ajustan intensidad, sino que reordenan
// prioridades ("empezar con extensores antes de volumen de tracción").
export type TrainingPriority = 'extensors-before-traction';

// -------------------- Ajustes de intensidad (§5.3, §5.4) --------------------
//
// Modificadores globales que Bill aplica al plan armado por el LLM:
//   - 'reduce-below-baseline': reducir intensidad general (§5.4 sueño <5h).
//   - 'reduce-traction-volume': reducir volumen de dominadas/lock-offs (§5.3
//     historial de codo hasta completar 4 semanas de prevención).
export type IntensityAdjustment =
  | 'reduce-below-baseline'
  | 'reduce-traction-volume';

// -------------------- Verdict --------------------
//
// Un módulo emite un Verdict por cada regla que se dispara.
//   - 'block-categories' (§1.1, §1.2): bloquea familias/categorías del catálogo.
//   - 'block-zone' (§1.3): bloquea zona anatómica + deriva a profesional.
//   - 'add-grip-restriction' (§5.2): añade constraint de agarre al LLM.
//   - 'add-training-priority' (§5.3): reordena prioridades del plan.
//   - 'add-intensity-adjustment' (§5.3, §5.4): modifica intensidad global.
// 'block-all' queda para §1.5 embarazo (diferido a v2).
export type Verdict =
  | {
      kind: 'block-categories';
      rule: string;            // '1.1', '1.2'
      categories: BlockedCategory[];
      userMessage: string;     // verbatim del Doc 02
      source: string;          // 'López-Rivera 2021; Saeterbakken et al. 2024'
    }
  | {
      kind: 'block-zone';
      rule: string;            // '1.3'
      zone: BlockedZone;
      userMessage: string;
      source: string;
    }
  | {
      kind: 'add-grip-restriction';
      rule: string;            // '5.2'
      restriction: GripRestriction;
      userMessage: string;
      source: string;
    }
  | {
      kind: 'add-training-priority';
      rule: string;            // '5.3'
      priority: TrainingPriority;
      userMessage: string;
      source: string;
    }
  | {
      kind: 'add-intensity-adjustment';
      rule: string;            // '5.3', '5.4'
      adjustment: IntensityAdjustment;
      userMessage: string;
      source: string;
    };

// -------------------- BlockingContext --------------------
//
// Estado acumulado tras correr todos los módulos habilitados. Consumidores
// futuros lo usan como filtro contra Sheet 01 y como constraint al LLM.
export type BlockingContext = {
  blockedCategories: Set<BlockedCategory>;
  blockedZones: Set<BlockedZone>;
  blockedExercises: BlockedExerciseMatcher;
  gripRestrictions: Set<GripRestriction>;
  trainingPriorities: Set<TrainingPriority>;
  intensityAdjustments: Set<IntensityAdjustment>;
  derivationMessages: string[];
  ruleHits: Array<{ rule: string; kind: Verdict['kind'] }>;
};

// -------------------- Helper: ¿este ejercicio está bloqueado? --------------------
//
// Consulta pura. Sub-fase 3 (wiring con generate-plan) y section-03
// (validación de plan armado) lo usan para filtrar catálogo y validar
// ejercicios ya generados por el LLM.
export function isExerciseBlocked(id: string, matcher: BlockedExerciseMatcher): boolean {
  if (matcher.exactIds.has(id)) return true;
  let matched = false;
  matcher.prefixes.forEach((prefix) => {
    if (id.startsWith(prefix)) matched = true;
  });
  return matched;
}

// -------------------- Perfil mínimo para reglas --------------------
//
// Subset explícito de UserProfile para desacoplar tests y evitar
// dependencia circular con lib/profile.ts.
export type ProfileForRules = {
  age: string;                  // bucket: 'u16' | '16-25' | '26-35' | '36-45' | '46+' | ''
  climbingTime: string;         // bucket: 'start' | 'less1' | '1to3' | 'more3' | ''
  currentFingerPain: number;    // 0..10
  currentShoulderPain: number;  // 0..10
  currentElbowPain: number;     // 0..10
  // Sub-fase 3 (§5.2, §5.3): proxy conservador vía injuries[] del onboarding.
  // Valores esperados: 'none' | 'fingers' | 'elbows' | 'shoulders' | 'knees' |
  // 'back' | 'wrists' | 'other' | 'returning'. Ver canonicalization-debt.md
  // para la deuda de no capturar historial específico de polea/epicondilitis.
  injuries: string[];
  // Sub-fase 3 (§5.4): bucket del onboarding.
  //   'good'    = 7-9 hrs  (NO dispara)
  //   'regular' = 5-7 hrs  (NO dispara — decisión de Giuliana)
  //   'bad'     = <5 hrs   (DISPARA reducción de intensidad)
  //   ''        = sin dato (NO dispara — asume ok)
  sleep: string;
};

// -------------------- RuleModule --------------------
export interface RuleModule {
  readonly section: string;     // 'section-01', 'section-05', ...
  readonly ruleIds: readonly string[]; // ['1.1', '1.2', '1.3']
  check(profile: ProfileForRules): Verdict[];
}

// -------------------- Logging --------------------
//
// `kind` es la union de kinds de Verdict + 'derivation-weight' (§3.15,
// que NO emite un Verdict porque no corre en el pipeline de perfil —
// vive en el runtime del chat con detección por lenguaje). Los campos
// específicos por kind son opcionales.
export type BlockLogEvent = {
  section: string;
  rule: string;
  profileId: string | null;
  kind: Verdict['kind'] | 'derivation-weight';
  categories?: BlockedCategory[];
  zone?: BlockedZone;
  restriction?: GripRestriction;
  priority?: TrainingPriority;
  adjustment?: IntensityAdjustment;
  // §3.15 (chat runtime) — solo poblados si kind === 'derivation-weight'.
  weightKeywords?: string[];
  weightIntent?: 'change-weight' | 'informational' | 'other';
  weightReason?:
    | 'no-keyword'
    | 'change-weight'
    | 'informational'
    | 'other'
    | 'fail-safe';
  weightError?: string;
  timestamp: string;
};

export interface LogSink {
  logBlock(event: BlockLogEvent): void;
}

// ====================================================================
// Sub-fase 4 — Validación de PLAN (Doc 02 §3).
// ====================================================================
//
// Las reglas de §3 operan sobre un TrainingPlan ya armado por el LLM, no
// sobre un perfil. Emiten PlanViolation (distinto de Verdict) porque la
// unidad de trabajo es semana/sesión/ejercicio, no categoría/zona.
//
// El orquestador (a montarse en el paso final del middleware) va a:
//   1) Correr todas las PlanRuleModule.
//   2) Si hay violations → regenerar (hasta 3 intentos, passando el
//      diagnostic al prompt de retry).
//   3) Tras 3 fallidos → mensaje #17 al usuario (placeholder tono
//      Belay Partners), sin publicar el plan.
//
// Este módulo NO se wire-a con generate-plan en este PR (librería pura).

export type PlanRuleId =
  | '1.gating'
  | '3.1'
  | '3.2'
  | '3.3'
  | '3.4'
  | '3.6'
  | '3.7'
  | '3.8'
  | '3.9'
  | '3.10'
  | '3.20'
  | '10.6'
  | '14.2';

// Location dentro del plan donde ocurrió la violación. Al menos uno de
// weekNumber/dayNumber suele estar, salvo violaciones macro (§3.7/§3.8/§3.9)
// que son de PLAN entero.
export type PlanLocation = {
  weekNumber?: number;
  dayNumber?: number;
  exerciseIndex?: number;
  block?: 'warmup' | 'mainBlock' | 'cooldown';
};

// Detalle específico por regla — permite tanto reportar en tests como
// pasar al prompt de retry información útil ("estos días son hard
// consecutivos: 1,2,3"). Cada regla define su propio kind.
export type PlanViolationDetails =
  | { kind: 'session-order-wrong'; expected: string[]; got: string[] }
  | { kind: 'skill-not-in-first-30-min'; sessionMinutesBeforeSkill: number }
  | { kind: 'consecutive-hard-days'; dayNumbers: number[] }
  | {
      kind: 'insufficient-recovery-between-sessions';
      stimulus: string;
      daysBetween: number;
      minDaysRequired: number;
      dayA: number;
      dayB: number;
    }
  | { kind: 'hangboard-after-climb'; hangboardIndex: number; climbIndex: number }
  | {
      kind: 'missing-deload-after-block';
      weeksSinceLastDeload: number;
      maxAllowed: number;
    }
  | { kind: 'macro-order-wrong'; violation: string; details: string }
  | {
      kind: 'anaerobic-without-aerobic-base';
      firstAnaerobicWeek: number;
      aerobicBaseWeeksBefore: number;
      minRequired: number;
    }
  | { kind: 'too-many-hard-days-per-week'; hardCount: number; max: number }
  | {
      kind: 'more-than-two-high-intensity-elements';
      elements: string[];
      max: number;
    }
  | {
      kind: 'no-load-alternation';
      daysPerWeek: number;
      consecutiveHeavyDays: number[];
    }
  | {
      kind: 'gated-exercise-slipped';
      /** Nombre del ejercicio tal como lo generó Bill (para diagnostic). */
      exerciseName: string;
      /** Categoría gateable etiquetada por el LLM que el perfil bloquea. */
      blockedCategory: BlockedCategory;
      /** Regla del perfil que originó el bloqueo (ej '1.1' o '1.2'). Puede
       *  ser null si el bloqueo vino de una fuente que no exponía rule ID. */
      profileRule: string | null;
    }
  | {
      kind: 'missing-extensor-work';
      /** Cantidad de sesiones de tracción (strength/power/PE/aerobic-base)
       *  en la semana observada. */
      tractionDaysInWeek: number;
      /** true si el perfil incluye 'elbows' en injuries — regla dura. */
      hasEpicondylitisHistory: boolean;
      /** Por qué disparó: threshold general (3+ días) o historia clínica. */
      reason: 'traction-threshold' | 'epicondylitis-history';
    };

/**
 * Severidad de una violation.
 *   - 'blocking' → dispara regeneración del plan. Ej: 3.3 (3 días duros
 *     seguidos = riesgo de sobreuso), 3.9 (anaeróbico sin base = aeróbica
 *     insegura), 3.20 (más de 2 estímulos altos = sobrecarga sesión).
 *   - 'advisory' → NO regenera, se pasa como hint/mensaje al usuario o
 *     al retry-prompt. Ej: 10.6 (alternar heavy/light es preferencia con
 *     evidencia sólida pero no safety-critical).
 */
export type PlanViolationSeverity = 'blocking' | 'advisory';

/**
 * Una violación estructural del plan. Incluye contexto diagnóstico
 * para logging + retry prompt + tests.
 */
export type PlanViolation = {
  rule: PlanRuleId;
  section: 'section-01' | 'section-03' | 'section-10' | 'section-14';
  severity: PlanViolationSeverity;
  location: PlanLocation;
  details: PlanViolationDetails;
  /** Mensaje del Doc 02 §3.x — para trazabilidad en logs. Nunca se muestra
   *  al usuario tal cual; el usuario ve el fallback #17 tras 3 retries. */
  ruleSummary: string;
  /** Fuente académica de la regla. */
  source: string;
};

/**
 * Resultado de validar un plan. Vacío = plan sano.
 * ruleHits agrupado por regla ayuda a debugging.
 */
export type PlanValidationResult = {
  violations: PlanViolation[];
  ruleHits: PlanRuleId[];
};

// Subset del TrainingPlan runtime que necesitan las reglas. Definido
// localmente para desacoplar tests y evitar depender de lib/plan.ts en
// el módulo de reglas puro. Solo campos usados por §3/§10.6.
//
// TODOS los campos nuevos de sub-fase 4 (phase, stimulusCategory,
// intensityLevel, riskLevel) son OPCIONALES — planes viejos sin ellos
// hacen que las reglas dependientes se salten (permisivo por defecto,
// diseñado con Giuliana en el PR de schema).
export type PlanExerciseForRules = {
  name?: string | null;
  riskLevel?: 'bajo' | 'medio' | 'alto' | null;
  category?: string | null;
  // Sub-fase 4 base — categoría per-exercise. Habilita §3.1/§3.2/§3.6/§3.20
  // sin string matching. Opcional/nullable → fallback permisivo con planes
  // viejos generados antes de que aterrizara el schema per-exercise.
  stimulusCategory?:
    | 'warmup'
    | 'skill'
    | 'strength'
    | 'power'
    | 'power-endurance'
    | 'aerobic-base'
    | 'mobility'
    | 'mental'
    | 'cooldown'
    | 'rest'
    | null;
  // Sub-fase final del middleware — categoría gateable per-exercise.
  // Alineada con BlockedCategory. Cruza con BlockingContext del perfil.
  blockCategory?: BlockedCategory | null;
};

export type PlanSessionForRules = {
  dayNumber: number;
  title?: string | null;
  stimulusCategory?:
    | 'warmup'
    | 'skill'
    | 'strength'
    | 'power'
    | 'power-endurance'
    | 'aerobic-base'
    | 'mobility'
    | 'mental'
    | 'cooldown'
    | 'rest'
    | null;
  intensityLevel?: 'easy' | 'medium' | 'hard' | null;
  estimatedMinutes?: number | null;
  warmup?: PlanExerciseForRules[] | null;
  mainBlock?: PlanExerciseForRules[] | null;
  cooldown?: PlanExerciseForRules[] | null;
};

export type PlanWeekForRules = {
  weekNumber: number;
  phase?: 'base' | 'build' | 'peak' | 'deload' | 'test' | null;
  deloadWeek?: boolean | null;
  sessions: PlanSessionForRules[];
};

export type PlanForRules = {
  weeks: PlanWeekForRules[];
};

/**
 * Módulo que valida un TrainingPlan (no un profile). Simétrico a
 * RuleModule pero para reglas de programación.
 *
 * profile es opcional: reglas plan-only (§3.x, §10.6) lo ignoran.
 * Reglas que combinan plan + perfil (§14.2 — extensores condicionados
 * a historial de epicondilitis) lo requieren. Fallback permisivo:
 * cuando la regla necesita profile y viene undefined, se salta.
 */
export interface PlanRuleModule {
  readonly section: 'section-01' | 'section-03' | 'section-10' | 'section-14';
  readonly ruleIds: readonly PlanRuleId[];
  check(plan: PlanForRules, profile?: ProfileForRules): PlanViolation[];
}
