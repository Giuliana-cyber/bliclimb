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
export type BlockLogEvent = {
  section: string;
  rule: string;
  profileId: string | null;
  kind: Verdict['kind'];
  categories?: BlockedCategory[];
  zone?: BlockedZone;
  restriction?: GripRestriction;
  priority?: TrainingPriority;
  adjustment?: IntensityAdjustment;
  timestamp: string;
};

export interface LogSink {
  logBlock(event: BlockLogEvent): void;
}
